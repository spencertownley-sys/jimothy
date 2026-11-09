import { describe, expect, it } from 'vitest';
import { HAPTIC_PATTERNS, HAPTIC_PRIORITY, patternMs, shouldPulse } from '../../src/core/haptics';

const idle = { untilMs: 0, priority: -1 };

describe('haptics scheduling', () => {
  it('a button tap never cuts a bird hit short', () => {
    const hitAt = 1000;
    const peck = { untilMs: hitAt + patternMs(HAPTIC_PATTERNS.peck), priority: HAPTIC_PRIORITY.peck };
    expect(shouldPulse('tap', hitAt + 60, hitAt, peck)).toBe(false);
    expect(shouldPulse('tap', hitAt + patternMs(HAPTIC_PATTERNS.peck) + 1, hitAt, peck)).toBe(true);
  });

  it('a hit always plays, even right after a tap', () => {
    const tap = { untilMs: 1014, priority: HAPTIC_PRIORITY.tap };
    expect(shouldPulse('peck', 1005, 1000, tap)).toBe(true);
    expect(shouldPulse('hurt', 1005, 1000, tap)).toBe(true);
  });

  it('rapid same-strength pulses are rate limited', () => {
    expect(shouldPulse('stomp', 1000, -Infinity, idle)).toBe(true);
    const stomp = { untilMs: 1024, priority: HAPTIC_PRIORITY.stomp };
    expect(shouldPulse('stomp', 1030, 1000, stomp)).toBe(false);
    expect(shouldPulse('stomp', 1050, 1000, stomp)).toBe(true);
  });

  it('button taps are long enough for a phone motor to render', () => {
    expect(HAPTIC_PATTERNS.tap[0]).toBeGreaterThanOrEqual(10);
  });
});
