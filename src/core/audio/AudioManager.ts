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
};

const A3 = 220;
const noteHz = (semi: number): number => A3 * Math.pow(2, semi / 12);

interface MusicHandle {
  key: string;
  gain: GainNode;
  timer: number;
  stopped: boolean;
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

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        this.hidden = document.hidden;
        this.applyMasterGain();
      });
    }
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
    } catch (err) {
      console.warn('[audio] unavailable', err);
    }
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
    if (this.current?.key === key) return;
    const prev = this.current;
    this.current = null;
    if (prev) this.fadeOut(prev);
    if (!key || !this.ctx || !this.musicBus) return;
    const track = TRACKS[key];
    if (!track) {
      if (!this.warnedMissing.has(`music:${key}`)) {
        this.warnedMissing.add(`music:${key}`);
        console.warn(`[audio] no music placeholder for "${key}"`);
      }
      return;
    }
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(1, this.ctx.currentTime + CONFIG.MUSIC_CROSSFADE_MS / 1000);
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
    window.setTimeout(() => h.gain.disconnect(), CONFIG.MUSIC_CROSSFADE_MS + 100);
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
