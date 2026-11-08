import { describe, expect, it } from 'vitest';
import { InputState } from '../../src/core/input/InputState';
import { TouchSource } from '../../src/core/input/TouchSource';
import { dpadKeys } from '../../src/ui/dpad';
import type { InputKey } from '../../src/core/input/InputState';

const DIRS: InputKey[] = ['left', 'right', 'down', 'jump'];

/** thumb at `deg` (0 = right, 90 = up) and `r` (0..1) from the d-pad centre */
const at = (deg: number, r = 0.8): [number, number] => [Math.cos((deg * Math.PI) / 180) * r, -Math.sin((deg * Math.PI) / 180) * r];

describe('TouchSource: each control owns its keys', () => {
  it('moving on the d-pad never releases the Jump button', () => {
    const touch = new TouchSource();
    const input = new InputState([touch]);
    touch.press('jump', 'jumpButton');
    input.update();
    expect(input.justPressed('jump')).toBe(true);
    // the other thumb runs right; every touchmove re-applies the d-pad
    for (let i = 0; i < 10; i++) {
      touch.setHeld(['right'], DIRS, 'dpad');
      input.update();
      expect(input.get('jump')).toBe(true);
      expect(input.justReleased('jump')).toBe(false);
    }
    touch.release('jump', 'jumpButton');
    input.update();
    expect(input.justReleased('jump')).toBe(true);
    expect(input.get('right')).toBe(true);
  });

  it('a key held by two controls stays down until both let go', () => {
    const touch = new TouchSource();
    touch.setHeld(['jump'], DIRS, 'dpad');
    touch.press('jump', 'jumpButton');
    touch.release('jump', 'jumpButton');
    expect(touch.read().jump).toBe(true);
    touch.setHeld([], DIRS, 'dpad');
    expect(touch.read().jump).toBe(false);
  });

  it('a tap that starts and ends between two steps still counts once', () => {
    const touch = new TouchSource();
    const input = new InputState([touch]);
    input.update();
    touch.press('jump', 'jumpButton');
    touch.release('jump', 'jumpButton');
    input.update();
    expect(input.justPressed('jump')).toBe(true);
    input.update();
    expect(input.get('jump')).toBe(false);
  });
});

describe('d-pad sectors', () => {
  it('reads the eight directions', () => {
    expect(dpadKeys(...at(0))).toEqual(['right']);
    expect(dpadKeys(...at(180))).toEqual(['left']);
    expect(dpadKeys(...at(90))).toEqual(['jump']);
    expect(dpadKeys(...at(-90))).toEqual(['down']);
    expect(dpadKeys(...at(50)).sort()).toEqual(['jump', 'right']);
    expect(dpadKeys(...at(130)).sort()).toEqual(['jump', 'left']);
    expect(dpadKeys(...at(-130)).sort()).toEqual(['down', 'left']);
  });

  it('ignores a thumb resting at the centre', () => {
    expect(dpadKeys(0.1, 0.05)).toEqual([]);
  });

  it('a thumb slightly high on the right arm does not jump', () => {
    expect(dpadKeys(...at(25))).toEqual(['right']);
  });

  it('rolling from up toward up-right keeps the jump held (no mid-air cut)', () => {
    let keys = dpadKeys(...at(90));
    for (const deg of [80, 70, 60, 50, 40, 30]) {
      keys = dpadKeys(...at(deg), keys);
      expect(keys).toContain('jump');
    }
    expect(keys).toContain('right');
  });

  it('jitter on a sector edge does not flicker the key', () => {
    // the up edge is at 35°: a fresh touch at 36° is already up-right...
    let keys = dpadKeys(...at(36));
    expect(keys).toContain('jump');
    // ...but once jump is held, wobbling a few degrees either side keeps it held
    for (const deg of [33, 37, 31, 35, 30, 34]) {
      keys = dpadKeys(...at(deg), keys);
      expect(keys).toContain('jump');
    }
  });
});
