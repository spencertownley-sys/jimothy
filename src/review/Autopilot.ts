import { CONFIG } from '../config';
import { emptySnapshot, type InputSnapshot } from '../core/input/InputState';
import type { GameScene } from '../scenes/GameScene';

/**
 * One instruction in a level's review route (src/review/routes.ts). Columns are tile columns;
 * the autopilot aims for the middle of the column.
 *
 * - `to`    run (or `sprint`) to a column, hopping walls and gaps on its own
 * - `jump`  jump now, holding the button `hold` ms (250 = full height), steering `dir` or
 *           toward column `to` until he lands
 * - `wait`  stand still for `ms`
 * - `until` hold `dir` (default: stand still) until the predicate is true (gates, geysers…)
 * - `press` hold `down` or `a` for `ms`
 * - `note`  just a caption on the timeline
 *
 * Any instruction can carry a `note`: the caption shown when it starts.
 */
export type RouteCmd =
  | { to: number; sprint?: boolean; crouch?: boolean; noJump?: boolean; air?: boolean; tol?: number; note?: string }
  | { jump: number; dir?: -1 | 0 | 1; to?: number; sprint?: boolean; note?: string }
  | { wait: number; note?: string }
  | { until: (gs: GameScene) => boolean; dir?: -1 | 0 | 1; sprint?: boolean; max?: number; note?: string }
  | { press: 'down' | 'a'; ms: number; dir?: -1 | 0 | 1; note?: string }
  | { note: string };

const T = CONFIG.TILE;
const STEP_MS = 1000 / CONFIG.FIXED_FPS;

/** Autopilot tuning: how far ahead it looks, how long it waits before deciding it's stuck. */
export const AUTOPILOT = {
  /** px past his leading edge the "is there floor ahead?" probe looks */
  GAP_LOOKAHEAD: 6,
  /** px past his leading edge the "is there a wall ahead?" probe looks */
  WALL_LOOKAHEAD: 10,
  /** a drop deeper than this many tiles counts as a gap to jump */
  GAP_DEPTH_TILES: 3,
  /** column centre ± this many px counts as arrived */
  ARRIVE_TOL: 14,
  /** no sideways progress for this long while trying to move → jump */
  STUCK_MS: 450,
  /** full-height hold */
  FULL_HOLD_MS: 300,
  /** give up on an instruction after this long (keeps a broken route from hanging the review) */
  CMD_TIMEOUT_MS: 25000,
} as const;

/**
 * Drives Jimothy through a level for the route review. Pure function of the game state it
 * reads, so a replay from the start reproduces the same run step for step — that's what lets
 * the review rewind.
 */
export class Autopilot {
  private idx = 0;
  private cmdMs = 0;
  private started = false;
  /** jump bookkeeping */
  private jumpHeldMs = 0;
  private jumpHoldFor = 0;
  private jumping = false;
  private wasJumpDown = false;
  private leftGround = false;
  private stuckMs = 0;
  private lastX = NaN;
  private crouchUnder = false;

  constructor(private readonly route: readonly RouteCmd[]) {}

  get done(): boolean {
    return this.idx >= this.route.length;
  }

  /** Inputs for the next fixed step. */
  next(gs: GameScene): InputSnapshot {
    const out = emptySnapshot();
    const p = gs.player;
    if (!p || p.fsm === 'Dead' || p.fsm === 'Victory') return out;
    // finished the script: keep walking right (most levels end at the exit on the right)
    const cmd = this.route[this.idx];
    if (!cmd) {
      this.drive(gs, out, 1, false, false);
      return out;
    }
    if (!this.started) {
      this.started = true;
      this.cmdMs = 0;
      this.stuckMs = 0;
      this.leftGround = false;
      if (cmd.note) gs.reviewNote(cmd.note);
    }
    this.cmdMs += STEP_MS;
    const finished = this.run(cmd, gs, out) || this.cmdMs > AUTOPILOT.CMD_TIMEOUT_MS;
    this.wasJumpDown = out.jump;
    if (finished) {
      this.idx += 1;
      this.started = false;
    }
    return out;
  }

