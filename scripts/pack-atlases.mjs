// Packs every folder under art/sprites into public/assets/atlases/<folder>.png + .json
// (Phaser "JSON hash" format). Shelf packing is plenty for a few dozen frames; swapping a
// sprite is a file replace followed by `npm run pack:atlases`.
import { execFileSync } from 'node:child_process';
import { readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, basename, resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const SRC = join(ROOT, 'art', 'sprites');
const OUT = join(ROOT, 'public', 'assets', 'atlases');
const PAD = 2;
const MAX_W = 2048;
mkdirSync(OUT, { recursive: true });

function size(file) {
  const out = execFileSync('identify', ['-format', '%w %h', file]).toString().trim();
  const [w, h] = out.split(' ').map(Number);
  return { w, h };
}

for (const atlas of readdirSync(SRC)) {
  const dir = join(SRC, atlas);
  if (!statSync(dir).isDirectory()) continue;
  const files = readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
  const frames = files.map((f) => ({ name: basename(f, '.png'), file: join(dir, f), ...size(join(dir, f)) }));
  // tallest first so each shelf wastes little
  frames.sort((a, b) => b.h - a.h || a.name.localeCompare(b.name));
  let x = PAD, y = PAD, shelfH = 0, maxW = 0;
  for (const fr of frames) {
    if (x + fr.w + PAD > MAX_W) { x = PAD; y += shelfH + PAD; shelfH = 0; }
    fr.x = x; fr.y = y;
    x += fr.w + PAD; shelfH = Math.max(shelfH, fr.h); maxW = Math.max(maxW, x);
  }
  const W = maxW, H = y + shelfH + PAD;
  const args = ['-size', `${W}x${H}`, 'xc:none'];
  for (const fr of frames) args.push(fr.file, '-geometry', `+${fr.x}+${fr.y}`, '-composite');
  args.push('-depth', '8', join(OUT, `${atlas}.png`));
  execFileSync('convert', args);
  const json = {
    frames: Object.fromEntries(frames.map((fr) => [fr.name, {
      frame: { x: fr.x, y: fr.y, w: fr.w, h: fr.h },
      rotated: false, trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: fr.w, h: fr.h },
      sourceSize: { w: fr.w, h: fr.h },
    }])),
    meta: { app: 'jimothy/pack-atlases', version: '1', image: `${atlas}.png`, size: { w: W, h: H }, scale: '1' },
  };
  writeFileSync(join(OUT, `${atlas}.json`), JSON.stringify(json, null, 1));
  console.log(`${atlas}: ${frames.length} frames → ${W}x${H}`);
}
