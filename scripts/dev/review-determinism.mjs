import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
const id = process.argv[2] ?? '1-1';
const server = spawn('npx', ['vite', '--port', '4182', '--host', '127.0.0.1', '--strictPort'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 2500));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://127.0.0.1:4182/?review=${id}`);
await page.waitForFunction(() => window.__jimothy?.review() && !window.__jimothy.review().charting, null, { timeout: 200000 });
const rs = () => page.evaluate(() => window.__jimothy.review());
const seek = async (n) => {
  await page.evaluate((n) => { const r = window.__jimothy.game.scene.getScene('Review'); r.playing = false; r.seek(n); }, n);
  await page.waitForFunction((n) => { const s = window.__jimothy.review(); return s && !s.seeking && s.step === n; }, n, { timeout: 60000 });
  return rs();
};
const st = await rs();
const trail = await page.evaluate(() => window.__jimothy.game.scene.getScene('Review').trail);
console.log('total', st.total);
for (const n of [600, 1800, 1200, Math.floor(st.total * 0.9), 300]) {
  const a = await seek(n);
  const t = trail[Math.floor(n / 3) - 1];
  console.log(n, 'seek ->', a.x.toFixed(2), a.y.toFixed(2), ' chart ->', t?.x.toFixed(2), t?.y.toFixed(2));
}
await browser.close(); server.kill(); process.exit(0);
