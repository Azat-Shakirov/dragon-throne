// GameView — owns the engine, canvas, input, and HUD bar for one level.
// Mounted only when sessionStore.route === 'game'. Unmount destroys the
// engine cleanly. Esc opens the pause menu (engine stops ticking).

import { useEffect, useMemo, useRef, useState } from 'react';
import { GameEngine } from '../engine/GameEngine';
import { loadContent } from '../engine/content/ContentLoader';
import { PixiRenderer } from '../render/PixiRenderer';
import { InputController } from '../input/InputController';
import { createSessionState, type SessionState } from '../render/SessionState';
import { TICK_MS } from '../types';
import { UnitBar } from './UnitBar';
import { PauseMenu } from './PauseMenu';
import { EndScreen } from './EndScreen';
import { compactButtonStyle } from './menuStyles';
import { NodeInfoPanel } from './NodeInfoPanel';
import { TutorialOverlay } from './TutorialOverlay';
import { HudTimer } from './HudTimer';
import type { TutorialDef } from '../engine/content/ContentLibrary';
import type { NodeId } from '../types';
import type { ArchetypeId, LevelDef } from '../engine/content/ContentLibrary';
import { restartGameMusic } from '../audio/musicPlayer';
import { useHudStore } from '../store/hudStore';
import { useSessionStore, type AIDifficulty } from '../store/sessionStore';
import { useProgressStore } from '../store/progressStore';
import { computePlayerTotals } from '../store/computeTotals';

const MAX_FRAME_MS = 250;
const HUD_POLL_MS = 100;

interface GameViewProps {
  levelId: number;
}

