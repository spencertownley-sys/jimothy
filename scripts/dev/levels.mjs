// Dev probe: screenshot points of interest across 1-2 and 1-3 plus their cutscenes.
// usage: node scripts/dev/levels.mjs out-dir [level]
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
const out = process.argv[2] ?? '.';
const only = process.argv[3];
const server = spawn('npx', ['vite', 'preview', '--port', '4173', '--host', '127.0.0.1'], { cwd: process.cwd(), stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 2500));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') { if (!m.text().includes('GL Driver')) console.log('[' + m.type() + ']', m.text()); } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto('http://127.0.0.1:4173/');
await page.waitForFunction(() => window.__jimothy?.activeScenes().includes('Title'), null, { timeout: 30000 });
const T = 48;
const POIS = {
  '1-2': [['quay', 8, 12], ['crow', 36, 12], ['gate1', 62, 9], ['gauntlet', 74, 9], ['slug', 92, 12], ['gate2', 118, 9], ['herschel', 146, 12], ['ladder1', 172, 11], ['ladder2', 190, 8], ['dock', 197, 11], ['canal', 226, 9], ['exit', 276, 12]],
  '1-3': [['beach', 8, 11], ['cart', 36, 11], ['dip', 62, 13], ['seesaw', 90, 8], ['roof', 101, 6], ['bonfires', 118, 11], ['inlet', 146, 8], ['ledges', 172, 6], ['arena', 222, 11], ['exit', 254, 11]],
};
for (const [lvl, pois] of Object.entries(POIS)) {
  if (only && only !== lvl) continue;
  await page.evaluate((id) => window.__jimothy.start('Intro', { story: id, then: { scene: 'Game', data: { levelId: id } } }), lvl);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/${lvl}-story1.png` });
  await page.keyboard.press('ArrowUp'); await page.waitForTimeout(80); await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/${lvl}-story2.png` });
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__jimothy?.activeScenes().includes('Game'), null, { timeout: 15000 });
  await page.waitForTimeout(1200);
  for (const [name, tx, ty] of pois) {
    await page.evaluate(([x, y]) => window.__jimothy.teleport(x, y), [tx * T + 24, ty * T + 40]);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${out}/${lvl}-${name}.png` });
    console.log(lvl, name, await page.evaluate(() => window.__jimothy.debug()));
  }
}
await page.evaluate(() => window.__jimothy.start('Intro', { story: 'postcard-w1' }));
await page.waitForTimeout(2500);
await page.screenshot({ path: `${out}/postcard.png` });
await browser.close(); server.kill(); process.exit(0);
