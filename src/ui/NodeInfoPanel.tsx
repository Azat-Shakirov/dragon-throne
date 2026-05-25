// NodeInfoPanel — info card anchored above the currently-hovered
// node, with all of its actionable controls (upgrade, spell concoct,
// cancel concoction). Right-click no longer opens a separate menu;
// hover IS the menu.
//
// Visibility:
//   • Cursor over a node → panel shows for that node.
//   • Cursor over the panel itself → panel stays for the same node
//     (so the cursor can leave the node and click a button).
//   • Cursor over neither → after HIDE_DELAY_MS the panel disappears.
//     The delay is enough to span the small visual gap between the
//     node and the panel so quick cursor traversals don't dismiss it.

import { useEffect, useRef, useState } from 'react';
import type { GameEngine } from '../engine/GameEngine';
import type { SessionState } from '../render/SessionState';
import type { NodeId } from '../types';
import { playSfx } from '../audio/sfxPlayer';
import { metricsForType, NODE_SPRITE_SCALE_FACTOR } from '../render/shapes';
import {
  UnitsIcon,
  ProductionIcon,
  DefenseIcon,
  AttackIcon,
  RangeIcon,
  SpeedIcon,
  FlaskIcon,
  StarveIcon,
  SpellIcon,
} from './infoIcons';
// v2.9.7: in-game action buttons inherit the castle wood-plaque theme.
import { miniButtonStyle, THEME_FONT } from './menuStyles';

interface Props {
  engine: GameEngine;
  session: SessionState;
  // Polled value from GameView. May be null when nothing is hovered.
  hoveredNodeId: NodeId | null;
  // The PIXI canvas element — used to compute screen coords for the
  // anchor. Allowed to be null briefly during mount/unmount.
  canvasEl: HTMLCanvasElement | null;
}

const BASE_UNIT_SPEED_PX_PER_SEC = 90; // v2.7.3 — must match engine BASE_UNIT_SPEED.
const PANEL_WIDTH = 200;
// v2.9.9: dropped from 14 → 4 so the panel sits right above the node
// sprite instead of floating a chunky gap above it.
const PANEL_OFFSET_PX = 4;
const VIEWPORT_PAD = 8;
const HIDE_DELAY_MS = 180;

