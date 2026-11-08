// Dev probe: exercises the 1-2 / 1-3 mechanisms through the real game loop and prints results.
// usage: node scripts/dev/mechanics.mjs [scenario]
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
const only = process.argv[2];
const server = spawn('npx', ['vite', 'preview', '--port', '4175', '--host', '127.0.0.1'], { cwd: process.cwd(), stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 2500));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') { if (!m.text().includes('GL Driver')) console.log('[' + m.type() + ']', m.text()); } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto('http://127.0.0.1:4175/');
await page.waitForFunction(() => window.__jimothy?.activeScenes().includes('Title'), null, { timeout: 30000 });
const T = 48;
const wait = (ms) => page.waitForTimeout(ms);
const scene = (fn, arg) => page.evaluate(([src, a]) => { const gs = window.__jimothy.game.scene.getScene('Game'); return new Function('gs', 'a', src)(gs, a); }, [fn, arg]);
async function level(id) {
  await page.evaluate((l) => { window.__jimothy.game.registry.remove('run'); window.__jimothy.start('Game', { levelId: l }); }, id);
  await page.waitForFunction(() => window.__jimothy?.activeScenes().includes('Game'));
  await wait(800);
}
const tp = (tx, y) => page.evaluate(([x, yy]) => window.__jimothy.teleport(x, yy), [tx * T + 24, y]);
const dbg = () => page.evaluate(() => window.__jimothy.debug());
const results = [];
const check = (name, ok, info = '') => { results.push([name, ok]); console.log(ok ? 'PASS' : 'FAIL', name, info); };
const run = (n) => !only || only === n;

if (run('crow')) {
  await level('1-2');
  // drop onto the first crow from above
  const crow = await scene("const c = gs.enemies.getChildren().find(e => e.def.id === 'crow'); return { x: c.x, y: c.y };");
  await page.evaluate(([x, y]) => window.__jimothy.teleport(x, y), [crow.x, crow.y - 140]);
  await wait(450);
  // step off the shell before the bounce lands on it again (that would kick it, Mario-style)
  await page.evaluate(([x, y]) => window.__jimothy.teleport(x, y), [crow.x - 200, 600]);
  await wait(300);
  const mode = await scene("return gs.enemies.getChildren().find(e => e.def.id === 'crow')?.mode");
  check('crow stomp → shell', mode === 'shell', mode);
  // walk into the shell from the left: it should slide right and bowl the two gulls
  const sx = await scene("return gs.enemies.getChildren().find(e => e.def.id === 'crow').x");
  await page.evaluate(([x, y]) => window.__jimothy.teleport(x, y), [sx - 70, 620]);
  await page.keyboard.down('ArrowRight'); await wait(250); await page.keyboard.up('ArrowRight');
  await wait(2500);
  const gulls = await scene("return gs.enemies.getChildren().filter(e => e.def.id === 'seagull' && e.x > 1700 && e.x < 2300 && e.alive).length");
  check('shell bowls the gull row', gulls === 0, `gulls left ${gulls}`);
  check('jimothy survived the kick', !(await dbg()).startsWith('Dead'), await dbg());
}

if (run('gate')) {
  await level('1-2');
  // stand in the gate slot while the gate is down, collect the geoduck, ride the gate up
  await tp(62, 470);
  await page.waitForFunction(() => window.__jimothy.game.scene.getScene('Game').gates[0].legIndex === 2, null, { timeout: 10000 });
  await tp(64.5, 520);
  for (let i = 0; i < (process.env.TRACE ? 25 : 0); i++) {
    console.log(await scene("const p = gs.player; const g = gs.gates[0]; return `P ${p.x.toFixed(0)},${p.y.toFixed(0)} ${p.fsm} vy=${p.body.velocity.y.toFixed(0)} | gate ${g.body.y.toFixed(0)} vy=${g.body.velocity.y.toFixed(0)} leg=${g.legIndex} hold=${g.holdMs.toFixed(0)}`"));
    await wait(150);
  }
  await wait(900);
  const ducks = await page.evaluate(() => window.__jimothy.geoducks());
  check('geoduck #1 in the gate slot', ducks[0] === true, JSON.stringify(ducks));
  await wait(4500);
  const p = await page.evaluate(() => window.__jimothy.player());
  check('gate lifts jimothy out', p.y < 300 && p.fsm !== 'Dead', JSON.stringify(p));
  // hidden flannel block above the gate
  await tp(61, 470);
  await wait(600);
  await page.keyboard.down('ArrowUp'); await wait(400); await page.keyboard.up('ArrowUp');
  await wait(900);
  const items = await page.evaluate(() => window.__jimothy.items());
  const hidden = await scene("return gs.blocks.getChildren().filter(b => b.item === 'flannel').map(b => ({ used: b.used, visible: b.visible }))");
  check('hidden block reveals the flannel', items.some((i) => i.kind === 'flannel') || hidden[0]?.used, JSON.stringify(hidden));
}

if (run('salmon')) {
  await level('1-2');
  // stand on the low dock past the last pillar: the last salmon should lift him to the top
  await tp(197, 560);
  await wait(300);
  let maxUp = 999;
  for (let i = 0; i < 40; i++) { const p = await page.evaluate(() => window.__jimothy.player()); maxUp = Math.min(maxUp, p.y); await wait(100); }
  const ducks = await page.evaluate(() => window.__jimothy.geoducks());
  check('dock geoduck #2', ducks[1] === true, JSON.stringify(ducks));
  check('salmon lifts jimothy off the dock', maxUp < 420, `min y ${maxUp.toFixed(0)}`);
  check('still alive', !(await dbg()).startsWith('Dead'), await dbg());
}

