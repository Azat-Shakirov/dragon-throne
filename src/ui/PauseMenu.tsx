import { useSessionStore } from '../store/sessionStore';
import { playSfx } from '../audio/sfxPlayer';
import { buttonStyle, cardStyle, titleStyle } from './menuStyles';

interface PauseMenuProps {
  onResume: () => void;
  onRestart: () => void;
}

export function PauseMenu({ onResume, onRestart }: PauseMenuProps) {
  const exitToMenu = useSessionStore((s) => s.exitToMenu);
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
      <div style={{ ...cardStyle, textAlign: 'center', minWidth: 280 }}>
        <div style={{ ...titleStyle, fontSize: 28, marginBottom: 18 }}>Paused</div>
        <button style={buttonStyle} onClick={() => { playSfx('click'); onResume(); }}>Resume</button>
        <button style={buttonStyle} onClick={() => { playSfx('click'); onRestart(); }}>Restart level</button>
        <button style={buttonStyle} onClick={() => { playSfx('click'); exitToMenu(); }}>Main menu</button>
      </div>
    </div>
  );
}
