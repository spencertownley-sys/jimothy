import levelsJson from './levels.json';

export interface LevelDef {
  id: string;
  world: number;
  name: string;
  file: string | null;
  music: string;
  parallaxSet: string;
  timeLimit: number;
  autoScroll: number;
  wind: number;
  par: number;
  next?: string;
  hidden?: boolean;
  parent?: string;
  map?: { x: number; y: number };
  /** story key of the postcard shown after clearing (end of a world) */
  postcard?: string;
}

export const LEVELS: LevelDef[] = levelsJson as LevelDef[];

export function levelById(id: string): LevelDef | undefined {
  return LEVELS.find((l) => l.id === id);
}

/** Levels shown on the world map, in order. */
export function mapLevels(): LevelDef[] {
  return LEVELS.filter((l) => !l.hidden && l.map);
}

/** The level a clear should unlock (skips hidden bonus rooms). */
export function nextLevelId(id: string): string | undefined {
  const def = levelById(id);
  const target = def?.next ? levelById(def.next) : undefined;
  return target?.id;
}