if (run('flycrow')) {
  await level('1-2');
  // let the camera arrive first: off-screen enemies sleep
  await tp(226, 430);
  await wait(2500);
  const c = await scene("const c = gs.enemies.getChildren().find(e => e.def.id === 'crow' && e.mode === 'fly'); return { x: c.x, y: c.y };");
  await page.evaluate(([x, y]) => window.__jimothy.teleport(x, y), [c.x, c.y - 120]);
  await wait(250);
  const after = await scene("const c = gs.enemies.getChildren().find(e => e.def.id === 'crow' && e.mode === 'fly'); return c ? c.alive : false");
  await wait(1500);
  const ducks = await page.evaluate(() => window.__jimothy.geoducks());
  check('flying crow stomped', after === false);
  check('crow geoduck #3 caught', ducks[2] === true, JSON.stringify(ducks) + ' ' + (await dbg()));
}

if (run('seesaw')) {
  await level('1-3');
  // fall onto the high (right) end holding jump
  const ss = await scene("const s = gs.seesaws[0]; return { x: s.x, y: s.y, tilt: s.tilt }");
  await page.keyboard.down('ArrowRight');
  await page.evaluate(([x, y]) => window.__jimothy.teleport(x, y), [ss.x + 90, ss.y - 200]);
  await wait(250);
  await page.keyboard.down('ArrowUp');
  let minY = 999;
  for (let i = 0; i < 25; i++) { const p = await page.evaluate(() => window.__jimothy.player()); minY = Math.min(minY, p.y); await wait(60); }
  await page.keyboard.up('ArrowUp');
  await wait(1500);
  await page.keyboard.up('ArrowRight');
  const tilt = await scene('return gs.seesaws[0].tilt');
  check('see-saw tips', tilt !== ss.tilt, `tilt ${ss.tilt} → ${tilt}`);
  check('launch clears the roof line (y < 336)', minY < 336, `min y ${minY.toFixed(0)}`);
  console.log('after launch', JSON.stringify(await page.evaluate(() => window.__jimothy.player())), JSON.stringify(await page.evaluate(() => window.__jimothy.geoducks())));
}

if (run('goose')) {
  await level('1-3');
  await tp(219, 560);
  await wait(800);
  const engaged = await scene('return gs.arena.engaged');
  check('arena engages and walls close', engaged === true);
  // keep Jimothy alive and stomp the goose each time it's dizzy
  await page.evaluate(() => window.__jimothy.power('flannel'));
  let stomps = 0;
  for (let i = 0; i < 300 && stomps < 3; i++) {
    const g = await scene("const g = gs.arena.boss; return g ? { x: g.x, y: g.y, mode: g.mode, hp: g.hp, alive: g.alive } : null");
    if (!g || !g.alive) break;
    if (g.mode === 'stun') {
      await page.evaluate(([x, y]) => window.__jimothy.teleport(x, y), [g.x, g.y - 160]);
      await wait(500);
      const hp = await scene('return gs.arena.boss?.hp ?? 0');
      if (hp < g.hp) stomps++;
    } else {
      await page.evaluate(() => { const gs = window.__jimothy.game.scene.getScene('Game'); gs.player.flannelMs = 9000; gs.player.iframesMs = 2000; });
      await wait(100);
    }
  }
  await wait(1200);
  const st = await scene('return { done: gs.arena.done, walls: gs.arena.walls.length, items: gs.powerups.getChildren().map(p => p.kind), ducks: gs.geoducks.getChildren().map(d => d.index) }');
  check('goose beaten in 3 stomps', stomps === 3 && st.done, JSON.stringify(st));
  check('loyalty star drops (or was already caught)', st.items.includes('star') || (await page.evaluate(() => window.__jimothy.game.registry.get('run').lives)) > 3);
}

if (run('cutscene')) {
  // from the map, entering an uncleared 1-2 plays its cutscene first
  await page.evaluate(() => { localStorage.clear(); });
  await page.evaluate(() => window.__jimothy.start('WorldMap', { focus: '1-2' }));
  await wait(800);
  await page.evaluate(() => { const gs = window.__jimothy.game.scene.getScene('WorldMap'); gs.index = 1; gs.enter(); });
  await wait(1200);
  const sc = await page.evaluate(() => window.__jimothy.activeScenes());
  check('map → 1-2 cutscene', sc.includes('Intro'), JSON.stringify(sc));
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__jimothy.activeScenes().includes('Game'), null, { timeout: 8000 }).catch(() => {});
  check('cutscene → 1-2', (await page.evaluate(() => window.__jimothy.levelId())) === '1-2');
}

if (run('exit')) {
  for (const [id, tx] of [['1-2', 279], ['1-3', 255]]) {
    await level(id);
    if (id === '1-3') await scene('gs.arena.done = true; return 1');
    await tp(tx - 1, 560);
    await page.keyboard.down('ArrowRight'); await wait(150); await page.keyboard.down('ArrowUp'); await wait(350); await page.keyboard.up('ArrowUp');
    await wait(700); await page.keyboard.up('ArrowRight');
    try {
      await page.waitForFunction(() => window.__jimothy.activeScenes().includes('LevelClear'), null, { timeout: 12000 });
      check(`${id} exit → LevelClear`, true);
    } catch { check(`${id} exit → LevelClear`, false, await dbg()); continue; }
    await wait(3500);
    await page.keyboard.press('Space');
    await wait(1500);
    const sc = await page.evaluate(() => window.__jimothy.activeScenes());
    check(`${id} after clear`, id === '1-3' ? sc.includes('Intro') : sc.includes('WorldMap'), JSON.stringify(sc));
  }
}

console.log(results.filter((r) => !r[1]).length ? 'SOME FAILED' : 'ALL PASSED');
await browser.close(); server.kill(); process.exit(0);
