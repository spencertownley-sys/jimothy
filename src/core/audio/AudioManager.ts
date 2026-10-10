import { CONFIG } from '../../config';
import { Save } from '../save/Save';

/**
 * Web Audio wrapper. Real tracks are optional: every SFX and music loop has a synthesized
 * placeholder so the game never crashes or goes silent when an asset is missing. Music crossfades
 * (600 ms), ducks during Flannel, unlocks on the first input, and mutes when the tab hides.
 */
type Wave = OscillatorType;

interface Tone {
  f: number; // start frequency
  f2?: number; // glide target
  d: number; // duration s
  w?: Wave;
  g?: number; // gain
  at?: number; // start offset s
}

// Small synth recipes standing in for the ~40 SFX in docs/04_ART_AUDIO_SPEC.md §7.2.
const SFX: Record<string, Tone[]> = {
  jump: [{ f: 520, f2: 880, d: 0.12, w: 'square', g: 0.18 }],
  land: [{ f: 160, f2: 90, d: 0.08, w: 'triangle', g: 0.2 }],
  stomp: [{ f: 300, f2: 120, d: 0.12, w: 'square', g: 0.22 }, { f: 900, d: 0.05, w: 'sine', g: 0.1, at: 0.05 }],
  latte: [{ f: 1320, d: 0.06, w: 'sine', g: 0.16 }, { f: 1760, d: 0.1, w: 'sine', g: 0.14, at: 0.06 }],
  oneup: [{ f: 660, d: 0.1, w: 'square', g: 0.14 }, { f: 880, d: 0.1, w: 'square', g: 0.14, at: 0.1 }, { f: 1320, d: 0.25, w: 'square', g: 0.14, at: 0.2 }],
  geoduck: [{ f: 220, f2: 440, d: 0.2, w: 'sawtooth', g: 0.12 }, { f: 880, d: 0.2, w: 'sine', g: 0.12, at: 0.2 }, { f: 1320, d: 0.3, w: 'sine', g: 0.1, at: 0.35 }],
  grow: [{ f: 330, f2: 660, d: 0.3, w: 'triangle', g: 0.18 }, { f: 440, f2: 880, d: 0.3, w: 'triangle', g: 0.14, at: 0.1 }],
  hurt: [{ f: 440, f2: 180, d: 0.35, w: 'sawtooth', g: 0.16 }],
  die: [{ f: 600, f2: 700, d: 0.15, w: 'square', g: 0.14 }, { f: 500, f2: 80, d: 0.9, w: 'triangle', g: 0.18, at: 0.3 }],
  bump: [{ f: 200, d: 0.07, w: 'square', g: 0.16 }],
  brick: [{ f: 180, f2: 60, d: 0.15, w: 'sawtooth', g: 0.18 }, { f: 1200, d: 0.03, w: 'square', g: 0.08 }],
  powerup_appear: [{ f: 400, f2: 1200, d: 0.4, w: 'sine', g: 0.12 }],
  drain: [{ f: 300, f2: 60, d: 0.5, w: 'triangle', g: 0.18 }],
  checkpoint: [{ f: 1046, d: 0.08, w: 'sine', g: 0.14 }, { f: 1568, d: 0.18, w: 'sine', g: 0.14, at: 0.08 }],
  ticket: [{ f: 900, d: 0.04, w: 'square', g: 0.2 }, { f: 400, d: 0.08, w: 'square', g: 0.16, at: 0.05 }],
  clear: [
    { f: 523, d: 0.12, w: 'square', g: 0.12 }, { f: 659, d: 0.12, w: 'square', g: 0.12, at: 0.12 }, { f: 784, d: 0.12, w: 'square', g: 0.12, at: 0.24 },
    { f: 1046, d: 0.4, w: 'square', g: 0.12, at: 0.36 }, { f: 784, d: 0.4, w: 'triangle', g: 0.1, at: 0.36 },
  ],
  squawk: [{ f: 900, f2: 700, d: 0.12, w: 'sawtooth', g: 0.08 }, { f: 950, f2: 650, d: 0.12, w: 'sawtooth', g: 0.08, at: 0.14 }],
  boing: [{ f: 200, f2: 500, d: 0.18, w: 'triangle', g: 0.12 }],
  menu_move: [{ f: 700, d: 0.04, w: 'square', g: 0.08 }],
  menu_select: [{ f: 700, d: 0.05, w: 'square', g: 0.1 }, { f: 1050, d: 0.1, w: 'square', g: 0.1, at: 0.05 }],
  menu_back: [{ f: 500, f2: 300, d: 0.1, w: 'square', g: 0.08 }],
  pause: [{ f: 880, d: 0.05, w: 'square', g: 0.1 }, { f: 660, d: 0.08, w: 'square', g: 0.1, at: 0.06 }],
  flannel: [{ f: 110, d: 0.3, w: 'sawtooth', g: 0.14 }, { f: 165, d: 0.3, w: 'sawtooth', g: 0.14, at: 0.15 }, { f: 220, d: 0.4, w: 'sawtooth', g: 0.14, at: 0.3 }],
  throw: [{ f: 600, f2: 300, d: 0.08, w: 'square', g: 0.1 }],
  splash: [{ f: 800, f2: 200, d: 0.1, w: 'triangle', g: 0.1 }],
  honk: [{ f: 180, f2: 140, d: 0.3, w: 'sawtooth', g: 0.12 }],
  chainsaw: [{ f: 110, f2: 140, d: 1.2, w: 'sawtooth', g: 0.08 }],
  truck: [{ f: 70, f2: 50, d: 2.5, w: 'sawtooth', g: 0.08 }],
  steam: [{ f: 2400, f2: 1800, d: 0.3, w: 'triangle', g: 0.05 }],
};

