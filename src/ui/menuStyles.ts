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
// v2.9.8: menu/intro buttons retuned to mini-button proportions (user
// preferred the tighter wood plaque feel of the in-game HUD buttons).
// menu-background.png wired into screenStyle as a full-screen painterly
// backdrop with a darkening overlay so the wood UI reads cleanly.

import type { CSSProperties } from 'react';
import buttonWoodUrl from '../render/sprites/ui/button-wood.png';
import levelButtonUrl from '../render/sprites/ui/level-button.png';
import menuBackgroundUrl from '../render/sprites/ui/menu-background.png';
import parchmentUrl from '../render/sprites/ui/parchment-banner.png';

// v2.10.1: game-wide theme font (IM Fell English, an antique printing-press
// serif). Declared as @font-face in index.html and set on <body> so the DOM
// inherits it; this constant mirrors that stack for the inline-styled
// components that hardcode a fontFamily. Falls back to a serif while the
// woff2 loads / if it's unavailable. In-canvas PixiJS number labels and the
// DEV-only sandboxes keep a clean sans (serif numerals read poorly tiny, and
// WebGL text needs separate font-loading plumbing).
export const THEME_FONT = "'IM Fell English', Georgia, 'Times New Roman', serif";

// v2.9.8: layered backgrounds — the dark radial gradient sits ON TOP
// of the painterly menu image as a darkening veil so the white title
// + warm wood buttons stay legible. Background-size 'cover' so the
// image fills the viewport on any aspect; positioned to bias the
// central castle vertically a bit higher (the image's focal point
// sits slightly above center).
export const screenStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  width: '100vw',
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundImage: `linear-gradient(180deg, rgba(6,6,10,0.55) 0%, rgba(6,6,10,0.75) 100%), url(${menuBackgroundUrl})`,
  backgroundSize: 'cover, cover',
  backgroundPosition: 'center, center',
  backgroundRepeat: 'no-repeat, no-repeat',
  color: '#eee',
  fontFamily: THEME_FONT,
  zIndex: 100,
};

