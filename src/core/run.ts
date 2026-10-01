import { CONFIG, type PowerState } from '../config';

/** Per-session state (not saved): lives, lattes, power, checkpoint. */
export interface RunState {
  lives: number;
  lattes: number;
  power: PowerState;
  levelId: string;
  geoducksFound: boolean[];
  checkpoint: { levelId: string; x: number; y: number } | null;
  elapsedMs: number;
  /** Lattes collected since the level began (survives drain trips; shown on Level Clear). */
  lattesThisLevel: number;
}

export function newRun(levelId: string): RunState {
  return {
    lives: CONFIG.START_LIVES,
    lattes: 0,
    power: 'small',
    levelId,
    geoducksFound: [false, false, false],
    checkpoint: null,
    elapsedMs: 0,
    lattesThisLevel: 0,
  };
}

export const RUN_KEY = 'run';