// Procedural loops standing in for the real tracks (§7.1). Notes are semitone offsets from A3.
interface Track {
  bpm: number;
  wave: Wave;
  gain: number;
  bass: number[];
  arp: number[][];
}
const TRACKS: Record<string, Track> = {
  // "Ballard Drizzle" – cozy, 100 bpm, ukulele-ish plucks over a I–V–vi–IV
  ballard: { bpm: 100, wave: 'triangle', gain: 0.09, bass: [0, 7, 9, 5], arp: [[12, 16, 19, 16], [19, 23, 26, 23], [21, 24, 28, 24], [17, 21, 24, 21]] },
  // "Rain on Market St" – title/map, 90 bpm, soft
  title: { bpm: 90, wave: 'sine', gain: 0.08, bass: [0, 5, 7, 5], arp: [[12, 19, 24, 19], [17, 21, 24, 21], [19, 23, 26, 23], [17, 21, 24, 21]] },
  // "Flannel Power" – 150 bpm grunge riff
  flannel: { bpm: 150, wave: 'sawtooth', gain: 0.07, bass: [0, 0, 3, 5], arp: [[0, 12, 0, 12], [0, 12, 3, 15], [3, 15, 3, 15], [5, 17, 3, 15]] },
  // "Storm drain" – the bonus-room variant: same tune, lower and slower
  drain: { bpm: 80, wave: 'triangle', gain: 0.07, bass: [-12, -5, -3, -7], arp: [[0, 4, 7, 4], [7, 11, 14, 11], [9, 12, 16, 12], [5, 9, 12, 9]] },
  // "Golden Hour" – 1-3 at dusk, slow and warm
  dusk: { bpm: 84, wave: 'sine', gain: 0.08, bass: [0, 9, 5, 7], arp: [[12, 16, 19, 16], [21, 24, 28, 24], [17, 21, 24, 21], [19, 23, 26, 23]] },
  // "Honk If You're Angry" – goose fight
  goose: { bpm: 160, wave: 'square', gain: 0.05, bass: [0, 3, 5, 3], arp: [[12, 15, 19, 15], [15, 19, 22, 19], [17, 20, 24, 20], [15, 19, 22, 19]] },
};

