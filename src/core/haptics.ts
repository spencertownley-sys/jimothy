import { Save } from './save/Save';

/**
 * Haptic feedback for gameplay moments (block bumps, hits, power-ups…).
 *
 * Tries, in order: the Capacitor Haptics plugin (the v2 phone app), the Vibration API
 * (Android browsers), and the Safari 18 `<input switch>` tick (iPhone browsers, one short tap
 * per pulse). Browsers that support none of these, and pages embedded in a cross-origin frame
 * where vibration is blocked, simply get no haptics; nothing throws.
 */
export type HapticKind =
  | 'tap' | 'bump' | 'brick' | 'stomp' | 'hurt' | 'die' | 'powerup' | 'oneup' | 'geoduck' | 'checkpoint' | 'clear';

// Vibration patterns in ms (on, off, on…). Short and distinct so each event reads differently.
export const HAPTIC_PATTERNS: Record<HapticKind, number[]> = {
  tap: [6],
  bump: [18],
  brick: [14, 30, 26],
  stomp: [24],
  hurt: [60, 40, 60],
  die: [120, 60, 220],
  powerup: [20, 40, 20, 40, 70],
  oneup: [30, 50, 30, 50, 30],
  geoduck: [15, 30, 15, 30, 90],
  checkpoint: [35],
  clear: [40, 60, 40, 60, 140],
};

const MIN_GAP_MS = 45;

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

let lastAt = 0;

export const Haptics = {
  enabled(): boolean {
    return Save.get().options.haptics;
  },

  pulse(kind: HapticKind): void {
    if (!this.enabled()) return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - lastAt < MIN_GAP_MS && kind !== 'die' && kind !== 'hurt') return;
    lastAt = now;
    const pattern = HAPTIC_PATTERNS[kind];
    try {
      const cap = capacitorHaptics();
      if (cap) {
        const total = pattern.filter((_, i) => i % 2 === 0).reduce((a, b) => a + b, 0);
        void cap.impact({ style: total > 100 ? 'HEAVY' : total > 40 ? 'MEDIUM' : 'LIGHT' }).catch(() => undefined);
        return;
      }
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern);
        return;
      }
      if (isIOS()) {
        // one tick per "on" segment, spaced by the pattern
        let t = 0;
        pattern.forEach((ms, i) => {
          if (i % 2 === 0) setTimeout(iosTick, t);
          t += ms;
        });
      }
    } catch {
      /* haptics are a nicety; never break the game over them */
    }
  },
};
