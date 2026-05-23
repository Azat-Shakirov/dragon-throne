// ObjectiveBanner — persistent strip across the top of the game view
// showing the current level's objective string. Purely cosmetic; no
// engine semantics. Sits below the UnitBar.
//
// v2.9.3: rendered on the painterly parchment-banner.png asset. The
// inner-padding values are tuned to keep "Objective ... text" inside
// the scroll's visible parchment area (the wooden rollers on either
// side intentionally hang outside the text box).

import parchmentUrl from '../render/sprites/ui/parchment-banner.png';

interface Props {
  objective: string;
}

export function ObjectiveBanner({ objective }: Props) {
  return (
    <div style={bannerStyle}>
      <span style={kickerStyle}>Objective</span>
      <span style={textStyle}>{objective}</span>
    </div>
  );
}

const bannerStyle: React.CSSProperties = {
  position: 'fixed',
  top: 28,
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 14,
  // Padding side: roller width on the source = ~16% of asset width;
  // inset the text so it lands on the parchment, not the rollers.
  padding: '24px 78px',
  minWidth: 420,
  minHeight: 60,
  backgroundImage: `url(${parchmentUrl})`,
  backgroundSize: '100% 100%',
  backgroundRepeat: 'no-repeat',
  backgroundColor: 'transparent',
  border: 'none',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 14,
  color: '#3a2a1a',
  zIndex: 6,
  pointerEvents: 'none',
  maxWidth: '90vw',
  textShadow: '0 1px 0 rgba(255, 240, 210, 0.4)',
};

const kickerStyle: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: '#7a5a32',
  fontWeight: 700,
};

const textStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
};
