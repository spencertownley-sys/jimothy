import Phaser from 'phaser';
import { CONFIG } from '../config';
import { ensurePlaceholders } from '../core/placeholders';
import { LEVELS } from '../levels/LevelDef';
import { COLORS, uiText } from '../ui/text';

const ATLASES = ['jimothy', 'enemies', 'items', 'blocks', 'ui', 'props'];

/** Loads the World 1 pack: atlases, backgrounds, tileset, maps. Everything else lazy-loads later. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  preload(): void {
    const W = CONFIG.WIDTH;
    const H = CONFIG.HEIGHT;
    const bar = this.add.rectangle(W / 2, H / 2, 10, 14, COLORS.amberHex).setOrigin(0, 0.5).setX(W / 2 - 200);
    this.add.rectangle(W / 2, H / 2, 404, 18).setStrokeStyle(2, COLORS.paperHex);
    uiText(this, W / 2, H / 2 - 40, 'brewing…', { fontSize: 22 }).setOrigin(0.5);
    this.load.on(Phaser.Loader.Events.PROGRESS, (p: number) => bar.setSize(400 * p, 14));
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      console.warn(`[assets] failed to load ${file.key} (${file.url})`);
    });

    this.load.setPath('assets');
    for (const a of ATLASES) this.load.atlas(a, `atlases/${a}.png`, `atlases/${a}.json`);
    this.load.image('tiles:ballard', 'tilesets/ballard.png');
    this.load.image('bg:ballard_far', 'backgrounds/bg_ballard_far.jpg');
    this.load.image('bg:ballard_mid', 'backgrounds/bg_ballard_mid.png');
    this.load.image('bg:ballard_near', 'backgrounds/bg_ballard_near.png');
    this.load.image('bg:title', 'backgrounds/title_keyart.jpg');
    this.load.image('bg:worldmap', 'backgrounds/worldmap.jpg');
    for (const lvl of LEVELS) if (lvl.file) this.load.tilemapTiledJSON(`map:${lvl.id}`, `maps/${lvl.file}`);
  }

  create(): void {
    ensurePlaceholders(this);
    // tiny generated textures for VFX
    const g = this.add.graphics();
    g.fillStyle(0xb8d4de, 0.8);
    g.fillRect(0, 0, 2, 12);
    g.generateTexture('fx:drop', 2, 12);
    g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('fx:spark', 8, 8);
    g.destroy();
    this.scene.start('Title');
  }
}
