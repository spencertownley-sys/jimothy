import Phaser from 'phaser';
import { uiText } from '../../ui/text';

/** A wooden sign with chalk lettering. Decorative only — Tiled prop `text`. */
export class Sign extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number, text: string) {
    super(scene, x, y);
    const g = scene.add.graphics();
    g.fillStyle(0x5a3c22, 1);
    g.fillRect(w / 2 - 5, h - 20, 10, 20);
    g.fillStyle(0x233b31, 1);
    g.fillRoundedRect(0, 0, w, h - 16, 6);
    g.lineStyle(3, 0x8a6a40, 1);
    g.strokeRoundedRect(0, 0, w, h - 16, 6);
    const label = uiText(scene, w / 2, (h - 16) / 2, text, { fontSize: 15, align: 'center', color: '#F4EFE6', wordWrapWidth: w - 10 });
    label.setOrigin(0.5);
    this.add([g, label]);
    this.setDepth(1);
    scene.add.existing(this);
  }
}
