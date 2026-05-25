// PixiRenderer — bootstraps a PIXI.Application and renders engine state.
// Reads from World + SessionState, never writes. (§3.1, §10)
//
// Layered stage (§10.1):
//   1. Background          — biome floor (Phase 4) or dark canvas
//   2. Walls               — static terrain polylines (Phase 3)
//   3. Connection hints    — drag/hover line from selected source(s) to target
//   4. Nodes               — NodeView containers
//   5. Tower attack range  — Phase 2
//   6. Particles           — foot-puff dust, etc (v2.8.5; below units)
//   7. Unit groups         — UnitGroupView containers
//   8. Spell effects       — Phase 2
//   9. Selection box       — dashed rectangle while box-selecting
//  10. HUD overlay         — win/lose banner only (the v2.7-era
//                            tick+seconds text was removed in v2.9.1;
//                            elapsed time now lives in the React
//                            HudTimer overlay)
//
// v2.9.1: the world container (`worldRoot`) is scaled and translated
// each frame via `fitWorldToHost()` so the level (declared in raw
// pixels in its JSON) fits the host element while preserving aspect
// ratio. `InputController` uses `screenToWorld()` to invert that
// transform — fixing the cursor-drift bug that originally retired
// the v2.7.5 auto-zoom branch in v2.7.6.

import { Application, Container, Graphics, Sprite, Text } from 'pixi.js';
import type { World } from '../engine/World';
import type { Vec2 } from '../types';
import type { ContentLibrary } from '../engine/content/ContentLibrary';
import type { TowerShot } from '../engine/systems/TowerInterceptSystem';
import type { SpellCastEvent } from '../engine/GameEngine';
import { pathCacheKey } from '../engine/PathSystem';
import { NodeView } from './views/NodeView';
import { UnitGroupView } from './views/UnitGroupView';
import { SelectionBoxView } from './views/SelectionBoxView';
import { colorFromHex, ELEMENT_SCALE } from './shapes';
import type { SessionState } from './SessionState';
import { loadNodeTextures } from './sprites/nodeSprites';
import { loadUnitTextures } from './sprites/unitSprites';
import { loadBiomeTextures, getBiomeTexture } from './sprites/biomeSprites';
import { loadWallTextures, getWallTexture } from './sprites/wallSprites';
import {
  loadProjectileTextures,
  getProjectileTexture,
  projectileForTowerLevel,
  type ProjectileId,
} from './sprites/projectileSprites';
import { loadEffectTextures, getDeathPuffTexture } from './sprites/effectSprites';
import { loadSpellTextures, getSpellTexture } from './sprites/spellSprites';
import { playSfx } from '../audio/sfxPlayer';
import type { FactionId } from '../types';

interface ClickRipple {
  x: number;
  y: number;
  birthMs: number;
}

interface RenderedBeam {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color: number;
  birthMs: number;
  // v2.9.2: projectile texture (resolved from the firing tower's level).
  // When null, the beam renders as the v2.7-era solid-color line.
  projectile: ReturnType<typeof getProjectileTexture> | null;
  // v2.10.0: which projectile this is, so drawTowerBeams can apply a
  // per-type size scale (the ~square cannonball reads too big at the
  // full long-edge size that suits the thin arrow/bolt).
  projectileId: ProjectileId | null;
}

interface DeathPuff {
  x: number;
  y: number;
  birthMs: number;
  texture: ReturnType<typeof getDeathPuffTexture>;
  sprite: Sprite;
}

interface ActiveSpellOverlay {
  spellId: string;
  worldX: number;
  worldY: number;
  birthMs: number;
  sprite: Sprite;
  // v2.9.4: persistent overlays (freeze, and v2.11.1 starve) stay shown at
  // fixed size + alpha while the target is in the spell's effect state, and
  // tear down when the engine reverts that state (freeze → node recaptured;
  // starve → stacks cleared). One-shot overlays animate in/hold/out over
  // `lifeMs` (defaults to SPELL_OVERLAY_LIFE_MS; sabotage uses a 5 s hold).
  persistent: boolean;
  targetNodeId?: string;
  // v2.11.1: lifetime for one-shot overlays. Undefined for persistent ones.
  lifeMs?: number;
}

const RIPPLE_LIFE_MS = 600;
const RIPPLE_MAX_RADIUS = 28;
const BEAM_LIFE_MS = 220;
const DEATH_PUFF_LIFE_MS = 700;
// v2.9.4: sized to fit *within* one unit's silhouette (slightly
// smaller than UnitGroupView.SPRITE_BASE_DISPLAY_HEIGHT = 30). Reads
// as "one unit's worth of debris" without overpowering surviving
// units next to it. The v2.9.3 value of 30 with the +25% scale-up
// peaked at 37 px — bigger than a unit, which read as "too big".
const DEATH_PUFF_BASE_SIZE_PX = 22;
// v2.9.4: projectiles size by LONG edge (not height) so a long-thin
// arrow doesn't stretch wider than a unit silhouette. The v2.9.3
// height-based 14 px multiplied by the arrow's 128:24 aspect made it
// ~75 px wide — 2.5× a unit's width.
// v2.9.9: bumped 22 → 30 to match UnitGroupView.SPRITE_BASE_DISPLAY_HEIGHT,
// so an arrow / bolt / cannonball's long edge equals a unit's height.
// (At per-level visualScale this still scales together with the unit.)
const PROJECTILE_LONG_EDGE_PX = 30;
// v2.10.0: per-projectile long-edge multiplier. Arrow/bolt are long-thin,
// so the full 30 px long edge gives them a unit-scale silhouette. The
// cannonball is ~square, so the same 30 px long edge renders a solid
// ~30 px ball that reads much heavier than a unit ("too big"). Scale it
// down so the ball is roughly head/torso-sized relative to a unit.
const PROJECTILE_SIZE_SCALE: Record<ProjectileId, number> = {
  arrow: 1,
  'ballista-bolt': 1,
  // v2.10.1: 0.55 → 0.45, the cannonball still read a touch heavy.
  cannonball: 0.45,
};
const SPELL_OVERLAY_LIFE_MS = 1100;
const SPELL_OVERLAY_BASE_SIZE_PX = 120;
// v2.11.1: the sabotage ring lingers on the captured node for 5 s, then
// fades out — long enough to read "this was sabotaged" without sticking
// around permanently (sabotage leaves no lasting node state to track).
const SABOTAGE_OVERLAY_LIFE_MS = 5000;
// v2.11.2: the sabotage wreath read too large at the shared 120 px — sized
// down so it hugs the node rather than sprawling over its neighbours.
const SABOTAGE_OVERLAY_SIZE_PX = 84;
// v2.11.3: world-px margin reserved around the map by fitWorldToHost so node
// labels (level numeral above, unit count below) aren't clipped at the
// viewport edge.
// v2.11.4: cut 64 → 24 — nodes/labels are smaller now (ELEMENT_SCALE) so they
// need far less edge room, and the big margin was leaving an ugly dark
// letterbox around the map. 24 still covers labels on reasonably-inset nodes.
const MAP_FIT_MARGIN_PX = 24;

