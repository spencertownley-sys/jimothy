import Phaser from 'phaser';

/**
 * "Missing asset → placeholder, logged once, no crash." For each atlas the game needs, if the
 * texture failed to load we build a canvas with labelled colored rectangles and register the
 * same frame names, so every sprite still renders and swapping in real art is a file replace.
 */
const REQUIRED: Record<string, Record<string, [number, number]>> = {
  jimothy: {
    small_idle: [56, 72], small_lope: [80, 72], small_hop: [72, 72], small_crouch: [70, 40], small_hurt: [66, 72],
    small_victory: [62, 72], small_look: [48, 72], big_idle: [96, 94], big_lope: [110, 94], big_hop: [94, 94],
    big_crouch: [92, 52], big_hurt: [86, 94], big_victory: [80, 94], big_look: [62, 94], jacket_idle: [90, 94], flannel_idle: [100, 94],
  },
  enemies: { seagull: [84, 44], crow: [60, 44], freeze: [90, 96], scooter: [68, 56], cone: [36, 56], slug: [80, 36], cart: [72, 64], goose: [80, 80] },
  items: { latte: [30, 36], geoduck: [50, 44], star: [40, 40], flannel: [40, 40], jacket: [38, 40], teriyaki: [44, 40], ticket: [48, 40], doubleshot: [66, 40], salmon: [42, 40], flower: [40, 40] },
  blocks: { qblock: [48, 48], qblock_used: [48, 48], brick: [48, 48], brick_bit: [20, 20], checkpoint_off: [64, 96], checkpoint_on: [64, 96], bus: [200, 90], raindrop: [16, 16], puff: [24, 24] },
  ui: { heart_full: [32, 32], heart_empty: [32, 32], geoduck_silhouette: [50, 44] },
};

const TINT: Record<string, string> = { jimothy: '#8E8A86', enemies: '#FF6F61', items: '#F2B35B', blocks: '#5E8C5A', ui: '#B8C9CE' };

export function ensurePlaceholders(scene: Phaser.Scene): void {
  for (const [atlas, frames] of Object.entries(REQUIRED)) {
    if (scene.textures.exists(atlas)) {
      const tex = scene.textures.get(atlas);
      const missing = Object.keys(frames).filter((f) => !tex.has(f));
      if (missing.length) console.warn(`[assets] atlas "${atlas}" is missing frames: ${missing.join(', ')}`);
      continue;
    }
    console.warn(`[assets] atlas "${atlas}" not found — using placeholder rectangles`);
    const entries = Object.entries(frames);
    const pad = 2;
    let x = pad;
    let rowH = 0;
    let y = pad;
    const placed: { name: string; x: number; y: number; w: number; h: number }[] = [];
    for (const [name, [w, h]] of entries) {
      if (x + w + pad > 1024) {
        x = pad;
        y += rowH + pad;
        rowH = 0;
      }
      placed.push({ name, x, y, w, h });
      x += w + pad;
      rowH = Math.max(rowH, h);
    }
    const canvas = scene.textures.createCanvas(atlas, 1024, y + rowH + pad);
    if (!canvas) continue;
    const ctx = canvas.context;
    for (const p of placed) {
      ctx.fillStyle = TINT[atlas] ?? '#ffffff';
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.strokeStyle = '#1C2426';
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x + 1, p.y + 1, p.w - 2, p.h - 2);
      ctx.fillStyle = '#1C2426';
      ctx.font = '10px sans-serif';
      ctx.fillText(p.name.slice(0, Math.max(3, Math.floor(p.w / 6))), p.x + 3, p.y + 12);
      canvas.add(p.name, 0, p.x, p.y, p.w, p.h);
    }
    canvas.refresh();
  }
  // background / tileset fallbacks: a flat colored texture keeps tilemaps and parallax alive
  if (!scene.textures.exists('tiles:ballard')) {
    console.warn('[assets] tileset "tiles:ballard" not found — using flat placeholder');
    const g = scene.add.graphics();
    for (let i = 0; i < 32; i++) {
      const col = i % 8;
      const row = Math.floor(i / 8);
      g.fillStyle(Phaser.Display.Color.HSLToColor(((i * 37) % 360) / 360, 0.4, 0.45).color, 1);
      g.fillRect(col * 52, row * 52, 52, 52);
    }
    g.generateTexture('tiles:ballard', 416, 208);
    g.destroy();
  }
}
