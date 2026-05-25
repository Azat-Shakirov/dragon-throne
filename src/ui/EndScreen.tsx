// EndScreen — victory / defeat modal shown over the game when a level
// resolves. v2.10.2: rendered on the themed parchment scroll (matching
// PauseMenu / TutorialOverlay). Victory offers Next Level (when one
// exists) + Restart + Main Menu; Defeat offers Restart + Main Menu
// (no "next" — you didn't win it).

import { playSfx } from '../audio/sfxPlayer';
import {
  buttonStyle,
  parchmentBackdropStyle,
  parchmentCardStyle,
  parchmentKickerStyle,
  parchmentTitleStyle,
} from './menuStyles';

interface EndScreenProps {
  status: 'won' | 'lost';
  levelName: string;
  hasNext: boolean;
  onNext: () => void;
  onRestart: () => void;
  onMenu: () => void;
  // v2.11.0: label for the bottom nav button. Campaign uses "Main menu";
  // Battle Royale uses "Battle Royale" (returns to the map picker).
  menuLabel?: string;
}

export function EndScreen({ status, levelName, hasNext, onNext, onRestart, onMenu, menuLabel = 'Main menu' }: EndScreenProps) {
  const won = status === 'won';
  return (
    <div style={parchmentBackdropStyle}>
      <div style={parchmentCardStyle}>
        <div style={parchmentKickerStyle}>{levelName}</div>
        <div style={{ ...parchmentTitleStyle, color: won ? '#2f6b34' : '#8a3526' }}>
          {won ? 'Victory!' : 'Defeat'}
        </div>
        <div style={subtitleStyle}>
          {won ? 'The throne is yours.' : 'Your banner has fallen.'}
        </div>
        <div style={buttonStackStyle}>
          {won && hasNext && (
            <button className="dt-btn" style={buttonStyle} onClick={() => { playSfx('click'); onNext(); }}>
              Next level
            </button>
          )}
          <button className="dt-btn" style={buttonStyle} onClick={() => { playSfx('click'); onRestart(); }}>
            Restart
          </button>
          <button className="dt-btn" style={buttonStyle} onClick={() => { playSfx('click'); onMenu(); }}>
            {menuLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

const subtitleStyle: React.CSSProperties = {
  fontSize: 14,
  color: '#4a3520',
  marginBottom: 22,
  textShadow: '0 1px 0 rgba(255, 240, 210, 0.3)',
};

const buttonStackStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
};
