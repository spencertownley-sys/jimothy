// Generates the Tiled .tmj maps for World 1-1 ("Welcome to Ballard") and its storm-drain
// bonus room, following docs/03_LEVEL_SPECS.md screen by screen. Tiled can open and edit
// the output; this script is just faster than hand-placing 240 columns.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const OUT = join(ROOT, 'public', 'assets', 'maps');
mkdirSync(OUT, { recursive: true });

const T = 48;
// Tile ids in tilesets/ballard.png (gid = index; 0 = empty)
const TILE = {
  SIDEWALK: 1, DIRT: 2, GRASS: 3, COBBLE: 4, PALLET: 5,
  BIN_BLUE_LID: 6, BIN_GREEN_LID: 7, BIN_BLACK_LID: 8,
  BIN_BLUE: 9, BIN_GREEN: 10, BIN_BLACK: 11,
  PORCH_ROOF: 12, POST: 13, TRUNK: 14, FOLIAGE: 15, POTHOLE: 16, STUMP: 17, STONE: 18,
  COMPOST_LID: 19, COMPOST: 20, BUS_STOP: 21, CRT: 22, FREE_BOX: 23, DRAIN: 24, PUDDLE: 25,
  FERN: 26, FENCE: 27, PORCH_LIGHT: 28, BRANCH: 29, BOUGH: 30,
};
const ONEWAY = new Set([TILE.PALLET, TILE.BIN_BLUE_LID, TILE.BIN_GREEN_LID, TILE.BIN_BLACK_LID, TILE.COMPOST_LID, TILE.BRANCH]);

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
    ...[...ONEWAY].map((id) => ({ id: id - 1, properties: [{ name: 'oneway', type: 'bool', value: true }] })),
    { id: TILE.POTHOLE - 1, properties: [{ name: 'hazard', type: 'string', value: 'pothole' }] },
  ],
};

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
  fill(layer, x0, x1, y0, y1, id) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(layer, x, y, id);
  }
  ground(x0, x1, top = TILE.SIDEWALK) {
    this.fill('ground', x0, x1, 13, 13, top);
    this.fill('ground', x0, x1, 14, 14, TILE.DIRT);
  }
  oneway(x0, x1, y, id = TILE.PALLET) { this.fill('oneway', x0, x1, y, y, id); }
  decor(x, y, id) { this.set('decor', x, y, id); }
  // objects use Tiled rectangle convention: x,y = top-left in px
  obj(type, tx, ty, { w = 1, h = 1, name = '', props = {} } = {}) {
    this.objects.push({
      id: this.nextId++, name, type, visible: true, rotation: 0,
      x: tx * T, y: ty * T, width: w * T, height: h * T,
      properties: Object.entries(props).map(([k, v]) => ({
        name: k, type: typeof v === 'number' ? (Number.isInteger(v) ? 'int' : 'float') : typeof v === 'boolean' ? 'bool' : 'string', value: v,
      })),
    });
  }
  latte(tx, ty) { this.obj('latte', tx, ty); }
  lattes(txs, ty) { for (const tx of txs) this.latte(tx, ty); }
  bin(x, groundRow, height, color) {
    const lid = { blue: TILE.BIN_BLUE_LID, green: TILE.BIN_GREEN_LID, black: TILE.BIN_BLACK_LID, compost: TILE.COMPOST_LID }[color];
    const body = { blue: TILE.BIN_BLUE, green: TILE.BIN_GREEN, black: TILE.BIN_BLACK, compost: TILE.COMPOST }[color];
    for (let i = 1; i < height; i++) this.set('ground', x, groundRow - i, body);
    this.set('oneway', x, groundRow - height, lid);
  }
  cedar(x, top, bottom) {
    for (let y = top + 3; y <= bottom; y++) this.decor(x, y, TILE.TRUNK);
    this.decor(x, top, TILE.FOLIAGE);
    this.decor(x - 1, top + 1, TILE.BOUGH); this.decor(x, top + 1, TILE.FOLIAGE); this.decor(x + 1, top + 1, TILE.BOUGH);
    this.decor(x - 1, top + 2, TILE.BOUGH); this.decor(x, top + 2, TILE.FOLIAGE); this.decor(x + 1, top + 2, TILE.BOUGH);
  }
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
const G = 13; // ground top row

