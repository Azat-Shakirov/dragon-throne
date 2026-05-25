// Per-event SFX system. Hybrid architecture:
//   1. Hand-crafted Web Audio synth recipes per event — always available.
//   2. Optional file overrides — drop sfx/<event>.{mp3,ogg,wav,m4a} into
//      the project-root `sfx/` folder and the decoded buffer plays instead.
//
// One AudioContext + master GainNode bound to progressStore.settings.sfxVolume.
// Lazy-init on the first user gesture (browser autoplay policy). playSfx is
// cheap to call from render-loop observers — it no-ops while the context is
// suspended, so callers don't need readiness guards.
//
// DROPPING REAL SFX FILES
// -----------------------
// The folder /sfx/ at the project root is gitignored — drop named files in:
//   sfx/capture.mp3
//   sfx/launch.wav
//   ...etc, matching the SfxEvent literal.
// On next page load, `import.meta.glob` rediscovers the files and the
// player picks them up. Synth recipes act as fallbacks for any events
// without a file override.

export type SfxEvent =
  | 'click'
  | 'capture'
  | 'launch'
  | 'arrive_friendly'
  | 'arrive_hostile'
  | 'win'
  | 'lose'
  | 'spell_concoct_start'
  | 'spell_ready'
  | 'spell_freeze'
  | 'spell_starve'
  | 'spell_sabotage';

const fileGlob = import.meta.glob('/sfx/*.{mp3,ogg,wav,m4a}', {
  query: '?url',
  import: 'default',
}) as Record<string, () => Promise<string>>;

// Filename → event aliases, so a descriptively-named drop-in file still
// maps to its event without forcing the user to rename it to the bare
// event literal. Exact-event filenames (e.g. capture.mp3) still win;
// aliases only kick in when the base name isn't already an event.
const FILE_ALIASES: Record<string, SfxEvent> = {
  'wood-tap-click': 'click',
};

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let masterVolume = 0.8;
let initialized = false;

// Decoded file buffers per event. Populated lazily after init.
const decodedBuffers = new Map<SfxEvent, AudioBuffer>();

