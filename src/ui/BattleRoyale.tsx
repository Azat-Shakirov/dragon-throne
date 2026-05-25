// BattleRoyale — placeholder screen for the upcoming Battle Royale
// section. The mode itself is unbuilt (v2.10.0); this stub gives the
// Main-menu "Battle Royale" button a destination instead of a dead
// click. Replace the body with the real mode UI when it ships.

import { useSessionStore } from '../store/sessionStore';
import { playSfx } from '../audio/sfxPlayer';
import { buttonStyle, cardStyle, screenStyle, subtitleStyle, titleStyle } from './menuStyles';

export function BattleRoyale() {
  const navigate = useSessionStore((s) => s.navigate);
  return (
    <div style={screenStyle}>
      <div style={{ ...titleStyle, fontSize: 40, marginBottom: 8 }}>Battle Royale</div>
      <div style={subtitleStyle}>last banner standing</div>
      <div style={{ ...cardStyle, textAlign: 'center' }}>
        <p style={{ fontSize: 18, margin: '0 0 8px' }}>Coming soon…</p>
        <p style={{ color: '#9aa0aa', fontSize: 13, margin: 0 }}>
          A free-for-all mode is in the works.
          <br />
          For now, sharpen your blade in the Campaign.
        </p>
      </div>
      <button className="dt-btn" style={{ ...buttonStyle, marginTop: 24 }} onClick={() => { playSfx('click'); navigate('menu'); }}>
        ← back
      </button>
    </div>
  );
}
