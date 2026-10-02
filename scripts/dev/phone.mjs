// Dev probe: landscape phone with the side-panel controller (?touch=1). Drives the menus by
// tapping, plays a little of 1-1 with the on-screen buttons, and screenshots each step.
// usage: node scripts/dev/phone.mjs out-dir
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
const out = process.argv[2] ?? '.';
const server = spawn('npx', ['vite', 'preview', '--port', '4173', '--host', '127.0.0.1'], { cwd: process.cwd(), stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 2500));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: false });
page.on('console', (m) => { if ((m.type() === 'warning' || m.type() === 'error') && !m.text().includes('GL Driver')) console.log('[' + m.type() + ']', m.text()); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
const J = (fn) => page.evaluate(fn);
const center = async (sel, fx = 0.5, fy = 0.5) => {
  const b = await page.locator(sel).boundingBox();
  return { x: b.x + b.width * fx, y: b.y + b.height * fy };
};
const hold = async (sel, ms, fx, fy) => {
  const p = await center(sel, fx, fy);
  await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.waitForTimeout(ms); await page.mouse.up();
};
await page.goto('http://127.0.0.1:4173/?touch=1');
await page.waitForFunction(() => window.__jimothy?.activeScenes().includes('Title'), null, { timeout: 30000 });
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/p1-title.png` });
await hold('.jt-a', 120); await page.waitForTimeout(400);          // A = start
await hold('.jt-a', 120);                                           // New Game
await page.waitForFunction(() => window.__jimothy?.activeScenes().includes('Intro'));
await hold('.jt-pause', 120);                                       // skip intro
await page.waitForFunction(() => window.__jimothy?.activeScenes().includes('WorldMap'));
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/p2-map.png` });
await hold('.jt-a', 120);
await page.waitForFunction(() => window.__jimothy?.activeScenes().includes('Game'), null, { timeout: 15000 });
await page.waitForTimeout(1500);
console.log('audio:', JSON.stringify(await J(() => window.__jimothy.audio())));
const x0 = (await J(() => window.__jimothy.player())).x;
// run right on the d-pad, jump with the paw button mid-run
const d = await center('.jt-dpad', 0.88, 0.5);
await page.mouse.move(d.x, d.y); await page.mouse.down();
await page.waitForTimeout(900);
await page.screenshot({ path: `${out}/p3-run.png` });
await page.mouse.up();
await hold('.jt-jump', 300);
await page.waitForTimeout(200);
const p = await J(() => window.__jimothy.player());
console.log('moved', Math.round(p.x - x0), 'px; state', p.fsm);
await hold('.jt-dpad', 600, 0.5, 0.88); // crouch
console.log('crouch:', (await J(() => window.__jimothy.debug())).slice(0, 40));
await page.screenshot({ path: `${out}/p4-crouch.png` });
await hold('.jt-pause', 120);
await page.waitForFunction(() => window.__jimothy?.activeScenes().includes('Pause'));
await page.screenshot({ path: `${out}/p5-pause.png` });
await browser.close(); server.kill(); process.exit(0);