export class PixiRenderer {
  readonly app: Application;
  private readonly host: HTMLElement;
  private readonly content: ContentLibrary;

  // v2.7.5: world layers attach to worldRoot (which we scale+translate
  // per level via world.preferredView). The HUD layer attaches directly
  // to stage so overlay text doesn't zoom with the world.
  private readonly worldRoot: Container;
  private readonly bgLayer: Container;
  private readonly wallsLayer: Container;
  private readonly rangeLayer: Container;
  private readonly hintLayer: Container;
  private readonly nodeLayer: Container;
  private readonly particleLayer: Container;
  private readonly unitLayer: Container;
  private readonly beamLayer: Container;
  private readonly boxLayer: Container;
  private readonly hudLayer: Container;

  private readonly hintGraphics: Graphics;
  private readonly rippleGraphics: Graphics;
  private readonly rangeGraphics: Graphics;
  private readonly beamGraphics: Graphics;
  private readonly wallsGraphics: Graphics;
  private readonly selectionBoxView: SelectionBoxView;
  private readonly statusText: Text;

  // v2.9.1: world-fit transform — uniform scale + centering offset
  // applied to `worldRoot` each frame so the level (declared in raw
  // px in its JSON) fits the host area (which is sized to the
  // viewport). Preserves aspect ratio; letterboxes if needed.
  private worldFitScale = 1;
  private worldFitOffsetX = 0;
  private worldFitOffsetY = 0;

  // Walls are static per level — redraw only when the level id changes.
  private lastWallsLevelId: number | null = null;
  // Biome floor is static per level — track separately from walls.
  private lastBiomeLevelId: number | null = null;
  private biomeSprite: Sprite | null = null;
  // Win/lose SFX edge detection — fire the stinger once on the transition
  // out of 'playing', not every frame the banner is shown.
  private lastWorldStatus: World['status'] | null = null;

  private readonly nodeViews = new Map<string, NodeView>();
  private readonly unitViews = new Map<string, UnitGroupView>();
  private readonly ripples: ClickRipple[] = [];
  private readonly beams: RenderedBeam[] = [];
  private readonly deathPuffs: DeathPuff[] = [];
  private readonly activeSpellOverlays: ActiveSpellOverlay[] = [];
  // v2.9.6: per-node owner snapshot across frames so we can detect
  // a non-null → null transition (i.e. a freeze cast happened
  // mid-tick). Lets the renderer spawn the freeze overlay for AI
  // casts, which never go through the InputController's
  // spawnSpellOverlay callback. Naturally-neutral nodes that start
  // with ownerId === null don't trigger because the first observed
  // value is null (no prior non-null state).
  private readonly lastNodeOwners = new Map<string, string | null>();
  // Wall sprite per biome — placed once at the polyline's bbox and
  // retained across frames (walls are static per level). Cleared on
  // level change inside syncWalls.
  private readonly wallSprites: Sprite[] = [];
  // Dedupe key per shot — `${firedAtTick}-${fromNodeId}` is unique
  // because a single tower fires at most once per tick.
  private ingestedShotKeys = new Set<string>();

  private constructor(app: Application, host: HTMLElement, content: ContentLibrary) {
    this.app = app;
    this.host = host;
    this.content = content;

    this.worldRoot = new Container();
    this.bgLayer = new Container();
    this.wallsLayer = new Container();
    this.rangeLayer = new Container();
    this.hintLayer = new Container();
    this.nodeLayer = new Container();
    this.particleLayer = new Container();
    this.unitLayer = new Container();
    this.beamLayer = new Container();
    this.boxLayer = new Container();
    this.hudLayer = new Container();

    this.app.stage.addChild(this.worldRoot);
    this.worldRoot.addChild(this.bgLayer);
    this.worldRoot.addChild(this.wallsLayer);
    this.worldRoot.addChild(this.rangeLayer);
    this.worldRoot.addChild(this.hintLayer);
    this.worldRoot.addChild(this.nodeLayer);
    this.worldRoot.addChild(this.particleLayer);
    this.worldRoot.addChild(this.unitLayer);
    this.worldRoot.addChild(this.beamLayer);
    this.worldRoot.addChild(this.boxLayer);
    // HUD stays at canvas scale.
    this.app.stage.addChild(this.hudLayer);

    this.wallsGraphics = new Graphics();
    this.wallsLayer.addChild(this.wallsGraphics);

    this.hintGraphics = new Graphics();
    this.hintLayer.addChild(this.hintGraphics);

    this.rippleGraphics = new Graphics();
    this.hintLayer.addChild(this.rippleGraphics);

    this.rangeGraphics = new Graphics();
    this.rangeLayer.addChild(this.rangeGraphics);

    this.beamGraphics = new Graphics();
    this.beamLayer.addChild(this.beamGraphics);

    this.selectionBoxView = new SelectionBoxView();
    this.boxLayer.addChild(this.selectionBoxView.graphic);

    // v2.9.1: removed the Pixi `hudText` (level/tick/seconds string).
    // A compact React clock chip (`HudTimer`) renders the elapsed
    // seconds instead. Pixi HUD now owns only the win/lose status
    // banner.

    this.statusText = new Text({
      text: '',
      style: {
        fontFamily: 'system-ui, sans-serif',
        fontSize: 36,
        fill: 0xffffff,
        // Dark stroke keeps the win/lose banner legible against any
        // biome (snow especially). Scaled to fontSize 36.
        stroke: { color: 0x000000, width: 5, alpha: 0.9 },
        fontWeight: '700',
        align: 'center',
      },
    });
    this.statusText.anchor.set(0.5);
    this.hudLayer.addChild(this.statusText);
  }

