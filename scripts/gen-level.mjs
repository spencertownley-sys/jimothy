// Generates the Tiled .tmj maps for World 1-1 ("Welcome to Ballard") and its storm-drain
// bonus room, following docs/03_LEVEL_SPECS.md screen by screen. Tiled can open and edit
// the output; this script is just faster than hand-placing 240 columns.
//
// Art: every tile and prop is cut from Higgsfield generations by scripts/gen-art.sh. Tiles
// carry collision; trees, bins, signs and other decor are `prop` objects drawn as sprites.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const OUT = join(ROOT, 'public', 'assets', 'maps');
mkdirSync(OUT, { recursive: true });

const T = 48;
// Tile ids in tilesets/ballard.png (gid = index; 0 = empty). Ranges hold wrap-around variants.
const TILE = {
  SIDEWALK: 1, // 1-4
  SIDEWALK_SOIL: 5, // 5-8
  GRASS: 9, // 9-12
  GRASS_SOIL: 13, // 13-16
  COBBLE: 17, // 17-20 (2x2 mirrored patch)
  FENCE_TOP: 21, // 21-22, one-way
  FENCE_BODY: 23, // 23-24, solid
  ROOF: 25, // 25-26 shingles
  EAVE: 27, // 27-28 roof underside
  DRAIN_L: 29,
  DRAIN_R: 30,
  POTHOLE: 31,
};
const ONEWAY_IDS = [TILE.FENCE_TOP, TILE.FENCE_TOP + 1];

const tileset = {
  firstgid: 1,
  name: 'ballard',
  tilewidth: T,
  tileheight: T,
  margin: 2,
  spacing: 4,
  columns: 8,
  tilecount: 32,
  image: '../tilesets/ballard.png',
  imagewidth: 416,
  imageheight: 208,
  tiles: [
    ...ONEWAY_IDS.map((id) => ({ id: id - 1, properties: [{ name: 'oneway', type: 'bool', value: true }] })),
    { id: TILE.POTHOLE - 1, properties: [{ name: 'hazard', type: 'string', value: 'pothole' }] },
  ],
};

const propList = (props) =>
  Object.entries(props).map(([k, v]) => ({
    name: k,
    type: typeof v === 'number' ? (Number.isInteger(v) ? 'int' : 'float') : typeof v === 'boolean' ? 'bool' : 'string',
    value: v,
  }));

class MapBuilder {
  constructor(width, height, props) {
    this.width = width;
    this.height = height;
    this.props = props;
    this.layers = {};
    for (const name of ['ground', 'oneway', 'decor', 'hazards']) this.layers[name] = new Array(width * height).fill(0);
    this.objects = [];
    this.nextId = 1;
  }
  set(layer, x, y, id) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) throw new Error(`tile out of bounds ${x},${y}`);
    this.layers[layer][y * this.width + x] = id;
  }
  /** Sidewalk or grass ground: top row 13, soil row 14, wrap-around variants by column. */
  ground(x0, x1, kind = 'sidewalk') {
    const top = kind === 'grass' ? TILE.GRASS : TILE.SIDEWALK;
    const soil = kind === 'grass' ? TILE.GRASS_SOIL : TILE.SIDEWALK_SOIL;
    for (let x = x0; x <= x1; x++) {
      this.set('ground', x, 13, top + (x % 4));
      this.set('ground', x, 14, soil + (x % 4));
    }
  }
  cobble(x0, x1, y0, y1, layer = 'ground') {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(layer, x, y, TILE.COBBLE + (x % 2) + 2 * (y % 2));
  }
  /** Floating wooden-fence platform, one-way from above. */
  fence(x0, x1, y) {
    for (let x = x0; x <= x1; x++) this.set('oneway', x, y, TILE.FENCE_TOP + (x % 2));
  }
  /** Fence step standing on the ground: walkable top, solid fence body underneath. */
  fenceStep(x0, x1, height) {
    for (let x = x0; x <= x1; x++) {
      this.set('oneway', x, 13 - height, TILE.FENCE_TOP + (x % 2));
      for (let y = 14 - height; y <= 12; y++) this.set('ground', x, y, TILE.FENCE_BODY + (x % 2));
    }
  }
  /** Low decorative fence along the ground (no collision). */
  fenceDecor(x0, x1) {
    for (let x = x0; x <= x1; x++) this.set('decor', x, 12, TILE.FENCE_TOP + (x % 2));
  }
  /** Porch roof two tiles thick (rows y, y+1), solid, with columns at both ends. */
  porch(x0, x1, y) {
    for (let x = x0; x <= x1; x++) {
      this.set('ground', x, y, TILE.ROOF + (x % 2));
      this.set('ground', x, y + 1, TILE.EAVE + (x % 2));
    }
    const gap = 12 - (y + 1);
    for (const x of [x0, x1]) this.prop('column', x, 12, { h: gap, stretch: true, w: 0.3 });
  }
  drain(x) {
    this.set('ground', x, 12, TILE.DRAIN_L);
    this.set('ground', x + 1, 12, TILE.DRAIN_R);
  }
  pothole(x) {
    this.set('hazards', x, 12, TILE.POTHOLE);
  }
  // objects use Tiled rectangle convention: x,y = top-left in px
  obj(type, tx, ty, { w = 1, h = 1, name = '', props = {} } = {}) {
    this.objects.push({
      id: this.nextId++, name, type, visible: true, rotation: 0,
      x: tx * T, y: ty * T, width: w * T, height: h * T,
      properties: propList(props),
    });
  }
  /**
   * Decor sprite from the `props` atlas. (tx, bottomRow) is the tile the sprite stands on top of
   * the bottom of; `h` is its height in tiles (width follows the image unless `stretch`).
   */
  prop(sprite, tx, bottomRow, { h = 1, w = 1, front = false, stretch = false, align = 'bottom', dx = 0 } = {}) {
    const bottom = (bottomRow + 1) * T;
    this.objects.push({
      id: this.nextId++, name: sprite, type: 'prop', visible: true, rotation: 0,
      x: tx * T + (T - w * T) / 2 + dx * T, y: bottom - h * T, width: w * T, height: h * T,
      properties: propList({ sprite, front, stretch, align }),
    });
  }
  cedar(x, h = 9) {
    this.prop('cedar', x, 12, { h, w: 1 });
  }
  latte(tx, ty) { this.obj('latte', tx, ty); }
  lattes(txs, ty) { for (const tx of txs) this.latte(tx, ty); }
  toJSON() {
    const tileLayer = (name, i) => ({
      id: i + 1, name, type: 'tilelayer', visible: true, opacity: 1, x: 0, y: 0,
      width: this.width, height: this.height, data: this.layers[name],
    });
    return {
      type: 'map', version: '1.10', tiledversion: '1.10.2', orientation: 'orthogonal', renderorder: 'right-down',
      infinite: false, width: this.width, height: this.height, tilewidth: T, tileheight: T, nextlayerid: 6,
      nextobjectid: this.nextId, compressionlevel: -1,
      properties: Object.entries(this.props).map(([k, v]) => ({
        name: k, type: typeof v === 'number' ? (Number.isInteger(v) ? 'int' : 'float') : typeof v === 'boolean' ? 'bool' : 'string', value: v,
      })),
      layers: [
        tileLayer('ground', 0), tileLayer('oneway', 1), tileLayer('decor', 2), tileLayer('hazards', 3),
        { id: 5, name: 'objects', type: 'objectgroup', visible: true, opacity: 1, x: 0, y: 0, draworder: 'topdown', objects: this.objects },
      ],
      tilesets: [tileset],
    };
  }
}

