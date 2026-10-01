// Dev probe: screenshot points of interest across 1-1 (art review).
// usage: node scripts/dev/shots.mjs out-dir
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
const out = process.argv[2] ?? '.';
const server = spawn('npx', ['vite', 'preview', '--port', '4173', '--host', '127.0.0.1'], { cwd: process.cwd(), stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 2500));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') { if (!m.text().includes('GL Driver')) console.log('[' + m.type() + ']', m.text()); } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto('http://127.0.0.1:4173/');
await page.waitForFunction(() => window.__jimothy?.activeScenes().includes('Title'), null, { timeout: 30000 });
await page.keyboard.press('Space'); await page.waitForTimeout(300); await page.keyboard.press('Space');
await page.waitForFunction(() => window.__jimothy?.activeScenes().includes('Intro'));
await page.waitForTimeout(600); await page.screenshot({ path: `${out}/intro1.png` });
await page.waitForTimeout(3300); await page.screenshot({ path: `${out}/intro2.png` });
await page.keyboard.press('Space');
await page.waitForFunction(() => window.__jimothy?.activeScenes().includes('WorldMap'));
await page.waitForTimeout(300); await page.keyboard.press('Space');
await page.waitForFunction(() => window.__jimothy?.activeScenes().includes('Game'), null, { timeout: 15000 });
await page.waitForTimeout(800);
for (const [name, tx] of [['steps', 60], ['porch', 78], ['freebox', 98], ['checkpoint', 115], ['pit', 146], ['bricks', 176], ['drain', 199], ['end', 228]]) {
  await page.evaluate((x) => window.__jimothy.teleport(x * 48, 600), tx);
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `${out}/${name}.png` });
}
await browser.close(); server.kill(); process.exit(0);