export function NodeInfoPanel({ engine, session, hoveredNodeId, canvasEl }: Props) {
  const [pinnedId, setPinnedId] = useState<NodeId | null>(null);
  const panelHoverRef = useRef(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [panelHeight, setPanelHeight] = useState(0);

  const cancelHide = () => {
    if (hideTimerRef.current !== null) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const scheduleHide = () => {
    cancelHide();
    hideTimerRef.current = setTimeout(() => {
      hideTimerRef.current = null;
      setPinnedId(null);
    }, HIDE_DELAY_MS);
  };

  // Hover changed: if a node is now hovered, pin it (and cancel any
  // pending hide). If not, start the hide countdown UNLESS the
  // cursor is currently over the panel itself.
  useEffect(() => {
    if (hoveredNodeId !== null) {
      cancelHide();
      setPinnedId(hoveredNodeId);
    } else if (!panelHoverRef.current) {
      scheduleHide();
    }
  }, [hoveredNodeId]);

  useEffect(() => () => cancelHide(), []);

  // Force a re-render every 250ms so live values (units, concoction
  // progress, bleed drain) refresh without React having to subscribe
  // to engine internals.
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 250);
    return () => clearInterval(id);
  }, []);

  // Track panel height so we can flip below the node when the
  // anchor doesn't have headroom. Recomputed each render via ref.
  useEffect(() => {
    if (panelRef.current) {
      const h = panelRef.current.offsetHeight;
      if (h !== panelHeight) setPanelHeight(h);
    }
  });

  if (!pinnedId) return null;
  const node = engine.world.nodes.get(pinnedId);
  if (!node) return null;

  const typeDef = engine.content.nodeTypes[node.nodeType];
  const lv = typeDef?.levels.find((l) => l.level === node.level);

  const owner = node.ownerId
    ? engine.world.players.find((p) => p.id === node.ownerId)
    : null;
  const ownerColor = owner ? owner.color : '#666';
  const ownerLabel = owner
    ? owner.id === engine.world.humanPlayerId
      ? 'You'
      : 'Enemy'
    : 'Neutral';

  const isOwn = node.ownerId === engine.world.humanPlayerId;
  const sendPenalty = typeDef?.sendSpeedPenalty ?? 1;
  const sendSpeed = Math.round(BASE_UNIT_SPEED_PX_PER_SEC * sendPenalty);

  // Spells available to a Lab at its current level.
  const spellsAvailable: string[] = lv?.unlockedSpells ?? [];

  // Anchor the panel above the node in viewport coords. If the node
  // sits too close to the top to fit the panel, flip below. Clamp
  // horizontally so it stays on-screen.
  const rect = canvasEl?.getBoundingClientRect();
  const nodeScreenX = (rect?.left ?? 0) + node.position.x;
  const nodeScreenY = (rect?.top ?? 0) + node.position.y;
  // v2.9.9: compute the actual sprite half-height from the same
  // formula NodeView uses (metricsForType × NODE_SPRITE_SCALE_FACTOR),
  // so the panel bottom sits at the exact top edge of THIS node's
  // sprite rather than a one-size-fits-all guess. Combined with
  // PANEL_OFFSET_PX = 4 the panel reads as "right above the node"
  // regardless of node type (house=61, barracks=84, lab=tower=76 at L1).
  const nodeMetrics = metricsForType(node.nodeType, node.level, engine.world.visualScale);
  const nodeHalfHeight = (nodeMetrics.size * NODE_SPRITE_SCALE_FACTOR[node.nodeType]) / 2;
  const panelH = panelHeight || 200;
  const aboveTop = nodeScreenY - nodeHalfHeight - PANEL_OFFSET_PX - panelH;
  const fitsAbove = aboveTop >= VIEWPORT_PAD;
  const top = fitsAbove
    ? aboveTop
    : nodeScreenY + nodeHalfHeight + PANEL_OFFSET_PX;
  const rawLeft = nodeScreenX - PANEL_WIDTH / 2;
  const maxLeft = (rect?.right ?? window.innerWidth) - PANEL_WIDTH - VIEWPORT_PAD;
  const minLeft = (rect?.left ?? 0) + VIEWPORT_PAD;
  const left = Math.max(minLeft, Math.min(maxLeft, rawLeft));

  // v2.9.1: compact icon-pill grid for the stat block. Each cell is
  // a small SVG glyph + numeric value; the grid wraps to keep the
  // panel narrow (~200 px). Tooltips on each cell carry the spelled-
  // out meaning.
  const pills: { key: string; icon: React.ReactNode; label: string; title: string; tone?: string }[] = [];

  pills.push({
    key: 'units',
    icon: <UnitsIcon />,
    label: `${Math.floor(node.units)}/${node.maxUnits}`,
    title: 'Units (current / max)',
  });

  if (lv?.productionRate !== undefined && lv.productionRate > 0) {
    pills.push({
      key: 'prod',
      icon: <ProductionIcon />,
      label: `${lv.productionRate.toFixed(1)}/s`,
      title: 'Production rate (units per second)',
    });
  }

  if (lv?.defenseRate !== undefined && lv.defenseRate > 0) {
    pills.push({
      key: 'def',
      icon: <DefenseIcon />,
      label: `÷${lv.defenseRate}`,
      title: 'Defense divisor on arriving enemy',
    });
  }

  if (lv?.attackRate !== undefined) {
    pills.push({
      key: 'atk',
      icon: <AttackIcon />,
      label: `${lv.attackRate}/s×${lv.attackDamage ?? 0}`,
      title: 'Attack rate × damage per shot',
    });
    pills.push({
      key: 'range',
      icon: <RangeIcon />,
      label: `${lv.attackRange}`,
      title: 'Attack range (px)',
    });
  }

  if (lv?.concoctSpeed !== undefined) {
    pills.push({
      key: 'concoct',
      icon: <FlaskIcon />,
      label: `${lv.concoctSpeed.toFixed(1)}×`,
      title: 'Spell concoct speed multiplier',
    });
  }

  pills.push({
    key: 'send',
    icon: <SpeedIcon />,
    label: `${sendSpeed}`,
    title: 'Send speed (px/sec)',
  });

  if (node.starveStacks.length > 0) {
    const drain = node.starveStacks.reduce((s, x) => s + x.drainPerSecond, 0);
    pills.push({
      key: 'starve',
      icon: <StarveIcon />,
      label: `−${drain}/s`,
      title: 'Starving — units drained per second',
      tone: '#9be29b',
    });
  }

  if (node.spellQueue) {
    const ready = node.spellQueue.state === 'ready';
    const sp = engine.content.spells[node.spellQueue.spellId];
    pills.push({
      key: 'spell',
      icon: <SpellIcon />,
      label: ready ? 'READY' : `${Math.round(node.spellQueue.progress * 100)}%`,
      title: `${sp?.name ?? node.spellQueue.spellId} — ${ready ? 'ready to cast' : 'concocting'}`,
      tone: '#c6a8ff',
    });
  }

  const faction = engine.content.factions[node.faction];

  return (
    <div
      ref={panelRef}
      onMouseEnter={() => {
        panelHoverRef.current = true;
        cancelHide();
      }}
      onMouseLeave={() => {
        panelHoverRef.current = false;
        // Hide unless the cursor is now back on a node (engine hover
        // will re-pin it on the next poll). Always schedule — the
        // hover-effect cancels if it sees a non-null hoveredNodeId.
        scheduleHide();
      }}
      style={{ ...panelStyle, top, left }}
    >
      <div style={headerStyle}>
        <span
          style={{ ...dotStyle, background: ownerColor }}
          title={faction ? faction.name : ownerLabel}
        />
        <span style={titleStyle}>
          {capitalize(node.nodeType)} L{node.level}
        </span>
        <span style={ownerLabelStyle}>{ownerLabel}</span>
      </div>

      <div style={pillGridStyle}>
        {pills.map((p) => (
          <div
            key={p.key}
            style={{ ...pillStyle, color: p.tone ?? '#e8e8e8' }}
            title={p.title}
          >
            <span style={pillIconStyle}>{p.icon}</span>
            <span style={pillValueStyle}>{p.label}</span>
          </div>
        ))}
      </div>

      {/* Action buttons — only on the human player's nodes. */}
      {isOwn && node.nodeType === 'lab' && (!node.spellQueue) && spellsAvailable.length > 0 && (
        <div style={sectionStyle}>
          <div style={sectionLabel}>Concoct</div>
          {spellsAvailable.map((sid) => {
            const spell = engine.content.spells[sid];
            if (!spell) return null;
            const affordable = node.units >= spell.unitCost;
            return (
              <button
                key={sid}
                onClick={() => {
                  if (!affordable) {
                    playSfx('click');
                    return;
                  }
                  const result = engine.startConcoction(node.id, sid);
                  playSfx(result.ok ? 'spell_concoct_start' : 'click');
                }}
                disabled={!affordable}
                style={{
                  ...miniButtonStyle,
                  opacity: affordable ? 1 : 0.45,
                  cursor: affordable ? 'pointer' : 'not-allowed',
                }}
              >
                <span>{spell.name}</span>
                <span style={costStyle}>{spell.unitCost}u</span>
              </button>
            );
          })}
        </div>
      )}

      {isOwn && node.nodeType === 'lab' && node.spellQueue && (
        <div style={sectionStyle}>
          <button
            onClick={() => { playSfx('click'); engine.cancelConcoction(node.id); }}
            style={{ ...miniButtonStyle, color: '#ffb38a', justifyContent: 'center' }}
          >
            Cancel concoction
          </button>
          {node.spellQueue.state === 'ready' && (
            <button
              onClick={() => {
                playSfx('click');
                session.targetingFromLabId = node.id;
              }}
              style={{ ...miniButtonStyle, color: '#9be29b', justifyContent: 'center' }}
            >
              Cast on click…
            </button>
          )}
        </div>
      )}

      {isOwn && renderUpgradeButtons(engine, node)}
    </div>
  );
}

