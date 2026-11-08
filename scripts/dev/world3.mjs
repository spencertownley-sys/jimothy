// Dev probe: exercises the World 3 (Seattle Center) mechanisms in the built game and prints results.
// usage: node scripts/dev/world3.mjs [scenario]
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
const only = process.argv[2];
const server = spawn('npx', ['vite', 'preview', '--port', '4179', '--host', '127.0.0.1'], { cwd: process.cwd(), stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 2500));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', (m) => { if (m.type() === 'error') console.log('[error]', m.text()); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto('http://127.0.0.1:4179/');
await page.waitForFunction(() => window.__jimothy?.activeScenes().includes('Title'), null, { timeout: 30000 });
const T = 48;
const wait = (ms) => page.waitForTimeout(ms);
const scene = (fn, arg) => page.evaluate(([src, a]) => { const gs = window.__jimothy.game.scene.getScene('Game'); return new Function('gs', 'a', src)(gs, a); }, [fn, arg]);
async function level(id) {
  await page.evaluate((l) => { window.__jimothy.game.registry.remove('run'); window.__jimothy.start('Game', { levelId: l }); }, id);
  await page.waitForFunction((l) => window.__jimothy?.levelId() === l, id, { timeout: 20000 });
  await wait(900);
}
const tpx = (x, y) => page.evaluate(([a, b]) => window.__jimothy.teleport(a, b), [x, y]);
const tp = (tx, y) => tpx(tx * T + 24, y);
const player = () => page.evaluate(() => window.__jimothy.player());
const dbg = () => page.evaluate(() => window.__jimothy.debug());
const ducks = () => page.evaluate(() => window.__jimothy.geoducks());
const results = [];
const check = (name, ok, info = '') => { results.push([name, ok]); console.log(ok ? 'PASS' : 'FAIL', name, info); };
const run = (n) => !only || only === n;
async function settle(tx, y) { await tp(tx, y); await wait(1800); }
/** lowest feet y seen over `ms` (smaller = higher) */
async function apex(ms) {
  let top = Infinity;
  for (let t = 0; t < ms; t += 50) { const p = await player(); top = Math.min(top, p.y); await wait(50); }
  return top;
}

if (run('geyser')) {
  await level('3-1');
  await settle(16, 560);
  const top = await apex(3000);
  const rise = (576 - top) / T;
  check('fountain jet launches ~5 tiles', rise > 4 && rise < 6.5, `${rise.toFixed(2)} tiles`);
  // standing in it keeps riding it (no ratcheting higher and higher)
  const top2 = await apex(3000);
  check('riding a jet stays at its top', (576 - top2) / T < 6.5, `${((576 - top2) / T).toFixed(2)} tiles`);
}

if (run('triple')) {
  await level('3-1');
  await settle(94, 560);
  await page.keyboard.down('ArrowUp');
  const top = await apex(2600);
  await page.keyboard.up('ArrowUp');
  check('triple geyser reaches the lamp wire (row 3)', top <= 3 * T + 4, `feet y ${top.toFixed(0)} (wire ${3 * T})`);
  // put him on the wire and walk to the geoduck
  await tp(92, 3 * T - 2); await wait(400);
  await page.keyboard.down('ArrowRight'); await wait(1400); await page.keyboard.up('ArrowRight');
  check('lamp-wire Geoduck #1', (await ducks())[0] === true, JSON.stringify(await ducks()));
}

if (run('wet')) {
  await level('3-1');
  await settle(6, 560);
  await page.keyboard.down('ArrowRight'); await wait(900);
  const d = await dbg();
  await page.keyboard.up('ArrowRight');
  check('the plaza paving is wet underfoot', d.includes('wet=true'), d.slice(0, 60));
}

if (run('tube')) {
  await level('3-1');
  await settle(170, 560);
  await page.evaluate(() => window.__jimothy.power('flannel'));
  await page.keyboard.down('ArrowDown'); await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => window.__jimothy.player().x > 186 * 48, null, { timeout: 30000 }).catch(() => {});
  await page.keyboard.up('ArrowRight'); await page.keyboard.up('ArrowDown');
  const p = await player();
  check('crouch through the glass tube', p.x > 185 * T, `x ${(p.x / T).toFixed(1)}`);
  check('glass-garden Geoduck #2', (await ducks())[1] === true, JSON.stringify(await ducks()));
}

if (run('needle')) {
  await level('3-1');
  await settle(231, 560);
  await page.keyboard.down('ArrowUp'); await wait(500); await page.keyboard.up('ArrowUp');
  await wait(1500);
  await page.keyboard.down('ArrowLeft'); await wait(300); await page.keyboard.up('ArrowLeft');
  await page.keyboard.down('ArrowRight'); await wait(300); await page.keyboard.up('ArrowRight');
  await wait(800);
  const items = await scene('return gs.geoducks.getChildren().map((d) => d.index)');
  check('hidden block at the Needle leg holds Geoduck #3', (await ducks())[2] === true || items.includes(2), JSON.stringify(items));
}

if (run('ride')) {
  await level('3-2');
  const p0 = await player();
  await wait(4000);
  const p1 = await player();
  const cam = await scene('return gs.cameras.main.scrollX');
  check('monorail carries Jimothy at the scroll speed', p1.fsm !== 'Dead' && p1.x - p0.x > 400 && Math.abs(p1.y - p0.y) < 6, `dx ${(p1.x - p0.x).toFixed(0)} cam ${cam.toFixed(0)}`);
}

