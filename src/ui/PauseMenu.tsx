// PauseMenu — modal shown when the player presses Esc mid-game.
// Engine stops ticking while open. v2.9.6: compact wooden buttons +
// inline Music / SFX sliders so the player can tune audio without
// leaving the game to visit Settings.

import { useSessionStore } from '../store/sessionStore';
import { useProgressStore } from '../store/progressStore';
import { playSfx } from '../audio/sfxPlayer';
import { cardStyle, compactButtonStyle, titleStyle } from './menuStyles';

interface PauseMenuProps {
  onResume: () => void;
  onRestart: () => void;
}

export function PauseMenu({ onResume, onRestart }: PauseMenuProps) {
  const exitToMenu = useSessionStore((s) => s.exitToMenu);
  const musicVolume = useProgressStore((s) => s.settings.musicVolume);
  const sfxVolume = useProgressStore((s) => s.settings.sfxVolume);
  const setMusicVolume = useProgressStore((s) => s.setMusicVolume);
  const setSfxVolume = useProgressStore((s) => s.setSfxVolume);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(6, 6, 10, 0.7)',
        zIndex: 50,
      }}
    >
      <div style={{ ...cardStyle, textAlign: 'center', minWidth: 280, maxWidth: 320 }}>
        <div style={{ ...titleStyle, fontSize: 26, marginBottom: 14 }}>Paused</div>

        <div style={sliderBlockStyle}>
          <Slider label="Music" value={musicVolume} onChange={setMusicVolume} />
          <Slider label="SFX" value={sfxVolume} onChange={setSfxVolume} />
        </div>

        <div style={buttonStackStyle}>
          <button style={compactButtonStyle} onClick={() => { playSfx('click'); onResume(); }}>
            Resume
          </button>
          <button style={compactButtonStyle} onClick={() => { playSfx('click'); onRestart(); }}>
            Restart level
          </button>
          <button style={compactButtonStyle} onClick={() => { playSfx('click'); exitToMenu(); }}>
            Main menu
          </button>
        </div>
      </div>
    </div>
  );
}

interface SliderProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
}

function Slider({ label, value, onChange }: SliderProps) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 12, color: '#bbc3cf' }}>{label}</span>
        <span style={{ fontSize: 11, color: '#7a8090' }}>{Math.round(value * 100)}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(value * 100)}
        onChange={(e) => onChange(Number.parseInt(e.target.value, 10) / 100)}
        style={{ width: '100%' }}
      />
    </div>
  );
}

const sliderBlockStyle: React.CSSProperties = {
  marginBottom: 14,
  padding: '8px 4px',
  borderTop: '1px solid rgba(120, 140, 180, 0.18)',
  borderBottom: '1px solid rgba(120, 140, 180, 0.18)',
};

const buttonStackStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
};
