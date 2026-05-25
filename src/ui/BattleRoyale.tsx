// BattleRoyale — skirmish setup screen (v2.11.0). Warcraft III "Frozen
// Throne" custom-game layout: a grid of maps on the left, and on the right
// a minimap preview of the selected map plus the player's setup (own unit
// type + global AI difficulty) and a Play button.
//
// Maps shown here are levels flagged `battleRoyale: true` (set via the dev
// editor). The chosen unit type overrides the human player's archetype and
// forces their faction to azure; the chosen difficulty overrides every AI
// on the map. None of this touches campaign progress (see GameView).

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSessionStore, type AIDifficulty } from '../store/sessionStore';
import { loadContent } from '../engine/content/ContentLoader';
import { playSfx } from '../audio/sfxPlayer';
import { ArchetypeIcon } from './archetypeIcons';
import {
  buttonStyle,
  chipSelectedStyle,
  chipStyle,
  levelButtonStyle,
  screenStyle,
  titleStyle,
} from './menuStyles';
import type { ArchetypeId, BiomeId, LevelDef } from '../engine/content/ContentLibrary';

// Deterministic chip order (matches the retired LevelSelect picker).
const ARCHETYPE_ORDER: ArchetypeId[] = ['infantry', 'archer', 'knight', 'cavalry', 'mage'];

const DIFFICULTIES: { id: AIDifficulty; label: string; blurb: string }[] = [
  { id: 'easy', label: 'Easy', blurb: 'Slow, passive — no spells.' },
  { id: 'normal', label: 'Normal', blurb: 'Balanced aggression + economy.' },
  { id: 'hard', label: 'Hard', blurb: 'Fast, aggressive, casts spells.' },
];

// Minimap biome floor tints (approximate the in-game biome palettes so the
// preview reads as the right terrain at a glance).
const BIOME_BG: Record<BiomeId, string> = {
  grass: '#3c5a34',
  desert: '#bda05e',
  snow: '#cdd8e4',
  jungle: '#244a2c',
  stone: '#54585f',
};

