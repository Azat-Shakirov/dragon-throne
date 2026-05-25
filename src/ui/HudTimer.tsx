// HudTimer — compact elapsed-time chip rendered as a React overlay
// (clock SVG + integer seconds). Replaces the v2.7-era Pixi `hudText`
// that read "level: N (name)   tick: T   t: Xs". Polls the engine
// every 250ms via a ref so React doesn't have to subscribe to per-tick
// engine state.

import { useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { GameEngine } from '../engine/GameEngine';
import { THEME_FONT } from './menuStyles';

interface Props {
  engineRef: MutableRefObject<GameEngine | null>;
}

const POLL_MS = 250;

export function HudTimer({ engineRef }: Props) {
  const [seconds, setSeconds] = useState(0);
  const lastRef = useRef(-1);

  useEffect(() => {
    const id = setInterval(() => {
      const engine = engineRef.current;
      if (!engine) return;
      const s = Math.floor(engine.world.elapsedMs / 1000);
      if (s !== lastRef.current) {
        lastRef.current = s;
        setSeconds(s);
      }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [engineRef]);

  return (
    <div style={chipStyle} aria-label={`Elapsed: ${seconds} seconds`}>
      <ClockIcon />
      <span style={valueStyle}>{seconds}s</span>
    </div>
  );
}

function ClockIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15.5 14" />
    </svg>
  );
}

const chipStyle: React.CSSProperties = {
  position: 'fixed',
  top: 32,
  left: 12,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '4px 8px',
  background: 'rgba(20, 22, 28, 0.85)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 6,
  fontFamily: THEME_FONT,
  fontSize: 12,
  fontWeight: 600,
  color: '#cfd3dc',
  zIndex: 6,
  pointerEvents: 'none',
  lineHeight: 1,
};

const valueStyle: React.CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
};
