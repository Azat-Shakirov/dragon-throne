// LevelSelect — level grid with the challenge-tier archetype picker
// (v2.9.0). The picker chooses the player's unit type (Infantry /
// Archer / Knight / Cavalry / Mage), not banner color. Selecting any
// archetype also forces the human player's faction to 'azure' — the
// user always plays blue. Reset = fall back to the designer's choice.

import { useMemo } from 'react';
import { useSessionStore } from '../store/sessionStore';
import { useProgressStore, isLevelUnlocked } from '../store/progressStore';
import { loadContent } from '../engine/content/ContentLoader';
import { playSfx } from '../audio/sfxPlayer';
import { ArchetypeIcon } from './archetypeIcons';
import { buttonStyle, chipSelectedStyle, chipStyle, levelButtonStyle, screenStyle, titleStyle } from './menuStyles';
import type { ArchetypeId } from '../engine/content/ContentLibrary';

const STAR_FILLED = '★';
const STAR_EMPTY = '☆';

// Deterministic chip order. Hard-coded rather than derived from
// Object.keys(content.archetypes) so no accidental neutral / future
// non-playable archetype can sneak into the picker.
const ARCHETYPE_ORDER: ArchetypeId[] = ['infantry', 'archer', 'knight', 'cavalry', 'mage'];

export function LevelSelect() {
  const navigate = useSessionStore((s) => s.navigate);
  const startLevel = useSessionStore((s) => s.startLevel);
  const playerStartArchetype = useSessionStore((s) => s.playerStartArchetype);
  const setPlayerStartArchetype = useSessionStore((s) => s.setPlayerStartArchetype);
  const completedLevels = useProgressStore((s) => s.completedLevels);

  const content = useMemo(() => loadContent(), []);
  // Level 0 is the dev sandbox — hide it from the regular grid. The
  // v2.9.8 DEV-only Sandbox link was retired in v2.9.9; if you need
  // the sandbox during development, edit sessionStore's default route
  // to 'game' with selectedLevelId 0.
  const sortedIds = useMemo(
    () =>
      Object.keys(content.levels)
        .map(Number)
        .filter((id) => id !== 0)
        .sort((a, b) => a - b),
    [content.levels],
  );
  // Only show the challenge-tier picker once at least one level with
  // letPlayerChooseArchetype exists in the campaign.
  const hasChallengeLevels = useMemo(
    () => sortedIds.some((id) => content.levels[id]?.letPlayerChooseArchetype === true),
    [sortedIds, content.levels],
  );

  return (
    <div style={screenStyle}>
      {/* v2.9.9: back button anchored top-left at full menu-button size. */}
      <button className="dt-btn" style={backButtonStyle} onClick={() => { playSfx('click'); navigate('menu'); }}>
        ← back
      </button>
      <div style={{ ...titleStyle, fontSize: 36, marginBottom: 24 }}>Choose a Level</div>
      {hasChallengeLevels && (
        <div style={pickerRowStyle}>
          <span style={pickerLabelStyle}>Unit type for challenge levels (L31-40)</span>
          {ARCHETYPE_ORDER.map((aid) => {
            const arch = content.archetypes[aid];
            if (!arch) return null;
            const selected = playerStartArchetype === aid;
            return (
              <button
                key={aid}
                className={selected ? 'dt-chip dt-chip-selected' : 'dt-chip'}
                onClick={() => {
                  playSfx('click');
                  setPlayerStartArchetype(selected ? null : aid);
                }}
                style={selected ? chipSelectedStyle : chipStyle}
                title={arch.description}
              >
                <span style={iconWrapStyle}>
                  <ArchetypeIcon id={aid} size={18} />
                </span>
                <span>{arch.name}</span>
              </button>
            );
          })}
          <button
            className="dt-chip"
            onClick={() => { playSfx('click'); setPlayerStartArchetype(null); }}
            style={{
              ...chipStyle,
              opacity: playerStartArchetype === null ? 0.45 : 1,
              cursor: playerStartArchetype === null ? 'default' : 'pointer',
            }}
            disabled={playerStartArchetype === null}
          >
            Reset
          </button>
        </div>
      )}
      {/* v2.10.0: 10 columns spanning almost the full page, no scroll
          bar — the 40 campaign levels fit in 4 rows. justify-items
          center so each square tile sits centered in its cell. */}
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

const pickerRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  marginBottom: 20,
  alignItems: 'center',
  flexWrap: 'wrap',
  justifyContent: 'center',
  maxWidth: 720,
  width: '90%',
};

const pickerLabelStyle: React.CSSProperties = {
  fontSize: 12,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  // v2.9.8: bumped contrast + added text-shadow so the kicker reads
  // cleanly on top of the painterly menu-background.
  color: '#c8cfdc',
  marginRight: 4,
  textShadow: '0 1px 2px rgba(0,0,0,0.85)',
};

const iconWrapStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 18,
  height: 18,
};
