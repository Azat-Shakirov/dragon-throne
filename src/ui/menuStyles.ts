// Shared menu styles — keeps the screens visually consistent without
// pulling in a CSS framework.
//
// v2.9.3: buttonStyle uses button-wood.png as a background-image so
// the menus carry the painterly castle aesthetic (vs the v2.7-era
// flat dark-rounded-rectangle). Text sits on top; the plaque scales
// to whatever width the button reaches.

import type { CSSProperties } from 'react';
import buttonWoodUrl from '../render/sprites/ui/button-wood.png';

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

export const buttonStyle: CSSProperties = {
  minWidth: 260,
  minHeight: 52,
  padding: '14px 26px',
  margin: '6px 0',
  fontSize: 16,
  fontWeight: 700,
  fontFamily: 'inherit',
  color: '#f3e8d0',
  // Painterly wooden plaque from src/render/sprites/ui/button-wood.png.
  // background-size: 100% 100% so the plaque stretches edge-to-edge of
  // the button (its iron-stud border is symmetric enough that this
  // reads OK without a 9-slice). Color resets to transparent so the
  // wood shows through; text-shadow keeps the label legible against
  // the wood grain.
  backgroundImage: `url(${buttonWoodUrl})`,
  backgroundSize: '100% 100%',
  backgroundRepeat: 'no-repeat',
  backgroundColor: 'transparent',
  border: 'none',
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
