// Dev probe: exercises the World 2 (Pike Place) mechanisms in the built game and prints results.
// usage: node scripts/dev/world2.mjs [scenario]
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
const only = process.argv[2];
const server = spawn('npx', ['vite', 'preview', '--port', '4178', '--host', '127.0.0.1'], { cwd: process.cwd(), stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 2500));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', (m) => { if (m.type() === 'error') console.log('[error]', m.text()); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto('http://127.0.0.1:4178/');
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
const results = [];
const check = (name, ok, info = '') => { results.push([name, ok]); console.log(ok ? 'PASS' : 'FAIL', name, info); };
const run = (n) => !only || only === n;
// let the camera arrive before acting (off-screen enemies sleep)
async function settle(tx, y) { await tp(tx, y); await wait(1800); }

if (run('toss')) {
  await level('2-1');
  await settle(31, 520);
  // wait for a salmon to be thrown from the left fishmonger, then step onto it
  await page.waitForFunction(() => { const gs = window.__jimothy.game.scene.getScene('Game'); return gs.movers.some((m) => m.frame.name === 'salmon' && m.visible && m.body.velocity.x > 0 && m.x < 31 * 48 + 150); }, null, { timeout: 12000 });
  const f = await scene("const m = gs.movers.find((m) => m.frame.name === 'salmon' && m.visible); return { x: m.body.center.x, y: m.body.top }");
  await tpx(f.x, f.y - 4);
  let maxX = 0;
  for (let i = 0; i < 25; i++) { const p = await player(); maxX = Math.max(maxX, p.x); await wait(100); }
  const p = await player();
  check('ride the thrown salmon across the gap', maxX > 39 * T && p.fsm !== 'Dead', `maxX ${(maxX / T).toFixed(1)} tiles, ${p.fsm}`);
}

if (run('pig')) {
  await level('2-1');
  // count only lattes right of the pig (crows elsewhere keep eating theirs)
  const near = "return gs.lattes.getChildren().filter((l) => l.x > 145 * 48 && l.x < 160 * 48).length + gs.run.lattesThisLevel";
  const before = await scene(near);
  await settle(144, 380);
  await wait(3600);
  const after = await scene(near);
  const done = await scene('return gs.pig.done');
  check('brass pig pays out 10 lattes', done && after - before === 10, JSON.stringify({ before, after, done }));
}

if (run('dahlia')) {
  await level('2-1');
  await settle(108, 520);
  await page.keyboard.down('ArrowUp');
  await tp(112, 300);
  let minY = 999;
  for (let i = 0; i < 20; i++) { const p = await player(); minY = Math.min(minY, p.y); await wait(60); }
  await page.keyboard.up('ArrowUp');
  check('dahlia bucket bounces Jimothy up to the roofs', minY < 300, `min y ${minY.toFixed(0)}`);
}

if (run('crow')) {
  await level('2-1');
  const count = () => scene("return gs.lattes.getChildren().filter((l) => l.x > 46 * 48 && l.x < 53 * 48).length");
  const before = await count();
  await settle(25, 520);
  await wait(4000);
  const after = await count();
  check('market crow steals lattes', after < before, `${before} → ${after}`);
}

if (run('freeze')) {
  await level('2-1');
  await settle(62.4, 520);
  const x0 = (await player()).x;
  let moved = 0;
  for (let i = 0; i < 40; i++) { const p = await player(); moved = Math.max(moved, Math.abs(p.x - x0)); await wait(100); }
  check('Freeze pulse shoves Jimothy back', moved > 30, `moved ${moved.toFixed(0)} px, ${(await dbg()).slice(0, 12)}`);
  check('…without hurting him', (await player()).fsm !== 'Dead');
  await page.evaluate(() => window.__jimothy.power('jacket'));
  await wait(700);
  await tp(58, 520);
  await wait(500);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('KeyA');
  await wait(900);
  const thawed = await scene("return gs.enemies.getChildren().find((e) => e.def.id === 'freeze')?.thawed");
  check('a Rain Drop thaws the Freeze', thawed === true);
}

