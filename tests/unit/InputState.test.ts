import { describe, expect, it } from 'vitest';
import { emptySnapshot, InputState, type InputSnapshot, type InputSource } from '../../src/core/input/InputState';
import { KeyboardSource } from '../../src/core/input/KeyboardSource';
import { GamepadSource } from '../../src/core/input/GamepadSource';
import { TouchSource } from '../../src/core/input/TouchSource';

class FakeSource implements InputSource {
  snap: InputSnapshot = emptySnapshot();
  read(): InputSnapshot {
    return { ...this.snap };
  }
}

describe('InputState', () => {
  it('edge-detects justPressed / justReleased across fixed steps', () => {
    const src = new FakeSource();
    const input = new InputState([src]);
    input.update();
    expect(input.justPressed('jump')).toBe(false);
    src.snap.jump = true;
    input.update();
    expect(input.get('jump')).toBe(true);
    expect(input.justPressed('jump')).toBe(true);
    input.update();
    expect(input.get('jump')).toBe(true);
    expect(input.justPressed('jump')).toBe(false);
    src.snap.jump = false;
    input.update();
    expect(input.justReleased('jump')).toBe(true);
    expect(input.justPressed('jump')).toBe(false);
  });

  it('ORs simultaneous sources together', () => {
    const kb = new KeyboardSource(undefined, undefined);
    const pad = new GamepadSource(() => [
      { connected: true, buttons: [{ pressed: true }, { pressed: false }], axes: [0, 0] } as unknown as Gamepad,
    ]);
    const touch = new TouchSource();
    const input = new InputState([kb, pad, touch]);
    kb.setCode('ArrowRight', true);
    touch.set({ down: true });
    input.update();
    expect(input.get('right')).toBe(true); // keyboard
    expect(input.get('a')).toBe(true); // gamepad button 0 (classic preset)
    expect(input.get('down')).toBe(true); // touch
    expect(input.get('left')).toBe(false);
    expect(input.axisX()).toBe(1);
    kb.setCode('ArrowLeft', true);
    input.update();
    expect(input.axisX()).toBe(0); // opposite directions cancel
  });

  it('gamepad "modern" preset moves jump to button 0', () => {
    const pad = new GamepadSource(() => [
      { connected: true, buttons: [{ pressed: true }], axes: [0, 0] } as unknown as Gamepad,
    ]);
    pad.preset = 'modern';
    expect(pad.read().jump).toBe(true);
    expect(pad.read().a).toBe(false);
  });

  it('reset clears held state so nothing sticks across scenes', () => {
    const src = new FakeSource();
    const input = new InputState([src]);
    src.snap.start = true;
    input.update();
    input.reset();
    expect(input.get('start')).toBe(false);
    input.update();
    expect(input.justPressed('start')).toBe(true); // still held → counts as a fresh press after reset
  });
});

describe('KeyboardSource latching', () => {
  it('a tap shorter than one frame still registers once', () => {
    const kb = new KeyboardSource(undefined, undefined);
    const input = new InputState([kb]);
    kb.setCode('Space', true);
    kb.setCode('Space', false);
    input.update();
    expect(input.justPressed('start')).toBe(true);
    input.update();
    expect(input.get('start')).toBe(false);
  });
});
