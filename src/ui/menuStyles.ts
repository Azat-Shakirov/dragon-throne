// Shared menu styles — keeps the screens visually consistent without
// pulling in a CSS framework.
//
// v2.9.3: buttonStyle uses button-wood.png as a background-image so
// the menus carry the painterly castle aesthetic (vs the v2.7-era
// flat dark-rounded-rectangle). Text sits on top.
// v2.9.4: switched from background-image stretch to CSS border-image
// 9-slice so the metal frame + iron studs stay at fixed size and
// only the wood center stretches. Fixes the v2.9.3 horizontal-squash
// where 5:1 menu buttons stretched the 1.67:1 source asset.
// v2.9.4: levelButtonStyle uses the square level-button.png — better
// aspect for the square-ish LevelSelect grid tiles.

import type { CSSProperties } from 'react';
import buttonWoodUrl from '../render/sprites/ui/button-wood.png';
import levelButtonUrl from '../render/sprites/ui/level-button.png';

export const screenStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  width: '100vw',
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'radial-gradient(circle at 50% 35%, #14141c 0%, #06060a 70%)',
  color: '#eee',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  zIndex: 100,
};

export const titleStyle: CSSProperties = {
  fontSize: 48,
  fontWeight: 800,
  marginBottom: 12,
  letterSpacing: '0.02em',
  background: 'linear-gradient(180deg, #ffffff 0%, #6dd0ff 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

export const subtitleStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 500,
  color: '#9aa0aa',
  marginBottom: 36,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
};

// CSS border-image 9-slice numbers for the button-wood.png source
// (512×308 after rembg). The metal frame + iron studs occupy ~95 px
// from the top/bottom edges and ~75 px from the left/right edges.
// `fill` keeps the wood interior visible as the button background.
const BUTTON_WOOD_SLICE = '95 75 95 75 fill';
const BUTTON_WOOD_BORDER_WIDTH = 18; // visible CSS border thickness

export const buttonStyle: CSSProperties = {
  minWidth: 260,
  minHeight: 60,
  padding: '12px 24px',
  margin: '6px 0',
  fontSize: 16,
  fontWeight: 700,
  fontFamily: 'inherit',
  color: '#f3e8d0',
  // 9-slice the wood plaque. The transparent base border is required
  // for border-image to render in CSS; border-image-slice cuts the
  // source into 9 regions (4 corners stay at fixed size, 4 edges
  // stretch along their axis, center stretches both ways).
  background: 'transparent',
  border: `${BUTTON_WOOD_BORDER_WIDTH}px solid transparent`,
  borderImageSource: `url(${buttonWoodUrl})`,
  borderImageSlice: BUTTON_WOOD_SLICE,
  borderImageWidth: `${BUTTON_WOOD_BORDER_WIDTH}px`,
  borderImageRepeat: 'stretch',
  borderImageOutset: 0,
  borderRadius: 0,
  cursor: 'pointer',
  letterSpacing: '0.04em',
  textShadow: '0 1px 2px rgba(0,0,0,0.75), 0 0 4px rgba(0,0,0,0.4)',
};

export const buttonDangerStyle: CSSProperties = {
  ...buttonStyle,
  // Danger variant keeps the wood plaque but tints the label red.
  color: '#ffb3a8',
};

// v2.9.6: compact variant for overlay menus (PauseMenu). Smaller
// border-image-width keeps the iron studs proportional at the
// smaller button size. Same 9-slice source — just tuned for tight
// vertical real estate inside a pause card.
const BUTTON_WOOD_COMPACT_BORDER_WIDTH = 12;

export const compactButtonStyle: CSSProperties = {
  ...buttonStyle,
  minWidth: 180,
  minHeight: 42,
  padding: '6px 16px',
  fontSize: 14,
  border: `${BUTTON_WOOD_COMPACT_BORDER_WIDTH}px solid transparent`,
  borderImageWidth: `${BUTTON_WOOD_COMPACT_BORDER_WIDTH}px`,
};