if (run('scooter')) {
  await level('2-2');
  await settle(47, 1200);
  await page.evaluate(() => { window.__jimothy.game.scene.getScene('Game').player.flannelMs = 99999; });
  await page.keyboard.down('ArrowRight'); await wait(800); await page.keyboard.up('ArrowRight');
  await wait(300);
  const s1 = await scene("const s = gs.enemies.getChildren().find((e) => e.def.id === 'scooter'); return s ? { mode: s.mode, x: s.x } : null");
  let s2 = null;
  for (let i = 0; i < 20 && !s2; i++) { await wait(100); s2 = await scene("const s = gs.enemies.getChildren().find((e) => e.def.id === 'scooter' && e.mode === 'ride'); return s ? { mode: s.mode, x: s.x, vis: s.visible } : null"); }
  check('scooter honks first', s1?.mode === 'horn' || s1?.mode === 'ride', JSON.stringify(s1));
  check('…then rides in from the right', s2?.mode === 'ride' && s2.vis, JSON.stringify(s2));
}

if (run('gum')) {
  await level('2-2');
  await settle(36, 300);
  await page.keyboard.down('ArrowRight');
  await tp(40.2, 450);
  let slid = 0, maxVy = 0;
  for (let i = 0; i < 25; i++) {
    const d = await scene('return { ws: gs.player.wallSlide, vy: gs.player.body.velocity.y }');
    if (d.ws) { slid++; maxVy = Math.max(maxVy, d.vy); }
    await wait(80);
  }
  await page.keyboard.up('ArrowRight');
  check('gum wall: pushing into it turns the fall into a slow slide', slid > 3 && maxVy <= 75, `steps sliding ${slid}, max vy ${maxVy.toFixed(0)}`);
  await wait(2500);
  const ducks = await page.evaluate(() => window.__jimothy.geoducks());
  check('…down past the ledge to Geoduck #1', ducks[0] === true, JSON.stringify(ducks));
}

if (run('door')) {
  await level('2-2');
  await settle(76.5, 1200);
  await page.keyboard.press('ArrowDown');
  await wait(1500);
  const p = await player();
  check('stage door leads to the hidden alcove', p.x > 131 * T, `x ${(p.x / T).toFixed(1)}`);
  await tp(137, 1200);
  await wait(700);
  check('alcove geoduck #2', (await page.evaluate(() => window.__jimothy.geoducks()))[1] === true);
  await tp(132.5, 1200);
  await wait(400);
  await page.keyboard.press('ArrowDown');
  await wait(1500);
  check('…and back out', (await player()).x < 90 * T);
}

if (run('scooterpad')) {
  await level('2-2');
  await settle(104, 1200);
  await page.keyboard.down('ArrowRight'); await page.keyboard.down('KeyS');
  await page.waitForFunction(() => window.__jimothy.player().x > 109.6 * 48, null, { timeout: 5000 });
  await page.keyboard.down('ArrowUp');
  await wait(2200);
  await page.keyboard.up('ArrowUp'); await page.keyboard.up('ArrowRight'); await page.keyboard.up('KeyS');
  const ducks = await page.evaluate(() => window.__jimothy.geoducks());
  check('sprint-jump off the tipped scooter reaches Geoduck #3', ducks[2] === true, JSON.stringify(ducks) + ' ' + (await dbg()).slice(0, 60));
}

