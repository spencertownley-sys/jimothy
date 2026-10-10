// Generates the Tiled .tmj maps for World 1 — 1-1 ("Welcome to Ballard") and its storm-drain
// bonus room, 1-2 "The Locks" and 1-3 "Golden Gardens at Dusk" — following
// docs/03_LEVEL_SPECS.md screen by screen. Tiled can open and edit the output; this script is
// just faster than hand-placing hundreds of columns.
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

// World 1 lock-wall and beach tilesets (scripts/gen-art.sh `tileset`): 16 tiles each.
//   1-4 surface · 5-8 body · 9-10 one-way plank · 11-14 deep body · 15 invisible one-way · 16 blank
const W1 = { TOP: 1, BODY: 5, PLANK: 9, DEEP: 11, GHOST: 15, WALL: 17, GUM: 21 };
const smallTileset = (name, extra = [], rows = 2) => ({
  firstgid: 1,
  name,
  tilewidth: T,
  tileheight: T,
  margin: 2,
  spacing: 4,
  columns: 8,
  tilecount: 8 * rows,
  image: `../tilesets/${name}.png`,
  imagewidth: 416,
  imageheight: 52 * rows,
  tiles: [
    ...[W1.PLANK, W1.PLANK + 1, W1.GHOST].map((id) => ({ id: id - 1, properties: [{ name: 'oneway', type: 'bool', value: true }] })),
    ...extra,
  ],
});
const locksTileset = smallTileset('locks');
// sand is a touch slidier underfoot
const beachTileset = smallTileset('beach', [0, 1, 2, 3].map((i) => ({ id: W1.TOP - 1 + i, properties: [{ name: 'surface', type: 'string', value: 'sand' }] })));
// World 2: market floor (2-1), the alley with the sticky gum wall + gum blobs (2-2), pier boardwalk (2-3)
const marketTileset = smallTileset('market');
const alleyTileset = smallTileset('alley', [
  ...[0, 1, 2, 3].map((i) => ({ id: W1.WALL - 1 + i, properties: [{ name: 'sticky', type: 'bool', value: true }] })),
  { id: W1.GUM - 1, properties: [{ name: 'hazard', type: 'string', value: 'gum' }] },
], 3);
const pierTileset = smallTileset('pier');

const propList = (props) =>
  Object.entries(props).map(([k, v]) => ({
    name: k,
    type: typeof v === 'number' ? (Number.isInteger(v) ? 'int' : 'float') : typeof v === 'boolean' ? 'bool' : 'string',
    value: v,
  }));

