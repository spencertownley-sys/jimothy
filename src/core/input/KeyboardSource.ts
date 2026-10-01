import { emptySnapshot, type InputKey, type InputSnapshot, type InputSource } from './InputState';
import { DEFAULT_KEYMAP, type Keymap } from './keymap';

const SCROLL_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space']);

/** Listens on window in the capture phase so arrows/space never scroll the page. */
export class KeyboardSource implements InputSource {
  private down = new Set<string>();
  /** Codes pressed since the last read — a tap shorter than one frame still counts as a press. */
  private latched = new Set<string>();
  private keymap: Keymap;
  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (SCROLL_KEYS.has(e.code)) e.preventDefault();
    if (!e.repeat) this.latched.add(e.code);
    this.down.add(e.code);
  };
  private readonly onKeyUp = (e: KeyboardEvent): void => {
    if (SCROLL_KEYS.has(e.code)) e.preventDefault();
    this.down.delete(e.code);
  };
  private readonly onBlur = (): void => {
    this.down.clear();
    this.latched.clear();
  };

  constructor(keymap: Keymap = DEFAULT_KEYMAP, target: Window | undefined = typeof window !== 'undefined' ? window : undefined) {
    this.keymap = keymap;
    if (target) {
      target.addEventListener('keydown', this.onKeyDown, { capture: true });
      target.addEventListener('keyup', this.onKeyUp, { capture: true });
      target.addEventListener('blur', this.onBlur);
    }
  }

  setKeymap(keymap: Keymap): void {
    this.keymap = keymap;
  }

  /** Test hook / programmatic press. */
  setCode(code: string, isDown: boolean): void {
    if (isDown) {
      this.down.add(code);
      this.latched.add(code);
    } else this.down.delete(code);
  }

  isDown(key: InputKey): boolean {
    return this.keymap[key].some((code) => this.down.has(code) || this.latched.has(code));
  }

  read(): InputSnapshot {
    const s = emptySnapshot();
    for (const k of Object.keys(s) as InputKey[]) s[k] = this.isDown(k);
    this.latched.clear();
    return s;
  }

  destroy(target: Window | undefined = typeof window !== 'undefined' ? window : undefined): void {
    if (!target) return;
    target.removeEventListener('keydown', this.onKeyDown, { capture: true });
    target.removeEventListener('keyup', this.onKeyUp, { capture: true });
    target.removeEventListener('blur', this.onBlur);
  }
}
