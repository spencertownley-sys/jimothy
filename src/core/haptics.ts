import { Save } from './save/Save';

/**
 * Haptic feedback for gameplay moments (button presses, block bumps, hits, power-ups…).
 *
 * Tries, in order: the Capacitor Haptics plugin (the v2 phone app), the Vibration API
 * (Android browsers), and the Safari 18 `<input switch>` tick (iPhone browsers, one short tap
 * per pulse). A connected gamepad with a rumble motor also rumbles for gameplay events (not for
 * button taps: those buttons are physical already). Browsers that support none of these, and
 * pages embedded in a cross-origin frame where vibration is blocked, simply get no haptics;
 * nothing throws.
 */
export type HapticKind =
  | 'tap' | 'bump' | 'brick' | 'stomp' | 'hurt' | 'peck' | 'die' | 'powerup' | 'oneup' | 'geoduck' | 'checkpoint' | 'clear';

// Vibration patterns in ms (on, off, on…). Short and distinct so each event reads differently.
// Anything under ~10 ms is below what most phone motors can render, so the button tap is 14.
export const HAPTIC_PATTERNS: Record<HapticKind, number[]> = {
  tap: [14],
  bump: [18],
  brick: [14, 30, 26],
  stomp: [24],
  hurt: [60, 40, 60],
  // hit by a gull, crow or goose: two quick pecks and a thump
  peck: [28, 34, 28, 40, 110],
  die: [120, 60, 220],
  powerup: [20, 40, 20, 40, 70],
  oneup: [30, 50, 30, 50, 30],
  geoduck: [15, 30, 15, 30, 90],
  checkpoint: [35],
  clear: [40, 60, 40, 60, 140],
};

/**
 * Higher wins. `navigator.vibrate` replaces whatever pattern is playing, so without this the
 * next button tap (a few ms later — you're always pressing something) would cut a hit short.
 */
export const HAPTIC_PRIORITY: Record<HapticKind, number> = {
  tap: 0,
  bump: 1, brick: 1, stomp: 1, checkpoint: 1,
  powerup: 2, oneup: 2, geoduck: 2, clear: 2,
  hurt: 3, peck: 3,
  die: 4,
};

const MIN_GAP_MS = 45;

/** Total length of a pattern, on and off. */
export function patternMs(pattern: readonly number[]): number {
  return pattern.reduce((a, b) => a + b, 0);
}

/**
 * Should `kind` play now? Pure so it can be unit tested. `busy` describes the pattern that is
 * still playing (if any).
 */
export function shouldPulse(kind: HapticKind, nowMs: number, lastAt: number, busy: { untilMs: number; priority: number }): boolean {
  const priority = HAPTIC_PRIORITY[kind];
  if (nowMs < busy.untilMs && priority < busy.priority) return false;
  if (nowMs - lastAt < MIN_GAP_MS && priority < HAPTIC_PRIORITY.hurt && priority <= busy.priority) return false;
  return true;
}

interface CapacitorHaptics {
  vibrate(opts: { duration: number }): Promise<void>;
  impact(opts: { style: 'LIGHT' | 'MEDIUM' | 'HEAVY' }): Promise<void>;
}

function capacitorHaptics(): CapacitorHaptics | undefined {
  const cap = (globalThis as unknown as { Capacitor?: { Plugins?: { Haptics?: CapacitorHaptics } } }).Capacitor;
  return cap?.Plugins?.Haptics;
}

let iosSwitch: HTMLLabelElement | null = null;
function iosTick(): boolean {
  if (typeof document === 'undefined') return false;
  if (!iosSwitch) {
    const label = document.createElement('label');
    label.setAttribute('aria-hidden', 'true');
    label.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    input.tabIndex = -1;
    label.appendChild(input);
    document.body.appendChild(label);
    iosSwitch = label;
  }
  iosSwitch.click();
  return true;
}

const isIOS = (): boolean =>
  typeof navigator !== 'undefined' && /iP(hone|ad|od)/.test(navigator.userAgent) && !('vibrate' in navigator);

/** Rumble any connected pad that has a motor (Chrome / Edge / Firefox "dual-rumble"). */
function rumblePads(pattern: readonly number[], priority: number): void {
  if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') return;
  const strong = Math.min(1, 0.25 + priority * 0.2);
  for (const pad of Array.from(navigator.getGamepads())) {
    const act = (pad as (Gamepad & { vibrationActuator?: { playEffect?: (t: string, p: object) => Promise<unknown> } }) | null)?.vibrationActuator;
    if (!act?.playEffect) continue;
    let t = 0;
    pattern.forEach((ms, i) => {
      if (i % 2 === 0) {
        const play = (): void => void act.playEffect?.('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: 0.6 })?.catch(() => undefined);
        if (t === 0) play();
        else setTimeout(play, t);
      }
      t += ms;
    });
  }
}

let lastAt = -Infinity;
const busy = { untilMs: 0, priority: -1 };

export const Haptics = {
  enabled(): boolean {
    return Save.get().options.haptics;
  },

  pulse(kind: HapticKind): void {
    if (!this.enabled()) return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (!shouldPulse(kind, now, lastAt, busy)) return;
    const pattern = HAPTIC_PATTERNS[kind];
    const priority = HAPTIC_PRIORITY[kind];
    lastAt = now;
    busy.untilMs = now + patternMs(pattern);
    busy.priority = priority;
    try {
      if (kind !== 'tap') rumblePads(pattern, priority);
      const cap = capacitorHaptics();
      if (cap) {
        // one impact per "on" segment, so a peck-peck-thump feels like one
        let t = 0;
        pattern.forEach((ms, i) => {
          if (i % 2 === 0) {
            const style = ms >= 90 ? 'HEAVY' : ms >= 25 ? 'MEDIUM' : 'LIGHT';
            const hit = (): void => void cap.impact({ style }).catch(() => undefined);
            if (t === 0) hit();
            else setTimeout(hit, t);
          }
          t += ms;
        });
        return;
      }
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern);
        return;
      }
      if (isIOS()) {
        // One tick per "on" segment. The first one runs synchronously: Safari only lets the switch
        // tick inside the user's touch, and a setTimeout (even 0 ms) leaves that gesture behind.
        let t = 0;
        pattern.forEach((ms, i) => {
          if (i % 2 === 0) {
            if (t === 0) iosTick();
            else setTimeout(iosTick, t);
          }
          t += ms;
        });
      }
    } catch {
      /* haptics are a nicety; never break the game over them */
    }
  },
};
