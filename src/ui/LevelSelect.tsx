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
import { buttonStyle, linkStyle, screenStyle, titleStyle } from './menuStyles';
import type { ArchetypeId } from '../engine/content/ContentLibrary';

const STAR_FILLED = '★';
const STAR_EMPTY = '☆';

// Deterministic chip order. Hard-coded rather than derived from
// Object.keys(content.archetypes) so no accidental neutral / future
// non-playable archetype can sneak into the picker.
const ARCHETYPE_ORDER: ArchetypeId[] = ['infantry', 'archer', 'knight', 'cavalry', 'mage'];

// Azure (the user's locked color on challenge levels) — drives the
// selected-chip border + tint.
const AZURE_HEX = '#3da9fc';

export function LevelSelect() {
  const navigate = useSessionStore((s) => s.navigate);
  const startLevel = useSessionStore((s) => s.startLevel);
  const playerStartArchetype = useSessionStore((s) => s.playerStartArchetype);
  const setPlayerStartArchetype = useSessionStore((s) => s.setPlayerStartArchetype);
  const completedLevels = useProgressStore((s) => s.completedLevels);

  const content = useMemo(() => loadContent(), []);
  // Level 0 is the dev sandbox — hide it from the regular grid; reachable
  // only via the DEV-only Sandbox button below.
  const sortedIds = useMemo(
    () =>
      Object.keys(content.levels)
        .map(Number)
        .filter((id) => id !== 0)
        .sort((a, b) => a - b),
    [content.levels],
  );
  const hasSandbox = useMemo(
    () => content.levels[0] !== undefined,
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
                onClick={() => {
                  playSfx('click');
                  setPlayerStartArchetype(selected ? null : aid);
                }}
                style={{
                  ...chipStyle,
                  borderColor: selected ? AZURE_HEX : 'rgba(255,255,255,0.15)',
                  background: selected ? `${AZURE_HEX}20` : 'rgba(255,255,255,0.04)',
                  color: selected ? AZURE_HEX : '#e8e8e8',
                }}
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
            onClick={() => { playSfx('click'); setPlayerStartArchetype(null); }}
            style={{
              ...chipStyle,
              padding: '6px 10px',
              opacity: playerStartArchetype === null ? 0.45 : 1,
              cursor: playerStartArchetype === null ? 'default' : 'pointer',
            }}
            disabled={playerStartArchetype === null}
          >
            Reset
          </button>
        </div>
      )}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 12,
        maxWidth: 900,
        width: '90%',
        maxHeight: '70vh',
        overflowY: 'auto',
        padding: '4px 8px',
      }}>
        {sortedIds.map((id) => {
          const lv = content.levels[id]!;
          const unlocked = isLevelUnlocked(id, sortedIds, completedLevels);
          const stars = completedLevels[id]?.stars ?? 0;
          return (
            <button
              key={id}
              disabled={!unlocked}
              onClick={() => { playSfx('click'); if (unlocked) startLevel(id); }}
              style={{
                ...buttonStyle,
                minWidth: 0,
                padding: '20px 14px',
                opacity: unlocked ? 1 : 0.35,
                cursor: unlocked ? 'pointer' : 'not-allowed',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span style={{ fontSize: 26, fontWeight: 800 }}>{id}</span>
              <span style={{ fontSize: 13, color: '#bbc3cf' }}>{lv.name}</span>
              <span style={{ fontSize: 13, color: '#f5c95b', letterSpacing: '0.1em' }}>
                {[0, 1, 2].map((i) => (i < stars ? STAR_FILLED : STAR_EMPTY)).join('')}
              </span>
              {!unlocked && <span style={{ fontSize: 11, color: '#7a8090' }}>locked</span>}
            </button>
          );
        })}
      </div>
      {import.meta.env.DEV && hasSandbox && (
        <button
          style={{ ...linkStyle, color: '#9be29b', marginTop: 8 }}
          onClick={() => { playSfx('click'); startLevel(0); }}
        >
          ⚙ Sandbox (L0) — sprite preview
        </button>
      )}
      <button style={linkStyle} onClick={() => { playSfx('click'); navigate('menu'); }}>← back</button>
    </div>
  );
}

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
  color: '#8a92a0',
  marginRight: 4,
};

const chipStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 12px',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 4,
  fontSize: 12,
  color: '#e8e8e8',
  background: 'rgba(255,255,255,0.04)',
  cursor: 'pointer',
};

const iconWrapStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 18,
  height: 18,
};