// Screen 1: Jimothy's stump + the LUXE MICRO-LOFTS sign. Flat. 5 lattes in an arc teach jump height.
m.ground(0, 140);
m.decor(3, 12, TILE.STUMP);
m.obj('player_spawn', 2, 12, { name: 'start' });
m.obj('sign', 6, 10, { w: 3, h: 3, props: { text: 'COMING SOON\nLUXE MICRO-LOFTS\nSTUDIOS FROM $2,950' } });
m.decor(9, 12, TILE.FERN);
m.cedar(20, 4, 12);
m.latte(12, 11); m.latte(13, 10); m.latte(14, 9); m.latte(15, 10); m.latte(16, 11);
m.decor(24, 12, TILE.PUDDLE);

// Screen 2: first Seagull walking toward you on flat ground. Chalkboard ? block → Teriyaki Bowl.
m.lattes([29, 30, 31], 11);
m.obj('qblock', 34, 9, { props: { item: 'teriyaki' } });
m.obj('enemy:seagull', 40, 12, { props: { dir: -1 } });
m.decor(44, 12, TILE.FENCE); m.decor(45, 12, TILE.FENCE); m.decor(46, 12, TILE.FENCE);
m.lattes([48, 49, 50], 11);
m.cedar(53, 5, 12);

// Screen 3: recycling bins as rising steps, latte row on top. Geoduck #1 behind the compost bin
// under a porch you must crouch-walk through.
m.bin(57, G, 1, 'blue'); m.latte(57, 11);
m.bin(61, G, 2, 'green'); m.latte(61, 10);
m.bin(65, G, 3, 'black'); m.latte(65, 9);
m.fill('ground', 69, 83, 10, 10, TILE.PORCH_ROOF); // porch roof — walkable on top (alternate route)
m.decor(69, 11, TILE.POST); m.decor(69, 12, TILE.POST); m.decor(83, 11, TILE.POST); m.decor(83, 12, TILE.POST);
m.decor(70, 11, TILE.PORCH_LIGHT);
m.fill('ground', 73, 78, 11, 11, TILE.STONE); // low beam: only a 1-tile gap below → crouch
m.latte(75, 12); m.latte(77, 12);
m.obj('geoduck', 80, 12, { props: { index: 0 } });
m.decor(80, 12, TILE.COMPOST); // drawn in front of the geoduck so it hides "behind" the compost bin
m.decor(81, 12, TILE.FERN);

// Screen 4: porch overhang requires crouch (gap 1 tile). Joke: a "FREE" box of CRT monitors on the curb.
m.decor(86, 12, TILE.FENCE); m.decor(87, 12, TILE.FENCE); m.decor(88, 12, TILE.FENCE);
m.fill('ground', 92, 97, 11, 11, TILE.PORCH_ROOF);
m.fill('ground', 92, 97, 8, 10, TILE.STONE);
m.decor(91, 12, TILE.POST); m.decor(98, 12, TILE.POST);
m.latte(94, 12); m.latte(96, 12);
m.decor(100, 12, TILE.CRT); m.decor(101, 12, TILE.FREE_BOX); m.decor(102, 12, TILE.CRT); m.decor(101, 11, TILE.CRT);
m.obj('sign', 103, 10, { w: 2, h: 2, props: { text: 'FREE\n(works, probably)' } });
m.set('hazards', 106, 12, TILE.POTHOLE);
m.latte(107, 10); m.latte(108, 10);

// Screen 5: checkpoint coffee stand, then two seagulls in a row — stomp combo.
m.obj('checkpoint', 113, 11, { w: 1, h: 2, name: 'cp1' });
m.lattes([118, 119, 120], 11);
m.obj('enemy:seagull', 123, 12, { props: { dir: -1 } });
m.obj('enemy:seagull', 127, 12, { props: { dir: -1 } });
m.cedar(132, 4, 12);
m.decor(136, 12, TILE.PUDDLE);