if (run('wheel')) {
  await level('2-3');
  await settle(64, 520);
  const g0 = await scene('return gs.riders.map((r) => ({ x: r.img.x, y: r.img.y }))');
  await wait(1500);
  const g1 = await scene('return gs.riders.map((r) => ({ x: r.img.x, y: r.img.y }))');
  check('the wheel turns and carries Geoduck #1', g0.length === 1 && Math.hypot(g1[0].x - g0[0].x, g1[0].y - g0[0].y) > 20, JSON.stringify([g0, g1]));
  // stand on a gondola roof near the bottom and ride it up
  await page.waitForFunction(() => { const gs = window.__jimothy.game.scene.getScene('Game'); return gs.movers.some((m) => m.frame.name === 'gondola' && m.body.velocity.y < -20 && m.body.top > 380); }, null, { timeout: 15000 });
  const g = await scene("const m = gs.movers.find((m) => m.frame.name === 'gondola' && m.body.velocity.y < -20 && m.body.top > 380); return { x: m.body.center.x, y: m.body.top }");
  await tpx(g.x, g.y - 2);
  let minY = 999;
  for (let i = 0; i < 20; i++) { const p = await player(); minY = Math.min(minY, p.y); await wait(100); }
  check('gondola carries Jimothy up', minY < g.y - 40, `from ${g.y.toFixed(0)} to ${minY.toFixed(0)}`);
}

if (run('flock')) {
  await level('2-3');
  await page.evaluate(() => window.__jimothy.power('teriyaki'));
  await wait(800);
  await page.keyboard.down('ArrowRight'); await wait(600); await page.keyboard.up('ArrowRight');
  const f0 = await scene('return gs.flock.x');
  await wait(1000);
  const f1 = await scene('return gs.flock.x');
  check('the flock gives chase', f1 > f0 + 200, `${f0.toFixed(0)} → ${f1.toFixed(0)}`);
  let stripped = false;
  for (let i = 0; i < 80 && !stripped; i++) { await wait(150); stripped = (await scene('return gs.player.power')) === 'small'; }
  check('caught: the flock steals the Teriyaki (no damage)', stripped && (await player()).fsm !== 'Dead');
  const sw = await scene("return gs.flock.swoopersLeft");
  check('swoopers peel off the flock', sw < 10, `left ${sw}`);
  // the side pier: the flock waits
  await settle(100, 560);
  const p0 = await scene('return gs.flock.x');
  await wait(1500);
  const p1 = await scene('return gs.flock.x');
  check('flock hangs back while Jimothy is on the side pier', Math.abs(p1 - p0) < 30 || p1 <= p0, `${p0.toFixed(0)} → ${p1.toFixed(0)}`);
  await tp(103, 520);
  await wait(600);
  check('side-pier Geoduck #2', (await page.evaluate(() => window.__jimothy.geoducks()))[1] === true);
}

if (run('exits')) {
  await page.evaluate(() => localStorage.clear());
  for (const [id, tx, ty] of [['2-1', 306, 520], ['2-2', 120, 330], ['2-3', 331, 520]]) {
    await level(id);
    if (id === '2-3') await scene('gs.flock.x = -99999; gs.flock.speed = 0; return 1');
    await settle(tx, ty);
    await page.keyboard.down('ArrowRight'); await wait(150); await page.keyboard.down('ArrowUp'); await wait(350); await page.keyboard.up('ArrowUp');
    await wait(1200); await page.keyboard.up('ArrowRight');
    try {
      await page.waitForFunction(() => window.__jimothy.activeScenes().includes('LevelClear'), null, { timeout: 12000 });
      check(`${id} exit → LevelClear`, true);
    } catch { check(`${id} exit → LevelClear`, false, await dbg()); continue; }
    await wait(3500);
    await page.keyboard.press('Space');
    await wait(2000);
    const sc = await page.evaluate(() => window.__jimothy.activeScenes());
    check(`${id} after clear`, id === '2-3' ? sc.includes('Intro') : sc.includes('WorldMap'), JSON.stringify(sc));
  }
}

if (run('map')) {
  await page.evaluate(() => window.__jimothy.start('WorldMap', { focus: '2-1', from: '1-3' }));
  await wait(1500);
  const title = await page.evaluate(() => window.__jimothy.game.scene.getScene('WorldMap').children.list.filter((c) => c.type === 'Text').map((t) => t.text).find((t) => t.startsWith('WORLD')));
  check('world map shows World 2 · Pike Place', title === 'WORLD 2  ·  PIKE PLACE', title);
}

console.log(results.filter((r) => !r[1]).length ? 'SOME FAILED' : 'ALL PASSED');
await browser.close(); server.kill(); process.exit(0);