export function BattleRoyale() {
  const navigate = useSessionStore((s) => s.navigate);
  const startBattleRoyale = useSessionStore((s) => s.startBattleRoyale);
  const playerArchetype = useSessionStore((s) => s.playerStartArchetype);
  const setPlayerArchetype = useSessionStore((s) => s.setPlayerStartArchetype);
  const aiDifficulty = useSessionStore((s) => s.aiDifficulty);
  const setAIDifficulty = useSessionStore((s) => s.setAIDifficulty);

  const content = useMemo(() => loadContent(), []);
  const brMaps = useMemo(
    () =>
      Object.keys(content.levels)
        .map(Number)
        .filter((id) => content.levels[id]?.battleRoyale === true)
        .sort((a, b) => a - b),
    [content.levels],
  );

  const [selectedId, setSelectedId] = useState<number | null>(brMaps[0] ?? null);
  const selectedLevel = selectedId !== null ? content.levels[selectedId] ?? null : null;

  const aiCount = selectedLevel ? selectedLevel.players.filter((p) => p.type === 'ai').length : 0;
  const canPlay = selectedLevel !== null && playerArchetype !== null;

  return (
    <div style={screenStyle}>
      <button className="dt-btn" style={backButtonStyle} onClick={() => { playSfx('click'); navigate('menu'); }}>
        ← back
      </button>
      <div style={{ ...titleStyle, fontSize: 40, marginBottom: 2 }}>Battle Royale</div>
      <div style={subtitleStyle}>last banner standing</div>

      {brMaps.length === 0 ? (
        <div style={emptyStyle}>
          No Battle Royale maps yet. Flag a level as a Battle Royale map in the dev editor.
        </div>
      ) : (
        <div style={layoutStyle}>
          {/* ── Left: map picker grid ─────────────────────────────── */}
          <div style={leftPaneStyle}>
            <div style={paneHeadingStyle}>Maps</div>
            <div style={mapGridStyle}>
              {brMaps.map((id, idx) => {
                const selected = id === selectedId;
                return (
                  <button
                    key={id}
                    className="dt-level-btn"
                    title={content.levels[id]?.name}
                    onClick={() => { playSfx('click'); setSelectedId(id); }}
                    style={{
                      ...levelButtonStyle,
                      boxShadow: selected
                        ? '0 0 0 3px rgba(245,201,91,0.95), 0 0 16px rgba(245,201,91,0.55)'
                        : undefined,
                    }}
                  >
                    <span style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{idx + 1}</span>
                    <span style={{ fontSize: 8, color: '#e9d9b6', letterSpacing: '0.12em', lineHeight: 1 }}>MAP</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Right: preview + setup ────────────────────────────── */}
          <div style={rightPaneStyle}>
            <MapPreview level={selectedLevel} />
            <div style={mapInfoStyle}>
              <div style={mapNameStyle}>{selectedLevel?.name ?? '—'}</div>
              <div style={mapMetaStyle}>
                {selectedLevel
                  ? `${aiCount + 1} banners · ${selectedLevel.map.background} field`
                  : 'Select a map'}
              </div>
            </div>

            <div style={setupSectionStyle}>
              <div style={paneHeadingStyle}>Your unit type</div>
              <div style={chipRowStyle}>
                {ARCHETYPE_ORDER.map((aid) => {
                  const arch = content.archetypes[aid];
                  if (!arch) return null;
                  const selected = playerArchetype === aid;
                  return (
                    <button
                      key={aid}
                      className={selected ? 'dt-chip dt-chip-selected' : 'dt-chip'}
                      onClick={() => { playSfx('click'); setPlayerArchetype(aid); }}
                      style={selected ? chipSelectedStyle : chipStyle}
                      title={arch.description}
                    >
                      <span style={iconWrapStyle}><ArchetypeIcon id={aid} size={18} /></span>
                      <span>{arch.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={setupSectionStyle}>
              <div style={paneHeadingStyle}>AI difficulty</div>
              <div style={chipRowStyle}>
                {DIFFICULTIES.map((d) => {
                  const selected = aiDifficulty === d.id;
                  return (
                    <button
                      key={d.id}
                      className={selected ? 'dt-chip dt-chip-selected' : 'dt-chip'}
                      onClick={() => { playSfx('click'); setAIDifficulty(d.id); }}
                      style={selected ? chipSelectedStyle : chipStyle}
                      title={d.blurb}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              className="dt-btn"
              disabled={!canPlay}
              onClick={() => { if (canPlay && selectedId !== null) { playSfx('click'); startBattleRoyale(selectedId); } }}
              style={{
                ...buttonStyle,
                minWidth: 220,
                marginTop: 14,
                opacity: canPlay ? 1 : 0.4,
                cursor: canPlay ? 'pointer' : 'not-allowed',
              }}
            >
              {playerArchetype === null ? 'Pick a unit type' : 'Play'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Minimap preview ───────────────────────────────────────────────────
// Draws the selected level's terrain to scale on a small canvas: biome
// floor, walls, and nodes coloured by their owner's banner (neutral = grey).
// Like WC3's minimap thumbnail — no per-map screenshot assets needed.
const PREVIEW_W = 768;
const PREVIEW_H = 432;

function MapPreview({ level }: { level: LevelDef | null }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, PREVIEW_W, PREVIEW_H);

    if (!level) {
      ctx.fillStyle = '#1b1d24';
      ctx.fillRect(0, 0, PREVIEW_W, PREVIEW_H);
      return;
    }

    const mw = level.map.width;
    const mh = level.map.height;
    const scale = Math.min(PREVIEW_W / mw, PREVIEW_H / mh);
    const offX = (PREVIEW_W - mw * scale) / 2;
    const offY = (PREVIEW_H - mh * scale) / 2;
    const tx = (x: number) => offX + x * scale;
    const ty = (y: number) => offY + y * scale;

    // Biome floor.
    ctx.fillStyle = BIOME_BG[level.map.background] ?? '#2a2e36';
    ctx.fillRect(offX, offY, mw * scale, mh * scale);

    // Walls.
    ctx.strokeStyle = 'rgba(18, 14, 10, 0.8)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const w of level.terrain.walls) {
      if (w.points.length < 2) continue;
      ctx.beginPath();
      w.points.forEach((p, i) => (i === 0 ? ctx.moveTo(tx(p[0]), ty(p[1])) : ctx.lineTo(tx(p[0]), ty(p[1]))));
      ctx.stroke();
    }

    // Nodes — dots coloured by owning banner; bigger for higher-level nodes.
    for (const n of level.nodes) {
      const owner = n.ownerId ? level.players.find((p) => p.id === n.ownerId) : null;
      const color = owner?.color ?? '#8b8f99';
      const r = 6 + n.level * 2;
      ctx.beginPath();
      ctx.arc(tx(n.position[0]), ty(n.position[1]), r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.stroke();
    }
  }, [level]);

  return (
    <div style={previewFrameStyle}>
      <canvas ref={ref} width={PREVIEW_W} height={PREVIEW_H} style={previewCanvasStyle} />
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────
const backButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  position: 'fixed',
  top: 16,
  left: 16,
  margin: 0,
  minWidth: 0,
};

const subtitleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: '#c8cfdc',
  marginBottom: 22,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  textShadow: '0 1px 2px rgba(0,0,0,0.85)',
};

const layoutStyle: React.CSSProperties = {
  display: 'flex',
  gap: 20,
  alignItems: 'stretch',
  width: '92vw',
  maxWidth: 1180,
  maxHeight: '74vh',
};

const panelBaseStyle: React.CSSProperties = {
  background: 'rgba(16, 14, 22, 0.82)',
  border: '1px solid rgba(245, 201, 91, 0.28)',
  borderRadius: 10,
  padding: 16,
  boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
};

const leftPaneStyle: React.CSSProperties = {
  ...panelBaseStyle,
  width: 320,
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
};

const rightPaneStyle: React.CSSProperties = {
  ...panelBaseStyle,
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  minWidth: 0,
  overflowY: 'auto',
};

const paneHeadingStyle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: '#e9c873',
  marginBottom: 10,
  fontWeight: 700,
  textShadow: '0 1px 2px rgba(0,0,0,0.85)',
};

const mapGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: 10,
  overflowY: 'auto',
  justifyItems: 'center',
  paddingRight: 4,
};

const previewFrameStyle: React.CSSProperties = {
  width: '100%',
  border: '2px solid rgba(245, 201, 91, 0.45)',
  borderRadius: 8,
  overflow: 'hidden',
  background: '#15171c',
  boxShadow: 'inset 0 0 24px rgba(0,0,0,0.6)',
};

const previewCanvasStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  height: 'auto',
  aspectRatio: `${PREVIEW_W} / ${PREVIEW_H}`,
};

const mapInfoStyle: React.CSSProperties = {
  textAlign: 'center',
  margin: '12px 0 4px',
};

const mapNameStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 800,
  color: '#f3e8d0',
  textShadow: '0 1px 3px rgba(0,0,0,0.8)',
};

const mapMetaStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#aeb5c2',
  letterSpacing: '0.06em',
  marginTop: 2,
};

const setupSectionStyle: React.CSSProperties = {
  width: '100%',
  marginTop: 14,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
};

const chipRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  justifyContent: 'center',
};

const iconWrapStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 18,
  height: 18,
};

const emptyStyle: React.CSSProperties = {
  maxWidth: 460,
  textAlign: 'center',
  color: '#c8cfdc',
  fontSize: 15,
  lineHeight: 1.6,
  background: 'rgba(16, 14, 22, 0.82)',
  border: '1px solid rgba(245, 201, 91, 0.28)',
  borderRadius: 10,
  padding: 24,
};
