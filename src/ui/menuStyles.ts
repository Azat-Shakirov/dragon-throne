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

// 9-slice for level-button.png (square, 446×512 after rembg). Metal
// corners are large + square; bigger slice values than the menu button.
const LEVEL_BUTTON_SLICE = '110 110 110 110 fill';
const LEVEL_BUTTON_BORDER_WIDTH = 20;

// Square tile button for LevelSelect grid. CSS aspect-ratio: 1
// forces height = width regardless of the grid cell's natural
// width — the v2.9.4 build was rectangular because grid cells were
// ~200×124. The level-button.png source is square, so a square
// tile gives a 9-slice without distortion in either axis.
export const levelButtonStyle: CSSProperties = {
  width: '100%',
  aspectRatio: '1 / 1',
  minWidth: 0,
  padding: '14px 12px',
  margin: 0,
  fontSize: 13,
  fontWeight: 700,
  fontFamily: 'inherit',
  color: '#f3e8d0',
  background: 'transparent',
  border: `${LEVEL_BUTTON_BORDER_WIDTH}px solid transparent`,
  borderImageSource: `url(${levelButtonUrl})`,
  borderImageSlice: LEVEL_BUTTON_SLICE,
  borderImageWidth: `${LEVEL_BUTTON_BORDER_WIDTH}px`,
  borderImageRepeat: 'stretch',
  borderImageOutset: 0,
  borderRadius: 0,
  cursor: 'pointer',
  letterSpacing: '0.04em',
  textShadow: '0 1px 2px rgba(0,0,0,0.75), 0 0 4px rgba(0,0,0,0.4)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
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
