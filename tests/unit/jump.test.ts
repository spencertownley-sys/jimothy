import { describe, expect, it } from 'vitest';
import { CONFIG } from '../../src/config';
import { simulateJumpHeight } from '../../src/core/physics/jump';

const tiles = (px: number): number => px / CONFIG.TILE;

describe('jump feel (headless sim with the shipped constants)', () => {
  it('full-hold jump apex ≈ 4.0 tiles', () => {
    const h = tiles(simulateJumpHeight(60));
    expect(h).toBeGreaterThan(3.8);
    expect(h).toBeLessThan(4.2);
  });

  it('tap jump apex ≈ 2.0 tiles', () => {
    const h = tiles(simulateJumpHeight(1));
    expect(h).toBeGreaterThan(1.8);
    expect(h).toBeLessThan(2.2);
  });

  it('run-jump goes higher than a standing jump', () => {
    expect(simulateJumpHeight(60, CONFIG.RUN_JUMP_THRESHOLD + 1)).toBeGreaterThan(simulateJumpHeight(60, 0));
  });
});
