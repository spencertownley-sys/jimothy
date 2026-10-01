import Phaser from 'phaser';

/** Star Coin equivalent: 3 per level, persisted in the save. */
export class Geoduck extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  readonly index: number;

  constructor(scene: Phaser.Scene, x: number, y: number, index: number) {
    super(scene, x, y, 'items', 'geoduck');
    this.index = index;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(3);
    this.body.setAllowGravity(false);
    this.body.setSize(40, 36, true);
    scene.tweens.add({ targets: this, angle: 8, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }
}