export function GameView({ levelId }: GameViewProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restartCounter, setRestartCounter] = useState(0);
  const [hoveredId, setHoveredId] = useState<NodeId | null>(null);
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);
  const [tutorial, setTutorial] = useState<TutorialDef | null>(null);
  const [levelName, setLevelName] = useState<string>('');
  // Win/loss status, polled from the engine so the React EndScreen overlay
  // can show. 'playing' until WinConditionSystem flips it.
  const [endStatus, setEndStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const tutorialOpenRef = useRef(false);
  const engineRefForMenu = useRef<GameEngine | null>(null);
  const sessionRef = useRef<SessionState | null>(null);
  const paused = useSessionStore((s) => s.paused);
  const setPaused = useSessionStore((s) => s.setPaused);
  const togglePause = useSessionStore((s) => s.togglePause);
  const startLevel = useSessionStore((s) => s.startLevel);
  const exitToMenu = useSessionStore((s) => s.exitToMenu);
  const navigate = useSessionStore((s) => s.navigate);
  // v2.11.0: campaign vs battle-royale. BR matches apply the player's
  // chosen archetype + difficulty overrides, never record campaign
  // progress, and have no "next level" (each map is a standalone skirmish).
  const gameMode = useSessionStore((s) => s.gameMode);
  const recordCompletion = useProgressStore((s) => s.recordCompletion);
  const isBattleRoyale = gameMode === 'battleRoyale';

  // Sorted level ids (cached) so the EndScreen knows whether a "Next level"
  // exists. loadContent() is memoized internally; the useMemo just avoids
  // re-deriving the array each render.
  const availableLevels = useMemo(
    () => Object.keys(loadContent().levels).map(Number).sort((a, b) => a - b),
    [],
  );
  const nextLevel = nextLevelId(levelId, availableLevels);

  // Track pause via ref so the requestAnimationFrame closure sees the
  // current value without re-creating the entire effect.
  const pausedRef = useRef(paused);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  // Avoid double-recording the same victory.
  const recordedRef = useRef(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    let rafId = 0;
    let hudIntervalId: ReturnType<typeof setInterval> | null = null;
    let renderer: PixiRenderer | null = null;
    let input: InputController | null = null;
    let engineRef: GameEngine | null = null;
    let availableLevels: number[] = [];
    recordedRef.current = false;
    // Fresh level (re)boot — clear any lingering win/loss overlay so a
    // restart/next-level doesn't briefly flash the previous end screen.
    setEndStatus('playing');
    // Restart the in-game song from the top on every level (re)boot —
    // covers initial entry, the R-key / pause-menu restart, and next-level.
    // Crossing back out to the menu is handled by App's setMusicScene.
    restartGameMusic();

    const handleKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (tutorialOpenRef.current) return; // tutorial blocks all input
      const key = e.key.toLowerCase();
      if (key === 'escape') {
        // No pausing once the level has resolved — the EndScreen owns the
        // screen then (R / N still work as shortcuts below).
        if (engineRef && engineRef.world.status !== 'playing') return;
        // Cancel spell-targeting first if active; otherwise pause.
        if (sessionRef.current && sessionRef.current.targetingFromLabId !== null) {
          sessionRef.current.targetingFromLabId = null;
          return;
        }
        togglePause();
        return;
      }
      if (pausedRef.current) return;
      if (key === 'r') {
        setRestartCounter((c) => c + 1);
      } else if (key === 'n') {
        // Campaign-only: BR skirmishes are standalone, no "next level".
        if (useSessionStore.getState().gameMode !== 'campaign') return;
        if (engineRef && engineRef.world.status === 'won') {
          const next = nextLevelId(levelId, availableLevels);
          if (next !== null) startLevel(next);
        }
      }
    };
    window.addEventListener('keydown', handleKey);

    (async () => {
      let engine: GameEngine;
      let content: ReturnType<typeof loadContent>;
      try {
        content = loadContent();
        availableLevels = Object.keys(content.levels).map(Number).sort((a, b) => a - b);
        const baseLevel = content.levels[levelId];
        if (!baseLevel) {
          throw new Error(`Level ${levelId} not found.`);
        }
        // v2.11.0: Battle Royale skirmishes apply the player's setup-screen
        // picks — chosen unit type + 'azure' faction for the human, and the
        // chosen global difficulty for EVERY AI on the map. Campaign levels
        // always honor the designer's player setup (no overrides).
        const session = useSessionStore.getState();
        let level: LevelDef = baseLevel;
        if (session.gameMode === 'battleRoyale') {
          const archetype = session.playerStartArchetype ?? 'infantry';
          level = applyBattleRoyaleOverrides(baseLevel, archetype, session.aiDifficulty);
        }
        engine = new GameEngine(level, content);
        engineRef = engine;
        // v2.9.5: the in-game ObjectiveBanner overlay was retired
        // (objective text now lives inside the level-intro TutorialOverlay
        // on the parchment scroll). LevelName still drives the modal kicker.
        setLevelName(level.name);
        if (level.tutorial) {
          setTutorial(level.tutorial);
          tutorialOpenRef.current = true;
        } else {
          setTutorial(null);
          tutorialOpenRef.current = false;
        }
      } catch (err) {
        setError((err as Error).message);
        return;
      }

      const r = await PixiRenderer.create(host, content);
      if (cancelled) {
        r.destroy();
        return;
      }
      renderer = r;
      const session = createSessionState();
      sessionRef.current = session;
      engineRefForMenu.current = engine;
      setCanvasEl(r.app.canvas);
      input = new InputController(
        r.app.canvas,
        engine,
        session,
        (x, y) => r.screenToWorld(x, y),
        (spellId, targetNodeId, wx, wy) =>
          r.spawnSpellOverlay(spellId, targetNodeId, wx, wy, performance.now()),
      );

      const pushTotals = (): void => {
        if (!engineRef) return;
        useHudStore.getState().setTotals(computePlayerTotals(engineRef.world));
      };
      const pollHover = (): void => {
        const id = session.hoveredNodeId;
        setHoveredId((prev) => (prev === id ? prev : id));
      };
      const pollStatus = (): void => {
        const st = engineRef ? engineRef.world.status : 'playing';
        setEndStatus((prev) => (prev === st ? prev : st));
      };
      pushTotals();
      pollHover();
      pollStatus();
      hudIntervalId = setInterval(() => {
        pushTotals();
        pollHover();
        pollStatus();
      }, HUD_POLL_MS);

      let lastTime = performance.now();
      let accumulator = 0;

      const frame = (now: number) => {
        const delta = Math.min(now - lastTime, MAX_FRAME_MS);
        lastTime = now;
        const blockTick = pausedRef.current || tutorialOpenRef.current;
        if (!blockTick) {
          accumulator += delta;
          while (accumulator >= TICK_MS) {
            engine.tick();
            accumulator -= TICK_MS;
          }
        }

        if (
          engine.world.status === 'won' &&
          !recordedRef.current &&
          // v2.11.0: Battle Royale wins are skirmish-only — never unlock
          // campaign levels or record stars.
          useSessionStore.getState().gameMode === 'campaign'
        ) {
          recordedRef.current = true;
          recordCompletion(levelId, {
            stars: 1,
            bestTimeMs: Math.round(engine.world.elapsedMs),
            unitsLost: 0,
          });
        }

        const alpha = blockTick ? 0 : accumulator / TICK_MS;
        r.render(
          engine.world,
          session,
          alpha,
          now,
          engine.towerInterceptSystem.recentShots,
          engine.recentSpellCasts,
        );
        rafId = requestAnimationFrame(frame);
      };

      rafId = requestAnimationFrame(frame);
    })();

    return () => {
      cancelled = true;
      window.removeEventListener('keydown', handleKey);
      if (rafId) cancelAnimationFrame(rafId);
      if (hudIntervalId !== null) clearInterval(hudIntervalId);
      useHudStore.getState().reset();
      input?.destroy();
      renderer?.destroy();
      sessionRef.current = null;
      engineRefForMenu.current = null;
      setCanvasEl(null);
      setHoveredId(null);
      setPaused(false);
    };
  }, [levelId, restartCounter, togglePause, startLevel, recordCompletion, setPaused]);

  return (
    <>
      <UnitBar />
      {engineRefForMenu.current && <HudTimer engineRef={engineRefForMenu} />}
      {/* v2.7.6: shift the canvas below the UnitBar (24px) so nodes
         placed near y=0 in a level aren't hidden under the bar. */}
      {/* v2.11.2: `.game-host` sizes the canvas to dvh (dynamic viewport
          height) so it fills the ACTUALLY-visible area on mobile — `100vh`
          includes the region behind the browser's address/nav chrome, which
          pushed the map's bottom (and, with the fixed UnitBar, its top) out
          of view. The class layers `100vh` then `100dvh` so engines without
          dvh still get a working fallback. fitWorldToHost already contain-
          fits the map, so a correctly-sized host keeps the whole map on-screen. */}
      <div ref={hostRef} className="game-host" />
      {tutorial && (
        <TutorialOverlay
          tutorial={tutorial}
          levelName={levelName}
          onDismiss={() => {
            tutorialOpenRef.current = false;
            setTutorial(null);
          }}
        />
      )}
      {paused && endStatus === 'playing' && (
        <PauseMenu
          onResume={() => setPaused(false)}
          onRestart={() => {
            setPaused(false);
            setRestartCounter((c) => c + 1);
          }}
        />
      )}
      {endStatus !== 'playing' && (
        <EndScreen
          status={endStatus}
          levelName={levelName}
          // BR skirmishes are standalone: no "next level", and the menu
          // button returns to the Battle Royale map picker rather than the
          // main menu.
          hasNext={!isBattleRoyale && nextLevel !== null}
          onNext={() => { if (!isBattleRoyale && nextLevel !== null) startLevel(nextLevel); }}
          onRestart={() => { setEndStatus('playing'); setRestartCounter((c) => c + 1); }}
          onMenu={isBattleRoyale ? () => navigate('battleRoyale') : exitToMenu}
          menuLabel={isBattleRoyale ? 'Battle Royale' : 'Main menu'}
        />
      )}
      {!paused && endStatus === 'playing' && engineRefForMenu.current && sessionRef.current && (
        <NodeInfoPanel
          engine={engineRefForMenu.current}
          session={sessionRef.current}
          hoveredNodeId={hoveredId}
          canvasEl={canvasEl}
        />
      )}
      {error && (
        <div
          style={{
            position: 'fixed',
            top: 40,
            left: 20,
            color: '#ff8a8a',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
          }}
        >
          {error}
          <div style={{ marginTop: 8 }}>
            <button onClick={exitToMenu} style={compactButtonStyle}>Main menu</button>
          </div>
        </div>
      )}
    </>
  );
}

function nextLevelId(current: number, available: number[]): number | null {
  const idx = available.indexOf(current);
  if (idx === -1 || idx + 1 >= available.length) return null;
  return available[idx + 1] ?? null;
}

// v2.11.0: returns a shallow-cloned LevelDef set up for a Battle Royale
// skirmish from the player's setup-screen picks:
//   • the human player's `archetype` is swapped to the chosen unit type and
//     their `faction` is forced to 'azure' (the player always plays blue) —
//     buildWorldFromLevel propagates the faction onto every node they own;
//   • EVERY AI player's `aiConfigId` is overridden to the chosen difficulty
//     (easy/normal/hard), so the whole field plays at one strength.
// Enemy/neutral factions + the map layout are otherwise untouched.
function applyBattleRoyaleOverrides(
  level: LevelDef,
  archetypeId: ArchetypeId,
  difficulty: AIDifficulty,
): LevelDef {
  return {
    ...level,
    players: level.players.map((p) =>
      p.type === 'human'
        ? { ...p, archetype: archetypeId, faction: 'azure' }
        : { ...p, aiConfigId: difficulty },
    ),
  };
}
