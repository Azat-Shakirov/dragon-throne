// Background music player. One HTMLAudioElement, loop=true, volume
// driven by progressStore.settings.musicVolume. Lazily started on
// the first user gesture (browser autoplay policies block earlier).
//
// SWAPPING THE TRACK
// ------------------
// The folder /sounds/ at the project root is gitignored — drop a
// single .mp3/.ogg/.wav/.m4a file in there. On the next dev-server
// HMR (or page reload), `import.meta.glob` rediscovers it and the
// player picks it up. No code changes required.
//
// If multiple audio files are present, the one with the
// lexicographically-first filename wins (sorted below). The chosen
// track URL is console.info'd on init so you can verify swaps took
// effect.

const tracks = import.meta.glob('/sounds/*.{mp3,ogg,wav,m4a}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const trackUrls = Object.keys(tracks)
  .sort()
  .map((k) => tracks[k]!);

let audio: HTMLAudioElement | null = null;
let started = false;

export function initMusicPlayer(initialVolume: number): void {
  if (audio !== null) return;
  if (trackUrls.length === 0) {
    // No track on disk — silent no-op. Lets the codebase build/run
    // cleanly when the placeholder MP3 isn't checked out.
    console.info('[music] sounds/ is empty — no background music will play.');
    return;
  }
  const chosen = trackUrls[0]!;
  const sortedNames = Object.keys(tracks).sort();
  if (sortedNames.length > 1) {
    console.info(
      `[music] ${sortedNames.length} tracks in sounds/, picking "${sortedNames[0]}". Remove the others to silence this notice.`,
    );
  } else {
    console.info(`[music] loaded ${sortedNames[0]}`);
  }
  const el = new Audio(chosen);
  el.loop = true;
  el.preload = 'auto';
  el.volume = clamp01(initialVolume);
  audio = el;

  const tryStart = () => {
    if (started || audio === null) return;
    audio.play().then(
      () => {
        started = true;
        removeGestureListeners();
      },
      () => {
        // Autoplay still blocked (e.g. first gesture wasn't trusted).
        // Listeners stay attached; the next gesture will retry.
      },
    );
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

export function setMusicVolume(v: number): void {
  if (audio === null) return;
  audio.volume = clamp01(v);
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}
