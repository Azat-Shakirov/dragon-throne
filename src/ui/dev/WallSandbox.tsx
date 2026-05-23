// WallSandbox — DEV-only A/B compare of the v2.9.2 wall PNG candidates
// against the biome floors they're meant for. Renders four panels:
//
//   row 1: grass biome floor + primary candidate (wall-grass.png)
//   row 2: grass biome floor + alt candidate    (wall-grass-1.png)
//   row 3: desert biome floor + primary         (wall-desert.png)
//   row 4: desert biome floor + alt             (wall-desert-1.png)
//
// Each panel uses the production-path bbox-placement: a fixed-shape
// polyline (the same one across panels for direct comparison) is
// rendered as a Sprite stretched to the polyline's bbox + PAD —
// matching PixiRenderer.syncWalls' v2.9.2 branch. Lets the author
// pick which candidate ships as the production filename without
// having to play through a real level.
//
// Reached via the ?walls URL flag (see App.tsx). DEV-gated.

import { useEffect, useRef } from 'react';
import { Application, Container, Graphics, Sprite, Text } from 'pixi.js';
import { useSessionStore } from '../../store/sessionStore';
import { buttonStyle } from '../menuStyles';
import { loadBiomeTextures, getBiomeTexture } from '../../render/sprites/biomeSprites';
import {
  loadWallTextures,
  loadWallAltTextures,
  getWallTexture,
  getWallAltTexture,
} from '../../render/sprites/wallSprites';
import type { BiomeId } from '../../engine/content/ContentLibrary';

interface Panel {
  biome: BiomeId;
  variant: 'primary' | 'alt';
  label: string;
}

const PANELS: Panel[] = [
  { biome: 'grass',  variant: 'primary', label: 'grass + wall-grass.png (primary)' },
  { biome: 'grass',  variant: 'alt',     label: 'grass + wall-grass-1.png (alt)' },
  { biome: 'desert', variant: 'primary', label: 'desert + wall-desert.png (primary)' },
  { biome: 'desert', variant: 'alt',     label: 'desert + wall-desert-1.png (alt)' },
];

// Shared sample polyline — same shape on every panel so the comparison
// is apples-to-apples. Coordinates are in panel-local space.
const SAMPLE_WALL: Array<[number, number]> = [
  [120, 220],
  [260, 200],
  [380, 240],
  [520, 220],
  [640, 250],
  [760, 230],
];

const PANEL_W = 880;
const PANEL_H = 320;
const PANEL_GAP = 16;
const LABEL_H = 32;
const PADDING_X = 24;
const PADDING_Y = 24;
const BIOME_ALPHA = 0.92;
const BBOX_PAD = 14;

const CANVAS_W = PANEL_W + PADDING_X * 2;
const CANVAS_H =
  (PANEL_H + LABEL_H) * PANELS.length + PANEL_GAP * (PANELS.length - 1) + PADDING_Y * 2;

export function WallSandbox() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const navigate = useSessionStore((s) => s.navigate);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let app: Application | null = null;

    (async () => {
      const a = new Application();
      await a.init({
        background: '#0a0a0a',
        width: CANVAS_W,
        height: CANVAS_H,
        antialias: true,
        autoDensity: true,
        resolution: window.devicePixelRatio,
      });
      if (cancelled) {
        a.destroy(true, { children: true });
        return;
      }
      host.appendChild(a.canvas);
      app = a;

      await Promise.all([loadBiomeTextures(), loadWallTextures(), loadWallAltTextures()]);
      if (cancelled) return;

      for (let i = 0; i < PANELS.length; i++) {
        const panel = PANELS[i]!;
        const panelY = PADDING_Y + i * (PANEL_H + LABEL_H + PANEL_GAP);
        const root = new Container();
        root.position.set(PADDING_X, panelY);
        a.stage.addChild(root);

        // Panel background frame.
        const frame = new Graphics();
        frame
          .rect(0, 0, PANEL_W, PANEL_H + LABEL_H)
          .fill({ color: 0x141821, alpha: 0.85 })
          .rect(0, 0, PANEL_W, PANEL_H + LABEL_H)
          .stroke({ color: 0x2a2f3a, width: 1 });
        root.addChild(frame);

        // Label strip.
        const label = new Text({
          text: panel.label,
          style: {
            fontFamily: 'system-ui, sans-serif',
            fontSize: 13,
            fill: 0xcfd3dc,
            fontWeight: '600',
          },
        });
        label.position.set(12, 8);
        root.addChild(label);

        // Floor.
        const floorTex = getBiomeTexture(panel.biome);
        if (floorTex) {
          const floor = new Sprite(floorTex);
          floor.x = 0;
          floor.y = LABEL_H;
          floor.width = PANEL_W;
          floor.height = PANEL_H;
          floor.alpha = BIOME_ALPHA;
          root.addChild(floor);
        }

        // Wall sprite — bbox placement (matches PixiRenderer.syncWalls).
        const wallTex =
          panel.variant === 'primary'
            ? getWallTexture(panel.biome)
            : getWallAltTexture(panel.biome);
        if (wallTex) {
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          for (const [x, y] of SAMPLE_WALL) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
          const w = Math.max(maxX - minX + BBOX_PAD * 2, 28);
          const h = Math.max(maxY - minY + BBOX_PAD * 2, 28);
          const sprite = new Sprite(wallTex);
          sprite.x = minX - BBOX_PAD;
          sprite.y = LABEL_H + (minY - BBOX_PAD);
          sprite.width = w;
          sprite.height = h;
          root.addChild(sprite);
        } else {
          const missing = new Text({
            text: '(no texture loaded)',
            style: { fontFamily: 'monospace', fontSize: 11, fill: 0xff8a8a },
          });
          missing.position.set(12, LABEL_H + PANEL_H / 2 - 6);
          root.addChild(missing);
        }

        // Polyline overlay — thin debug stroke showing the engine's
        // actual wall path (PathSystem clearance line) inside the
        // sprite. Helps the author judge how loose the bbox is.
        const debug = new Graphics();
        debug.moveTo(SAMPLE_WALL[0]![0], LABEL_H + SAMPLE_WALL[0]![1]);
        for (let j = 1; j < SAMPLE_WALL.length; j++) {
          debug.lineTo(SAMPLE_WALL[j]![0], LABEL_H + SAMPLE_WALL[j]![1]);
        }
        debug.stroke({ color: 0xffd166, width: 1, alpha: 0.6, cap: 'round' });
        root.addChild(debug);
      }
    })();

    return () => {
      cancelled = true;
      if (app) {
        if (app.canvas.parentElement === host) {
          host.removeChild(app.canvas);
        }
        app.destroy(true, { children: true });
      }
    };
  }, []);

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'auto' }}>
      <div style={{ padding: 16 }}>
        <button onClick={() => navigate('menu')} style={buttonStyle}>
          ← Menu
        </button>
        <span style={{ marginLeft: 12, color: '#a0a4ad', fontSize: 12 }}>
          Yellow stroke = engine polyline (PathSystem clearance). Sprite = bbox-placed
          PNG (PixiRenderer.syncWalls v2.9.2). Tell Claude which row wins; the loser's
          PNG can be deleted.
        </span>
      </div>
      <div ref={hostRef} style={{ display: 'flex', justifyContent: 'center' }} />
    </div>
  );
}
