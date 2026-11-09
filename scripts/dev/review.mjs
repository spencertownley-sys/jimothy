// Dev probe: charts each level's review route in the built game and reports whether it clears.
// usage: node scripts/dev/review.mjs [level] [--shots dir] [--trace]
//   --trace prints Jimothy's position every second of the route (find where a route goes wrong)
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
const args = process.argv.slice(2);
const only = args.find((a) => /^\d-\d/.test(a));
const shots = args.includes('--shots') ? args[args.indexOf('--shots') + 1] : null;
const trace = args.includes('--trace');
// --look 20,25.5 : after charting, seek to these seconds and screenshot + print Jimothy's state
const look = args.includes('--look') ? args[args.indexOf('--look') + 1].split(',').map(Number) : [];
const port = 4181;
const server = spawn('npx', ['vite', '--port', String(port), '--host', '127.0.0.1', '--strictPort'], { cwd: process.cwd(), stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 2500));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium', headless: true });
const ids = only ? [only] : ['1-1', '1-1-bonus', '1-2', '1-3', '2-1', '2-2', '2-3', '3-1', '3-2', '3-3'];
const T = 48;
let failures = 0;
for (const id of ids) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('GL Driver')) errors.push(m.text()); });
  const t0 = Date.now();
  await page.goto(`http://127.0.0.1:${port}/?review=${id}`);
  const samples = [];
  let st;
  for (;;) {
    await page.waitForTimeout(trace ? 250 : 500);
    st = await page.evaluate(() => window.__jimothy?.review());
    if (st && trace) samples.push(`${(st.step / 60).toFixed(1)}s x=${(st.x / T).toFixed(1)} y=${(st.y / T).toFixed(1)}`);
    if (st && !st.charting) break;
    if (Date.now() - t0 > 240000) break;
  }
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  const clear = st?.beats.some((b) => b.kind === 'clear');
  const rescues = st?.beats.filter((b) => b.kind === 'rescue').length ?? 0;
  const ducks = st?.beats.filter((b) => b.kind === 'geoduck').map((b) => b.text.slice(-2)).join('') ?? '';
  if (!clear || rescues > 0 || errors.length) failures++;
  console.log(`${clear && !rescues ? 'PASS' : 'FAIL'} ${id}: ${clear ? 'cleared' : 'NOT cleared'} in ${((st?.total ?? 0) / 60).toFixed(1)} s of play (charted in ${secs} s), rescues ${rescues}, geoducks [${ducks}], end x=${((st?.x ?? 0) / T).toFixed(1)} y=${((st?.y ?? 0) / T).toFixed(1)}`);
  for (const b of st?.beats ?? []) console.log(`    ${(b.step / 60).toFixed(1).padStart(6)}s  ${b.kind.padEnd(10)} ${b.text}`);
  if (trace) console.log(samples.join('\n'));
  for (const e of errors.slice(0, 5)) console.log('    [error]', e);
  if (shots) await page.screenshot({ path: `${shots}/review-${id}.png` });
  for (const sec of look) {
    const n = Math.round(sec * 60);
    await page.evaluate((n) => { const r = window.__jimothy.game.scene.getScene('Review'); r.playing = false; r.seek(n); }, n);
    await page.waitForFunction((n) => { const s = window.__jimothy.review(); return s && !s.seeking && (s.step === n || s.ended); }, n, { timeout: 60000 });
    await page.waitForTimeout(150);
    console.log(`  @${sec}s`, await page.evaluate(() => window.__jimothy.game.scene.getScene('Game').player.debugInfo()));
    await page.screenshot({ path: `${shots ?? '.'}/look-${id}-${sec}.png` });
  }
  await page.close();
}
await browser.close();
server.kill();
process.exit(failures ? 1 : 0);
