import { emptySnapshot, type InputSnapshot, type InputSource } from './InputState';

/** A dumb mailbox: ui/TouchControls writes into it each frame, InputState reads it. */
export class TouchSource implements InputSource {
  private state: InputSnapshot = emptySnapshot();

  set(next: Partial<InputSnapshot>): void {
    this.state = { ...emptySnapshot(), ...next };
  }

  clear(): void {
    this.state = emptySnapshot();
  }

  read(): InputSnapshot {
    return { ...this.state };
  }
}
