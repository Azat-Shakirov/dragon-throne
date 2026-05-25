// TutorialOverlay — one-shot modal shown when a level starts that has
// a `tutorial` field. Engine is paused until the user clicks Start.
// Visible on top of the game canvas; clicking outside the card does
// nothing (the player must read + dismiss).
//
// v2.9.5: card rendered on the painterly parchment-banner.png scroll.
// border-image 9-slice with horizontal-only slice (0 / 80 / 0 / 80
// fill) keeps the wooden rollers at fixed size on the left + right
// edges and stretches the parchment middle to accommodate variable
// tutorial body height. The in-game ObjectiveBanner overlay was
// retired in this version — the level intro IS the parchment scroll.

import type { TutorialDef } from '../engine/content/ContentLibrary';
import { playSfx } from '../audio/sfxPlayer';
import { buttonStyle, THEME_FONT } from './menuStyles';
import parchmentUrl from '../render/sprites/ui/parchment-banner.png';

interface Props {
  tutorial: TutorialDef;
  levelName: string;
  onDismiss: () => void;
}

export function TutorialOverlay({ tutorial, levelName, onDismiss }: Props) {
  return (
    <div style={backdropStyle}>
      <div style={cardStyle}>
        <div style={kickerStyle}>{levelName}</div>
        <div style={titleStyle}>{tutorial.title}</div>
        <div style={bodyStyle}>{tutorial.body}</div>
        <button style={buttonStyle} onClick={() => { playSfx('click'); onDismiss(); }}>Start</button>
      </div>
    </div>
  );
}

const backdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(8, 10, 14, 0.78)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 50,
  fontFamily: THEME_FONT,
};

// 9-slice the parchment scroll. Source 512×419; the rollers occupy
// ~80px on the left and right edges. `0 80 0 80 fill` means no
// slice on top/bottom (parchment center stretches the full source
// width vertically — its torn edges read fine at any card height),
// 80px slice on left/right (wooden rollers stay at natural size),
// and `fill` keeps the parchment center visible as the card body.
const PARCHMENT_SLICE = '0 80 0 80 fill';
const PARCHMENT_BORDER_L = 60;
const PARCHMENT_BORDER_R = 60;

const cardStyle: React.CSSProperties = {
  width: 540,
  maxWidth: '92vw',
  // Padding clears the wooden rollers (~60px each side on screen) +
  // some breathing room for the parchment edges (top/bottom).
  padding: `36px 78px 32px 78px`,
  textAlign: 'center',
  color: '#3a2a1a',
  background: 'transparent',
  border: `0px solid transparent`,
  borderLeftWidth: `${PARCHMENT_BORDER_L}px`,
  borderRightWidth: `${PARCHMENT_BORDER_R}px`,
  borderImageSource: `url(${parchmentUrl})`,
  borderImageSlice: PARCHMENT_SLICE,
  borderImageWidth: `0 ${PARCHMENT_BORDER_R}px 0 ${PARCHMENT_BORDER_L}px`,
  borderImageRepeat: 'stretch',
  borderImageOutset: 0,
  borderRadius: 0,
  filter: 'drop-shadow(0 16px 32px rgba(0,0,0,0.55))',
};

const kickerStyle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: '#7a5a32',
  fontWeight: 700,
  marginBottom: 8,
};

const titleStyle: React.CSSProperties = {
  fontSize: 26,
  fontWeight: 800,
  marginBottom: 18,
  color: '#3a2a1a',
  textShadow: '0 1px 0 rgba(255, 240, 210, 0.45)',
};

const bodyStyle: React.CSSProperties = {
  fontSize: 14,
  lineHeight: 1.6,
  color: '#4a3520',
  marginBottom: 24,
  whiteSpace: 'pre-line',
  textShadow: '0 1px 0 rgba(255, 240, 210, 0.3)',
};
