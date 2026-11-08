export interface SaveOptions {
  musicVol: number;
  sfxVol: number;
  keymap: Record<string, string>;
  gamepadPreset: 'classic' | 'modern';
  touchLayout: 'classic' | 'jumpButton';
  showTimer: boolean;
  drizzle: boolean;
  reduceMotion: boolean;
  haptics: boolean;
}

export interface SaveV1 {
  v: 1;
  unlocked: string[];
  cleared: string[];
  geoducks: Record<string, boolean[]>;
  lattesTotal: number;
  bestTimes: Record<string, number>;
  options: SaveOptions;
}

export const FIRST_LEVEL = '1-1';

export function freshSave(): SaveV1 {
  return {
    v: 1,
    unlocked: [FIRST_LEVEL],
    cleared: [],
    geoducks: {},
    lattesTotal: 0,
    bestTimes: {},
    options: {
      musicVol: 0.7,
      sfxVol: 0.9,
      keymap: {},
      gamepadPreset: 'classic',
      touchLayout: 'jumpButton',
      showTimer: false,
      drizzle: true,
      reduceMotion: false,
      haptics: true,
    },
  };
}

/**
 * Takes anything parsed from storage and returns a valid SaveV1. Unknown or corrupt input yields
 * a fresh save; older versions get their migration step here as the schema grows.
 */
export function migrate(raw: unknown): SaveV1 {
  if (!raw || typeof raw !== 'object') return freshSave();
  const r = raw as Record<string, unknown>;
  const fresh = freshSave();
  if (r.v !== 1) return fresh; // no older versions exist yet; v2 migration goes here
  const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
  const opts = (r.options && typeof r.options === 'object' ? (r.options as Partial<SaveOptions>) : {}) as Partial<SaveOptions>;
  const num = (v: unknown, d: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);
  const geoducks: Record<string, boolean[]> = {};
  if (r.geoducks && typeof r.geoducks === 'object') {
    for (const [k, v] of Object.entries(r.geoducks as Record<string, unknown>)) {
      if (Array.isArray(v)) geoducks[k] = [0, 1, 2].map((i) => v[i] === true);
    }
  }
  const bestTimes: Record<string, number> = {};
  if (r.bestTimes && typeof r.bestTimes === 'object') {
    for (const [k, v] of Object.entries(r.bestTimes as Record<string, unknown>)) if (typeof v === 'number') bestTimes[k] = v;
  }
  const unlocked = strArr(r.unlocked);
  if (!unlocked.includes(FIRST_LEVEL)) unlocked.unshift(FIRST_LEVEL);
  return {
    v: 1,
    unlocked,
    cleared: strArr(r.cleared),
    geoducks,
    lattesTotal: num(r.lattesTotal, 0),
    bestTimes,
    options: {
      musicVol: Math.min(1, Math.max(0, num(opts.musicVol, fresh.options.musicVol))),
      sfxVol: Math.min(1, Math.max(0, num(opts.sfxVol, fresh.options.sfxVol))),
      keymap: opts.keymap && typeof opts.keymap === 'object' ? { ...opts.keymap } : {},
      gamepadPreset: opts.gamepadPreset === 'modern' ? 'modern' : 'classic',
      touchLayout: opts.touchLayout === 'classic' ? 'classic' : 'jumpButton',
      showTimer: opts.showTimer === true,
      drizzle: opts.drizzle !== false,
      reduceMotion: opts.reduceMotion === true,
      haptics: opts.haptics !== false,
    },
  };
}
