import Phaser from 'phaser';
import { CONFIG } from '../../config';
import { AudioManager } from '../../core/audio/AudioManager';
import { Haptics } from '../../core/haptics';
import type { Player } from '../Player';

/**
 * Driftwood log balanced on a beach boulder. One end is always up. Drop onto the high end and
 * it slams down, flinging Jimothy skyward — hold jump for the big launch (the bathhouse roof).
 * The physics body is a flat one-way plank at the pivot; only the art tilts.
 */
export class SeeSaw extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  /** -1: left end down, right end up · +1: right end down, left end up */
  tilt: -1 | 1;
  private rock: Phaser.GameObjects.Image;
  private cooldownMs = 0;

  constructor(scene: Phaser.Scene, x: number, groundY: number, width: number, tilt: -1 | 1) {
    const rock = scene.add.image(x, groundY, 'blocks', 'seesaw_rock').setOrigin(0.5, 1).setDepth(4);
    const pivotY = groundY - rock.height + 10;
    super(scene, x, pivotY, 'blocks', 'seesaw_log');
    this.rock = rock;
    this.tilt = tilt;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(5);
    this.setScale(width / this.width);
    this.setAngle(CONFIG.SEESAW.TILT_DEG * -tilt);
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    this.body.pushable = false;
    // a flat plank, one-way from above
    const h = 18 / this.scaleY;
    this.body.setSize(this.width, h, false);
    this.body.setOffset(0, this.height / 2 - h / 2);
    this.body.checkCollision.down = false;
    this.body.checkCollision.left = false;
    this.body.checkCollision.right = false;
  }

  fixedUpdate(dtMs: number): void {
    if (this.cooldownMs > 0) this.cooldownMs -= dtMs;
  }

  /** Player landed on the plank (collider callback). */
  land(player: Player, jumpHeld: boolean): void {
    if (this.cooldownMs > 0 || !player.body.touching.down) return;
    const highSide = this.tilt < 0 ? player.x > this.x : player.x < this.x;
    if (!highSide || player.lastVy < CONFIG.SEESAW.MIN_LAND_VY) return;
    this.tilt = this.tilt < 0 ? 1 : -1;
    this.cooldownMs = 400;
    this.scene.tweens.add({ targets: this, angle: CONFIG.SEESAW.TILT_DEG * -this.tilt, duration: 110, ease: 'Back.out' });
    player.launch(jumpHeld ? CONFIG.SEESAW.LAUNCH_VY : CONFIG.SEESAW.SOFT_VY, jumpHeld);
    AudioManager.sfx('boing');
    Haptics.pulse('stomp');
  }

  override destroy(fromScene?: boolean): void {
    this.rock.destroy();
    super.destroy(fromScene);
  }
}
