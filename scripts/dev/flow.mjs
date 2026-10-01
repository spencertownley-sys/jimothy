// Dev probe for the rest of the 1-1 flow: ? block → Teriyaki, drain → bonus → back, exit → Level Clear.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
const server = spawn('npx', ['vite', 'preview', '--port', '4173', '--host', '127.0.0.1'], { cwd: process.cwd(), stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 2500));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', (m) => { if (!m.text().includes('GL Driver') && !m.text().includes('Phaser v')) console.log('[console:' + m.type() + ']', m.text()); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
const J = (fn) => page.evaluate(fn);
const shot = (n) => page.screenshot({ path: `${process.argv[2] ?? '.'}/${n}.png` });
const waitFor = async (fn, label, timeout = 8000) => {
  try { await page.waitForFunction(fn, null, { timeout }); }
  catch { console.log(`TIMEOUT waiting for ${label}:`, await J(() => window.__jimothy.activeScenes()), await J(() => window.__jimothy.levelId()), await J(() => window.__jimothy.debug())); await shot(`timeout-${label}`); }
};
await page.goto('http://127.0.0.1:4173/');
await page.waitForFunction(() => window.__jimothy?.activeScenes().includes('Title'), null, { timeout: 30000 });
await shot('title');
await page.keyboard.press('Space'); await page.waitForTimeout(300); await shot('title-menu');
await page.keyboard.press('Space');
await page.waitForFunction(() => window.__jimothy?.activeScenes().includes('Intro'));
await page.waitForTimeout(400); await shot('intro');
await page.keyboard.press('Space');
await page.waitForFunction(() => window.__jimothy?.activeScenes().includes('WorldMap'));
await page.waitForTimeout(300); await shot('worldmap');
await page.keyboard.press('Space');
await page.waitForFunction(() => window.__jimothy?.activeScenes().includes('Game'), null, { timeout: 15000 });
await page.waitForTimeout(600);

// 0) stomp the first seagull so it can't interrupt the block test
await page.keyboard.down('ArrowRight');
while ((await J(() => window.__jimothy.player())).x < 1200) await page.waitForTimeout(100);
await page.keyboard.up('ArrowRight');
for (let i = 0; i < 80; i++) {
  await page.waitForTimeout(100);
  const p = await J(() => window.__jimothy.player());
  const gull = (await J(() => window.__jimothy.enemies())).find((e) => e.id === 'seagull' && e.alive);
  if (gull && gull.x - p.x < 85 && gull.x > p.x) {
    await page.keyboard.down('ArrowUp'); await page.waitForTimeout(500); await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(700);
    break;
  }
}
console.log('gulls alive after stomp:', (await J(() => window.__jimothy.enemies())).filter((e) => e.alive && e.id === 'seagull').length);
await shot('stomp');
// 1) ? block at tile (34,9): stand under it and jump
await J(() => window.__jimothy.teleport(34 * 48 + 24, 624));
await page.waitForTimeout(300);
await page.keyboard.down('ArrowUp'); await page.waitForTimeout(400); await page.keyboard.up('ArrowUp');
for (let i = 0; i < 5; i++) { await page.waitForTimeout(300); console.log('block', i, (await J(() => window.__jimothy.debug())).slice(0, 60), 'items:', JSON.stringify(await J(() => window.__jimothy.items()))); }
await page.waitForTimeout(1000);
console.log('after block:', await J(() => window.__jimothy.debug()));
await shot('teriyaki');
// walk right a bit to grab the bowl walking away, then come back
await page.keyboard.down('ArrowRight');
for (let i = 0; i < 60; i++) {
  await page.waitForTimeout(150);
  const items = await J(() => window.__jimothy.items());
  if (!items.some((it) => it.kind === 'teriyaki')) break;
}
await page.keyboard.up('ArrowRight');
await page.waitForTimeout(800);
console.log('power now:', await J(() => window.__jimothy.debug()));

// 2) crouch tunnel under the porch beam (73..78, row 11): teleport before it, crouch-walk through
await J(() => window.__jimothy.teleport(71 * 48, 624));
await page.waitForTimeout(200);
await page.keyboard.down('ArrowDown'); await page.keyboard.down('ArrowRight');
await page.waitForTimeout(4500);
await page.keyboard.up('ArrowRight'); await page.keyboard.up('ArrowDown');
await page.waitForTimeout(300);
console.log('after tunnel:', JSON.stringify(await J(() => window.__jimothy.player())), await J(() => window.__jimothy.debug()));
await shot('tunnel');

// 3) drain at tiles 196-197: stand on it and press down
await J(() => window.__jimothy.teleport(197 * 48, 576));
await page.waitForTimeout(400);
await page.keyboard.down('ArrowDown'); await page.waitForTimeout(900); await page.keyboard.up('ArrowDown');
await waitFor(() => window.__jimothy?.levelId() === '1-1-bonus', 'bonus');
await page.waitForTimeout(800);
console.log('in bonus:', await J(() => window.__jimothy.levelId()), JSON.stringify(await J(() => window.__jimothy.player())));
await shot('bonus');
await J(() => window.__jimothy.teleport(24 * 48, 576));
await page.waitForTimeout(400);
await page.keyboard.down('ArrowDown'); await page.waitForTimeout(900); await page.keyboard.up('ArrowDown');
await waitFor(() => window.__jimothy?.levelId() === '1-1', 'back');
await page.waitForTimeout(800);
console.log('back in 1-1 at', JSON.stringify(await J(() => window.__jimothy.player())));

// 4) exit at tile 234
await J(() => window.__jimothy.teleport(234 * 48, 624));
await waitFor(() => window.__jimothy?.activeScenes().includes('LevelClear'), 'clear', 10000);
await page.waitForTimeout(2500);
await shot('levelclear');
await page.keyboard.press('Space');
await waitFor(() => window.__jimothy?.activeScenes().includes('WorldMap'), 'map');
await page.waitForTimeout(400);
await shot('worldmap-after');
console.log('save:', await J(() => localStorage.getItem('jimothy.save')));
await browser.close(); server.kill(); process.exit(0);
