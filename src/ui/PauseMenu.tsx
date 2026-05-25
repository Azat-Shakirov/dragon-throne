// PauseMenu — modal shown when the player presses Esc mid-game.
// Engine stops ticking while open. v2.10.2: rendered on the themed
// parchment scroll (matching TutorialOverlay / EndScreen) with wood
// buttons + inline Music / SFX sliders so the player can tune audio
// without leaving the game to visit Settings.

import { useSessionStore } from '../store/sessionStore';
import { useProgressStore } from '../store/progressStore';
import { playSfx } from '../audio/sfxPlayer';
import {
  compactButtonStyle,
  parchmentBackdropStyle,
  parchmentCardStyle,
  parchmentTitleStyle,
} from './menuStyles';

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
    <div style={parchmentBackdropStyle}>
      <div style={parchmentCardStyle}>
        <div style={parchmentTitleStyle}>Paused</div>

        <div style={sliderBlockStyle}>
          <Slider label="Music" value={musicVolume} onChange={setMusicVolume} />
          <Slider label="SFX" value={sfxVolume} onChange={setSfxVolume} />
        </div>

        <div style={buttonStackStyle}>
          <button className="dt-btn" style={compactButtonStyle} onClick={() => { playSfx('click'); onResume(); }}>
            Resume
          </button>
          <button className="dt-btn" style={compactButtonStyle} onClick={() => { playSfx('click'); onRestart(); }}>
            Restart level
          </button>
          <button className="dt-btn" style={compactButtonStyle} onClick={() => { playSfx('click'); exitToMenu(); }}>
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
        <span style={{ fontSize: 13, color: '#4a3520', fontWeight: 700 }}>{label}</span>
        <span style={{ fontSize: 12, color: '#7a5a32' }}>{Math.round(value * 100)}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(value * 100)}
        onChange={(e) => onChange(Number.parseInt(e.target.value, 10) / 100)}
        style={{ width: '100%', accentColor: '#7a5a32' }}
      />
    </div>
  );
}

const sliderBlockStyle: React.CSSProperties = {
  marginBottom: 16,
  padding: '10px 4px',
  borderTop: '1px solid rgba(90, 60, 30, 0.35)',
  borderBottom: '1px solid rgba(90, 60, 30, 0.35)',
};

const buttonStackStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
};
