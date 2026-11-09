import { expect, test } from '@playwright/test';

/** Route review: charts 1-1, steps through beats with ← →, scrubs the timeline, exits cleanly. */
test('route review charts 1-1 and scrubs forward and back', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/?review=1-1');
  await page.waitForFunction(() => {
    const r = window.__jimothy?.review();
    return r && !r.charting && r.total > 0;
  }, null, { timeout: 90_000 });
  const charted = await page.evaluate(() => window.__jimothy!.review()!);
  expect(charted.beats.some((b) => b.kind === 'clear')).toBe(true); // the route reaches the bus stop
  expect(charted.beats.some((b) => b.kind === 'rescue')).toBe(false); // …without a would-be death
  expect(charted.beats.filter((b) => b.kind === 'geoduck').length).toBeGreaterThanOrEqual(2);

  const status = () => page.evaluate(() => window.__jimothy!.review()!);
  const settled = () => page.waitForFunction(() => { const r = window.__jimothy?.review(); return r && !r.seeking; });

  // pause, then hop forward two beats
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowRight');
  await settled();
  const first = (await status()).step;
  await page.keyboard.press('ArrowRight');
  await settled();
  const second = (await status()).step;
  expect(second).toBeGreaterThan(first);

  // back one beat lands exactly where the forward hop did (the replay is deterministic)
  await page.keyboard.press('ArrowLeft');
  await settled();
  const back = await status();
  expect(back.step).toBe(first);

  // click the timeline near the end
  const canvas = page.locator('canvas');
  const box = (await canvas.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.9, box.y + box.height * ((720 - 80) / 720));
  await settled();
  expect((await status()).step).toBeGreaterThan(charted.total * 0.8);

  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.__jimothy?.activeScenes().includes('ReviewMenu'));
  expect(errors).toEqual([]);
});
