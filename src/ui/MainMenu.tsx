import { useSessionStore } from '../store/sessionStore';
import { playSfx } from '../audio/sfxPlayer';
import { buttonStyle, screenStyle, subtitleStyle, titleStyle } from './menuStyles';

const DEV = import.meta.env.DEV;

export function MainMenu() {
  const navigate = useSessionStore((s) => s.navigate);
  const go = (route: Parameters<typeof navigate>[0]) => {
    playSfx('click');
    navigate(route);
  };
  return (
    <div style={screenStyle}>
      <div style={titleStyle}>Dragon's Throne</div>
      <div style={subtitleStyle}>node capture · castle strategy</div>
      <button className="dt-btn" style={buttonStyle} onClick={() => go('levelSelect')}>Campaign</button>
      <button className="dt-btn" style={buttonStyle} onClick={() => go('battleRoyale')}>Battle Royale</button>
      <button className="dt-btn" style={buttonStyle} onClick={() => go('settings')}>Settings</button>
      <button className="dt-btn" style={buttonStyle} onClick={() => go('credits')}>Credits</button>
      {DEV && (
        <button className="dt-btn" style={buttonStyle} onClick={() => go('editor')}>
          Level Editor (dev)
        </button>
      )}
      <button className="dt-btn" style={buttonStyle} onClick={() => go('quit')}>Quit</button>
    </div>
  );
}
