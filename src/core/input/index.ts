import { GamepadSource } from './GamepadSource';
import { InputState } from './InputState';
import { KeyboardSource } from './KeyboardSource';
import { resolveKeymap } from './keymap';
import { TouchSource } from './TouchSource';
import { Save } from '../save/Save';

/** One shared InputState for the whole game; scenes call `input.update()` per fixed step. */
export class InputManager {
  readonly state: InputState;
  readonly keyboard: KeyboardSource;
  readonly gamepad: GamepadSource;
  readonly touch: TouchSource;

  constructor() {
    const options = Save.get().options;
    this.keyboard = new KeyboardSource(resolveKeymap(options.keymap));
    this.gamepad = new GamepadSource();
    this.gamepad.preset = options.gamepadPreset;
    this.touch = new TouchSource();
    this.state = new InputState([this.keyboard, this.gamepad, this.touch]);
  }

  refreshFromSave(): void {
    const options = Save.get().options;
    this.keyboard.setKeymap(resolveKeymap(options.keymap));
    this.gamepad.preset = options.gamepadPreset;
  }
}

let shared: InputManager | undefined;
export function getInput(): InputManager {
  if (!shared) shared = new InputManager();
  return shared;
}

export { InputState } from './InputState';
export type { InputKey, InputSnapshot, InputSource } from './InputState';
