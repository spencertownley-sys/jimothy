import { emptySnapshot, INPUT_KEYS, type InputKey, type InputSnapshot, type InputSource } from './InputState';

/**
 * Mailbox for the on-screen controller (ui/TouchControls). Buttons call press/release as
 * fingers go down and up; InputState reads a snapshot once per fixed step. A tap that starts
 * and ends between two reads is latched so it still counts as one press.
 */
export class TouchSource implements InputSource {
  private held = new Set<InputKey>();
  private latched = new Set<InputKey>();

  press(key: InputKey): void {
    this.held.add(key);
    this.latched.add(key);
  }

  release(key: InputKey): void {
    this.held.delete(key);
  }

  /** Replace the whole held set (d-pad directions change together). */
  setHeld(keys: InputKey[], among: readonly InputKey[]): void {
    for (const k of among) {
      if (keys.includes(k)) {
        if (!this.held.has(k)) this.latched.add(k);
        this.held.add(k);
      } else this.held.delete(k);
    }
  }

  /** Legacy helper used by tests: set held keys from a partial snapshot. */
  set(next: Partial<InputSnapshot>): void {
    this.held.clear();
    for (const k of INPUT_KEYS) if (next[k]) this.press(k);
  }

  clear(): void {
    this.held.clear();
    this.latched.clear();
  }

  read(): InputSnapshot {
    const s = emptySnapshot();
    for (const k of INPUT_KEYS) s[k] = this.held.has(k) || this.latched.has(k);
    this.latched.clear();
    return s;
  }
}
