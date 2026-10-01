import Phaser from 'phaser';

/** The coin. 100 = 1-up. Bobs and "spins" via a periodic flip (6-frame spin lands with the real atlas). */
export class Latte extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'items', 'latte');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(3);
    this.body.setAllowGravity(false);
    this.body.setSize(28, 32, true);
    scene.tweens.add({ targets: this, y: y - 6, duration: 700 + ((x * 7) % 300), yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  /** Called from one scene-level timer (not one per latte) so destroyed lattes leave nothing behind. */
  spin(): void {
    this.toggleFlipX();
  }
}
