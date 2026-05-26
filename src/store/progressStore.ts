// progressStore — completed levels + settings.
//
// Backend integration (v2.12.0): `completedLevels` is now SERVER-backed —
// loaded from GET /api/progress on login and pushed to PUT /api/progress after
// each campaign win. It is NO LONGER read from / written to localStorage.
// `settings` (musicVolume / sfxVolume) stays in localStorage at the §13
// versioned key 'lnw_progress_v1' (audio prefs don't need cross-device sync).

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  fetchProgress,
  putProgress,
  setAuthToken,
  isAuthenticated,
} from '../api/apiClient';

export interface LevelProgress {
  stars: number; // 0..3 (Phase 1 awards a flat 1; multi-star is Phase 5)
  bestTimeMs: number | null;
  unitsLost: number;
}

export interface SettingsState {
  musicVolume: number; // 0..1
  sfxVolume: number; // 0..1
}

interface ProgressStore {
  completedLevels: Record<number, LevelProgress>;
  settings: SettingsState;
  recordCompletion: (id: number, p: LevelProgress) => void;
  setMusicVolume: (v: number) => void;
  setSfxVolume: (v: number) => void;
  resetProgress: () => void;
  // v2.12.0 — server-backed campaign progress.
  // loadProgressFromServer: hydrate completedLevels from GET /api/progress.
  // Pass the freshly-issued token (login/register) to set it on the api
  // client first; omit it if the client already holds a token.
  loadProgressFromServer: (token?: string) => Promise<void>;
  // saveProgressToServer: PUT the current completedLevels (+ settings, for
  // schema completeness) to the server. Called after each campaign win.
  // No-op when not authenticated (e.g. the DEV ?level= jump-to bootstrap).
  saveProgressToServer: () => Promise<void>;
}

const DEFAULT_SETTINGS: SettingsState = { musicVolume: 0.5, sfxVolume: 0.8 };

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set, get) => ({
      completedLevels: {},
      settings: { ...DEFAULT_SETTINGS },
      recordCompletion: (id, p) =>
        set((s) => {
          const existing = s.completedLevels[id];
          // Keep best time + max stars across attempts.
          const merged: LevelProgress = {
            stars: Math.max(existing?.stars ?? 0, p.stars),
            bestTimeMs:
              existing?.bestTimeMs !== null && existing?.bestTimeMs !== undefined
                ? Math.min(existing.bestTimeMs, p.bestTimeMs ?? existing.bestTimeMs)
                : p.bestTimeMs,
            unitsLost:
              existing !== undefined ? Math.min(existing.unitsLost, p.unitsLost) : p.unitsLost,
          };
          return { completedLevels: { ...s.completedLevels, [id]: merged } };
        }),
      setMusicVolume: (v) => set((s) => ({ settings: { ...s.settings, musicVolume: clamp01(v) } })),
      setSfxVolume: (v) => set((s) => ({ settings: { ...s.settings, sfxVolume: clamp01(v) } })),
      resetProgress: () =>
        set({ completedLevels: {}, settings: { ...DEFAULT_SETTINGS } }),
      loadProgressFromServer: async (token) => {
        if (token) setAuthToken(token);
        if (!isAuthenticated()) return;
        try {
          const payload = await fetchProgress();
          // Server owns completedLevels; settings stay local (audio prefs).
          // Cast: JSON object keys are strings but the store indexes by number
          // (JS coerces on lookup), so the runtime shape is compatible.
          set({
            completedLevels: (payload.completedLevels ?? {}) as unknown as Record<
              number,
              LevelProgress
            >,
          });
        } catch (err) {
          console.warn('[progress] failed to load from server:', err);
        }
      },
      saveProgressToServer: async () => {
        if (!isAuthenticated()) return;
        const s = get();
        try {
          await putProgress({
            completedLevels: s.completedLevels as unknown as Record<string, LevelProgress>,
            settings: s.settings,
          });
        } catch (err) {
          console.warn('[progress] failed to save to server:', err);
        }
      },
    }),
    {
      name: 'lnw_progress_v1',
      storage: createJSONStorage(() => localStorage),
      // v2.12.0: ONLY settings persist to localStorage now. completedLevels is
      // server-backed (loaded on login, pushed after each campaign win) and is
      // intentionally excluded so a stale local copy can't shadow the server.
      partialize: (s) => ({ settings: s.settings }),
    },
  ),
);

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

// Level N is unlocked if it's the first level in the sorted list, or if
// the level immediately before it has been completed.
//
// DEV bypass: when running under `npm run dev` (Vite sets
// import.meta.env.DEV = true) every level is unlocked so the author
// can jump straight to any level for playtest. Production builds
// (`npm run build`) keep the progression gate intact.
export function isLevelUnlocked(
  id: number,
  sortedAvailable: number[],
  completed: Record<number, LevelProgress>,
): boolean {
  if (import.meta.env.DEV) return true;
  const idx = sortedAvailable.indexOf(id);
  if (idx === -1) return false;
  if (idx === 0) return true;
  const prev = sortedAvailable[idx - 1]!;
  return completed[prev] !== undefined;
}
