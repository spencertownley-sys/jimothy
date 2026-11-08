import Phaser from 'phaser';

/** Rain Jacket projectile: bounces along the ground like a fireball, one hit, max 2 on screen. */
export class RainDrop extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  private lifeMs = 2500;

  constructor(scene: Phaser.Scene, x: number, y: number, dir: 1 | -1) {
    super(scene, x, y, 'blocks', 'raindrop');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(9);
    this.body.setCircle(7);
    this.body.setBounce(1, 0.9);
    this.body.setVelocity(dir * 460, -120);
  }

  fixedUpdate(dtMs: number): void {
    this.lifeMs -= dtMs;
    if (this.lifeMs <= 0 || this.body.blocked.left || this.body.blocked.right) this.destroy();
  }
}
