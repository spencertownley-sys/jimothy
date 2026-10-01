import Phaser from 'phaser';
import { CONFIG } from '../../config';
import { POWERUPS, type PowerUpKind } from '../../data/powerups';

/** Rises out of a block, then walks like a Mushroom (or sits still for Double Shot). */
export class PowerUp extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  readonly kind: PowerUpKind;
  private dir: 1 | -1 = 1;
  private rising = true;
  collectable = false;

  constructor(scene: Phaser.Scene, x: number, y: number, kind: PowerUpKind, fromBlock = true) {
    super(scene, x, y, 'items', POWERUPS[kind].frame);
    this.kind = kind;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(fromBlock ? 3 : 7);
    this.body.setAllowGravity(false);
    this.body.enable = false;
    this.body.setSize(36, 36, true);
    if (fromBlock) {
      scene.tweens.add({
        targets: this,
        y: y - CONFIG.TILE,
        duration: CONFIG.POWERUP_RISE_MS,
        ease: 'Sine.out',
        onComplete: () => this.release(),
      });
    } else {
      this.release();
    }
  }

  private release(): void {
    this.rising = false;
    this.collectable = true;
    this.setDepth(7);
    this.body.enable = true;
    if (POWERUPS[this.kind].walks) {
      this.body.setAllowGravity(true);
      this.body.setVelocityX(this.dir * CONFIG.POWERUP_WALK_SPEED);
    }
  }

  fixedUpdate(): void {
    if (this.rising || !POWERUPS[this.kind].walks) return;
    if (this.body.blocked.left) this.dir = 1;
    else if (this.body.blocked.right) this.dir = -1;
    this.body.setVelocityX(this.dir * CONFIG.POWERUP_WALK_SPEED);
  }
}
