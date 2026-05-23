// Inline SVG icons for the five archetypes. Used by LevelSelect's
// challenge-tier picker (v2.9.0) to identify each unit type without
// requiring extra PNG assets. Strokes use `currentColor` so the icon
// inherits its color from the CSS context (chip text color).

import type { ArchetypeId } from '../engine/content/ContentLibrary';

const STROKE = 1.6;

type IconProps = { size?: number };

export function InfantryIcon({ size = 22 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
         strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round">
      {/* helmet */}
      <path d="M6 10 Q6 6 12 6 Q18 6 18 10 L18 12 L6 12 Z" />
      <line x1="6" y1="12" x2="18" y2="12" />
      {/* sword */}
      <line x1="12" y1="13" x2="12" y2="21" />
      <line x1="9.5" y1="15" x2="14.5" y2="15" />
    </svg>
  );
}

export function ArcherIcon({ size = 22 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
         strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round">
      {/* bow */}
      <path d="M7 4 Q15 12 7 20" />
      {/* string */}
      <line x1="7" y1="4" x2="7" y2="20" />
      {/* arrow */}
      <line x1="4" y1="12" x2="18" y2="12" />
      <polyline points="16,10 18,12 16,14" />
    </svg>
  );
}

export function KnightIcon({ size = 22 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
         strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round">
      {/* heater shield */}
      <path d="M5 4 L19 4 L19 12 Q19 18 12 21 Q5 18 5 12 Z" />
      {/* center bar / cross */}
      <line x1="12" y1="4" x2="12" y2="21" />
      <line x1="5" y1="10" x2="19" y2="10" />
    </svg>
  );
}

export function CavalryIcon({ size = 22 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
         strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round">
      {/* horse silhouette */}
      <path d="M3 16 L5 12 L9 11 L11 8 L14 8 L16 10 L20 11 L20 16" />
      <line x1="6" y1="16" x2="6" y2="21" />
      <line x1="10" y1="16" x2="10" y2="21" />
      <line x1="15" y1="16" x2="15" y2="21" />
      <line x1="19" y1="16" x2="19" y2="21" />
      {/* tail */}
      <path d="M3 16 Q1 17 2 19" />
    </svg>
  );
}

export function MageIcon({ size = 22 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
         strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round">
      {/* wizard hat */}
      <path d="M12 3 L7 13 L17 13 Z" />
      <line x1="5" y1="13" x2="19" y2="13" />
      {/* staff */}
      <line x1="18" y1="6" x2="18" y2="21" />
      {/* orb */}
      <circle cx="18" cy="5" r="2" />
    </svg>
  );
}

export function ArchetypeIcon({ id, size }: { id: ArchetypeId; size?: number }) {
  switch (id) {
    case 'infantry':
      return <InfantryIcon size={size} />;
    case 'archer':
      return <ArcherIcon size={size} />;
    case 'knight':
      return <KnightIcon size={size} />;
    case 'cavalry':
      return <CavalryIcon size={size} />;
    case 'mage':
      return <MageIcon size={size} />;
  }
}
