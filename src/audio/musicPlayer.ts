// Background music player. Two looping tracks routed through Web Audio:
//   • menu  — plays on the menu / level-select / settings / credits /
//              battle-royale / dev-sandbox screens.
//   • game  — plays during a live level.
// App.tsx drives the switch via setMusicScene() off the route, so the
// player crosses in/out of a level without the user touching the volume
// slider.
//
// WHY WEB AUDIO (not a bare <audio>.volume)
// -----------------------------------------
// The two source tracks aren't mastered to the same loudness — the
// medieval-ambient menu melody is noticeably quieter than the energetic
// in-game song. To level-match them we boost the menu track ABOVE the
// raw musicVolume, which an <audio> element can't do (its .volume caps
// at 1.0). Routing each track through a GainNode lets the menu gain
// exceed 1.0. Per-track NORMALIZE_GAIN below is the level-match knob:
// the game track is the 1.0 reference; the menu track is boosted up to
// it. Tune MENU by ear if the two scenes still feel mismatched.
//
// DROPPING / SWAPPING TRACKS
// --------------------------
// Files live in the gitignored project-root `sfx/` folder (same place
// as the SFX overrides). Tracks are matched to a scene by filename
// keyword (case-insensitive):
//   menu  ← contains "deuslower", "medieval", or "menu"
//   game  ← contains "field", "memories", "waterflame", "game", or "ingame"
// `import.meta.glob` rediscovers files on reload; the chosen URLs are
// console.info'd on init so swaps are verifiable. Only mp3/ogg/m4a are
// scanned — the .wav click SFX in the same folder is ignored here.

type Scene = 'menu' | 'game';

// Per-track loudness normalization. game is the reference (1.0); the
// quieter ambient menu track is boosted up to match. Tune by ear.
const NORMALIZE_GAIN: Record<Scene, number> = {
  menu: 2.5,
  game: 1.0,
};

const trackModules = import.meta.glob('/sfx/*.{mp3,ogg,m4a}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

function classify(path: string): Scene | null {
  const name = path.split('/').pop()?.toLowerCase() ?? '';
  if (/deuslower|medieval|menu/.test(name)) return 'menu';
  if (/field|memories|waterflame|game|ingame/.test(name)) return 'game';
  return null;
}

const trackUrls: Partial<Record<Scene, string>> = {};

interface Track {
  el: HTMLAudioElement;
  gain: GainNode;
}

let ctx: AudioContext | null = null;
let baseVolume = 0.5;
let currentScene: Scene = 'menu';
let initialized = false;
let started = false;
const tracks: Partial<Record<Scene, Track>> = {};

export function initMusicPlayer(initialVolume: number): void {
  if (initialized) return;
  initialized = true;
  baseVolume = clamp01(initialVolume);

  for (const path of Object.keys(trackModules).sort()) {
    const scene = classify(path);
    if (scene && !trackUrls[scene]) trackUrls[scene] = trackModules[path]!;
  }
  if (!trackUrls.menu && !trackUrls.game) {
    console.info('[music] no menu/game tracks found in sfx/ — background music disabled.');
    return;
  }
  console.info(
    `[music] menu="${trackUrls.menu ?? '(none)'}" game="${trackUrls.game ?? '(none)'}"`,
  );

  // Arm on the first user gesture (browser autoplay policy blocks
  // earlier). The AudioContext + media-element graph are built then.
  const tryStart = () => {
    if (started) return;
    const AudioCtor =
      (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;
    if (ctx === null) {
      ctx = new AudioCtor();
      buildTracks(ctx);
    }
    void ctx.resume();
    started = true;
    playScene(currentScene, false);
    removeGestureListeners();
  };

  const removeGestureListeners = () => {
    window.removeEventListener('pointerdown', tryStart);
    window.removeEventListener('keydown', tryStart);
    window.removeEventListener('touchstart', tryStart);
  };

  window.addEventListener('pointerdown', tryStart);
  window.addEventListener('keydown', tryStart);
  window.addEventListener('touchstart', tryStart);
}

function buildTracks(audioCtx: AudioContext): void {
  (['menu', 'game'] as Scene[]).forEach((scene) => {
    const url = trackUrls[scene];
    if (!url) return;
    const el = new Audio(url);
    el.loop = true;
    el.preload = 'auto';
    el.crossOrigin = 'anonymous';
    const srcNode = audioCtx.createMediaElementSource(el);
    const gain = audioCtx.createGain();
    gain.gain.value = clamp01nonneg(baseVolume * NORMALIZE_GAIN[scene]);
    srcNode.connect(gain);
    gain.connect(audioCtx.destination);
    tracks[scene] = { el, gain };
  });
}

// Play one scene's track and pause the other. When `restart` is true the
// incoming track is rewound to 0 first — used whenever the player crosses
// in/out of a level (and on level restart) so the song starts fresh
// rather than resuming mid-phrase.
function playScene(scene: Scene, restart: boolean): void {
  (['menu', 'game'] as Scene[]).forEach((s) => {
    const track = tracks[s];
    if (!track) return;
    if (s === scene) {
      if (restart) {
        try {
          track.el.currentTime = 0;
        } catch {
          // Some browsers throw if the media isn't seekable yet; ignore.
        }
      }
      void track.el.play().catch(() => {
        // Autoplay still blocked — the next gesture re-arms via tryStart.
      });
    } else {
      track.el.pause();
    }
  });
}

export function setMusicScene(scene: Scene): void {
  if (currentScene === scene) return;
  currentScene = scene;
  // Scene actually changed (menu↔game) — rewind the incoming track so the
  // melody restarts when crossing in/out of a level. Same-scene navigation
  // (menu→settings→credits) early-returns above, so the menu melody is NOT
  // restarted on every menu click. Only acts post-gesture (graph exists);
  // before that, tryStart plays whatever currentScene is when it fires.
  if (started) playScene(scene, true);
}

// Force the in-game track to restart from 0. GameView calls this on every
// engine boot (initial entry, level restart, next level) — restart keeps
// the route/scene unchanged, so setMusicScene wouldn't fire on its own.
export function restartGameMusic(): void {
  currentScene = 'game';
  if (started) playScene('game', true);
}

export function setMusicVolume(v: number): void {
  baseVolume = clamp01(v);
  (['menu', 'game'] as Scene[]).forEach((scene) => {
    const track = tracks[scene];
    if (track) track.gain.gain.value = clamp01nonneg(baseVolume * NORMALIZE_GAIN[scene]);
  });
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

// Track gain may legitimately exceed 1.0 (menu boost), but must stay
// non-negative.
function clamp01nonneg(v: number): number {
  return Math.max(0, v);
}