  /** Returns true when the instruction is complete. */
  private run(cmd: RouteCmd, gs: GameScene, out: InputSnapshot): boolean {
    const p = gs.player;
    const grounded = p.lastGrounded;
    if ('to' in cmd && !('jump' in cmd)) {
      const tx = cmd.to * T + T / 2;
      const dx = tx - p.x;
      const tol = cmd.tol ?? AUTOPILOT.ARRIVE_TOL;
      if (Math.abs(dx) <= tol) {
        this.holdJump(out, p.body.velocity.y);
        return grounded || cmd.air === true;
      }
      if (cmd.crouch) out.down = true;
      this.drive(gs, out, dx > 0 ? 1 : -1, cmd.sprint === true, cmd.noJump === true);
      return false;
    }
    if ('jump' in cmd) {
      const dir = cmd.to !== undefined ? Math.sign(cmd.to * T + T / 2 - p.x) : (cmd.dir ?? 0);
      if (cmd.to !== undefined && Math.abs(cmd.to * T + T / 2 - p.x) <= AUTOPILOT.ARRIVE_TOL) {
        // over the target: stop steering and drop onto it
      } else if (dir > 0) out.right = true;
      else if (dir < 0) out.left = true;
      out.b = cmd.sprint === true;
      if (!this.jumping && !this.leftGround) {
        if (grounded && !this.wasJumpDown) this.startJump(out, cmd.jump);
        return false;
      }
      this.holdJump(out, p.body.velocity.y);
      if (!grounded) this.leftGround = true;
      return this.leftGround && grounded && p.body.velocity.y >= 0;
    }
    if ('wait' in cmd) {
      this.holdJump(out, p.body.velocity.y);
      return this.cmdMs >= cmd.wait;
    }
    if ('until' in cmd) {
      if (cmd.dir) this.drive(gs, out, cmd.dir, cmd.sprint === true, false);
      return cmd.until(gs) || this.cmdMs >= (cmd.max ?? AUTOPILOT.CMD_TIMEOUT_MS);
    }
    if ('press' in cmd) {
      out[cmd.press] = true;
      if (cmd.dir) out[cmd.dir > 0 ? 'right' : 'left'] = true;
      return this.cmdMs >= cmd.ms;
    }
    return true; // a bare note
  }

  /** Walk/run one way, hopping walls, gaps and anything he's stuck on. */
  private drive(gs: GameScene, out: InputSnapshot, dir: 1 | -1, sprint: boolean, noJump: boolean): void {
    const p = gs.player;
    const b = p.body;
    out[dir > 0 ? 'right' : 'left'] = true;
    out.b = sprint;
    if (this.jumping) {
      this.holdJump(out, b.velocity.y);
      return;
    }
    if (!p.lastGrounded || noJump) {
      this.lastX = NaN;
      return;
    }
    const front = dir > 0 ? b.right : b.left;
    const feet = b.bottom;
    const gx = front + dir * AUTOPILOT.GAP_LOOKAHEAD;
    let floor = false;
    for (let y = feet + 4; y <= feet + AUTOPILOT.GAP_DEPTH_TILES * T; y += T / 4) {
      if (gs.reviewSolidAt(gx, y)) {
        floor = true;
        break;
      }
    }
    const wx = front + dir * AUTOPILOT.WALL_LOOKAHEAD;
    const low = gs.reviewSolidAt(wx, feet - 10, true);
    const high = gs.reviewSolidAt(wx, b.top + 6, true);
    if (floor) {
      // an overhang only big Jimothy bumps his head on: crouch-walk under it, and stay down
      // until there's standing room above him and just ahead
      const headY = feet - CONFIG.HITBOX.big.h + 4;
      if (this.crouchUnder) {
        if ([b.left + 2, p.x, b.right - 2, wx].some((x) => gs.reviewSolidAt(x, headY, true))) {
          out.down = true;
          this.lastX = NaN;
          return;
        }
        this.crouchUnder = false;
      }
      if (high && !low && p.power !== 'small' && !gs.reviewSolidAt(wx, feet - CONFIG.HITBOX.crouchBig.h - 2, true)) {
        this.crouchUnder = true;
        out.down = true;
        this.lastX = NaN;
        return;
      }
    }
    if (Number.isFinite(this.lastX) && Math.abs(p.x - this.lastX) < 0.5) this.stuckMs += STEP_MS;
    else this.stuckMs = 0;
    this.lastX = p.x;
    if ((low || high || !floor || this.stuckMs >= AUTOPILOT.STUCK_MS) && !this.wasJumpDown) {
      this.stuckMs = 0;
      this.crouchUnder = false;
      this.startJump(out, AUTOPILOT.FULL_HOLD_MS);
    }
  }

  private startJump(out: InputSnapshot, holdMs: number): void {
    out.jump = true;
    this.jumping = true;
    this.jumpHeldMs = 0;
    this.jumpHoldFor = holdMs;
  }

  /** Keep the button down for the planned hold, then let go (the jump cut). */
  private holdJump(out: InputSnapshot, vy: number): void {
    if (!this.jumping) return;
    this.jumpHeldMs += STEP_MS;
    if (this.jumpHeldMs <= this.jumpHoldFor && (this.jumpHeldMs < 50 || vy < 0)) out.jump = true;
    else this.jumping = false;
  }
}
