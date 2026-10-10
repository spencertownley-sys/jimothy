import Phaser from 'phaser';
import { CONFIG } from '../config';

interface ParallaxSet {
  sky: number;
  far?: string;
  mid?: string;
  near?: string;
}

const SETS: Record<string, ParallaxSet> = {
  ballard: { sky: 0x6e9aa6, far: 'bg:ballard_far', mid: 'bg:ballard_mid', near: 'bg:ballard_near' },
  drain: { sky: 0x101c1a },
  locks: { sky: 0x8fb1b4, far: 'bg:locks_far', mid: 'bg:locks_mid', near: 'bg:ballard_near' },
  beach: { sky: 0xd99a86, far: 'bg:beach_far', mid: 'bg:beach_mid' },
};

interface Layer {
  images: Phaser.GameObjects.Image[];
  width: number;
  factor: number;
}

/**
 * Three wrapped image layers pinned to the camera, scrolled at 0.1 / 0.4 / 0.75 of the camera.
 * Plain Images (not TileSprites): a WebGL TileSprite re-uploads a full-screen canvas every frame
 * its offset changes, which is far too heavy for mid-range phones.
 */
export class Parallax {
  private layers: Layer[] = [];
  private overlay?: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, setName: string) {
    const set = SETS[setName] ?? SETS.ballard;
    scene.cameras.main.setBackgroundColor(set.sky);
    [set.far, set.mid, set.near].forEach((key, i) => {
      if (!key || !scene.textures.exists(key)) return;
      const src = scene.textures.get(key).getSourceImage() as { width: number; height: number };
      const width = src.width;
      const copies = Math.ceil(CONFIG.WIDTH / width) + 1;
      const images: Phaser.GameObjects.Image[] = [];
      for (let c = 0; c < copies; c++) {
        const img = scene.add.image(c * width, CONFIG.HEIGHT, key).setOrigin(0, 1).setScrollFactor(0).setDepth(-30 + i * 10);
        images.push(img);
      }
      this.layers.push({ images, width, factor: CONFIG.PARALLAX_FACTORS[i] });
    });
    if (this.layers.length === 0) {
      this.overlay = scene.add.rectangle(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT, set.sky, 1).setOrigin(0).setScrollFactor(0).setDepth(-30);
    }
  }

  update(cam: Phaser.Cameras.Scene2D.Camera): void {
    for (const l of this.layers) {
      const offset = Phaser.Math.Wrap(-cam.scrollX * l.factor, -l.width, 0);
      l.images.forEach((img, c) => img.setX(Math.round(offset + c * l.width)));
    }
  }

  destroy(): void {
    for (const l of this.layers) for (const img of l.images) img.destroy();
    this.overlay?.destroy();
  }
}