  static async create(host: HTMLElement, content: ContentLibrary): Promise<PixiRenderer> {
    const app = new Application();
    await app.init({
      background: '#0a0a0a',
      resizeTo: host,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio,
    });
    host.appendChild(app.canvas);
    await Promise.all([
      loadNodeTextures(),
      loadUnitTextures(),
      loadBiomeTextures(),
      loadWallTextures(),
      loadProjectileTextures(),
      loadEffectTextures(),
      loadSpellTextures(),
    ]);
    return new PixiRenderer(app, host, content);
  }

  render(
    world: World,
    session: SessionState,
    alpha: number,
    nowMs: number,
    recentTowerShots: ReadonlyArray<TowerShot> = [],
    recentSpellCasts: SpellCastEvent[] = [],
  ): void {
    this.fitWorldToHost(world);
    this.syncBiome(world);
    this.syncWalls(world);
    this.syncNodes(world, session, nowMs, alpha);
    this.syncUnitGroups(world, alpha, nowMs);
    this.drawHints(world, session);
    this.drawTowerRanges(world, session);
    this.ingestTowerShots(recentTowerShots, world, nowMs);
    this.drawTowerBeams(nowMs, world);
    this.drawDeathPuffs(nowMs);
    this.observeFreezeTransitions(world, nowMs);
    this.observeStarveOverlays(world, nowMs);
    this.ingestSpellCasts(recentSpellCasts, world, nowMs);
    this.drawSpellOverlays(nowMs, world);
    this.selectionBoxView.update(session.boxSelect);
    this.drawRipples(nowMs);
    this.updateHud(world);
  }

  // Biome floor is static per level — only swap the sprite when the
  // level id changes. Stretches one biome texture to fill the map's
  // declared width × height. Falls back to no sprite (canvas background
  // shows through) when the biome has no texture registered.
  //
  // v2.8.3: backed off the v2.8.2 desaturate + tint compensations.
  // They existed to make a photographic dunes source feel painterly;
  // the new grass source is already painterly and matches the
  // building/unit aesthetic, so no compensation is needed. A small
  // alpha drop (0.92) gives a hint of atmospheric depth without
  // muting the source. Per-node/per-unit drop shadows still ground
  // sprites onto the floor.
  private syncBiome(world: World): void {
    if (this.lastBiomeLevelId === world.level.id) return;
    this.lastBiomeLevelId = world.level.id;

    if (this.biomeSprite) {
      this.bgLayer.removeChild(this.biomeSprite);
      this.biomeSprite.destroy();
      this.biomeSprite = null;
    }

    const tex = getBiomeTexture(world.level.map.background);
    if (!tex) return;
    const s = new Sprite(tex);
    s.x = 0;
    s.y = 0;
    s.width = world.level.map.width;
    s.height = world.level.map.height;
    s.alpha = 0.92;
    this.biomeSprite = s;
    this.bgLayer.addChild(s);
  }

  // Walls are static per level — only redraw when the level changes.
  // v2.9.2: when the biome has a registered wall sprite (grass, desert),
  // bbox-place the sprite over each wall polyline instead of stroking
  // the line. Biomes without a sprite (snow, jungle, stone) fall
  // through to the v2.7-era procedural stone-grey stroke + shadow +
  // highlight pass. Engine wall math (PathSystem) is unchanged — the
  // polyline is the source of truth for clearance.
  private syncWalls(world: World): void {
    if (this.lastWallsLevelId === world.level.id) return;
    this.lastWallsLevelId = world.level.id;
    this.wallsGraphics.clear();
    // Tear down any wall sprites from the previous level.
    for (const s of this.wallSprites) {
      this.wallsLayer.removeChild(s);
      s.destroy();
    }
    this.wallSprites.length = 0;

    const wallTex = getWallTexture(world.level.map.background);

    for (const wall of world.walls) {
      if (wall.points.length < 2) continue;

      if (wallTex) {
        // Bbox placement: stretch the sprite to fit the polyline's
        // bounding box (+ a small pad so the painterly edges don't
        // visually clip at the engine's exact line). Engine clearance
        // math is unaffected.
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of wall.points) {
          if (p.x < minX) minX = p.x;
          if (p.x > maxX) maxX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.y > maxY) maxY = p.y;
        }
        const PAD = 14;
        const bw = maxX - minX + PAD * 2;
        const bh = maxY - minY + PAD * 2;
        // A pure-horizontal or pure-vertical wall has zero extent on
        // one axis; clamp to a minimum thickness so the sprite has
        // visible area.
        const w = Math.max(bw, 28);
        const h = Math.max(bh, 28);
        const sprite = new Sprite(wallTex);
        sprite.x = minX - PAD;
        sprite.y = minY - PAD;
        sprite.width = w;
        sprite.height = h;
        this.wallsLayer.addChild(sprite);
        this.wallSprites.push(sprite);
        continue;
      }

      // Procedural fallback: stone-grey stroke with drop shadow + bevel.
      this.wallsGraphics.moveTo(wall.points[0]!.x, wall.points[0]!.y + 2);
      for (let i = 1; i < wall.points.length; i++) {
        this.wallsGraphics.lineTo(wall.points[i]!.x, wall.points[i]!.y + 2);
      }
      this.wallsGraphics.stroke({ color: 0x000000, width: 9, alpha: 0.45, cap: 'round', join: 'round' });