// v2.9.7: miniButtonStyle — wood-themed action button sized for the
// in-game NodeInfoPanel (panel is 200 px wide, so each row button can
// only afford ~180 px of width). Same 9-slice wood plaque as buttonStyle
// but with a shorter border-image width so the iron studs stay visually
// proportional at this tiny size. Use this for ANY in-game button that
// sits inside a HUD panel (Concoct, Upgrade, Cancel, Cast on click).
const BUTTON_WOOD_MINI_BORDER_WIDTH = 9;

export const miniButtonStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  width: '100%',
  minHeight: 26,
  padding: '4px 8px',
  margin: 0,
  fontSize: 11,
  fontWeight: 700,
  fontFamily: 'inherit',
  color: '#f3e8d0',
  background: 'transparent',
  border: `${BUTTON_WOOD_MINI_BORDER_WIDTH}px solid transparent`,
  borderImageSource: `url(${buttonWoodUrl})`,
  borderImageSlice: BUTTON_WOOD_SLICE,
  borderImageWidth: `${BUTTON_WOOD_MINI_BORDER_WIDTH}px`,
  borderImageRepeat: 'stretch',
  borderImageOutset: 0,
  borderRadius: 0,
  cursor: 'pointer',
  letterSpacing: '0.02em',
  textAlign: 'left',
  textShadow: '0 1px 2px rgba(0,0,0,0.75), 0 0 4px rgba(0,0,0,0.4)',
};

// v2.9.6: levelButtonStyle uses the level-button.png as a simple
// background-image at fixed compact dimensions — the 9-slice approach
// stretched one axis whenever the parent grid cell wasn't perfectly
// square (and produced visibly oversized buttons in the v2.9.5 grid).
// Fixed 112×112 button, asset rendered at full size with backgroundSize
// '100% 100%'; the asset's natural 446:512 aspect squashes by ~13% in
// each axis, which is imperceptible on the wooden plaque texture.
// Justify-center on the grid cell so cells wider than the button
// don't stretch it.
// v2.9.7: bumped from 112 to 128 to give text more breathing room
// inside the inner wood plaque (iron frame eats ~22% per side, so the
// inner usable area at 128 is ~80 px square — enough for two-line
// names like "Three-Way Cold War" without overflowing the frame).
const LEVEL_BUTTON_SIZE = 128;
// Inner-padding values keep ALL text strictly within the central
// wood plaque (away from the iron frame + corner studs).
const LEVEL_BUTTON_INNER_INSET = 18;

export const levelButtonStyle: CSSProperties = {
  width: LEVEL_BUTTON_SIZE,
  height: LEVEL_BUTTON_SIZE,
  padding: `${LEVEL_BUTTON_INNER_INSET}px ${LEVEL_BUTTON_INNER_INSET}px`,
  margin: 0,
  fontSize: 10,
  fontWeight: 700,
  fontFamily: 'inherit',
  color: '#f3e8d0',
  backgroundImage: `url(${levelButtonUrl})`,
  backgroundSize: '100% 100%',
  backgroundRepeat: 'no-repeat',
  backgroundColor: 'transparent',
  border: 'none',
  borderRadius: 0,
  cursor: 'pointer',
  letterSpacing: '0.02em',
  lineHeight: 1.1,
  textShadow: '0 1px 2px rgba(0,0,0,0.75), 0 0 4px rgba(0,0,0,0.4)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 2,
  // Grid cell may be wider than the button — center inside the cell
  // instead of stretching.
  justifySelf: 'center',
  // Belt-and-suspenders: even if a future level name is absurdly long,
  // clip rather than spill over the iron frame.
  overflow: 'hidden',
};

export const linkStyle: CSSProperties = {
  marginTop: 32,
  fontSize: 13,
  color: '#7a8090',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  letterSpacing: '0.05em',
};

export const cardStyle: CSSProperties = {
  background: 'rgba(28, 30, 38, 0.88)',
  border: '1px solid rgba(120, 140, 180, 0.18)',
  borderRadius: 10,
  padding: 24,
  minWidth: 360,
  maxWidth: 520,
};
