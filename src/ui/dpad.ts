import type { InputKey } from '../core/input/InputState';

/**
 * Touch d-pad geometry, kept free of the DOM so it can be unit tested.
 *
 * `dx`/`dy` are the thumb position from the pad centre, -1..1 across its box (y grows down).
 * Directions are angle sectors, eight-way like a real d-pad: up-right means jump *and* right, so
 * a thumb rolled toward the corner doesn't cancel the jump mid-air.
 *
 * Every edge has hysteresis: a held direction lets go only once the thumb is clearly past its
 * edge. Without it a resting thumb sitting on a boundary flickers the key every few touchmove
 * events. A flicker of `jump` cuts the jump short and then re-buffers a fresh one, so the hop
 * height came out different from press to press.
 */
export const DPAD = {
  /** distance from the centre a fresh touch must reach before anything is pressed */
  DEAD_IN: 0.22,
  /** …and how close it must come back before everything lets go */
  DEAD_OUT: 0.14,
  /** up (jump) covers this many degrees either side of straight up */
  UP_HALF_DEG: 55,
  /** down covers this many degrees either side of straight down */
  DOWN_HALF_DEG: 55,
  /** left / right each cover this many degrees either side of horizontal */
  SIDE_HALF_DEG: 70,
  /** a held direction's sector grows by this much before it lets go */
  HYSTERESIS_DEG: 12,
} as const;

/** Signed angle from `centerDeg`, folded into -180..180. */
function offset(angleDeg: number, centerDeg: number): number {
  let d = angleDeg - centerDeg;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return Math.abs(d);
}

export function dpadKeys(dx: number, dy: number, prev: readonly InputKey[] = []): InputKey[] {
  const r = Math.hypot(dx, dy);
  const dead = prev.length > 0 ? DPAD.DEAD_OUT : DPAD.DEAD_IN;
  if (r < dead) return [];
  // 0° = right, 90° = up (screen y is flipped)
  const angle = (Math.atan2(-dy, dx) * 180) / Math.PI;
  const within = (key: InputKey, centerDeg: number, halfDeg: number): boolean =>
    offset(angle, centerDeg) <= halfDeg + (prev.includes(key) ? DPAD.HYSTERESIS_DEG : 0);
  const keys: InputKey[] = [];
  if (within('right', 0, DPAD.SIDE_HALF_DEG)) keys.push('right');
  if (within('left', 180, DPAD.SIDE_HALF_DEG)) keys.push('left');
  if (within('jump', 90, DPAD.UP_HALF_DEG)) keys.push('jump');
  if (within('down', -90, DPAD.DOWN_HALF_DEG)) keys.push('down');
  return keys;
}
