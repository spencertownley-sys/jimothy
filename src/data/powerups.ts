import type { PowerState } from '../config';

export type PowerUpKind = 'teriyaki' | 'jacket' | 'flannel' | 'star' | 'doubleshot';

export interface PowerUpDef {
  kind: PowerUpKind;
  frame: string;
  /** Mushroom-style walker or static (Double Shot). */
  walks: boolean;
  sfx: string;
  label: string;
}

export const POWERUPS: Record<PowerUpKind, PowerUpDef> = {
  teriyaki: { kind: 'teriyaki', frame: 'teriyaki', walks: true, sfx: 'grow', label: 'Teriyaki Bowl' },
  jacket: { kind: 'jacket', frame: 'jacket', walks: true, sfx: 'grow', label: 'Rain Jacket' },
  flannel: { kind: 'flannel', frame: 'flannel', walks: true, sfx: 'flannel', label: 'Flannel' },
  star: { kind: 'star', frame: 'star', walks: true, sfx: 'oneup', label: 'Loyalty Star' },
  doubleshot: { kind: 'doubleshot', frame: 'doubleshot', walks: false, sfx: 'latte', label: 'Double Shot' },
};

/** Mario rule: a Mushroom block gives a Fire Flower once you're already big. */
export function resolveBlockItem(item: string, power: PowerState): PowerUpKind | 'latte' | 'geoduck' {
  if (item === 'teriyaki' && power !== 'small') return 'jacket';
  if (item in POWERUPS) return item as PowerUpKind;
  if (item === 'geoduck' || item.startsWith('geoduck:')) return 'geoduck';
  return 'latte';
}

/** How many hits Jimothy can take in each power state (GDD §3.4). */
export function heartsFor(power: PowerState): number {
  return power === 'jacket' ? 3 : power === 'big' ? 2 : 1;
}

export function powerAfterHit(power: PowerState): PowerState | 'dead' {
  if (power === 'jacket') return 'big';
  if (power === 'big') return 'small';
  return 'dead';
}
