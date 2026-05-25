import { useSessionStore } from '../store/sessionStore';
import { playSfx } from '../audio/sfxPlayer';
import { cardStyle, linkStyle, screenStyle, titleStyle } from './menuStyles';

export function Credits() {
  const navigate = useSessionStore((s) => s.navigate);
  return (
    <div style={screenStyle}>
      <div style={{ ...titleStyle, fontSize: 36, marginBottom: 24 }}>Credits</div>
      <div style={{ ...cardStyle, textAlign: 'center' }}>
        <p style={{ fontSize: 18, marginTop: 0 }}>Dragon's Throne</p>
        <p style={{ color: '#bbc3cf' }}>by Azat Shakirov</p>
        <hr style={{ border: 'none', borderTop: '1px solid rgba(120, 140, 180, 0.18)', margin: '16px 0' }} />
        <p style={{ color: '#bbc3cf', fontSize: 13, margin: '0 0 4px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Music
        </p>
        <p style={{ color: '#7a8090', fontSize: 13, margin: '0 0 12px' }}>
          “Field of Memories” by Waterflame
          <br />
          “Deuslower” by Vlad Bakutov
        </p>
        <p style={{ color: '#7a8090', fontSize: 13, marginBottom: 0 }}>
          Built on PixiJS, React, TypeScript, and Vite.
          <br />
          Thanks for playing.
        </p>
      </div>
      <button className="dt-btn" style={linkStyle} onClick={() => { playSfx('click'); navigate('menu'); }}>← back</button>
    </div>
  );
}