function renderUpgradeButtons(engine: GameEngine, node: ReturnType<GameEngine['world']['nodes']['get']>) {
  if (!node) return null;
  const typeDef = engine.content.nodeTypes[node.nodeType];
  if (!typeDef) return null;

  const opts: { label: string; cost: number; onPick: () => void }[] = [];

  if (node.nodeType === 'house') {
    const targets = typeDef.upgradeTargets ?? [];
    for (const t of targets) {
      const td = engine.content.nodeTypes[t];
      const lv1 = td?.levels.find((l) => l.level === 1);
      if (!lv1 || lv1.upgradeCostFromHouse === undefined) continue;
      opts.push({
        label: `→ ${capitalize(t)} L1`,
        cost: lv1.upgradeCostFromHouse,
        onPick: () => engine.upgradeNode(node.id, t),
      });
    }
  } else {
    const next = typeDef.levels.find((l) => l.level === node.level + 1);
    if (next && next.upgradeCost !== undefined) {
      opts.push({
        label: `${capitalize(node.nodeType)} L${node.level} → L${next.level}`,
        cost: next.upgradeCost,
        onPick: () => engine.upgradeNode(node.id),
      });
    }
  }

  if (opts.length === 0) return null;

  return (
    <div style={sectionStyle}>
      <div style={sectionLabel}>Upgrade</div>
      {opts.map((o, i) => {
        const affordable = node.units >= o.cost;
        return (
          <button
            key={i}
            onClick={() => { playSfx('click'); if (affordable) o.onPick(); }}
            disabled={!affordable}
            style={{
              ...miniButtonStyle,
              opacity: affordable ? 1 : 0.45,
              cursor: affordable ? 'pointer' : 'not-allowed',
            }}
          >
            <span>{o.label}</span>
            <span style={costStyle}>{o.cost}u</span>
          </button>
        );
      })}
    </div>
  );
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1);
}

