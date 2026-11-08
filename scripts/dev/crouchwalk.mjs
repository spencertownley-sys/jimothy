// Dev probe: from the start of 1-1, crouch-walk right and log state (regression check for
// Jimothy sinking through the floor while crouched).
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
const server = spawn('npx', ['vite', 'preview', '--port', '4173', '--host', '127.0.0.1'], { cwd: process.cwd(), stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 2500));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
const J = (fn) => page.evaluate(fn);
await page.goto('http://127.0.0.1:4173/');
await page.waitForFunction(() => window.__jimothy?.activeScenes().includes('Title'), null, { timeout: 30000 });
await page.keyboard.press('Space'); await page.waitForTimeout(300); await page.keyboard.press('Space');
await page.waitForFunction(() => window.__jimothy?.activeScenes().includes('Intro'));
await page.keyboard.press('Space');
await page.waitForFunction(() => window.__jimothy?.activeScenes().includes('WorldMap'));
await page.waitForTimeout(300); await page.keyboard.press('Space');
await page.waitForFunction(() => window.__jimothy?.activeScenes().includes('Game'), null, { timeout: 15000 });
await page.waitForTimeout(800);
if (process.argv.includes('--big')) {
  await J(() => window.__jimothy.power('teriyaki'));
  await page.waitForTimeout(800);
  console.log('power:', (await J(() => window.__jimothy.debug())).slice(0, 40));
}
if (process.argv.includes('--porch')) {
  await J(() => window.__jimothy.teleport(71 * 48, 624));
  await page.waitForTimeout(400);
}
await page.keyboard.down('ArrowDown'); await page.keyboard.down('ArrowRight');
for (let i = 0; i < 20; i++) {
  await page.waitForTimeout(300);
  console.log(i, (await J(() => window.__jimothy.debug())).replace(/coyote.*crouch/, 'crouch').slice(0, 170), JSON.stringify(await J(() => window.__jimothy.enemies().filter((e) => Math.abs(e.x - 3700) < 900))));
}
await page.keyboard.up('ArrowRight'); await page.keyboard.up('ArrowDown');
await browser.close(); server.kill(); process.exit(0);