// ------------------------------------------------------------------------------------
// 1-1 "Welcome to Ballard" — 9 screens × ~26.7 tiles = 240 tiles wide, 15 tall
// ------------------------------------------------------------------------------------
const m = new MapBuilder(240, 15, { music: 'ballard', parallaxSet: 'ballard', timeLimit: 0, wind: 0, autoScroll: 0, par: 90, name: 'Welcome to Ballard' });

// Screen 1: Jimothy's stump + the LUXE MICRO-LOFTS sign. Flat. 5 lattes in an arc teach jump height.
m.ground(0, 140);
m.prop('stump', 3, 12, { h: 1.3 });
m.obj('player_spawn', 2, 12, { name: 'start' });
m.obj('sign', 6, 9, { w: 3.4, h: 4, props: { text: 'COMING SOON\nLUXE MICRO-LOFTS\nSTUDIOS FROM $2,950' } });
m.prop('fern', 10, 12, { h: 1.2 });
m.cedar(20, 9);
m.prop('fern', 22, 12, { h: 1 });
m.latte(12, 11); m.latte(13, 10); m.latte(14, 9); m.latte(15, 10); m.latte(16, 11);
m.prop('puddle', 25, 12, { h: 0.35 });

// Screen 2: first Seagull walking toward you on flat ground. Chalkboard ? block → Teriyaki Bowl.
m.lattes([29, 30, 31], 11);
m.obj('qblock', 34, 9, { props: { item: 'teriyaki' } });
m.obj('enemy:seagull', 40, 12, { props: { dir: -1 } });
m.fenceDecor(44, 47);
m.lattes([48, 49, 50], 11);
m.cedar(53, 8.5);

// Screen 3: rising wooden-fence steps beside the recycling bins, latte row on top. Geoduck #1
// hides behind the compost bin under a low porch you must crouch-walk through.
m.fenceStep(57, 58, 1); m.lattes([57, 58], 11);
m.prop('bin_blue', 59, 12, { h: 1.5 });
m.fenceStep(61, 62, 2); m.lattes([61, 62], 10);
m.prop('bin_green', 63, 12, { h: 1.5 });
m.fenceStep(65, 66, 3); m.lattes([65, 66], 9);
m.prop('bin_black', 67, 12, { h: 1.5 });
m.porch(73, 80, 10); // roof rows 10-11, 1-tile gap underneath → crouch
m.prop('lantern', 76, 12, { h: 0.8, align: 'top' });
m.latte(75, 12); m.latte(77, 12);
m.obj('geoduck', 79, 12, { props: { index: 0 } });
m.prop('compost', 79, 12, { h: 1.15, front: true, dx: 0.25 }); // drawn in front so the geoduck peeks out
m.prop('fern', 82, 12, { h: 1 });