      this.wallsGraphics.moveTo(wall.points[0]!.x, wall.points[0]!.y);
      for (let i = 1; i < wall.points.length; i++) {
        this.wallsGraphics.lineTo(wall.points[i]!.x, wall.points[i]!.y);
      }
      this.wallsGraphics.stroke({ color: 0x4a4a4a, width: 7, alpha: 1.0, cap: 'round', join: 'round' });

      this.wallsGraphics.moveTo(wall.points[0]!.x, wall.points[0]!.y);
      for (let i = 1; i < wall.points.length; i++) {
        this.wallsGraphics.lineTo(wall.points[i]!.x, wall.points[i]!.y);
      }
      this.wallsGraphics.stroke({ color: 0x6a6a6a, width: 2, alpha: 0.9, cap: 'round', join: 'round' });
    }
  }

  // Polyline path between two nodes — cached one if present, else direct
  // [from, to]. Returns null if the pair is explicitly unreachable.
  private polylineForPair(
    world: World,
    fromId: string,
    toId: string,
  ): { x: number; y: number }[] | null {
    const cached = world.pathCache.get(pathCacheKey(fromId, toId));
    if (cached === null) return null;
    if (cached === undefined) {
      const a = world.nodes.get(fromId);
      const b = world.nodes.get(toId);
      if (!a || !b) return null;
      return [{ ...a.position }, { ...b.position }];
    }
    return cached.map((p) => ({ x: p.x, y: p.y }));
  }

  private drawTowerRanges(world: World, session: SessionState): void {
    this.rangeGraphics.clear();
    if (session.selectedNodeIds.size === 0) return;
    for (const id of session.selectedNodeIds) {
      const n = world.nodes.get(id);
      if (!n || n.nodeType !== 'tower') continue;
      const def = this.content.nodeTypes[n.nodeType];
      const lv = def?.levels.find((l) => l.level === n.level);
      const range = lv?.attackRange;
      if (range === undefined || range <= 0) continue;
      const owner = n.ownerId
        ? world.players.find((p) => p.id === n.ownerId)
        : undefined;
      const color = owner ? colorFromHex(owner.color) : 0xffffff;
      this.rangeGraphics
        .circle(n.position.x, n.position.y, range)
        .fill({ color, alpha: 0.04 })
        .circle(n.position.x, n.position.y, range)
        .stroke({ color, width: 1, alpha: 0.35 });
    }
  }

  private ingestTowerShots(
    shots: ReadonlyArray<TowerShot>,
    world: World,
    nowMs: number,
  ): void {
    if (shots.length === 0) return;
    for (const shot of shots) {
      const key = `${shot.firedAtTick}-${shot.fromNodeId}`;
      if (this.ingestedShotKeys.has(key)) continue;
      this.ingestedShotKeys.add(key);
      const tower = world.nodes.get(shot.fromNodeId);
      const owner = tower?.ownerId
        ? world.players.find((p) => p.id === tower.ownerId)
        : undefined;
      const color = owner ? colorFromHex(owner.color) : 0xffffff;
      // v2.9.2: resolve projectile sprite from the firing tower's level
      // (1→arrow, 2→ballista-bolt, 3+→cannonball). When the sprite
      // registry has the texture, drawTowerBeams will tween it from
      // tower → target instead of drawing the legacy color beam.
      const projectileId = tower ? projectileForTowerLevel(tower.level) : null;
      const projectile = projectileId ? getProjectileTexture(projectileId) : null;
      this.beams.push({
        fromX: shot.fromPos.x,
        fromY: shot.fromPos.y,
        toX: shot.toPos.x,
        toY: shot.toPos.y,
        color,
        birthMs: nowMs,
        projectile,
        projectileId,
      });
    }
    // Bound the dedupe set so it doesn't grow forever during long sessions.
    if (this.ingestedShotKeys.size > 4096) {
      this.ingestedShotKeys = new Set(
        Array.from(this.ingestedShotKeys).slice(-1024),
      );
    }
  }

  // v2.9.2: projectile sprites tween from tower → target over the
  // BEAM_LIFE_MS lifetime. Beams whose projectile texture is null
  // (registry miss for that tower level) fall back to the v2.7-era
  // colored line. Sprite is rotated to face direction of travel
  // (cannonball still rotates — reads as tumbling, which is fine for
  // a heavy cannonball).
  private projectileSprites = new Map<number, Sprite>();
  private beamSerial = 0;

  private drawTowerBeams(nowMs: number, world: World): void {
    this.beamGraphics.clear();
    const aliveKeys = new Set<number>();
    // Size by LONG edge so the longest dimension matches
    // PROJECTILE_LONG_EDGE_PX regardless of the source's aspect ratio.
    // Scales with per-level visualScale to track unit size on sparse maps,
    // and × ELEMENT_SCALE (v2.11.4) so projectiles shrink with units/nodes.
    const baseLE = PROJECTILE_LONG_EDGE_PX * world.visualScale * ELEMENT_SCALE;
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const b = this.beams[i]!;
      const age = nowMs - b.birthMs;
      if (age > BEAM_LIFE_MS) {
        // Tear down the per-beam sprite, if any.
        const key = (b as { _serial?: number })._serial;
        if (key !== undefined) {
          const s = this.projectileSprites.get(key);
          if (s) {
            this.beamLayer.removeChild(s);
            s.destroy();
            this.projectileSprites.delete(key);
          }
        }
        this.beams.splice(i, 1);
        continue;
      }
      const t = age / BEAM_LIFE_MS;
      if (b.projectile) {
        // Tween a sprite along the beam.
        let serial = (b as { _serial?: number })._serial;
        if (serial === undefined) {
          serial = ++this.beamSerial;
          (b as { _serial?: number })._serial = serial;
          const sprite = new Sprite(b.projectile);
          sprite.anchor.set(0.5);
          const targetLE = baseLE * (b.projectileId ? PROJECTILE_SIZE_SCALE[b.projectileId] : 1);
          const tw = b.projectile.width;
          const th = b.projectile.height;
          if (tw >= th) {
            sprite.width = targetLE;
            sprite.height = targetLE * (th / tw);
          } else {
            sprite.height = targetLE;
            sprite.width = targetLE * (tw / th);
          }
          this.beamLayer.addChild(sprite);
          this.projectileSprites.set(serial, sprite);
        }
        const sprite = this.projectileSprites.get(serial)!;
        const x = b.fromX + (b.toX - b.fromX) * t;
        const y = b.fromY + (b.toY - b.fromY) * t;
        sprite.position.set(x, y);
        sprite.rotation = Math.atan2(b.toY - b.fromY, b.toX - b.fromX);
        sprite.alpha = 1 - Math.max(0, t - 0.85) / 0.15;
        aliveKeys.add(serial);
      } else {
        const alpha = 1 - t;
        this.beamGraphics
          .moveTo(b.fromX, b.fromY)
          .lineTo(b.toX, b.toY)
          .stroke({ color: b.color, width: 2, alpha: alpha * 0.85 });
      }
    }
    // Garbage-collect any sprites whose beam was removed without
    // hitting the explicit teardown branch (defensive — shouldn't
    // happen but cheap to guard).
    for (const [key, sprite] of this.projectileSprites) {
      if (!aliveKeys.has(key)) {
        this.beamLayer.removeChild(sprite);
        sprite.destroy();
        this.projectileSprites.delete(key);
      }
    }
  }

  private syncNodes(world: World, session: SessionState, nowMs: number, alpha: number): void {
    const present = new Set<string>();
    const targetingId = session.targetingFromLabId;
    for (const id of world.nodeOrder) {
      const node = world.nodes.get(id);
      if (!node) continue;
      present.add(id);
      let view = this.nodeViews.get(id);
      if (!view) {
        view = new NodeView(node);
        this.nodeViews.set(id, view);
        this.nodeLayer.addChild(view.container);
      }
      view.update(
        node,
        world,
        this.content,
        session.selectedNodeIds.has(id),
        nowMs,
        alpha,
        targetingId === id,
      );
    }
    for (const [id, view] of this.nodeViews) {
      if (!present.has(id)) {
        view.destroy();
        this.nodeViews.delete(id);
      }
    }
  }

  private syncUnitGroups(world: World, alpha: number, nowMs: number): void {
    const present = new Set<string>();
    for (const ug of world.unitGroups) {
      present.add(ug.id);
      let view = this.unitViews.get(ug.id);
      if (!view) {
        view = new UnitGroupView(ug, this.particleLayer);
        this.unitViews.set(ug.id, view);
        this.unitLayer.addChild(view.container);
        // Launch SFX: only when the human player sends. AI mass-sends would
        // otherwise carpet-bomb the audio channel.
        if (world.humanPlayerId !== null && ug.ownerId === world.humanPlayerId) {
          playSfx('launch');
        }
      }
      view.update(ug, world, this.content, alpha, nowMs);
    }
    for (const [id, view] of this.unitViews) {
      if (!present.has(id)) {
        // Arrival SFX: friendly = the human's group lands anywhere;
        // hostile = an enemy group lands on a human-owned node (alert cue).
        // AI-on-AI is silent so the audio channel stays useful as a
        // player-facing gameplay signal.
        let hostile = false;
        if (world.humanPlayerId !== null) {
          if (view.ownerId === world.humanPlayerId) {
            playSfx('arrive_friendly');
          } else {
            const target = world.nodes.get(view.toNodeId);
            if (target && target.ownerId === world.humanPlayerId) {
              playSfx('arrive_hostile');
              hostile = true;
            }
          }
        }
        // v2.9.2: spawn a faction-colored death-puff at the unit's
        // last position when the disappearance reads as a hostile
        // outcome — i.e. the group landed on a human-owned target
        // (defenders die), or the group was destroyed before
        // arriving (TowerInterceptSystem killed it). The latter is
        // detected by checking whether the engine's tower-shot
        // dedupe set saw a recent hit on this unit; for simplicity
        // here we ALSO spawn a puff whenever a non-human group
        // crosses into our territory and dies, OR whenever any
        // group disappears at a friendly-target node where combat
        // resolved (faction-mismatch crash). Concretely: spawn the
        // puff at the disappearance position colored by the
        // destroyed group's sourceFaction.
        const target = world.nodes.get(view.toNodeId);
        const destroyedByCombat = target && target.faction !== view.sourceFaction;
        if (hostile || destroyedByCombat) {
          this.spawnDeathPuff(
            view.lastWorldX,
            view.lastWorldY,
            view.sourceFaction as FactionId,
            performance.now(),
            world.visualScale,
          );
        }
        view.destroy();
        this.unitViews.delete(id);
      }
    }
  }

  // v2.9.2: spawn a faction-colored death-puff sprite at world coords.
  // Lifetime DEATH_PUFF_LIFE_MS; fades out + scales up slightly while
  // alive. No-op if the faction has no registered texture (e.g. neutral
  // — but neutral never sends units, so this branch shouldn't fire).
  private spawnDeathPuff(
    worldX: number,
    worldY: number,
    faction: FactionId,
    nowMs: number,
    visualScale: number,
  ): void {
    const tex = getDeathPuffTexture(faction);
    if (!tex) return;
    const sprite = new Sprite(tex);
    sprite.anchor.set(0.5, 0.7); // anchor low so the cloud sits above and the pool grounds
    // v2.9.4: size by LONG edge so the puff fits within unit silhouette
    // regardless of source aspect (current source is 137×192, taller
    // than wide). Scales with per-level visualScale.
    const targetLE = DEATH_PUFF_BASE_SIZE_PX * visualScale;
    const tw = tex.width;
    const th = tex.height;
    if (tw >= th) {
      sprite.width = targetLE;
      sprite.height = targetLE * (th / tw);
    } else {
      sprite.height = targetLE;
      sprite.width = targetLE * (tw / th);
    }
    sprite.position.set(worldX, worldY);
    this.particleLayer.addChild(sprite);
    this.deathPuffs.push({ x: worldX, y: worldY, birthMs: nowMs, texture: tex, sprite });
  }

  private drawDeathPuffs(nowMs: number): void {
    for (let i = this.deathPuffs.length - 1; i >= 0; i--) {
      const p = this.deathPuffs[i]!;
      const age = nowMs - p.birthMs;
      if (age > DEATH_PUFF_LIFE_MS) {
        this.particleLayer.removeChild(p.sprite);
        p.sprite.destroy();
        this.deathPuffs.splice(i, 1);
        continue;
      }
      const t = age / DEATH_PUFF_LIFE_MS;
      // v2.9.4: dropped the scale-up that peaked at 1.25 — the v2.9.3
      // pop made the puff visually larger than a unit at peak. Now
      // just alpha-fade and rise; scale stays at the spawn size.
      p.sprite.alpha = 1.0 - t;
      p.sprite.y = p.y - t * 6;
    }
  }

  // v2.9.2: spawn a spell-effect overlay at the target node. Freeze
  // is persistent (stays until the node is recaptured); other spells
  // are one-shot and animate in/hold/out over SPELL_OVERLAY_LIFE_MS.
  // v2.9.4: targetNodeId added — freeze needs it to detect when the
  // node has been recaptured (ownerId becomes non-null) so the
  // persistent overlay can tear down.
  spawnSpellOverlay(
    spellId: string,
    targetNodeId: string,
    worldX: number,
    worldY: number,
    nowMs: number,
  ): void {
    const tex = getSpellTexture(spellId as 'freeze' | 'starve' | 'sabotage');
    if (!tex) return;

    // Persistent overlays sit on the node while its spell-effect state holds:
    // freeze (node neutralized) and starve (active starve stacks). Sabotage
    // and any future one-shot spell animate over a fixed lifetime instead.
    const persistent = spellId === 'freeze' || spellId === 'starve';

    // Persistent: dedupe by target — if a freeze overlay already
    // exists for this node (shouldn't normally happen, since the
    // engine refuses to freeze an already-neutral node — but
    // defensive against double-fire), tear down the old one before
    // spawning the new.
    if (persistent) {
      for (let i = this.activeSpellOverlays.length - 1; i >= 0; i--) {
        const o = this.activeSpellOverlays[i]!;
        if (o.persistent && o.targetNodeId === targetNodeId) {
          this.beamLayer.removeChild(o.sprite);
          o.sprite.destroy();
          this.activeSpellOverlays.splice(i, 1);
        }
      }
    }

    const sprite = new Sprite(tex);
    sprite.anchor.set(0.5);
    const targetH = spellId === 'sabotage' ? SABOTAGE_OVERLAY_SIZE_PX : SPELL_OVERLAY_BASE_SIZE_PX;
    const ratio = tex.width / tex.height;
    sprite.height = targetH;
    sprite.width = targetH * ratio;
    sprite.position.set(worldX, worldY);
    // Persistent overlays show at full opacity immediately, no
    // build-in animation. One-shot overlays start at 0 and fade in.
    sprite.alpha = persistent ? 1 : 0;
    this.beamLayer.addChild(sprite);
    this.activeSpellOverlays.push({
      spellId,
      worldX,
      worldY,
      birthMs: nowMs,
      sprite,
      persistent,
      targetNodeId,
      lifeMs: persistent ? undefined : spellId === 'sabotage' ? SABOTAGE_OVERLAY_LIFE_MS : SPELL_OVERLAY_LIFE_MS,
    });
  }

  // v2.9.6: walk every node each frame; if a node's owner went from
  // non-null to null since the last frame, that's a freeze cast that
  // happened either via the InputController path (human cast — the
  // overlay may already exist via spawnSpellOverlay's call, and the
  // dedup loop in spawnSpellOverlay catches the duplicate) OR via an
  // AI cast (no InputController involvement; this is the only path
  // that catches it). Cleanup: remove nodes from the snapshot that
  // are no longer in the world (defensive — nodes don't get removed
  // in MVP, but future map-rotation features might).
  private observeFreezeTransitions(world: World, nowMs: number): void {
    for (const id of world.nodeOrder) {
      const node = world.nodes.get(id);
      if (!node) continue;
      const last = this.lastNodeOwners.get(id);
      const current = node.ownerId;
      // Transition non-null → null = the node was just frozen.
      // `last === undefined` (first observation) doesn't count — that
      // would false-trigger on naturally-neutral nodes at level load.
      if (last !== undefined && last !== null && current === null) {
        this.spawnSpellOverlay('freeze', id, node.position.x, node.position.y, nowMs);
      }
      this.lastNodeOwners.set(id, current);
    }
    // Defensive GC of stale entries.
    if (this.lastNodeOwners.size > world.nodes.size * 2) {
      for (const id of this.lastNodeOwners.keys()) {
        if (!world.nodes.has(id)) this.lastNodeOwners.delete(id);
      }
    }
  }

  // v2.11.1: ensure a persistent starve overlay exists for every node with
  // active starve stacks. State-driven (not edge-detected), so it covers
  // BOTH human and AI casts; the spawnSpellOverlay dedup keeps the human
  // cast (which also fires via the InputController) from double-spawning.
  // Teardown when stacks clear is handled in drawSpellOverlays.
  private observeStarveOverlays(world: World, nowMs: number): void {
    for (const id of world.nodeOrder) {
      const node = world.nodes.get(id);
      if (!node || node.starveStacks.length === 0) continue;
      const exists = this.activeSpellOverlays.some(
        (o) => o.persistent && o.spellId === 'starve' && o.targetNodeId === id,
      );
      if (!exists) {
        this.spawnSpellOverlay('starve', id, node.position.x, node.position.y, nowMs);
      }
    }
  }

  // v2.11.1: spawn one-shot overlays for spells the engine resolved since the
  // last frame (drains the buffer). Human casts are skipped — they already
  // spawned via the InputController callback. Today only sabotage needs this
  // (freeze + starve are caught by their state observers above); freeze/starve
  // entries are ignored here to avoid a duplicate one-shot.
  private ingestSpellCasts(events: SpellCastEvent[], world: World, nowMs: number): void {
    for (const ev of events) {
      if (ev.byHuman) continue;
      if (ev.spellId !== 'sabotage') continue;
      const node = world.nodes.get(ev.targetNodeId);
      if (!node) continue;
      this.spawnSpellOverlay(ev.spellId, ev.targetNodeId, node.position.x, node.position.y, nowMs);
    }
    // Drain — consumed exactly once.
    events.length = 0;
  }

  // v2.9.4: drawSpellOverlays takes the world so it can tear down
  // persistent overlays once the engine state that triggered them
  // has reverted (e.g. someone captures a frozen node).
  private drawSpellOverlays(nowMs: number, world: World): void {
    for (let i = this.activeSpellOverlays.length - 1; i >= 0; i--) {
      const o = this.activeSpellOverlays[i]!;

      if (o.persistent) {
        // Persistent overlays stay until the engine state that triggered
        // them reverts. Teardown signal differs per spell:
        //   freeze  — node recaptured (ownerId goes non-null again).
        //   starve  — all starve stacks cleared (drained out / captured).
        const node = o.targetNodeId ? world.nodes.get(o.targetNodeId) : null;
        const stillActive = !!node && (
          o.spellId === 'starve'
            ? node.starveStacks.length > 0
            : node.ownerId === null // freeze
        );
        if (!stillActive) {
          this.beamLayer.removeChild(o.sprite);
          o.sprite.destroy();
          this.activeSpellOverlays.splice(i, 1);
          continue;
        }
        // Keep sprite glued to the node — if a future feature lets nodes
        // move, the overlay tracks them. Today nodes are static.
        o.sprite.position.set(node.position.x, node.position.y);
        // Starve breathes gently so the wreath reads as "alive/draining";
        // freeze just sits.
        if (o.spellId === 'starve') {
          o.sprite.alpha = 0.78 + 0.12 * Math.sin(nowMs * 0.004);
        }
        continue;
      }

      // One-shot animated overlay (sabotage / future spells).
      const life = o.lifeMs ?? SPELL_OVERLAY_LIFE_MS;
      const age = nowMs - o.birthMs;
      if (age > life) {
        this.beamLayer.removeChild(o.sprite);
        o.sprite.destroy();
        this.activeSpellOverlays.splice(i, 1);
        continue;
      }
      const t = age / life;
      let alpha: number;
      let scale: number;
      if (o.spellId === 'sabotage') {
        // Snap in, sit at full opacity for most of the 5 s hold, then fade
        // out over the last ~15% — the ring "stays, then disappears".
        const fadeIn = 0.06;
        const fadeOut = 0.85;
        if (t < fadeIn) alpha = t / fadeIn;
        else if (t < fadeOut) alpha = 1;
        else alpha = 1 - (t - fadeOut) / (1 - fadeOut);
        scale = 0.98 + 0.05 * t; // barely-perceptible drift, no burst
      } else {
        // Legacy burst: scale up + ease in (30%), hold (40%), fade out (30%).
        if (t < 0.3) alpha = t / 0.3;
        else if (t < 0.7) alpha = 1;
        else alpha = 1 - (t - 0.7) / 0.3;
        scale = 0.6 + t * 0.7;
      }
      o.sprite.alpha = alpha;
      o.sprite.scale.set(scale);
    }
  }

  private drawHints(world: World, session: SessionState): void {
    this.hintGraphics.clear();

    if (session.drag) {
      const targetNode = session.drag.overTargetId
        ? world.nodes.get(session.drag.overTargetId) ?? null
        : null;
      const tipX = targetNode ? targetNode.position.x : session.drag.cursorPos.x;
      const tipY = targetNode ? targetNode.position.y : session.drag.cursorPos.y;
      for (const fromId of session.drag.fromNodeIds) {
        const from = world.nodes.get(fromId);
        if (!from) continue;
        const owner = from.ownerId
          ? world.players.find((p) => p.id === from.ownerId)
          : undefined;
        const color = owner ? colorFromHex(owner.color) : 0xffffff;
        // When dragging over an actual target, preview the cached path
        // polyline. While the cursor is mid-air, fall back to a straight
        // rubber-band to the cursor.
        if (targetNode) {
          const poly = this.polylineForPair(world, fromId, targetNode.id);
          if (poly === null) {
            // Unreachable — draw a faint X across the link to make it visible.
            this.hintGraphics
              .moveTo(from.position.x, from.position.y)
              .lineTo(tipX, tipY)
              .stroke({ color: 0xff5050, width: 1.5, alpha: 0.45 });
          } else {
            this.strokePolyline(poly, color, 1.5, 0.85);
          }
          this.hintGraphics
            .circle(targetNode.position.x, targetNode.position.y, 22)
            .stroke({ color, width: 2, alpha: 0.9 });
        } else {
          this.hintGraphics
            .moveTo(from.position.x, from.position.y)
            .lineTo(tipX, tipY)
            .stroke({ color, width: 1.5, alpha: 0.45 });
        }
      }
      return;
    }

    // Multi-select preview — when two or more nodes are selected and the
    // cursor is over a non-selected target, preview the click-to-send.
    if (
      session.selectedNodeIds.size >= 2 &&
      session.hoveredNodeId &&
      !session.selectedNodeIds.has(session.hoveredNodeId)
    ) {
      const hovered = world.nodes.get(session.hoveredNodeId);
      if (hovered) {
        for (const sid of session.selectedNodeIds) {
          const source = world.nodes.get(sid);
          if (!source) continue;
          const owner = source.ownerId
            ? world.players.find((p) => p.id === source.ownerId)
            : undefined;
          const color = owner ? colorFromHex(owner.color) : 0xffffff;
          const poly = this.polylineForPair(world, sid, hovered.id);
          if (poly === null) {
            this.hintGraphics
              .moveTo(source.position.x, source.position.y)
              .lineTo(hovered.position.x, hovered.position.y)
              .stroke({ color: 0xff5050, width: 1.5, alpha: 0.35 });
          } else {
            this.strokePolyline(poly, color, 1.5, 0.45);
          }
        }
        this.hintGraphics
          .circle(hovered.position.x, hovered.position.y, 22)
          .stroke({ color: 0xffffff, width: 2, alpha: 0.55 });
        return;
      }
    }

    if (session.hoveredNodeId) {
      const hovered = world.nodes.get(session.hoveredNodeId);
      if (hovered) {
        this.hintGraphics
          .circle(hovered.position.x, hovered.position.y, 26)
          .stroke({ color: 0xffffff, width: 1, alpha: 0.18 });
      }
    }
  }

  private strokePolyline(
    poly: { x: number; y: number }[],
    color: number,
    width: number,
    alpha: number,
  ): void {
    if (poly.length < 2) return;
    this.hintGraphics.moveTo(poly[0]!.x, poly[0]!.y);
    for (let i = 1; i < poly.length; i++) {
      this.hintGraphics.lineTo(poly[i]!.x, poly[i]!.y);
    }
    this.hintGraphics.stroke({ color, width, alpha, cap: 'round', join: 'round' });
  }

  private drawRipples(nowMs: number): void {
    this.rippleGraphics.clear();
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i]!;
      const age = nowMs - r.birthMs;
      if (age > RIPPLE_LIFE_MS) {
        this.ripples.splice(i, 1);
        continue;
      }
      const t = age / RIPPLE_LIFE_MS;
      const radius = RIPPLE_MAX_RADIUS * t;
      const a = (1 - t) * 0.5;
      this.rippleGraphics
        .circle(r.x, r.y, radius)
        .stroke({ color: 0xffffff, width: 1, alpha: a });
    }
  }

  // v2.9.1: scale the world container uniformly so the level's
  // declared (width × height) fits the host element while preserving
  // aspect ratio. Cheap to call every frame — Pixi's `resizeTo: host`
  // already drives `renderer.width/height` to match the host's CSS
  // size, so we just read those values and recompute the transform.
  // Centered letterboxing keeps the level visually framed on any
  // laptop aspect ratio.
  private fitWorldToHost(world: World): void {
    const w = this.app.renderer.width;
    const h = this.app.renderer.height;
    const mapW = world.level.map.width;
    const mapH = world.level.map.height;
    if (mapW <= 0 || mapH <= 0 || w <= 0 || h <= 0) return;
    // v2.11.3: fit the map PLUS a world-space margin so the per-node labels
    // that sit just OUTSIDE the map rectangle — the level numeral above each
    // node and the unit count below tower sprites — stay on-screen instead of
    // being clipped at the viewport edge when the map would otherwise fill it
    // edge-to-edge (the fullscreen "top/bottom cut off" bug). The map itself
    // stays centered; only the scale shrinks enough to letterbox the margin.
    const scale = Math.min(w / (mapW + MAP_FIT_MARGIN_PX * 2), h / (mapH + MAP_FIT_MARGIN_PX * 2));
    const offsetX = Math.round((w - mapW * scale) / 2);
    const offsetY = Math.round((h - mapH * scale) / 2);
    this.worldFitScale = scale;
    this.worldFitOffsetX = offsetX;
    this.worldFitOffsetY = offsetY;
    this.worldRoot.scale.set(scale);
    this.worldRoot.position.set(offsetX, offsetY);
  }

  // v2.11.3: forward transform (inverse of screenToWorld) — world coords →
  // canvas-CSS px. The DOM NodeInfoPanel uses this to anchor itself on the
  // hovered node; without it the panel used raw world coords and drifted
  // (too far + slightly left) as the fit scale diverged from 1.
  worldToScreen(wx: number, wy: number): Vec2 {
    return {
      x: wx * this.worldFitScale + this.worldFitOffsetX,
      y: wy * this.worldFitScale + this.worldFitOffsetY,
    };
  }

  get worldScale(): number {
    return this.worldFitScale || 1;
  }

  // Inverse of fitWorldToHost — convert canvas-CSS coords (as reported
  // by InputController.localCoords) back into the world coordinate
  // system the engine uses. Input layer calls this so cursor maths
  // remain identical to the v2.7.6 "no transform" branch from the
  // engine's POV; the responsive fit is invisible to gameplay code.
  screenToWorld(x: number, y: number): Vec2 {
    const s = this.worldFitScale || 1;
    return {
      x: (x - this.worldFitOffsetX) / s,
      y: (y - this.worldFitOffsetY) / s,
    };
  }

  private updateHud(world: World): void {
    // Win/lose stinger fires once on the transition out of 'playing'.
    if (world.status !== this.lastWorldStatus) {
      if (this.lastWorldStatus === 'playing' && world.status === 'won') {
        playSfx('win');
      } else if (this.lastWorldStatus === 'playing' && world.status === 'lost') {
        playSfx('lose');
      }
      this.lastWorldStatus = world.status;
    }

    // v2.10.2: the win/loss message moved to the themed DOM EndScreen
    // overlay (GameView). Keep the in-canvas statusText blank so the two
    // don't double up; the SFX stinger above still fires on the transition.
    if (this.statusText.text) this.statusText.text = '';
  }

  addClickRipple(x: number, y: number, nowMs: number): void {
    this.ripples.push({ x, y, birthMs: nowMs });
  }

  destroy(): void {
    for (const v of this.nodeViews.values()) v.destroy();
    for (const v of this.unitViews.values()) v.destroy();
    this.nodeViews.clear();
    this.unitViews.clear();
    this.selectionBoxView.destroy();
    if (this.app.canvas.parentElement === this.host) {
      this.host.removeChild(this.app.canvas);
    }
    this.app.destroy(true, { children: true });
  }
}