export const titleStyle: CSSProperties = {
  fontSize: 52,
  fontWeight: 800,
  marginBottom: 12,
  letterSpacing: '0.03em',
  fontFamily: THEME_FONT,
  // v2.10.1: warm gold gradient (was a cool white→azure gradient that read
  // as off-theme against the castle aesthetic). Gold-on-parchment matches
  // the wood-and-banner UI.
  background: 'linear-gradient(180deg, #ffe9b0 0%, #c9912f 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
  textShadow: '0 2px 6px rgba(0,0,0,0.45)',
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
// v2.9.8: menu buttonStyle dropped from border 18 → 11 and minWidth
// 260→200 / minHeight 60→44 / fontSize 16→14 / padding 12×24 → 6×16.
// The user preferred the in-game mini-button look (proportionally
// thinner iron frame, more compact). Border-image-width scales to
// keep the iron studs the right visual weight at this smaller size.
const BUTTON_WOOD_BORDER_WIDTH = 11;

export const buttonStyle: CSSProperties = {
  minWidth: 200,
  minHeight: 44,
  padding: '6px 18px',
  margin: '5px 0',
  fontSize: 14,
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

// v2.9.6 → v2.9.8: compact variant for overlay menus (PauseMenu).
// Now identical to buttonStyle (the v2.9.8 retune collapsed both
// down to the same proportionally-tight wood plaque). Kept as a
// separate export so callsites can semantically opt into the
// "overlay menu" variant — if they later need to diverge again it's
// one line to change here without touching call sites.
export const compactButtonStyle: CSSProperties = {
  ...buttonStyle,
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
// inside the inner wood plaque (iron frame eats ~22% per side).
// v2.10.0: the grid is now 10 columns spanning ~96vw with no scroll,
// so tiles size to their grid cell (width 100% + aspect-ratio 1/1)
// instead of a fixed pixel size. On a 1280–1920 viewport each tile
// lands roughly 120–180 px square — same ballpark as the old 128, so
// the text proportions still read. maxWidth caps it on ultra-wide
// monitors so a row of 10 doesn't balloon into oversized plaques.
// v2.10.1: shrunk from 150 → 104 so the 10-wide grid reads as compact
// tiles with breathing room between them rather than big plaques filling
// every cell. Tile fonts dropped to match (see LevelSelect inline sizes).
const LEVEL_BUTTON_MAX_SIZE = 104;
// v2.9.8: symmetric padding. The level-button.png wood plaque IS
// geometrically centered (verified via Pillow column-scan of the
// 446×512 source: inner-wood vertical bounds ~y=221–353 → center
// y=287, asset center y=256 — essentially centered modulo the
// corner-stud weighting). With `justify-content: center` the
// number+name+stars stack sits on the wood midline at all tile
// sizes without an asymmetric kludge.
const LEVEL_BUTTON_PADDING_V = 12;
const LEVEL_BUTTON_PADDING_X = 10;

export const levelButtonStyle: CSSProperties = {
  width: '100%',
  maxWidth: LEVEL_BUTTON_MAX_SIZE,
  // Square tiles regardless of how wide the grid cell ends up.
  aspectRatio: '1 / 1',
  boxSizing: 'border-box',
  padding: `${LEVEL_BUTTON_PADDING_V}px ${LEVEL_BUTTON_PADDING_X}px`,
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
  textAlign: 'center',
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

// v2.9.8: "back" / inline link is now a wood-themed mini-button instead
// of bare text, so it matches the rest of the castle UI. Kept smaller
// than the full menu buttonStyle so it still reads as a secondary nav
// affordance (auto width hugs the label "← back").
const BUTTON_WOOD_LINK_BORDER_WIDTH = 9;

export const linkStyle: CSSProperties = {
  marginTop: 24,
  minHeight: 30,
  padding: '4px 14px',
  fontSize: 12,
  fontWeight: 700,
  fontFamily: 'inherit',
  color: '#f3e8d0',
  background: 'transparent',
  border: `${BUTTON_WOOD_LINK_BORDER_WIDTH}px solid transparent`,
  borderImageSource: `url(${buttonWoodUrl})`,
  borderImageSlice: BUTTON_WOOD_SLICE,
  borderImageWidth: `${BUTTON_WOOD_LINK_BORDER_WIDTH}px`,
  borderImageRepeat: 'stretch',
  borderImageOutset: 0,
  borderRadius: 0,
  cursor: 'pointer',
  letterSpacing: '0.05em',
  textShadow: '0 1px 2px rgba(0,0,0,0.75), 0 0 4px rgba(0,0,0,0.4)',
};

// v2.9.8: chipStyle — wood plaque for the LevelSelect archetype
// picker. Same 9-slice as miniButtonStyle so the chips look like
// a row of small castle buttons. Selected state is signalled by a
// blue inner glow + brighter label (the wood texture itself can't
// change, so the affordance lives in shadow + color).
const BUTTON_WOOD_CHIP_BORDER_WIDTH = 9;

export const chipStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  minHeight: 30,
  padding: '4px 12px',
  margin: 0,
  fontSize: 12,
  fontWeight: 700,
  fontFamily: 'inherit',
  color: '#f3e8d0',
  background: 'transparent',
  border: `${BUTTON_WOOD_CHIP_BORDER_WIDTH}px solid transparent`,
  borderImageSource: `url(${buttonWoodUrl})`,
  borderImageSlice: BUTTON_WOOD_SLICE,
  borderImageWidth: `${BUTTON_WOOD_CHIP_BORDER_WIDTH}px`,
  borderImageRepeat: 'stretch',
  borderImageOutset: 0,
  borderRadius: 0,
  cursor: 'pointer',
  letterSpacing: '0.03em',
  textShadow: '0 1px 2px rgba(0,0,0,0.75), 0 0 4px rgba(0,0,0,0.4)',
};

export const chipSelectedStyle: CSSProperties = {
  ...chipStyle,
  // Brighter label to signal selection on top of the wood plaque. The
  // azure glow itself moved to the `.dt-chip-selected` CSS class (v2.10.1)
  // so the `.dt-chip:hover` brightness can layer on top of it — an inline
  // `filter` here would shadow the hover rule (inline beats stylesheet).
  color: '#bfe6ff',
};

export const cardStyle: CSSProperties = {
  background: 'rgba(28, 30, 38, 0.88)',
  border: '1px solid rgba(120, 140, 180, 0.18)',
  borderRadius: 10,
  padding: 24,
  minWidth: 360,
  maxWidth: 520,
};

// v2.10.2: shared parchment-scroll card (matches TutorialOverlay's look).
// The painterly parchment-banner.png is 9-sliced with a horizontal-only
// slice ('0 80 0 80 fill') so the wooden rollers stay fixed-size on the
// left/right and the parchment center stretches to fit the content. Used
// by PauseMenu + EndScreen (and conceptually by TutorialOverlay). Text on
// the parchment is dark brown, so pair with parchmentTitleStyle /
// parchmentBackdropStyle below — NOT the white-on-dark menu text styles.
const PARCHMENT_SLICE = '0 80 0 80 fill';
const PARCHMENT_BORDER = 60;

export const parchmentBackdropStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(8, 10, 14, 0.78)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 60,
  fontFamily: THEME_FONT,
};

export const parchmentCardStyle: CSSProperties = {
  width: 440,
  maxWidth: '92vw',
  padding: '34px 78px 30px 78px',
  textAlign: 'center',
  color: '#3a2a1a',
  fontFamily: THEME_FONT,
  background: 'transparent',
  border: '0px solid transparent',
  borderLeftWidth: `${PARCHMENT_BORDER}px`,
  borderRightWidth: `${PARCHMENT_BORDER}px`,
  borderImageSource: `url(${parchmentUrl})`,
  borderImageSlice: PARCHMENT_SLICE,
  borderImageWidth: `0 ${PARCHMENT_BORDER}px 0 ${PARCHMENT_BORDER}px`,
  borderImageRepeat: 'stretch',
  borderImageOutset: 0,
  borderRadius: 0,
  filter: 'drop-shadow(0 16px 32px rgba(0,0,0,0.55))',
};

export const parchmentTitleStyle: CSSProperties = {
  fontFamily: THEME_FONT,
  fontSize: 34,
  fontWeight: 800,
  margin: '0 0 6px',
  color: '#3a2a1a',
  letterSpacing: '0.02em',
  textShadow: '0 1px 0 rgba(255, 240, 210, 0.45)',
};

export const parchmentKickerStyle: CSSProperties = {
  fontSize: 11,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: '#7a5a32',
  fontWeight: 700,
  marginBottom: 4,
};