// Screen 4: porch overhang requires crouch (gap 1 tile). Joke: a "FREE" box of CRT monitors on the curb.
m.fenceDecor(86, 88);
m.cobble(92, 97, 8, 9);
m.porch(92, 97, 10);
m.latte(94, 12); m.latte(96, 12);
m.prop('freebox', 100.5, 12, { h: 2 });
m.obj('sign', 102.5, 9.6, { w: 2.8, h: 3.4, props: { text: 'FREE\n(works, probably)' } });
m.pothole(106);
m.latte(107, 10); m.latte(108, 10);

// Screen 5: checkpoint coffee stand, then two seagulls in a row — stomp combo.
m.obj('checkpoint', 113, 11, { w: 1, h: 2, name: 'cp1' });
m.lattes([118, 119, 120], 11);
m.obj('enemy:seagull', 123, 12, { props: { dir: -1 } });
m.obj('enemy:seagull', 127, 12, { props: { dir: -1 } });
m.cedar(132, 9);
m.prop('puddle', 136, 12, { h: 0.35 });

// Screen 6: small pit (3 tiles) — first required jump. Fence platforms.
m.ground(144, 149);
m.latte(141, 11); m.latte(142, 10); m.latte(143, 11);
m.fence(146, 148, 10); m.lattes([146, 147, 148], 9);
m.fence(150, 152, 11); m.lattes([150, 151, 152], 10);
m.ground(153, 239, 'grass');
m.prop('fern', 155, 12, { h: 1.1 });

// Screen 7: Hopping Cone intro, flat area. Mossy brick row overhead (breakable when Big).
m.obj('enemy:cone', 170, 12);
for (const x of [174, 175, 177, 178, 179]) m.obj('brick', x, 9);
m.obj('qblock', 176, 9, { props: { item: 'latte' } });
m.lattes([174, 175, 176, 177, 178, 179], 8);
m.obj('enemy:cone', 183, 12);
m.fenceDecor(187, 189);

// Screen 8: Geoduck #2 inside a storm drain (Down to enter) → bonus room with 20 lattes.
m.drain(196);
m.obj('drain', 196, 12, { w: 2, h: 1, props: { targetLevel: '1-1-bonus', targetSpawn: 'bonus_in' } });
m.obj('player_spawn', 199, 12, { name: 'drain_out' });
m.lattes([203, 204, 205], 11);
m.obj('enemy:seagull', 209, 12, { props: { dir: -1 } });
m.pothole(213);
m.cedar(216, 8.5);

// Screen 9: Geoduck #3 on top of the last cedar — bounce off the final Seagull with jump held.
// Exit: Ferry Ticket at a bus stop; the 44 bus pulls up and Jimothy boards.
m.cedar(226, 9.5);
m.fence(221, 223, 10);
m.obj('enemy:seagull', 222, 9, { props: { dir: -1, turnAtEdges: true } });
m.fence(225, 227, 7);
m.obj('geoduck', 226, 6, { props: { index: 2 } });
m.latte(222, 8); m.latte(224, 6);
m.prop('busstop', 233, 12, { h: 3.1 });
m.obj('exit', 234, 11, { w: 2, h: 2, props: { vehicle: 'bus' } });
m.prop('fern', 237, 12, { h: 1 });

writeFileSync(join(OUT, '1-1.tmj'), JSON.stringify(m.toJSON()));

// ------------------------------------------------------------------------------------
// 1-1 bonus room: a mossy storm-drain chamber with 20 lattes and Geoduck #2
// ------------------------------------------------------------------------------------
const b = new MapBuilder(27, 15, { music: 'ballard', parallaxSet: 'drain', timeLimit: 0, wind: 0, autoScroll: 0, par: 0, name: 'Storm Drain' });
b.cobble(0, 26, 13, 14);
b.cobble(0, 26, 0, 0);
b.cobble(0, 0, 1, 12);
b.cobble(26, 26, 1, 12);
b.obj('player_spawn', 2, 11, { name: 'bonus_in' });
b.fence(5, 14, 9);
b.lattes([5, 6, 7, 8, 9, 10, 11, 12, 13, 14], 11);
b.lattes([5, 6, 7, 8, 9, 10, 11, 12, 13, 14], 8);
b.fence(18, 21, 6);
b.obj('geoduck', 19, 5, { props: { index: 1 } });
b.prop('puddle', 3, 12, { h: 0.35 });
b.prop('puddle', 16, 12, { h: 0.35 });
b.drain(23);
b.obj('drain', 23, 12, { w: 2, h: 1, props: { targetLevel: '1-1', targetSpawn: 'drain_out' } });
b.obj('sign', 22, 8.6, { w: 2.4, h: 3, props: { text: 'EXIT ↓' } });
writeFileSync(join(OUT, '1-1-bonus.tmj'), JSON.stringify(b.toJSON()));

console.log('maps written: 1-1.tmj, 1-1-bonus.tmj');
