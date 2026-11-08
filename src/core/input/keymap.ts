import type { InputKey } from './InputState';

export type Keymap = Record<InputKey, string[]>;

// KeyboardEvent.code values. GDD §7: ← → ↓ ↑=jump, A=a (throw), S=b (sprint), Space=start.
export const DEFAULT_KEYMAP: Keymap = {
  left: ['ArrowLeft'],
  right: ['ArrowRight'],
  down: ['ArrowDown'],
  jump: ['ArrowUp'],
  a: ['KeyA'],
  b: ['KeyS'],
  start: ['Space', 'Enter'],
};

/** Merges a (possibly partial / stale) saved map over the defaults. */
export function resolveKeymap(saved: Partial<Record<string, string>> | undefined): Keymap {
  const map: Keymap = { ...DEFAULT_KEYMAP };
  if (!saved) return map;
  for (const key of Object.keys(map) as InputKey[]) {
    const code = saved[key];
    if (typeof code === 'string' && code.length > 0) map[key] = [code];
  }
  return map;
}
