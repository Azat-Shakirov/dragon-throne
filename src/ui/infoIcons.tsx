// infoIcons — small stroke-only SVG icons used by NodeInfoPanel's
// stat grid. Style matches archetypeIcons.tsx: 24×24 viewbox,
// currentColor strokes, ~1.7px width. Each icon is intentionally
// silhouette-only so the panel reads as a row of glyphs, not a
// row of mini-illustrations.

interface Props {
  size?: number;
}

function svgProps(size: number) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
}

// Units — soldier helm silhouette.
export function UnitsIcon({ size = 14 }: Props) {
  return (
    <svg {...svgProps(size)}>
      <path d="M5 13a7 7 0 0 1 14 0v3H5z" />
      <path d="M12 4v9" />
      <path d="M9 16h6" />
    </svg>
  );
}

// Production — anvil / hammer silhouette.
export function ProductionIcon({ size = 14 }: Props) {
  return (
    <svg {...svgProps(size)}>
      <path d="M4 11h13l3 -2v3l-3 1H7l-1 4h10" />
      <path d="M8 19h10" />
    </svg>
  );
}

// Defense — heater shield.
export function DefenseIcon({ size = 14 }: Props) {
  return (
    <svg {...svgProps(size)}>
      <path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4 -1.5 7 -4.5 7 -9V6z" />
    </svg>
  );
}

// Attack — crossed swords.
export function AttackIcon({ size = 14 }: Props) {
  return (
    <svg {...svgProps(size)}>
      <path d="M5 5l9 9" />
      <path d="M19 5l-9 9" />
      <path d="M3 17l4 4" />
      <path d="M21 17l-4 4" />
      <path d="M5 19l2 -2" />
      <path d="M19 19l-2 -2" />
    </svg>
  );
}

// Range — bullseye target.
export function RangeIcon({ size = 14 }: Props) {
  return (
    <svg {...svgProps(size)}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" />
    </svg>
  );
}

// Send speed — boot / footstep.
export function SpeedIcon({ size = 14 }: Props) {
  return (
    <svg {...svgProps(size)}>
      <path d="M5 12h11" />
      <path d="M11 7l5 5l-5 5" />
      <path d="M3 6v12" />
    </svg>
  );
}

// Concoct / spell speed — round-bottom flask.
export function FlaskIcon({ size = 14 }: Props) {
  return (
    <svg {...svgProps(size)}>
      <path d="M9 3h6" />
      <path d="M10 3v6l-4 8a3 3 0 0 0 2.7 4.3h6.6A3 3 0 0 0 18 17l-4 -8V3" />
      <path d="M8 14h8" />
    </svg>
  );
}

// Starve drain — downward triple-drop.
export function StarveIcon({ size = 14 }: Props) {
  return (
    <svg {...svgProps(size)}>
      <path d="M12 3v8" />
      <path d="M9 8l3 3 3 -3" />
      <path d="M5 13l3 6" />
      <path d="M19 13l-3 6" />
      <path d="M12 14v6" />
    </svg>
  );
}

// Spell ready — sparkle / star.
export function SpellIcon({ size = 14 }: Props) {
  return (
    <svg {...svgProps(size)}>
      <path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8 -5.4L5 10l5.2 -1.6z" />
    </svg>
  );
}