const panelStyle: React.CSSProperties = {
  position: 'fixed',
  width: PANEL_WIDTH,
  background: 'rgba(20, 22, 28, 0.96)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 6,
  padding: 10,
  fontFamily: THEME_FONT,
  fontSize: 12,
  color: '#e8e8e8',
  zIndex: 8,
  pointerEvents: 'auto',
  boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  marginBottom: 6,
  paddingBottom: 6,
  borderBottom: '1px solid rgba(255,255,255,0.10)',
};

const dotStyle: React.CSSProperties = {
  display: 'inline-block',
  width: 10,
  height: 10,
  borderRadius: '50%',
};

const titleStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: 13,
  flex: 1,
};

const ownerLabelStyle: React.CSSProperties = {
  fontSize: 11,
  opacity: 0.65,
};

const pillGridStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 4,
  marginBottom: 2,
};

const pillStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '3px 6px',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 4,
  fontSize: 11,
  fontWeight: 600,
  lineHeight: 1,
  fontVariantNumeric: 'tabular-nums',
};

const pillIconStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  opacity: 0.85,
};

const pillValueStyle: React.CSSProperties = {
  whiteSpace: 'nowrap',
};

const sectionStyle: React.CSSProperties = {
  marginTop: 8,
  paddingTop: 8,
  borderTop: '1px solid rgba(255,255,255,0.10)',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

const sectionLabel: React.CSSProperties = {
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  opacity: 0.55,
};

const costStyle: React.CSSProperties = {
  opacity: 0.7,
  marginLeft: 8,
};