if (run('gantry')) {
  await level('3-2');
  // standing up, the first gantry (tile 42) shoves him off the back of the train
  const died = await page.waitForFunction(() => window.__jimothy.player().fsm === 'Dead', null, { timeout: 60000 }).then(() => true, () => false);
  const p = await player();
  check('standing into a gantry costs a life', died, `${p.fsm} x ${(p.x / T).toFixed(1)}`);
  await level('3-2');
  await page.keyboard.down('ArrowDown');
  await page.waitForFunction(() => window.__jimothy.player().x > 47 * 48 || window.__jimothy.player().fsm === 'Dead', null, { timeout: 60000 }).catch(() => {});
  await page.keyboard.up('ArrowDown');
  const q = await player();
  check('crouching slips under the gantry', q.fsm !== 'Dead' && q.x > 44 * T, `${q.fsm} x ${(q.x / T).toFixed(1)}`);
}

if (run('edge')) {
  await level('3-2');
  await wait(3000);
  // off the left edge of the scrolling camera = a lost life
  await scene('gs.player.body.setAllowGravity(false); return 1');
  const cam = await scene('return gs.cameras.main.scrollX');
  await tpx(cam - 80, 200);
  await wait(300);
  check('left behind by the auto-scroll = death', (await player()).fsm === 'Dead');
}

if (run('museum')) {
  await level('3-2');
  // skip ahead to just before the museum, standing on the train
  await scene('gs.scroll.x = 88 * 48; const m = gs.movers[0]; m.t = (88 * 48 / 140) * 1000; const p = m.path(m.t); gs.teleport(p.x + 200, p.y + 12); return 1');
  await wait(300);
  // ride into the museum wall without jumping: shoved back and off
  let dead = false;
  for (let i = 0; i < 60 && !dead; i++) { await wait(200); dead = (await player()).fsm === 'Dead'; }
  check('the museum wall shoves you off the train', dead);
}

if (run('rear')) {
  await level('3-2');
  // sample the train's path: on the last straight it pulls ahead of the camera, so the rear
  // window (Geoduck #3, riding 60 px from the rear) comes on screen
  const at = (tx) => scene(`const m = gs.movers[0]; const ms = (${tx} * 48 / 140) * 1000; const p = m.path(ms); return p.x - m.width / 2 + 60 - ${tx} * 48`);
  const before = await at(290);
  const after = await at(316);
  check('rear-window geoduck comes on screen on the last straight', before < 0 && after > 40 && after < 400, `screen x ${before.toFixed(0)} → ${after.toFixed(0)}`);
  const rider = await scene('return gs.riders.some((r) => r.ride === gs.movers[0])');
  check('the geoduck rides the train', rider);
}

if (run('rain')) {
  await level('3-3');
  const states = [];
  for (let i = 0; i < 16; i++) { states.push(await scene('return gs.umbrellas[0].img.body.enable')); await wait(500); }
  check('umbrellas open and fold with the rain cycle', states.includes(true) && states.includes(false), states.map((s) => (s ? 'U' : '.')).join(''));
}

if (run('gift')) {
  await level('3-3');
  await page.evaluate(() => window.__jimothy.power('jacket'));
  await settle(81, 560);
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('KeyA');
    await wait(1300);
  }
  await wait(600);
  const items = await scene('return gs.geoducks.getChildren().map((d) => d.index)');
  check('thaw the midpoint Freeze 3 times → Geoduck #3', items.includes(2) || (await ducks())[2] === true, JSON.stringify(items));
}

if (run('exits')) {
  await page.evaluate(() => localStorage.clear());
  for (const [id, tx, ty] of [['3-1', 281, 520], ['3-2', 363, 8 * 48], ['3-3', 222, 520]]) {
    await level(id);
    if (id === '3-2') await scene(`gs.scroll.x = gs.scroll.max; gs.movers[0].t = 200000; gs.teleport(${tx * T + 24}, ${ty}); return 1`);
    await settle(tx, ty);
    await page.keyboard.down('ArrowRight'); await wait(1600); await page.keyboard.up('ArrowRight');
    try {
      await page.waitForFunction(() => window.__jimothy.activeScenes().includes('LevelClear'), null, { timeout: 12000 });
      check(`${id} exit → LevelClear`, true);
    } catch { check(`${id} exit → LevelClear`, false, await dbg()); continue; }
    await wait(3500);
    await page.keyboard.press('Space');
    await wait(2000);
    const sc = await page.evaluate(() => window.__jimothy.activeScenes());
    check(`${id} after clear`, id === '3-3' ? sc.includes('Intro') : sc.includes('WorldMap'), JSON.stringify(sc));
  }
}

if (run('map')) {
  await page.evaluate(() => window.__jimothy.start('WorldMap', { focus: '3-1', from: '2-3' }));
  await wait(2500);
  const title = await page.evaluate(() => window.__jimothy.game.scene.getScene('WorldMap').children.list.filter((c) => c.type === 'Text').map((t) => t.text).find((t) => t.startsWith('WORLD')));
  check('world map shows World 3 · Seattle Center', title === 'WORLD 3  ·  SEATTLE CENTER', title);
  await page.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/map3.png` : '/tmp/map3.png' });
}

console.log(results.filter((r) => !r[1]).length ? 'SOME FAILED' : 'ALL PASSED');
await browser.close(); server.kill(); process.exit(0);
