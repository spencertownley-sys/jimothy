// Dev probe: drives the built game in headless Chromium and prints player/enemy state.
// usage: node scripts/dev/probe.mjs out.png   (run `npm run build` first)
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
const server = spawn('npx', ['vite', 'preview', '--port', '4173', '--host', '127.0.0.1'], { cwd: process.cwd(), stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 2500));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', (m) => { if (!m.text().includes('GL Driver')) console.log('[console:' + m.type() + ']', m.text()); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
const state = async () => ({ p: await page.evaluate(() => window.__jimothy.player()), d: await page.evaluate(() => window.__jimothy.debug()), e: await page.evaluate(() => window.__jimothy.enemies()) });
await page.goto('http://127.0.0.1:4173/');
await page.waitForFunction(() => window.__jimothy?.activeScenes().includes('Title'), null, { timeout: 30000 });
await page.keyboard.press('Space'); await page.waitForTimeout(300);
await page.keyboard.press('Space');
await page.waitForFunction(() => window.__jimothy?.activeScenes().includes('Intro'));
await page.keyboard.press('Space');
await page.waitForFunction(() => window.__jimothy?.activeScenes().includes('WorldMap'));
await page.waitForTimeout(200); await page.keyboard.press('Space');
await page.waitForFunction(() => window.__jimothy?.activeScenes().includes('Game'), null, { timeout: 15000 });
await page.waitForTimeout(500);
// run right to x≈1200, then wait for the first seagull and stomp it
await page.keyboard.down('ArrowRight');
while ((await state()).p.x < 1200) await page.waitForTimeout(100);
await page.keyboard.up('ArrowRight');
console.log('arrived', JSON.stringify((await state()).p));
for (let i = 0; i < 80; i++) {
  await page.waitForTimeout(100);
  const s = await state();
  const gull = s.e.find((e) => e.id === 'seagull' && e.alive);
  if (gull && gull.x - s.p.x < 85 && gull.x > s.p.x) {
    // full-hold jump straight up: ≈0.86 s airtime, the gull walks ≈60 px into the landing spot
    await page.keyboard.down('ArrowUp'); await page.waitForTimeout(500); await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(600);
    console.log('after jump', JSON.stringify((await state()).p), 'gulls alive:', (await state()).e.filter((e) => e.alive && e.id === 'seagull').length);
    break;
  }
}
await page.waitForTimeout(1200);
const fin = await state();
console.log('final', JSON.stringify(fin.p), fin.d, 'enemies', fin.e.length);
await page.screenshot({ path: process.argv[2] ?? 'probe.png' });
await browser.close(); server.kill(); process.exit(0);