export function initSfxPlayer(initialVolume: number): void {
  if (initialized) return;
  initialized = true;
  masterVolume = clamp01(initialVolume);

  const tryStart = () => {
    if (ctx !== null) return;
    const AudioCtor =
      (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;
    ctx = new AudioCtor();
    master = ctx.createGain();
    master.gain.value = masterVolume;
    master.connect(ctx.destination);
    void ctx.resume();
    loadFiles();
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

export function setSfxVolume(v: number): void {
  masterVolume = clamp01(v);
  if (master !== null) master.gain.value = masterVolume;
}

export function playSfx(event: SfxEvent): void {
  if (ctx === null || master === null) return;
  if (ctx.state === 'suspended') {
    void ctx.resume();
  }
  const buffer = decodedBuffers.get(event);
  if (buffer) {
    playBuffer(ctx, master, buffer);
  } else {
    playSynth(ctx, master, event, ctx.currentTime);
  }
}

function loadFiles(): void {
  if (ctx === null) return;
  for (const path of Object.keys(fileGlob)) {
    const base = path.split('/').pop()?.replace(/\.[^.]+$/, '') ?? '';
    const event: SfxEvent | undefined = isSfxEvent(base)
      ? base
      : FILE_ALIASES[base.toLowerCase()];
    if (!event) continue;
    const loader = fileGlob[path];
    if (!loader) continue;
    void loader()
      .then((url) => fetch(url))
      .then((res) => res.arrayBuffer())
      .then((buf) => ctx!.decodeAudioData(buf))
      .then((audio) => {
        decodedBuffers.set(event, audio);
        console.info(`[sfx] loaded ${event} (${base}) from /sfx/`);
      })
      .catch(() => {
        // Silent failure — synth fallback covers the event.
      });
  }
}

function isSfxEvent(s: string): s is SfxEvent {
  return (
    s === 'click' ||
    s === 'capture' ||
    s === 'launch' ||
    s === 'arrive_friendly' ||
    s === 'arrive_hostile' ||
    s === 'win' ||
    s === 'lose' ||
    s === 'spell_concoct_start' ||
    s === 'spell_ready' ||
    s === 'spell_freeze' ||
    s === 'spell_starve' ||
    s === 'spell_sabotage'
  );
}

function playBuffer(ctx: AudioContext, dest: AudioNode, buffer: AudioBuffer): void {
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.connect(dest);
  src.start();
}

// ── Synth recipes ────────────────────────────────────────────────────
// Each event has a hand-tuned recipe combining oscillators, gain envelopes,
// and optional shaped noise. Recipes share a small helper toolkit.

function playSynth(ctx: AudioContext, dest: AudioNode, event: SfxEvent, t0: number): void {
  switch (event) {
    case 'click':
      blip(ctx, dest, t0, { freq: 1200, type: 'square', dur: 0.04, peak: 0.12 });
      return;
    case 'capture':
      sweep(ctx, dest, t0, {
        from: 220,
        to: 660,
        type: 'triangle',
        dur: 0.22,
        peak: 0.30,
      });
      noiseBurst(ctx, dest, t0 + 0.04, { dur: 0.10, peak: 0.12, filter: { type: 'bandpass', freq: 800 } });
      return;
    case 'launch':
      sweep(ctx, dest, t0, {
        from: 380,
        to: 180,
        type: 'square',
        dur: 0.13,
        peak: 0.18,
      });
      return;
    case 'arrive_friendly':
      blip(ctx, dest, t0, { freq: 520, type: 'sine', dur: 0.07, peak: 0.18 });
      blip(ctx, dest, t0 + 0.06, { freq: 780, type: 'sine', dur: 0.07, peak: 0.18 });
      return;
    case 'arrive_hostile':
      sweep(ctx, dest, t0, {
        from: 520,
        to: 240,
        type: 'sawtooth',
        dur: 0.16,
        peak: 0.24,
      });
      noiseBurst(ctx, dest, t0, { dur: 0.10, peak: 0.10, filter: { type: 'lowpass', freq: 1200 } });
      return;
    case 'win': {
      // Major arpeggio C5-E5-G5 + sparkle.
      const notes = [523.25, 659.25, 783.99];
      for (let i = 0; i < notes.length; i++) {
        blip(ctx, dest, t0 + i * 0.12, { freq: notes[i]!, type: 'triangle', dur: 0.22, peak: 0.28 });
      }
      blip(ctx, dest, t0 + 0.36, { freq: 1046.5, type: 'sine', dur: 0.34, peak: 0.20 });
      return;
    }
    case 'lose': {
      // Descending minor third G4 → C4.
      sweep(ctx, dest, t0, {
        from: 392,
        to: 261.63,
        type: 'sawtooth',
        dur: 0.55,
        peak: 0.28,
      });
      return;
    }
    case 'spell_concoct_start':
      blip(ctx, dest, t0, { freq: 360, type: 'sine', dur: 0.10, peak: 0.16 });
      blip(ctx, dest, t0 + 0.08, { freq: 540, type: 'sine', dur: 0.10, peak: 0.16 });
      return;
    case 'spell_ready':
      blip(ctx, dest, t0, { freq: 660, type: 'sine', dur: 0.16, peak: 0.20 });
      blip(ctx, dest, t0 + 0.10, { freq: 990, type: 'sine', dur: 0.18, peak: 0.20 });
      return;
    case 'spell_freeze':
      sweep(ctx, dest, t0, {
        from: 1400,
        to: 600,
        type: 'sine',
        dur: 0.45,
        peak: 0.22,
      });
      noiseBurst(ctx, dest, t0, { dur: 0.30, peak: 0.10, filter: { type: 'highpass', freq: 2000 } });
      return;
    case 'spell_starve':
      sweep(ctx, dest, t0, {
        from: 180,
        to: 90,
        type: 'sawtooth',
        dur: 0.55,
        peak: 0.20,
      });
      noiseBurst(ctx, dest, t0, { dur: 0.42, peak: 0.08, filter: { type: 'lowpass', freq: 400 } });
      return;
    case 'spell_sabotage': {
      // Glitchy stutter: three quick rising blips.
      for (let i = 0; i < 3; i++) {
        const f = 400 + i * 220;
        blip(ctx, dest, t0 + i * 0.06, { freq: f, type: 'square', dur: 0.05, peak: 0.18 });
      }
      return;
    }
  }
}

interface BlipOpts {
  freq: number;
  type: OscillatorType;
  dur: number;
  peak: number;
}

function blip(ctx: AudioContext, dest: AudioNode, t0: number, o: BlipOpts): void {
  const osc = ctx.createOscillator();
  osc.type = o.type;
  osc.frequency.setValueAtTime(o.freq, t0);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(o.peak, t0 + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
  osc.connect(g);
  g.connect(dest);
  osc.start(t0);
  osc.stop(t0 + o.dur + 0.02);
}

interface SweepOpts {
  from: number;
  to: number;
  type: OscillatorType;
  dur: number;
  peak: number;
}

function sweep(ctx: AudioContext, dest: AudioNode, t0: number, o: SweepOpts): void {
  const osc = ctx.createOscillator();
  osc.type = o.type;
  osc.frequency.setValueAtTime(o.from, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t0 + o.dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(o.peak, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
  osc.connect(g);
  g.connect(dest);
  osc.start(t0);
  osc.stop(t0 + o.dur + 0.02);
}

interface NoiseBurstOpts {
  dur: number;
  peak: number;
  filter?: { type: BiquadFilterType; freq: number };
}

function noiseBurst(ctx: AudioContext, dest: AudioNode, t0: number, o: NoiseBurstOpts): void {
  const sampleRate = ctx.sampleRate;
  const frames = Math.max(1, Math.floor(sampleRate * o.dur));
  const buf = ctx.createBuffer(1, frames, sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < frames; i++) ch[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(o.peak, t0 + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
  let node: AudioNode = src;
  if (o.filter) {
    const filt = ctx.createBiquadFilter();
    filt.type = o.filter.type;
    filt.frequency.value = o.filter.freq;
    src.connect(filt);
    node = filt;
  }
  node.connect(g);
  g.connect(dest);
  src.start(t0);
  src.stop(t0 + o.dur + 0.02);
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}
