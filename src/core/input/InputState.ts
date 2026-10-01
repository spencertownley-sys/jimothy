// The only thing gameplay ever reads. Keyboard, gamepad and touch each produce a snapshot;
// InputState ORs them together once per fixed step and does edge detection.
export type InputKey = 'left' | 'right' | 'down' | 'jump' | 'a' | 'b' | 'start';
export const INPUT_KEYS: readonly InputKey[] = ['left', 'right', 'down', 'jump', 'a', 'b', 'start'];

export type InputSnapshot = Record<InputKey, boolean>;

export interface InputSource {
  read(): InputSnapshot;
}

export function emptySnapshot(): InputSnapshot {
  return { left: false, right: false, down: false, jump: false, a: false, b: false, start: false };
}

export class InputState {
  private cur: InputSnapshot = emptySnapshot();
  private prev: InputSnapshot = emptySnapshot();
  private sources: InputSource[] = [];

  constructor(sources: InputSource[] = []) {
    this.sources = [...sources];
  }

  addSource(source: InputSource): void {
    this.sources.push(source);
  }

  removeSource(source: InputSource): void {
    this.sources = this.sources.filter((s) => s !== source);
  }

  /** Snapshot all sources. Call exactly once per fixed step. */
  update(): void {
    this.prev = this.cur;
    const next = emptySnapshot();
    for (const src of this.sources) {
      const s = src.read();
      for (const k of INPUT_KEYS) if (s[k]) next[k] = true;
    }
    this.cur = next;
  }

  get(key: InputKey): boolean {
    return this.cur[key];
  }

  justPressed(key: InputKey): boolean {
    return this.cur[key] && !this.prev[key];
  }

  justReleased(key: InputKey): boolean {
    return !this.cur[key] && this.prev[key];
  }

  /** Horizontal axis: -1, 0 or 1. Opposite directions cancel like a d-pad. */
  axisX(): -1 | 0 | 1 {
    if (this.cur.left === this.cur.right) return 0;
    return this.cur.left ? -1 : 1;
  }

  snapshot(): InputSnapshot {
    return { ...this.cur };
  }

  /** Forget held keys (scene change, pause) so nothing "sticks". */
  reset(): void {
    this.cur = emptySnapshot();
    this.prev = emptySnapshot();
  }
}
