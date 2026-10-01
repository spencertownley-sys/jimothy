import Phaser from 'phaser';
import { uiText } from '../../ui/text';

// Chalk face of props/signboard as fractions of the image (frame and posts excluded).
const FACE = { x: 0.1, y: 0.13, w: 0.8, h: 0.5 };

/** A wooden chalkboard sign on two posts with chalk lettering. Decorative only — Tiled prop `text`. */
export class Sign extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number, text: string) {
    super(scene, x, y);
    const parts: Phaser.GameObjects.GameObject[] = [];
    if (scene.textures.get('props')?.has('signboard')) {
      const board = scene.add.image(0, 0, 'props', 'signboard').setOrigin(0, 0).setDisplaySize(w, h);
      parts.push(board);
    } else {
      const g = scene.add.graphics();
      g.fillStyle(0x233b31, 1);
      g.fillRect(0, 0, w, h * 0.7);
      parts.push(g);
    }
    const label = uiText(scene, w * (FACE.x + FACE.w / 2), h * (FACE.y + FACE.h / 2), text, {
      fontSize: Math.max(12, Math.min(16, Math.floor(w / 11))),
      align: 'center',
      color: '#F4EFE6',
      wordWrapWidth: w * FACE.w - 6,
      stroke: false,
    });
    label.setOrigin(0.5).setAlpha(0.92);
    parts.push(label);
    this.add(parts);
    this.setDepth(1);
    scene.add.existing(this);
  }
}