class MapBuilder {
  constructor(width, height, props, ts = tileset) {
    this.tileset = ts;
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
  prop(sprite, tx, bottomRow, { h = 1, w = 1, front = false, stretch = false, align = 'bottom', dx = 0, atlas = 'props', flip = false } = {}) {
    const bottom = (bottomRow + 1) * T;
    this.objects.push({
      id: this.nextId++, name: sprite, type: 'prop', visible: true, rotation: 0,
      x: tx * T + (T - w * T) / 2 + dx * T, y: bottom - h * T, width: w * T, height: h * T,
      properties: propList({ sprite, front, stretch, align, ...(atlas !== 'props' ? { atlas } : {}), ...(flip ? { flip } : {}) }),
    });
  }
  cedar(x, h = 9) {
    this.prop('cedar', x, 12, { h, w: 1 });
  }
  // --- lock-wall / beach tilesets ---------------------------------------------------
  /** Solid ground whose walkable surface is row `top`, filled down to the bottom of the map. */
  solid(x0, x1, top) {
    for (let x = x0; x <= x1; x++) {
      this.set('ground', x, top, W1.TOP + (x % 4));
      if (top + 1 < this.height) this.set('ground', x, top + 1, W1.BODY + (x % 4));
      for (let y = top + 2; y < this.height; y++) this.set('ground', x, y, W1.DEEP + (x % 2) + 2 * (y % 2));
    }
  }
  /** Solid filler (deep body tiles) for a rectangle: alley ceilings, walls, building blocks. */
  block(x0, x1, y0, y1) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set('ground', x, y, W1.DEEP + (x % 2) + 2 * (y % 2));
  }
  /** Sticky gum wall (solid): slide down it slowly while pushing into it. */
  gumWall(x0, x1, y0, y1) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set('ground', x, y, W1.WALL + (x % 2) + 2 * (y % 2));
  }
  /** Gum wall art with no collision (backdrop for the joke screen). */
  gumDecor(x0, x1, y0, y1) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set('decor', x, y, W1.WALL + (x % 2) + 2 * (y % 2));
  }
  /** Gum blobs on the floor of row `row` (slippery, like slug slime). */
  gum(x0, x1, row) {
    for (let x = x0; x <= x1; x++) this.set('hazards', x, row, W1.GUM);
  }
  clear(x0, x1, y0, y1) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set('ground', x, y, 0);
  }
  /** One-way dock plank / driftwood log. */
  plank(x0, x1, y) {
    for (let x = x0; x <= x1; x++) this.set('oneway', x, y, W1.PLANK + (x % 2));
  }
  /** Invisible one-way ledge (the top of a prop, like the bathhouse roof). */
  ghost(x0, x1, y) {
    for (let x = x0; x <= x1; x++) this.set('oneway', x, y, W1.GHOST);
  }
  /** Deadly water from column x0 to x1; the foam line sits 20 px under row `surfaceRow`'s top. */
  water(x0, x1, surfaceRow, style = 'canal') {
    const y = surfaceRow * T + 20;
    this.objects.push({
      id: this.nextId++, name: '', type: 'water', visible: true, rotation: 0,
      x: x0 * T, y, width: (x1 - x0 + 1) * T, height: this.height * T - y + 40,
      properties: propList({ style }),
    });
  }
  /** Leaping salmon: the top of its back reaches row `topRow`; it rests below the map. */
  salmon(tx, topRow, phase, dir = 1) {
    this.objects.push({
      id: this.nextId++, name: '', type: 'salmon', visible: true, rotation: 0,
      x: tx * T - T, y: topRow * T, width: 3 * T, height: this.height * T - topRow * T + 40,
      properties: propList({ phase, dir }),
    });
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
      tilesets: [this.tileset],
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


// ------------------------------------------------------------------------------------
// 1-2 "The Locks" — 11 screens (290 tiles). Lock gates, a salmon ladder, crows that turn
// into shells, banana slugs, Herschel. Exit: hop on a lock boat.
// ------------------------------------------------------------------------------------
{
  const k = new MapBuilder(290, 15, { music: 'ballard', parallaxSet: 'locks', timeLimit: 0, wind: 0, autoScroll: 0, par: 120, name: 'The Locks' }, locksTileset);
  // Screen 1: the quay. Bollards, a life ring, a seagull.
  k.solid(0, 49, 13);
  k.obj('player_spawn', 2, 12, { name: 'start' });
  k.prop('bollard', 6, 12, { h: 1.1 });
  k.prop('lifering', 9, 12, { h: 1.6 });
  k.latte(12, 11); k.latte(13, 10); k.latte(14, 9); k.latte(15, 10); k.latte(16, 11);
  k.obj('enemy:seagull', 21, 12, { props: { dir: -1 } });
  k.prop('rope', 24, 12, { h: 0.7 });
  // Screen 2: crow intro. Stomp it, kick the shell, watch it bowl the two gulls into the canal.
  k.obj('enemy:crow', 33, 12, { props: { dir: -1 } });
  k.lattes([29, 30], 11);
  k.obj('enemy:seagull', 39, 12, { props: { dir: 1, turnAtEdges: true } });
  k.obj('enemy:seagull', 43, 12, { props: { dir: 1, turnAtEdges: true } });
  k.prop('bollard', 47, 12, { h: 1.1 });
  k.water(50, 52, 13);
  k.lattes([50, 51, 52], 10);
  // Screen 3: up onto the lock wall. Lock gate #1 rises out of its slot and sinks again;
  // Geoduck #1 waits in the slot under it, and the gate lifts you out like an elevator.
  // A hidden block above the gate holds the Flannel for the crow + gull gauntlet.
  k.solid(53, 55, 13); k.solid(56, 57, 12); k.solid(58, 59, 11); k.solid(60, 63, 10);
  // no floor tiles in the slot: the lowered gate is the floor, so it can lift whoever stands on it
  k.obj('lockgate', 64, 5, { w: 2, h: 7, props: { travel: 7, phase: 0 } });
  k.obj('geoduck', 64.5, 11, { props: { index: 0 } });
  k.obj('qblock', 61, 6, { props: { item: 'flannel', hidden: true } });
  k.solid(66, 81, 10);
  k.prop('bollard', 67, 9, { h: 1.1 });
  k.obj('enemy:crow', 71, 9, { props: { dir: -1 } });
  k.obj('enemy:seagull', 78, 6, { props: { dir: -1, swoop: true } });
  k.lattes([69, 70, 72, 73, 75, 76], 8);
  // Screen 4: down to the canal path. Banana slug intro: its trail is slippery.
  k.solid(82, 83, 11); k.solid(84, 85, 12); k.solid(86, 97, 13);
  k.obj('enemy:slug', 93, 12, { props: { dir: -1 } });
  k.prop('rope', 89, 12, { h: 0.7 });
  k.water(98, 100, 13);
  k.lattes([98, 99, 100], 10);
  // Screen 5: lock gate #2 (no secret this time, just lattes in its slot) and slug #2 on the wall.
  k.solid(101, 108, 13); k.solid(109, 110, 12); k.solid(111, 112, 11); k.solid(113, 115, 10);
  k.obj('lockgate', 116, 5, { w: 2, h: 7, props: { travel: 7, phase: 2600 } });
  k.lattes([116, 117], 11);
  k.solid(118, 127, 10);
  k.obj('enemy:slug', 123, 9, { props: { dir: -1 } });
  k.prop('lifering', 120, 9, { h: 1.6 });
  k.solid(128, 129, 11); k.solid(130, 131, 12); k.solid(132, 165, 13);
  // Screen 6 (joke): Herschel the sea lion, lounging with a salmon, immune to everything.
  // Tourists' camera flashes pop around him. Then the checkpoint.
  k.obj('sign', 137.5, 9.6, { w: 3, h: 3.4, props: { text: 'HERSCHEL\n(immune to\neverything)' } });
  k.prop('sealion', 146, 12, { h: 3.1 });
  k.obj('flashzone', 136, 6, { w: 20, h: 7 });
  k.lattes([152, 153, 154], 11);
  k.obj('checkpoint', 158, 11, { w: 1, h: 2, name: 'cp1' });
  // Screens 7-8: the salmon ladder. Pillars step up left to right over the fish ladder; salmon
  // leap out of each pool and hold for 1.2 s. Skip the last salmon and drop to the low dock for
  // Geoduck #2 — the salmon lifts you back up out of the water.
  k.water(166, 200, 13);
  k.salmon(168, 11, 0);
  k.solid(171, 172, 12);
  k.salmon(175, 10, 600);
  k.solid(178, 179, 11);
  k.salmon(182, 9, 1200);
  k.solid(185, 186, 10);
  k.salmon(189, 8, 1800);
  k.solid(192, 193, 9);
  k.lattes([168, 175, 182, 189], 9);
  k.plank(196, 198, 12);
  k.obj('geoduck', 197, 11, { props: { index: 1 } });
  k.salmon(197, 8, 2400);
  k.solid(201, 207, 7);
  k.prop('fishwindow', 204, 11, { h: 2, front: true });
  k.lattes([202, 203, 204, 205], 6);
  // Screen 9: down to the canal. A crow carrying Geoduck #3 patrols over the water between two
  // docks: jump off a dock and stomp it in mid-air.
  k.solid(208, 209, 9); k.solid(210, 211, 11); k.solid(212, 221, 13);
  k.lattes([214, 215, 216], 11);
  k.water(222, 235, 13);
  k.plank(225, 227, 10);
  k.plank(231, 233, 10);
  k.obj('enemy:crow', 229, 7, { props: { dir: -1, fly: true, carries: 2 } });
  // Screen 10: last stretch of quay with a swooping gull.
  k.solid(236, 279, 13);
  k.obj('enemy:seagull', 252, 9, { props: { dir: -1, swoop: true } });
  k.lattes([244, 245, 246, 258, 259, 260], 11);
  k.prop('bollard', 264, 12, { h: 1.1 });
  k.obj('sign', 268, 9.6, { w: 2.6, h: 3.4, props: { text: 'BOATS\n→' } });
  k.prop('rope', 274, 12, { h: 0.7 });
  // Screen 11: exit — hop aboard the lock boat.
  k.water(280, 289, 13);
  k.obj('exit', 282, 9, { w: 5, h: 4, props: { vehicle: 'boat' } });
  writeFileSync(join(OUT, '1-2.tmj'), JSON.stringify(k.toJSON()));
}

// ------------------------------------------------------------------------------------
// 1-3 "Golden Gardens at Dusk" — 8 screens + the goose arena (262 tiles). Sand, driftwood
// see-saw, bonfires, swooping gulls, one runaway cart. Exit: drift off in a kayak.
// ------------------------------------------------------------------------------------
{
  const g = new MapBuilder(262, 15, { music: 'dusk', parallaxSet: 'beach', timeLimit: 0, wind: 0, autoScroll: 0, par: 105, name: 'Golden Gardens at Dusk' }, beachTileset);
  // Swoopers dive for your Teriyaki: the bottom of the dive clips big Jimothy, not small.
  const swoop = (tx, ty = 8.5) => g.obj('enemy:seagull', tx, ty, { props: { dir: -1, swoop: true } });
  // Screen 1: the beach at sundown.
  g.solid(0, 59, 12);
  g.obj('player_spawn', 2, 11, { name: 'start' });
  g.obj('sign', 5, 8, { w: 3.4, h: 4, props: { text: 'GOLDEN GARDENS\nPARK CLOSES\nAT DUSK' } });
  g.prop('picnic', 12, 11, { h: 1.5 });
  g.prop('dunegrass', 16, 11, { h: 1.4 });
  g.lattes([18, 19, 20], 10);
  swoop(23);
  // Screen 2: the parking lot. Runaway cart intro, then the first bonfire on its own.
  g.prop('stones', 30, 11, { h: 1 });
  g.obj('enemy:cart', 40, 11, { props: { dir: -1 } });
  g.prop('dunegrass', 44, 11, { h: 1.4 });
  g.obj('bonfire', 48, 10, { w: 1, h: 2 });
  g.latte(47, 8); g.latte(48, 7); g.latte(49, 8);
  // Screen 3: a sand dip. The lattes say "jump over it"; Geoduck #1 says "don't".
  g.solid(60, 66, 14);
  g.obj('geoduck', 63, 13, { props: { index: 0 } });
  g.lattes([60, 61, 62, 64, 65, 66], 9);
  g.solid(67, 261, 12);
  swoop(56);
  g.plank(72, 74, 9);
  g.lattes([72, 73, 74], 8);
  swoop(76);
  // Screen 4: driftwood see-saw beside the bathhouse. Drop onto the high end holding jump to
  // launch onto the roof: Geoduck #2.
  g.obj('seesaw', 89, 9, { w: 6, h: 3, props: { tilt: -1 } });
  g.prop('bathhouse', 101, 11, { h: 5, front: false });
  g.ghost(99, 103, 7);
  g.obj('geoduck', 101, 6, { props: { index: 1 } });
  g.prop('dunegrass', 108, 11, { h: 1.2 });
  // Screen 5: bonfires to hop, checkpoint between them.
  g.obj('bonfire', 112, 10, { w: 1, h: 2 });
  swoop(113);
  g.plank(115, 116, 9);
  g.obj('checkpoint', 119, 10, { w: 1, h: 2, name: 'cp1' });
  g.obj('bonfire', 125, 10, { w: 1, h: 2 });
  g.lattes([124, 125, 126], 7);
  swoop(130);
  // Screen 6: a tidal inlet to jump, picnic tables, driftwood.
  g.prop('picnic', 140, 11, { h: 1.5 });
  g.water(146, 149, 12, 'dusk');
  for (let x = 146; x <= 149; x++) for (let y = 12; y < 15; y++) g.set('ground', x, y, 0);
  g.lattes([146, 147, 148, 149], 9);
  swoop(152);
  g.prop('driftstump', 156, 11, { h: 1.2 });
  // Screen 7: driftwood ledges, another bonfire.
  g.plank(166, 168, 9);
  g.plank(172, 174, 7);
  g.lattes([166, 167, 168], 8);
  g.lattes([172, 173, 174], 6);
  swoop(174);
  g.obj('bonfire', 179, 10, { w: 1, h: 2 });
  g.prop('stones', 185, 11, { h: 1 });
  // Screen 8: the approach.
  swoop(195);
  g.obj('sign', 200, 8, { w: 3.2, h: 4, props: { text: 'BEWARE\nOF GOOSE' } });
  g.prop('dunegrass', 206, 11, { h: 1.4 });
  g.lattes([207, 208, 209, 210], 10);
  // Goose arena (1.5 screens): driftwood walls drop in behind you; a hidden block holds
  // Geoduck #3 in case the no-damage reward slips away.
  g.obj('arena', 214, 0, { w: 40, h: 12 });
  g.plank(220, 223, 8);
  g.plank(234, 237, 8);
  g.plank(246, 249, 8);
  g.obj('qblock', 229, 8, { props: { item: 'geoduck:2', hidden: true } });
  g.obj('enemy:goose', 244, 11, { props: { dir: -1 } });
  // Exit: the kayak at the waterline.
  g.water(256, 261, 12, 'dusk');
  for (let x = 256; x <= 261; x++) for (let y = 12; y < 15; y++) g.set('ground', x, y, 0);
  g.obj('exit', 257, 8, { w: 4, h: 4, props: { vehicle: 'kayak' } });
  writeFileSync(join(OUT, '1-3.tmj'), JSON.stringify(g.toJSON()));
}

// ------------------------------------------------------------------------------------
// 2-1 "Market Arcade" — 12 screens (320 tiles). Fishmongers lob salmon you can ride, dahlia
// buckets bounce, produce crates break, crows steal lattes, one Freeze blocks the aisle, and the
// brass pig pays out if you stand on it. Exit: hop on a fish-delivery hand truck.
// ------------------------------------------------------------------------------------
{
  const a = new MapBuilder(320, 15, { music: 'market', parallaxSet: 'pike', timeLimit: 0, wind: 0, autoScroll: 0, par: 135, name: 'Market Arcade' }, marketTileset);
  const crate = (x, y) => a.obj('brick', x, y, { props: { style: 'crate' } });
  // Screen 1: under the PUBLIC MARKET sign.
  a.solid(0, 33, 12);
  a.obj('player_spawn', 2, 11, { name: 'start' });
  a.obj('sign', 6, 8, { w: 3.4, h: 4, props: { text: 'PIKE PLACE\nwatch for\nflying fish' } });
  a.prop('fishstall', 12, 11, { h: 2.3 });
  a.lattes([16, 17, 18, 19, 20], 10);
  a.prop('fishstall', 24, 11, { h: 2.3 });
  // Screen 2: the first salmon toss, across a gap between stalls. Ride the fish.
  a.obj('salmonthrow', 31, 9, { w: 13, h: 3, props: { apex: 2.5, phase: 0 } });
  a.solid(39, 60, 12);
  a.lattes([34, 35, 36, 37, 38], 7);
  a.obj('enemy:crow', 50, 11, { props: { dir: -1 } });
  a.lattes([47, 48, 49, 50, 51, 52], 11); // the crow eats these if you dawdle
  // Screen 3: the Freeze stands in the aisle. Go over on the stall awning (or wait for the pulse).
  a.obj('qblock', 56, 8, { props: { item: 'teriyaki' } });
  a.plank(60, 68, 8);
  a.lattes([61, 62, 63, 64, 65, 66, 67], 7);
  a.solid(61, 108, 12);
  a.obj('enemy:freeze', 64, 11);
  crate(71, 8); crate(72, 8); a.obj('qblock', 73, 8, { props: { item: 'latte' } }); crate(74, 8);
  a.prop('fishstall', 78, 11, { h: 2.3 });
  // Screen 4: the long throw. Ride its peak up to the upper arcade: Geoduck #1.
  a.obj('salmonthrow', 84, 9, { w: 18, h: 3, props: { apex: 6.2, phase: 900 } });
  a.plank(90, 96, 4);
  a.obj('geoduck', 93, 3, { props: { index: 0 } });
  a.lattes([90, 91, 95, 96], 3);
  a.obj('enemy:seagull', 104, 11, { props: { dir: -1 } });
  // Screen 5: dahlia buckets bounce you up to the flower-stall roofs.
  a.obj('bouncepad', 112, 10, { w: 1, h: 2, props: { style: 'dahlia' } });
  a.plank(114, 117, 6);
  a.lattes([114, 115, 116, 117], 5);
  a.obj('bouncepad', 120, 10, { w: 1, h: 2, props: { style: 'dahlia' } });
  a.plank(122, 125, 5);
  a.lattes([122, 123, 124, 125], 4);
  a.solid(109, 175, 12);
  a.obj('enemy:crow', 128, 11, { props: { dir: -1 } });
  crate(131, 8); crate(132, 8); crate(133, 8);
  // Screen 6 (joke): the brass pig. Stand on it for three seconds. A hidden block above it.
  a.obj('pig', 143, 10, { w: 2, h: 2 });
  a.obj('qblock', 143.5, 6, { props: { item: 'doubleshot', hidden: true } });
  a.obj('sign', 137, 8, { w: 3, h: 4, props: { text: 'PLEASE DO\nNOT RIDE\nTHE PIG' } });
  a.obj('qblock', 156, 8, { props: { item: 'teriyaki' } });
  a.obj('enemy:seagull', 164, 11, { props: { dir: -1 } });
  a.obj('enemy:seagull', 169, 11, { props: { dir: -1 } });
  // Screen 7: checkpoint, second toss over another gap.
  a.obj('checkpoint', 173, 10, { w: 1, h: 2, name: 'cp1' });
  a.obj('salmonthrow', 176, 9, { w: 13, h: 3, props: { apex: 3, phase: 1500 } });
  a.lattes([179, 180, 181, 182, 183], 6);
  a.solid(184, 245, 12);
  // Screen 8: the fish-ice display — bump it from below for Geoduck #2. Crows work the stalls.
  a.prop('fishstall', 191, 11, { h: 2.3 });
  a.obj('qblock', 196, 8, { props: { item: 'geoduck:1', style: 'icebox' } });
  a.obj('enemy:crow', 200, 11, { props: { dir: -1 } });
  a.obj('enemy:crow', 206, 11, { props: { dir: 1 } });
  a.lattes([199, 200, 201, 202, 203, 204, 205, 206], 11);
  crate(210, 8); crate(211, 8);
  // Screen 9: bounce up and over a crow line.
  a.obj('bouncepad', 216, 10, { w: 1, h: 2, props: { style: 'dahlia' } });
  a.plank(218, 224, 6);
  a.lattes([218, 219, 220, 221, 222, 223, 224], 5);
  a.obj('enemy:seagull', 226, 11, { props: { dir: -1 } });
  // Screen 10: the Sanitary Market alley — a high walkway of planks, crows on patrol, and
  // Geoduck #3 tucked behind the crow nest at the far end.
  a.obj('sign', 237, 8, { w: 3, h: 4, props: { text: 'SANITARY\nMARKET\n↗' } });
  a.obj('bouncepad', 241, 10, { w: 1, h: 2, props: { style: 'dahlia' } });
  a.plank(243, 263, 7);
  a.obj('enemy:crow', 248, 6, { props: { dir: 1 } });
  a.obj('enemy:crow', 255, 6, { props: { dir: -1 } });
  a.lattes([246, 247, 251, 252, 258, 259], 6);
  a.obj('geoduck', 262, 6, { props: { index: 2 } });
  a.prop('crownest', 262, 6, { h: 1.3, front: true, dx: 0.3 });
  a.solid(249, 320 - 1, 12);
  a.lattes([270, 271, 272, 273], 11);
  a.prop('fishstall', 280, 11, { h: 2.3 });
  // Screens 11-12: home stretch, then the delivery hand truck out of the market.
  a.lattes([290, 291, 292, 293, 294, 295], 10);
  a.obj('sign', 300, 8, { w: 3, h: 4, props: { text: 'DELIVERIES\n→' } });
  a.obj('exit', 308, 9, { w: 4, h: 3, props: { vehicle: 'handtruck' } });
  writeFileSync(join(OUT, '2-1.tmj'), JSON.stringify(a.toJSON()));
}

// ------------------------------------------------------------------------------------
// 2-2 "The Gum Wall" — down Post Alley and back up (140 × 30 tiles). The gum wall is sticky:
// push into it while falling to slide down slowly. Gum blobs on the floor are slippery.
// Scooters honk before they shoot through the low corridor. Exit: the service elevator.
// ------------------------------------------------------------------------------------
{
  const g = new MapBuilder(140, 30, { music: 'alley', parallaxSet: 'alley', timeLimit: 0, wind: 0, autoScroll: 0, par: 150, name: 'The Gum Wall' }, alleyTileset);
  // Top of the alley (surface row 8).
  g.solid(0, 30, 8);
  g.obj('player_spawn', 2, 7, { name: 'start' });
  g.obj('sign', 5, 4, { w: 3, h: 4, props: { text: 'POST\nALLEY\n↓' } });
  g.lattes([10, 11, 12], 6);
  g.obj('enemy:slug', 20, 7, { props: { dir: -1 } });
  g.gum(24, 26, 7);
  // The drop: a shaft with the giant gum wall on its far side. Most players land on the
  // ledge; hug the gum wall past it for Geoduck #1.
  g.gumWall(41, 42, 3, 21);
  g.plank(32, 37, 18);
  g.lattes([33, 34, 35, 36], 17);
  g.obj('geoduck', 39.5, 23, { props: { index: 0 } });
  g.latte(40, 15); g.latte(40, 17); g.latte(40, 19);
  // The low corridor (rows 22-25) under the buildings.
  g.solid(31, 128, 26);
  g.block(43, 96, 8, 21);
  g.obj('enemy:cone', 46, 25);
  g.obj('qblock', 52, 22, { props: { item: 'jacket' } }); // the Rain Jacket: throw Rain Drops (A) at the slug line
  g.obj('enemy:slug', 58, 25, { props: { dir: -1 } });
  g.obj('enemy:slug', 61, 25, { props: { dir: -1 } });
  g.obj('enemy:slug', 64, 25, { props: { dir: -1 } });
  g.gum(66, 69, 25);
  g.obj('enemy:scooter', 69, 25);
  g.lattes([54, 55, 56, 67, 68], 24);
  g.obj('checkpoint', 72, 24, { w: 1, h: 2, name: 'cp1' });
  // The theater's stage door (Down) — a hidden alcove with Geoduck #2.
  g.prop('stagedoor', 77, 25, { h: 3.1 });
  g.obj('door', 76.5, 24, { w: 1, h: 2, props: { target: 'alcove' } });
  g.obj('player_spawn', 79, 25, { name: 'alcove_out' });
  g.obj('enemy:cone', 81, 25);
  // Joke screen: a tourist's selfie with the gum (gum wall backdrop, no collision).
  g.gumDecor(83, 92, 22, 25);
  g.prop('tourist', 87, 25, { h: 2.2 });
  g.obj('enemy:scooter', 87, 25);
  g.obj('enemy:cone', 90, 25);
  g.obj('enemy:slug', 93, 25, { props: { dir: -1 } });
  // The courtyard: climb back up on fire-escape landings (3 rows apart).
  g.plank(98, 101, 23); g.plank(103, 106, 20); g.plank(98, 101, 17); g.plank(103, 106, 14);
  g.plank(98, 101, 11);
  g.lattes([99, 100], 22); g.lattes([104, 105], 19); g.lattes([99, 100], 16); g.lattes([104, 105], 13);
  g.gumWall(129, 130, 0, 25);
  g.obj('enemy:scooter', 104, 25);
  // Sprint-jump off the tipped e-scooter for Geoduck #3 (the latte arc shows the way).
  g.obj('bouncepad', 110, 24, { w: 1, h: 2, props: { style: 'scooter_pad' } });
  g.latte(112, 20); g.latte(114, 17); g.latte(116, 15); g.latte(118, 15);
  g.plank(118, 122, 17);
  g.obj('geoduck', 120.5, 16, { props: { index: 2 } });
  // Top right: the service elevator down to the waterfront.
  g.plank(103, 128, 8);
  g.lattes([110, 112, 114, 116], 7);
  g.obj('exit', 123, 5, { w: 4, h: 3, props: { vehicle: 'elevator' } });
  // The secret alcove (walled off; only the stage door leads here).
  g.block(131, 139, 20, 21);
  g.solid(131, 139, 26);
  g.gumWall(139, 139, 22, 25);
  g.obj('player_spawn', 133, 25, { name: 'alcove' });
  g.obj('door', 132.5, 24, { w: 1, h: 2, props: { target: 'alcove_out' } });
  g.prop('stagedoor', 133, 25, { h: 3.1 });
  g.lattes([135, 136, 137, 138], 23);
  g.obj('geoduck', 137, 24, { props: { index: 1 } });
  writeFileSync(join(OUT, '2-2.tmj'), JSON.stringify(g.toJSON()));
}

// ------------------------------------------------------------------------------------
// 2-3 "Waterfront Run" — 13 screens (347 tiles), gentle auto-chase. A seagull flock rolls in
// from the left a little faster than you walk; it steals your power-up if it catches you and
// hangs back while you're out on a side pier. Great Wheel gondolas, piers over the water.
// Exit: leap onto the departing water taxi.
// ------------------------------------------------------------------------------------
{
  const w = new MapBuilder(347, 15, { music: 'chase', parallaxSet: 'waterfront', timeLimit: 0, wind: 0, autoScroll: 0, par: 120, name: 'Waterfront Run' }, pierTileset);
  const gap = (x0, x1) => w.water(x0, x1, 13);
  w.obj('flock', -12, 4, { w: 1, h: 6 });
  // Screen 1: Double Shot early — it feels great in a chase.
  w.solid(0, 33, 12);
  w.obj('player_spawn', 3, 11, { name: 'start' });
  w.obj('qblock', 9, 8, { props: { item: 'doubleshot' } });
  w.obj('sign', 14, 8, { w: 3, h: 4, props: { text: 'WATERFRONT\n→' } });
  w.lattes([18, 19, 20, 21, 22], 10);
  gap(34, 37);
  w.lattes([34, 35, 36, 37], 9);
  // Screen 2: the first Freeze, standing on the boardwalk staring at its phone.
  w.solid(38, 85, 12);
  w.obj('enemy:freeze', 47, 11);
  w.lattes([52, 53, 54], 10);
  // Screen 3: the Great Wheel. Geoduck #1 rides the bottom gondola.
  w.obj('wheel', 61, 1.5, { w: 10, h: 8, props: { radius: 3.6, gondolas: 6, carryGeoduck: 0 } });
  w.plank(74, 79, 4);
  w.lattes([74, 75, 76, 77, 78, 79], 3);
  // Screen 4: stairs up to the promenade; straight ahead, a dead-end side pier (the flock
  // waits while you're on it) with Geoduck #2 at the very end.
  w.plank(85, 87, 10);
  w.plank(89, 113, 7);
  w.solid(86, 104, 12);
  w.obj('pier', 88, 10, { w: 17, h: 2 });
  w.plank(95, 96, 10); w.plank(100, 101, 10);
  w.obj('geoduck', 103, 11, { props: { index: 1 } });
  w.lattes([92, 93, 94, 97, 98, 99], 11);
  gap(105, 112);
  w.lattes([106, 107, 108, 109, 110, 111], 6);
  // Screen 5 (joke): the World's Largest Fry, and the gulls who worship it.
  w.solid(113, 145, 12);
  w.prop('fry', 122, 11, { h: 5.4 });
  w.prop('seagull', 119, 11, { h: 0.9, atlas: 'enemies' });
  w.prop('seagull', 125, 11, { h: 0.9, atlas: 'enemies', flip: true });
  w.prop('seagull', 120.5, 11, { h: 0.9, atlas: 'enemies' });
  w.obj('sign', 128, 8, { w: 3, h: 4, props: { text: "WORLD'S\nLARGEST\nFRY" } });
  w.obj('enemy:cart', 140, 11, { props: { dir: -1 } });
  // Screen 6: the Flannel, mid-run.
  w.obj('qblock', 143, 8, { props: { item: 'flannel' } });
  gap(146, 150);
  w.plank(147, 149, 10);
  w.solid(151, 195, 12);
  w.lattes([153, 154, 155, 156], 10);
  // Screen 7: Freeze #2 between two crate stacks.
  w.obj('brick', 168, 11); w.obj('brick', 168, 10);
  w.obj('enemy:freeze', 172, 11);
  w.obj('brick', 176, 11); w.obj('brick', 176, 10);
  w.lattes([167, 168, 175, 176], 8);
  w.obj('checkpoint', 186, 10, { w: 1, h: 2, name: 'cp1' });
  // Screen 8: water, then a runaway cart.
  gap(196, 200);
  w.plank(197, 199, 9);
  w.solid(201, 260, 12);
  w.obj('enemy:cart', 212, 11, { props: { dir: -1 } });
  // Screen 9: the aquarium window — bump it from below for Geoduck #3.
  w.obj('qblock', 226, 8, { props: { item: 'geoduck:2', style: 'aquarium' } });
  w.lattes([223, 224, 228, 229], 10);
  w.obj('pier', 236, 10, { w: 8, h: 2 });
  w.lattes([237, 238, 239, 240, 241, 242], 11);
  // Screens 10-12: piers and gaps, latte lines.
  gap(261, 265);
  w.plank(262, 264, 9);
  w.solid(266, 300, 12);
  w.lattes([270, 272, 274, 276, 278, 280], 10);
  gap(301, 304);
  w.lattes([301, 302, 303, 304], 9);
  w.solid(305, 332, 12);
  w.lattes([310, 311, 312, 313, 314, 315], 10);
  w.obj('sign', 322, 8, { w: 3, h: 4, props: { text: 'WATER\nTAXI\n→' } });
  // Screen 13: leap onto the departing water taxi.
  gap(333, 346);
  w.obj('exit', 335, 8, { w: 6, h: 4, props: { vehicle: 'watertaxi' } });
  writeFileSync(join(OUT, '2-3.tmj'), JSON.stringify(w.toJSON()));
}

console.log('maps written: 1-1, 1-1-bonus, 1-2, 1-3, 2-1, 2-2, 2-3');
