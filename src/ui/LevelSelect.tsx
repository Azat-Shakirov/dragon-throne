// LevelSelect — Campaign level grid.
//
// v2.11.0: the challenge-tier archetype picker was REMOVED from this
// screen and moved to the Battle Royale setup screen (the unit-type
// choice now belongs to skirmish play, not the campaign ladder). Levels
// flagged `battleRoyale: true` are hidden here — they live in the BR grid.

import { useMemo } from 'react';
import { useSessionStore } from '../store/sessionStore';
import { useProgressStore, isLevelUnlocked } from '../store/progressStore';
import { loadContent } from '../engine/content/ContentLoader';
import { playSfx } from '../audio/sfxPlayer';
import { buttonStyle, levelButtonStyle, screenStyle, titleStyle } from './menuStyles';

const STAR_FILLED = '★';
const STAR_EMPTY = '☆';

export function LevelSelect() {
  const navigate = useSessionStore((s) => s.navigate);
  const startLevel = useSessionStore((s) => s.startLevel);
  const completedLevels = useProgressStore((s) => s.completedLevels);

  const content = useMemo(() => loadContent(), []);
  // Level 0 is the dev sandbox — hide it from the regular grid. Battle
  // Royale maps (battleRoyale: true) are also hidden — they're shown in
  // the dedicated BR grid, not the campaign ladder. If you need the
  // sandbox during development, set sessionStore's default route to
  // 'game' with selectedLevelId 0.
  const sortedIds = useMemo(
    () =>
      Object.keys(content.levels)
        .map(Number)
        .filter((id) => id !== 0 && !content.levels[id]?.battleRoyale)
        .sort((a, b) => a - b),
    [content.levels],
  );

  return (
    <div style={screenStyle}>
      {/* v2.9.9: back button anchored top-left at full menu-button size. */}
      <button className="dt-btn" style={backButtonStyle} onClick={() => { playSfx('click'); navigate('menu'); }}>
        ← back
      </button>
      <div style={{ ...titleStyle, fontSize: 36, marginBottom: 24 }}>Choose a Level</div>
      {/* v2.10.0: 10 columns spanning almost the full page, no scroll
          bar — the campaign levels fit in 4 rows. justify-items center
          so each square tile sits centered in its cell. */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(10, 1fr)',
        gap: 10,
        width: '96vw',
        maxWidth: 1700,
        justifyItems: 'center',
        padding: '4px 8px',
      }}>
        {sortedIds.map((id) => {
          const unlocked = isLevelUnlocked(id, sortedIds, completedLevels);
          const stars = completedLevels[id]?.stars ?? 0;
          return (
            <button
              key={id}
              className="dt-level-btn"
              disabled={!unlocked}
              onClick={() => { playSfx('click'); if (unlocked) startLevel(id); }}
              style={{
                ...levelButtonStyle,
                opacity: unlocked ? 1 : 0.35,
                cursor: unlocked ? 'pointer' : 'not-allowed',
              }}
            >
              {/* v2.10.2: tiles show just the big number + stars (level name
                  removed — it crowded the small plaque). */}
              <span style={{ fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{id}</span>
              <span style={{ fontSize: 12, color: '#f5c95b', letterSpacing: '0.06em', lineHeight: 1 }}>
                {[0, 1, 2].map((i) => (i < stars ? STAR_FILLED : STAR_EMPTY)).join('')}
              </span>
              {!unlocked && <span style={{ fontSize: 8, color: '#bbc3cf', lineHeight: 1 }}>locked</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const backButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  position: 'fixed',
  top: 16,
  left: 16,
  margin: 0,
  // Keep auto width so the "← back" label hugs without the 200-px
  // minimum sprawling across the corner.
  minWidth: 0,
};
