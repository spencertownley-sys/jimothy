// Dev probe: screenshot points of interest across 1-2 through 3-3 plus their cutscenes.
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
  '2-1': [['arcade', 8, 11], ['toss', 33, 11], ['freeze', 60, 11], ['longtoss', 88, 11], ['upper', 93, 3], ['dahlias', 113, 11], ['pig', 141, 9], ['icebox', 195, 11], ['sanitary', 250, 6], ['exit', 304, 11]],
  '2-2': [['top', 8, 7], ['drop', 36, 17], ['corridor', 50, 25], ['door', 76, 25], ['alcove', 134, 25], ['courtyard', 102, 22], ['scooterpad', 109, 25], ['elevator', 118, 7]],
  '2-3': [['start', 8, 11], ['freeze', 44, 11], ['wheel', 64, 11], ['sidepier', 100, 11], ['fry', 120, 11], ['crates', 166, 11], ['aquarium', 225, 11], ['taxi', 330, 11]],
  '3-1': [['plaza', 8, 11], ['jet', 15, 11], ['pair', 50, 11], ['triple', 93, 11], ['wire', 95, 2], ['islands', 120, 11], ['kids', 142, 11], ['tube', 177, 11], ['stones', 207, 11], ['needle', 230, 11], ['station', 282, 11]],
  '3-2': [['start', 0, 8], ['gantry', 32, 8], ['museum', 96, 8], ['billboard', 160, 8], ['lane', 206, 8], ['hurdles', 270, 8], ['rear', 312, 8], ['westlake', 350, 8]],
  '3-3': [['start', 6, 11], ['line', 18, 7], ['umbrellas', 41, 7], ['gift', 82, 11], ['busy', 118, 7], ['board', 160, 11], ['soldout', 182, 11], ['door', 222, 11]],
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
    if (lvl === '3-2') {
      // the auto-scroller: move the camera and the train, then drop him on the roof
      // move the camera, the train and Jimothy together (left behind the camera = a lost life);
      // he waits out of play for the train's one-step jump, then lands on its roof
      await page.evaluate((x) => {
        const gs = window.__jimothy.game.scene.getScene('Game');
        const m = gs.movers[0];
        gs.scroll.x = Math.min(x, gs.scroll.max);
        m.t = (gs.scroll.x / 140) * 1000;
        const p = m.path(m.t);
        gs.teleport(p.x, p.y + 12);
        gs.player.body.enable = false;
      }, tx * T);
      await page.waitForTimeout(300);
      await page.evaluate(() => { const gs = window.__jimothy.game.scene.getScene('Game'); const b = gs.movers[0].body; gs.player.body.enable = true; gs.teleport(b.center.x, b.top - 2); gs.devPower('flannel'); });
      await page.waitForTimeout(1200);
      await page.screenshot({ path: `${out}/${lvl}-${name}.png` });
      console.log(lvl, name, await page.evaluate(() => window.__jimothy.debug()));
      continue;
    }
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
