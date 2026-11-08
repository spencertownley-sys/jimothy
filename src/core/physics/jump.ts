import { CONFIG } from '../../config';

/**
 * The jump rules, isolated so a headless sim (tests/unit/jump.test.ts) and the Player share them.
 * Semi-implicit Euler, same order Arcade Physics uses: velocity first, then position.
 */
export interface JumpState {
  vy: number;
  holdMs: number;
  jumping: boolean;
  cut: boolean;
}

export function startJump(vx: number): JumpState {
  const bonus = Math.abs(vx) > CONFIG.RUN_JUMP_THRESHOLD ? CONFIG.RUN_JUMP_BONUS : 0;
  return { vy: CONFIG.JUMP_VELOCITY + bonus, holdMs: CONFIG.JUMP_HOLD_MS, jumping: true, cut: false };
}

/** Gravity multiplier for this step, given whether jump is held. Mutates hold/cut bookkeeping. */
export function jumpGravityScale(s: JumpState, holdingJump: boolean, dtMs: number): number {
  if (!s.jumping || s.vy >= 0) return 1;
  if (holdingJump && s.holdMs > 0) {
    s.holdMs -= dtMs;
    return CONFIG.JUMP_HOLD_GRAVITY_SCALE;
  }
  if (!holdingJump && !s.cut) {
    s.cut = true;
    s.holdMs = 0;
    s.vy *= CONFIG.JUMP_CUT_FACTOR;
  }
  return 1;
}

/** Pure sim: returns apex height in px for a jump where the button is held `holdFrames` frames. */
export function simulateJumpHeight(holdFrames: number, vx = 0): number {
  const dt = 1 / CONFIG.FIXED_FPS;
  const s = startJump(vx);
  let y = 0;
  let minY = 0;
  for (let frame = 0; frame < 300; frame++) {
    const holding = frame < holdFrames;
    const g = CONFIG.GRAVITY * jumpGravityScale(s, holding, dt * 1000);
    s.vy += g * dt;
    y += s.vy * dt;
    minY = Math.min(minY, y);
    if (s.vy > 0 && y >= 0) break;
  }
  return -minY;
}
