/* global navigator, document, Navigator */
// Dev probe: on an emulated phone, tap through the title and report whether Web Audio is
// actually running (browsers only allow it after a finger-up, not a finger-down).
// usage: node scripts/dev/phone-audio.mjs [device name]
import { chromium, devices } from '@playwright/test';
import { spawn } from 'node:child_process';
const name = process.argv[2] ?? 'Pixel 7';
const server = spawn('npx', ['vite', '--port', '4184', '--host', '127.0.0.1', '--strictPort'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 2500));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--autoplay-policy=user-gesture-required'] });
const ctx = await browser.newContext({ ...devices[name] });
const page = await ctx.newPage();
const ios = name.startsWith('iPhone');
await page.addInitScript((ios) => {
  // Chromium's iPhone emulation still has navigator.vibrate; Safari doesn't. Take it away and
  // count the iOS switch ticks instead.
  window.__ticks = 0;
  document.addEventListener('change', (e) => { if (e.target?.hasAttribute?.('switch')) window.__ticks++; }, true);
  if (ios) delete Navigator.prototype.vibrate;
  window.__vibrations = [];
  if (navigator.vibrate) {
    const orig = navigator.vibrate.bind(navigator);
    navigator.vibrate = (p) => { window.__vibrations.push(p); return orig(p); };
  }
}, ios);
await page.goto('http://127.0.0.1:4184/');
await page.waitForFunction(() => window.__jimothy?.activeScenes().includes('Title'), null, { timeout: 30000 });
const audio = () => page.evaluate(() => window.__jimothy.audio());
console.log('before tap:', JSON.stringify((({ playing, context }) => ({ playing, context }))(await audio())));
const box = await page.locator('canvas').boundingBox();
await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
await page.waitForTimeout(1500);
console.log('after 1 tap:', JSON.stringify((({ playing, context }) => ({ playing, context }))(await audio())));
await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height * 0.6);
await page.waitForTimeout(1500);
console.log('after 2 taps:', JSON.stringify((({ playing, context }) => ({ playing, context }))(await audio())));
const jump = page.locator('.jt-jump');
if (await jump.count()) {
  const b = await jump.boundingBox();
  await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForTimeout(200);
}
console.log('files:', JSON.stringify((await audio()).files));
console.log('has vibrate:', await page.evaluate(() => typeof navigator.vibrate), 'panels:', await page.locator('.jt-jump').count(), 'haptics opt:', await page.evaluate(() => JSON.parse(localStorage.getItem('jimothy.save.v1') ?? '{}')?.options?.haptics));
console.log('vibrate calls:', JSON.stringify(await page.evaluate(() => window.__vibrations)), 'iOS switch ticks:', await page.evaluate(() => window.__ticks));
await browser.close(); server.kill(); process.exit(0);