const A3 = 220;
const noteHz = (semi: number): number => A3 * Math.pow(2, semi / 12);

// Recorded audio (Epidemic Sound, see CREDITS.md). Anything missing or not yet decoded falls
// back to the synth recipes above, so a slow network never means a silent game.
const SAMPLE_SFX: Record<string, { file: string; gain: number }> = {
  jump: { file: 'sfx_jump', gain: 0.45 },
  latte: { file: 'sfx_latte', gain: 0.5 },
  stomp: { file: 'sfx_stomp', gain: 0.8 },
  grow: { file: 'sfx_grow', gain: 0.75 },
  hurt: { file: 'sfx_hurt', gain: 0.8 },
  bump: { file: 'sfx_bump', gain: 0.8 },
  brick: { file: 'sfx_brick', gain: 0.75 },
  die: { file: 'sfx_die', gain: 0.75 },
  clear: { file: 'sfx_clear', gain: 0.8 },
  squawk: { file: 'sfx_squawk', gain: 0.5 },
  drain: { file: 'sfx_drain', gain: 0.8 },
  oneup: { file: 'sfx_oneup', gain: 0.75 },
  geoduck: { file: 'sfx_geoduck', gain: 0.8 },
  checkpoint: { file: 'sfx_checkpoint', gain: 0.6 },
  boing: { file: 'sfx_boing', gain: 0.6 },
  menu_select: { file: 'sfx_menu_select', gain: 0.55 },
  menu_move: { file: 'sfx_menu_move', gain: 0.45 },
  chainsaw: { file: 'sfx_chainsaw', gain: 0.55 },
  truck: { file: 'sfx_truck', gain: 0.6 },
  honk: { file: 'sfx_honk', gain: 0.7 },
  splash: { file: 'sfx_splash', gain: 0.6 },
};

interface MusicFile {
  file: string;
  gain: number;
  /** muffled variant (storm drain: the Ballard track heard through the street) */
  lowpass?: number;
  rate?: number;
}
const MUSIC_FILES: Record<string, MusicFile> = {
  title: { file: 'title', gain: 0.5 }, // "Pearl City Beach" – Paper Twins
  ballard: { file: 'ballard', gain: 0.42 }, // "Feel So Right" – Dag Anderson
  flannel: { file: 'flannel', gain: 0.4 }, // "Wild in Seattle" – Rockin' For Decades
  drain: { file: 'ballard', gain: 0.38, lowpass: 650, rate: 0.94 },
  dusk: { file: 'dusk', gain: 0.42 }, // "Staycation" – Paper Twins
  goose: { file: 'goose', gain: 0.4 }, // "Gotta Catch That Unicorn" – Josef Bel Habib
};

type LoadState = 'loading' | 'ready' | 'failed';

interface MusicHandle {
  key: string;
  gain: GainNode;
  timer: number;
  stopped: boolean;
  source?: AudioBufferSourceNode;
}

