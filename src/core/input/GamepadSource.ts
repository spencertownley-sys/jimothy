import { emptySnapshot, type InputSnapshot, type InputSource } from './InputState';

export type GamepadPreset = 'classic' | 'modern';

const DEAD = 0.5;

/**
 * Standard-mapping gamepad. "classic" keeps parity with the keyboard: d-pad up (or stick up)
 * jumps, button 0 = A, button 1 = B. "modern" puts jump on button 0 and A on button 2.
 */
export class GamepadSource implements InputSource {
  preset: GamepadPreset = 'classic';
  private getPads: () => (Gamepad | null)[];

  constructor(getPads?: () => (Gamepad | null)[]) {
    this.getPads =
      getPads ??
      (() => (typeof navigator !== 'undefined' && navigator.getGamepads ? Array.from(navigator.getGamepads()) : []));
  }

  read(): InputSnapshot {
    const s = emptySnapshot();
    for (const pad of this.getPads()) {
      if (!pad || !pad.connected) continue;
      const b = (i: number): boolean => Boolean(pad.buttons[i]?.pressed);
      const ax = pad.axes[0] ?? 0;
      const ay = pad.axes[1] ?? 0;
      s.left ||= b(14) || ax < -DEAD;
      s.right ||= b(15) || ax > DEAD;
      s.down ||= b(13) || ay > DEAD;
      s.start ||= b(9);
      if (this.preset === 'modern') {
        s.jump ||= b(0) || b(12) || ay < -DEAD;
        s.a ||= b(2);
        s.b ||= b(1);
      } else {
        s.jump ||= b(12) || ay < -DEAD;
        s.a ||= b(0);
        s.b ||= b(1);
      }
    }
    return s;
  }
}
