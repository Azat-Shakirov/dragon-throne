// sessionStore — current route + paused flag for the in-game pause menu.
// Ephemeral; not persisted.
//
// v2.8.0: playerStartLiquid → playerStartFaction.
// v2.9.0: playerStartFaction → playerStartArchetype. The LevelSelect
// challenge-tier picker chose the player's unit type (archetype).
// v2.11.0: the archetype picker moved OUT of Campaign and INTO the new
// Battle Royale setup screen. `playerStartArchetype` now feeds Battle
// Royale (the player's chosen unit type) instead of campaign challenge
// levels. New `gameMode` distinguishes a campaign level from a BR skirmish,
// and `aiDifficulty` is the BR-only global AI strength the player picks.

import { create } from 'zustand';
import type { ArchetypeId } from '../engine/content/ContentLibrary';

export type Route = 'menu' | 'levelSelect' | 'battleRoyale' | 'settings' | 'credits' | 'game' | 'quit' | 'editor' | 'variantSandbox' | 'biomeSandbox' | 'unitSandbox' | 'wallSandbox';

// v2.11.0: which mode launched the current 'game' route.
//  - 'campaign'     : a Campaign ladder level. Designer's player setup is
//                     honored; winning records stars / unlocks the next level.
//  - 'battleRoyale' : a skirmish from the BR grid. The player's chosen
//                     archetype + 'azure' faction override the human player,
//                     every AI is forced to the chosen aiDifficulty config,
//                     and no campaign progress is recorded.
export type GameMode = 'campaign' | 'battleRoyale';

// v2.11.0: Battle Royale global AI difficulty. Maps directly to a
// content/ai/<id>.json personality that overrides every AI on the map.
export type AIDifficulty = 'easy' | 'normal' | 'hard';

interface SessionStore {
  route: Route;
  selectedLevelId: number | null;
  paused: boolean;
  // v2.11.0 — campaign vs battle-royale. GameView branches on this to
  // decide whether to apply the BR archetype/faction/difficulty overrides
  // and whether to record campaign completion.
  gameMode: GameMode;
  // Player's chosen archetype (unit type). v2.11.0: set on the Battle
  // Royale setup screen. On a BR match GameView overrides the human
  // player's archetype to this value AND forces their faction to 'azure'.
  // Campaign levels ignore it entirely (designer's choice always wins).
  // null = not yet chosen (BR Play is gated until a unit type is picked).
  playerStartArchetype: ArchetypeId | null;
  // v2.11.0 — chosen AI difficulty for the next Battle Royale match. Every
  // AI player on the BR map is forced to this personality.
  aiDifficulty: AIDifficulty;
  navigate: (route: Route) => void;
  startLevel: (id: number) => void;
  startBattleRoyale: (id: number) => void;
  setPlayerStartArchetype: (id: ArchetypeId | null) => void;
  setAIDifficulty: (d: AIDifficulty) => void;
  togglePause: () => void;
  setPaused: (p: boolean) => void;
  exitToMenu: () => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  route: 'menu',
  selectedLevelId: null,
  paused: false,
  gameMode: 'campaign',
  playerStartArchetype: null,
  aiDifficulty: 'normal',
  navigate: (route) => set({ route, paused: false }),
  startLevel: (id) => set({ route: 'game', selectedLevelId: id, paused: false, gameMode: 'campaign' }),
  startBattleRoyale: (id) => set({ route: 'game', selectedLevelId: id, paused: false, gameMode: 'battleRoyale' }),
  setPlayerStartArchetype: (id) => set({ playerStartArchetype: id }),
  setAIDifficulty: (d) => set({ aiDifficulty: d }),
  togglePause: () => set((s) => ({ paused: !s.paused })),
  setPaused: (p) => set({ paused: p }),
  exitToMenu: () => set({ route: 'menu', selectedLevelId: null, paused: false }),
}));