class AudioManagerImpl {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private current: MusicHandle | null = null;
  private ducked = false;
  private hidden = false;
  private paused = false;
  private unlocked = false;
  private warnedMissing = new Set<string>();
  private base = 'assets/audio/';
  private raw = new Map<string, ArrayBuffer>();
  private buffers = new Map<string, AudioBuffer>();
  private loadState = new Map<string, LoadState>();
  private wantedMusic: string | null = null;

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        this.hidden = document.hidden;
        this.applyMasterGain();
      });
    }
  }

  /**
   * Fetch every audio file up front (no AudioContext needed). Decoding waits for unlock(),
   * because Web Audio may only start after a user gesture.
   */
  preload(base = 'assets/audio/'): void {
    this.base = base;
    const files = new Set([...Object.values(SAMPLE_SFX).map((s) => s.file), ...Object.values(MUSIC_FILES).map((m) => m.file)]);
    for (const file of files) {
      if (this.loadState.has(file)) continue;
      this.loadState.set(file, 'loading');
      fetch(`${this.base}${file}.mp3`)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`HTTP ${r.status}`))))
        .then((buf) => {
          this.raw.set(file, buf);
          this.decode(file);
        })
        .catch((err: unknown) => {
          this.loadState.set(file, 'failed');
          console.warn(`[audio] could not load ${file}.mp3 — using the synth fallback`, err);
          this.onFileSettled(file);
        });
    }
  }

  private decode(file: string): void {
    const ctx = this.ctx;
    const buf = this.raw.get(file);
    if (!ctx || !buf || this.buffers.has(file)) return;
    this.raw.delete(file);
    ctx
      .decodeAudioData(buf)
      .then((decoded) => {
        this.buffers.set(file, decoded);
        this.loadState.set(file, 'ready');
        this.onFileSettled(file);
      })
      .catch((err: unknown) => {
        this.loadState.set(file, 'failed');
        console.warn(`[audio] could not decode ${file}.mp3`, err);
        this.onFileSettled(file);
      });
  }

  /** A file finished loading (or failed): start the music that was waiting on it. */
  private onFileSettled(file: string): void {
    const want = this.wantedMusic;
    if (!want || this.current?.key === want) return;
    if (MUSIC_FILES[want]?.file === file) this.startMusic(want);
  }

  /** Must be called from a user gesture (any first input) — Web Audio starts suspended. */
  unlock(): void {
    if (this.unlocked) {
      if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.musicBus = this.ctx.createGain();
      this.musicBus.connect(this.master);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.connect(this.master);
      this.unlocked = true;
      this.applyVolumes();
      this.applyMasterGain();
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      for (const file of [...this.raw.keys()]) this.decode(file);
      if (this.wantedMusic) this.startMusic(this.wantedMusic);
    } catch (err) {
      console.warn('[audio] unavailable', err);
    }
  }

  /** test hook: load state of each audio file */
  status(): Record<string, string> {
    return Object.fromEntries(this.loadState);
  }

  /** test hook: which music key is actually playing */
  get playing(): string | null {
    return this.current?.key ?? null;
  }

  get isUnlocked(): boolean {
    return this.unlocked;
  }

  applyVolumes(): void {
    const o = Save.get().options;
    if (this.musicBus) this.musicBus.gain.value = o.musicVol * (this.ducked ? 0.35 : 1);
    if (this.sfxBus) this.sfxBus.gain.value = o.sfxVol;
  }

  private applyMasterGain(): void {
    if (!this.master || !this.ctx) return;
    const silent = this.hidden || this.paused;
    this.master.gain.setTargetAtTime(silent ? 0 : 1, this.ctx.currentTime, 0.05);
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    this.applyMasterGain();
  }

  duck(on: boolean): void {
    this.ducked = on;
    this.applyVolumes();
  }

  sfx(name: string): void {
    if (!this.ctx || !this.sfxBus) return;
    const sample = SAMPLE_SFX[name];
    const buffer = sample ? this.buffers.get(sample.file) : undefined;
    if (sample && buffer) {
      const src = this.ctx.createBufferSource();
      const g = this.ctx.createGain();
      src.buffer = buffer;
      g.gain.value = sample.gain;
      src.connect(g);
      g.connect(this.sfxBus);
      src.start();
      return;
    }
    const recipe = SFX[name];
    if (!recipe) {
      if (!this.warnedMissing.has(name)) {
        this.warnedMissing.add(name);
        console.warn(`[audio] no sfx recipe for "${name}"`);
      }
      return;
    }
    const t0 = this.ctx.currentTime;
    for (const tone of recipe) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = tone.w ?? 'square';
      const start = t0 + (tone.at ?? 0);
      osc.frequency.setValueAtTime(tone.f, start);
      if (tone.f2) osc.frequency.exponentialRampToValueAtTime(tone.f2, start + tone.d);
      g.gain.setValueAtTime(0.0001, start);
      g.gain.linearRampToValueAtTime(tone.g ?? 0.15, start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, start + tone.d);
      osc.connect(g);
      g.connect(this.sfxBus);
      osc.start(start);
      osc.stop(start + tone.d + 0.02);
    }
  }

  /** Crossfades to a procedural loop. Same key = no-op. */
  music(key: string | null): void {
    this.wantedMusic = key;
    if (this.current?.key === key) return;
    this.startMusic(key);
  }

  private startMusic(key: string | null): void {
    if (this.current?.key === key && this.current) return;
    const ctx = this.ctx;
    const file = key ? MUSIC_FILES[key] : undefined;
    // Recorded track still on its way: stay quiet (and keep the old track playing) until it lands.
    if (ctx && file && this.loadState.get(file.file) === 'loading') return;
    const prev = this.current;
    this.current = null;
    if (prev) this.fadeOut(prev);
    if (!key || !ctx || !this.musicBus) return;
    const buffer = file ? this.buffers.get(file.file) : undefined;
    if (file && buffer) {
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(file.gain, ctx.currentTime + CONFIG.MUSIC_CROSSFADE_MS / 1000);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      if (file.rate) src.playbackRate.value = file.rate;
      if (file.lowpass) {
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = file.lowpass;
        src.connect(lp);
        lp.connect(gain);
      } else {
        src.connect(gain);
      }
      gain.connect(this.musicBus);
      src.start();
      this.current = { key, gain, timer: 0, stopped: false, source: src };
      return;
    }
    const track = TRACKS[key];
    if (!track) {
      if (!this.warnedMissing.has(`music:${key}`)) {
        this.warnedMissing.add(`music:${key}`);
        console.warn(`[audio] no music placeholder for "${key}"`);
      }
      return;
    }
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(1, ctx.currentTime + CONFIG.MUSIC_CROSSFADE_MS / 1000);
    gain.connect(this.musicBus);
    const handle: MusicHandle = { key, gain, timer: 0, stopped: false };
    this.current = handle;
    this.schedule(handle, track);
  }

  stopMusic(): void {
    this.music(null);
  }

  private fadeOut(h: MusicHandle): void {
    if (!this.ctx) return;
    h.stopped = true;
    window.clearInterval(h.timer);
    const t = this.ctx.currentTime;
    h.gain.gain.cancelScheduledValues(t);
    h.gain.gain.setValueAtTime(h.gain.gain.value, t);
    h.gain.gain.linearRampToValueAtTime(0.0001, t + CONFIG.MUSIC_CROSSFADE_MS / 1000);
    window.setTimeout(() => {
      try {
        h.source?.stop();
      } catch {
        /* already stopped */
      }
      h.gain.disconnect();
    }, CONFIG.MUSIC_CROSSFADE_MS + 100);
  }

  private schedule(h: MusicHandle, track: Track): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const beat = 60 / track.bpm;
    const step = beat / 2; // eighth notes
    let nextTime = ctx.currentTime + 0.05;
    let index = 0;
    const tick = (): void => {
      if (h.stopped) return;
      while (nextTime < ctx.currentTime + 0.4) {
        const bar = Math.floor(index / 8) % 4;
        const sub = index % 8;
        const arp = track.arp[bar];
        this.pluck(h.gain, noteHz(arp[sub % arp.length]), nextTime, step * 0.9, track.wave, track.gain);
        if (sub % 4 === 0) this.pluck(h.gain, noteHz(track.bass[bar] - 12), nextTime, beat * 0.9, 'sine', track.gain * 1.4);
        if (sub % 2 === 0 && track.wave === 'sawtooth') this.pluck(h.gain, 60, nextTime, 0.05, 'square', track.gain * 0.8);
        nextTime += step;
        index++;
      }
    };
    tick();
    h.timer = window.setInterval(tick, 120);
  }

  private pluck(out: GainNode, hz: number, at: number, dur: number, wave: Wave, gain: number): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(hz, at);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(gain, at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(g);
    g.connect(out);
    osc.start(at);
    osc.stop(at + dur + 0.02);
  }
}

export const AudioManager = new AudioManagerImpl();