// Screen 6: small pit (3 tiles) — first required jump. Pallet platforms.
m.ground(144, 149);
m.latte(141, 11); m.latte(142, 10); m.latte(143, 11);
m.oneway(146, 148, 10); m.lattes([146, 147, 148], 9);
m.oneway(150, 152, 11); m.lattes([150, 151, 152], 10);
m.ground(153, 239, TILE.GRASS);
m.decor(155, 12, TILE.FERN);

// Screen 7: Hopping Cone intro, flat area. Mossy brick row overhead (breakable when Big).
m.obj('enemy:cone', 170, 12);
for (const x of [174, 175, 177, 178, 179]) m.obj('brick', x, 9);
m.obj('qblock', 176, 9, { props: { item: 'latte' } });
m.lattes([174, 175, 176, 177, 178, 179], 8);
m.obj('enemy:cone', 183, 12);
m.decor(187, 12, TILE.FENCE); m.decor(188, 12, TILE.FENCE);

// Screen 8: Geoduck #2 inside a storm drain (Down to enter) → bonus room with 20 lattes.
m.set('ground', 196, 12, TILE.DRAIN); m.set('ground', 197, 12, TILE.DRAIN);
m.obj('drain', 196, 12, { w: 2, h: 1, props: { targetLevel: '1-1-bonus', targetSpawn: 'bonus_in' } });
m.obj('player_spawn', 199, 12, { name: 'drain_out' });
m.lattes([203, 204, 205], 11);
m.obj('enemy:seagull', 209, 12, { props: { dir: -1 } });
m.set('hazards', 213, 12, TILE.POTHOLE);
m.cedar(216, 5, 12);

// Screen 9: Geoduck #3 on top of the last cedar — bounce off the final Seagull with jump held.
// Exit: Ferry Ticket at a bus stop; the 44 bus pulls up and Jimothy boards.
m.oneway(221, 223, 10, TILE.BRANCH);
m.obj('enemy:seagull', 222, 9, { props: { dir: -1, turnAtEdges: true } });
m.cedar(226, 3, 12);
m.oneway(225, 227, 7, TILE.BRANCH);
m.obj('geoduck', 226, 6, { props: { index: 2 } });
m.latte(222, 8); m.latte(224, 6);
m.decor(233, 12, TILE.BUS_STOP);
m.obj('exit', 234, 11, { w: 2, h: 2, props: { vehicle: 'bus' } });
m.decor(237, 12, TILE.FERN);

writeFileSync(join(OUT, '1-1.tmj'), JSON.stringify(m.toJSON()));

// ------------------------------------------------------------------------------------
// 1-1 bonus room: a mossy storm-drain chamber with 20 lattes and Geoduck #2
// ------------------------------------------------------------------------------------
const b = new MapBuilder(27, 15, { music: 'ballard', parallaxSet: 'drain', timeLimit: 0, wind: 0, autoScroll: 0, par: 0, name: 'Storm Drain' });
b.fill('ground', 0, 26, 14, 14, TILE.STONE);
b.fill('ground', 0, 26, 0, 0, TILE.STONE);
b.fill('ground', 0, 0, 1, 13, TILE.STONE);
b.fill('ground', 26, 26, 1, 13, TILE.STONE);
b.fill('ground', 1, 25, 13, 13, TILE.COBBLE);
b.obj('player_spawn', 2, 11, { name: 'bonus_in' });
b.oneway(5, 14, 9);
b.lattes([5, 6, 7, 8, 9, 10, 11, 12, 13, 14], 11);
b.lattes([5, 6, 7, 8, 9, 10, 11, 12, 13, 14], 8);
b.oneway(18, 21, 6);
b.obj('geoduck', 19, 5, { props: { index: 1 } });
b.decor(3, 12, TILE.PUDDLE); b.decor(16, 12, TILE.PUDDLE);
b.set('ground', 23, 12, TILE.DRAIN); b.set('ground', 24, 12, TILE.DRAIN);
b.obj('drain', 23, 12, { w: 2, h: 1, props: { targetLevel: '1-1', targetSpawn: 'drain_out' } });
b.obj('sign', 22, 9, { w: 2, h: 2, props: { text: 'EXIT ↓' } });
writeFileSync(join(OUT, '1-1-bonus.tmj'), JSON.stringify(b.toJSON()));

console.log('maps written: 1-1.tmj, 1-1-bonus.tmj');
