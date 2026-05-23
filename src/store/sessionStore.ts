// sessionStore — current route + paused flag for the in-game pause menu.
// Ephemeral; not persisted.
//
// v2.8.0: playerStartLiquid → playerStartFaction.
// v2.9.0: playerStartFaction → playerStartArchetype. The LevelSelect
// challenge-tier picker now chooses the player's unit type (archetype),
// not banner color. When the override is active GameView also forces
// the human player's faction to 'azure' — the player is always blue.

import { create } from 'zustand';
import type { ArchetypeId } from '../engine/content/ContentLibrary';

export type Route = 'menu' | 'levelSelect' | 'settings' | 'credits' | 'game' | 'quit' | 'editor' | 'variantSandbox' | 'biomeSandbox' | 'unitSandbox' | 'wallSandbox';

interface SessionStore {
  route: Route;
  selectedLevelId: number | null;
  paused: boolean;
  // Player's chosen archetype for challenge-tier levels (L31-40, the
  // levels with `letPlayerChooseArchetype: true`). On those levels,
  // GameView clones the level and overrides the human player's
  // archetype to this value AND forces their faction to 'azure'
  // before booting the engine. On L1-30 (designer's choice) this is
  // ignored. null = fall back to the level's designer-set archetype.
  playerStartArchetype: ArchetypeId | null;
  navigate: (route: Route) => void;
  startLevel: (id: number) => void;
  setPlayerStartArchetype: (id: ArchetypeId | null) => void;
  togglePause: () => void;
  setPaused: (p: boolean) => void;
  exitToMenu: () => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  route: 'menu',
  selectedLevelId: null,
  paused: false,
  playerStartArchetype: null,
  navigate: (route) => set({ route, paused: false }),
  startLevel: (id) => set({ route: 'game', selectedLevelId: id, paused: false }),
  setPlayerStartArchetype: (id) => set({ playerStartArchetype: id }),
  togglePause: () => set((s) => ({ paused: !s.paused })),
  setPaused: (p) => set({ paused: p }),
  exitToMenu: () => set({ route: 'menu', selectedLevelId: null, paused: false }),
}));
