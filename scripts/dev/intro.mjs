// Dev probe: start a new game and screenshot each beat of the opening scene as it plays.
// usage: node scripts/dev/intro.mjs out-dir
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
const out = process.argv[2] ?? '.';
const server = spawn('npx', ['vite', 'preview', '--port', '4173', '--host', '127.0.0.1'], { cwd: process.cwd(), stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 2500));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', (m) => { if ((m.type() === 'warning' || m.type() === 'error') && !m.text().includes('GL Driver')) console.log('[' + m.type() + ']', m.text()); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto('http://127.0.0.1:4173/');
await page.waitForFunction(() => window.__jimothy?.activeScenes().includes('Title'), null, { timeout: 30000 });
await page.keyboard.press('Space'); await page.waitForTimeout(300); await page.keyboard.press('Space');
await page.waitForFunction(() => window.__jimothy?.activeScenes().includes('Intro'));
const t0 = Date.now();
for (const [i, at] of [4200, 9800, 15000, 21500, 27500].entries()) {
  while (Date.now() - t0 < at) await page.waitForTimeout(100);
  await page.screenshot({ path: `${out}/beat${i + 1}.png` });
}
await page.waitForFunction(() => window.__jimothy?.activeScenes().includes('WorldMap'), null, { timeout: 15000 });
console.log('intro ended on its own after', ((Date.now() - t0) / 1000).toFixed(1), 's');
await browser.close(); server.kill(); process.exit(0);
