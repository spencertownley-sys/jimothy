import { expect, test } from '@playwright/test';

/** Boot → Title → New Game → skip intro → World Map → 1-1 → run right 5 s → no console errors. */
test('1-1 loads and Jimothy can run', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/');
  await page.waitForSelector('canvas');
  await page.waitForFunction(() => window.__jimothy?.activeScenes().includes('Title'), null, { timeout: 30_000 });
  await page.keyboard.press('Space'); // Press Start → menu
  await page.waitForTimeout(300);
  await page.keyboard.press('Space'); // New Game
  await page.waitForFunction(() => window.__jimothy?.activeScenes().includes('Intro'));
  await page.keyboard.press('Space'); // skip intro
  await page.waitForFunction(() => window.__jimothy?.activeScenes().includes('WorldMap'));
  await page.waitForTimeout(200);
  await page.keyboard.press('Space'); // enter 1-1
  await page.waitForFunction(() => window.__jimothy?.activeScenes().includes('Game'), null, { timeout: 15_000 });
  await page.waitForTimeout(500);
  const start = await page.evaluate(() => window.__jimothy?.player());
  expect(start).toBeTruthy();

  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(1200);
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(300);
  await page.keyboard.up('ArrowUp');
  await page.waitForTimeout(2000);
  await page.keyboard.up('ArrowRight');
  const end = await page.evaluate(() => window.__jimothy?.player());
  expect(end).toBeTruthy();
  expect(end!.x).toBeGreaterThan(start!.x + 500); // ≈3.5 s at walk speed, still short of the first seagull
  expect(end!.fsm).not.toBe('Dead');
  await page.screenshot({ path: 'test-results/1-1.png' });

  await page.keyboard.press('Space'); // pause
  await page.waitForFunction(() => window.__jimothy?.activeScenes().includes('Pause'));
  expect(errors).toEqual([]);
});

/** 1-2 and 1-3: cutscene plays, skips into the level, Jimothy can move, no console errors. */
for (const id of ['1-2', '1-3']) {
  test(`${id} cutscene → level loads and Jimothy can move`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await page.waitForFunction(() => window.__jimothy?.activeScenes().includes('Title'), null, { timeout: 30_000 });
    await page.evaluate((lvl) => window.__jimothy?.start('Intro', { story: lvl, then: { scene: 'Game', data: { levelId: lvl } } }), id);
    await page.waitForFunction(() => window.__jimothy?.activeScenes().includes('Intro'));
    await page.waitForTimeout(400);
    await page.keyboard.press('Space'); // skip the cutscene
    await page.waitForFunction(() => window.__jimothy?.activeScenes().includes('Game'), null, { timeout: 15_000 });
    expect(await page.evaluate(() => window.__jimothy?.levelId())).toBe(id);
    await page.waitForTimeout(500);
    const start = await page.evaluate(() => window.__jimothy?.player());
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(1500);
    await page.keyboard.up('ArrowRight');
    const end = await page.evaluate(() => window.__jimothy?.player());
    expect(end!.x).toBeGreaterThan(start!.x + 200);
    expect(end!.fsm).not.toBe('Dead');
    expect(errors).toEqual([]);
  });
}
