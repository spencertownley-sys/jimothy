import { emptySnapshot, INPUT_KEYS, type InputKey, type InputSnapshot, type InputSource } from './InputState';

/** Which on-screen control is holding a key (the d-pad, the Jump button, …). */
export type TouchOwner = string;

const DEFAULT_OWNER: TouchOwner = 'touch';

/**
 * Mailbox for the on-screen controller (ui/TouchControls). Buttons call press/release as
 * fingers go down and up; InputState reads a snapshot once per fixed step. A tap that starts
 * and ends between two reads is latched so it still counts as one press.
 *
 * Every hold belongs to a control. Two controls can hold the same key (up on the d-pad and the
 * Jump button both mean `jump`), and a key stays down until *every* control holding it lets go.
 * Before this, a d-pad move dropped `jump` even while a thumb was still on the Jump button, which
 * cut the jump short: the "sometimes he jumps high, sometimes short" bug.
 */
export class TouchSource implements InputSource {
  private held = new Map<InputKey, Set<TouchOwner>>();
  private latched = new Set<InputKey>();

  private holders(key: InputKey): Set<TouchOwner> {
    let s = this.held.get(key);
    if (!s) {
      s = new Set();
      this.held.set(key, s);
    }
    return s;
  }

  isHeld(key: InputKey): boolean {
    return (this.held.get(key)?.size ?? 0) > 0;
  }

  press(key: InputKey, owner: TouchOwner = DEFAULT_OWNER): void {
    if (!this.isHeld(key)) this.latched.add(key);
    this.holders(key).add(owner);
  }

  release(key: InputKey, owner: TouchOwner = DEFAULT_OWNER): void {
    this.held.get(key)?.delete(owner);
  }

  /** Replace what one control holds among `among` (the d-pad's directions change together). */
  setHeld(keys: readonly InputKey[], among: readonly InputKey[], owner: TouchOwner = DEFAULT_OWNER): void {
    for (const k of among) {
      if (keys.includes(k)) this.press(k, owner);
      else this.release(k, owner);
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
    for (const k of INPUT_KEYS) s[k] = this.isHeld(k) || this.latched.has(k);
    this.latched.clear();
    return s;
  }
}
