import Phaser from 'phaser';
import { AudioManager } from '../../core/audio/AudioManager';
import type { TiledObjectLike } from '../../core/tiled';
import { ENEMIES } from '../../data/entities';
import { Enemy, type EnemyContext } from './Enemy';

/**
 * A loose shopping cart in the beach parking lot. It drifts, and the moment it "sees" Jimothy
 * on its level it rattles straight at him. Stompable; jumping over it is the lesson.
 */
export class RunawayCart extends Enemy {
  private chargeMs = 0;
  private coolMs = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, obj?: TiledObjectLike) {
    super(scene, x, y, ENEMIES.cart, obj);
  }

  protected override behave(ctx: EnemyContext): void {
    const p = this.def.params;
    if (this.chargeMs > 0) {
      this.chargeMs -= ctx.dtMs;
      if (this.body.blocked.left || this.body.blocked.right || this.chargeMs <= 0) {
        this.chargeMs = 0;
        this.coolMs = p.coolMs;
        this.dir = this.dir === 1 ? -1 : 1;
      }
      this.body.setVelocityX(this.dir * p.chargeSpeed);
      this.setAngle(Math.sin(this.scene.time.now / 40) * 3);
      this.applyFacing();
      return;
    }
    this.setAngle(0);
    if (this.coolMs > 0) this.coolMs -= ctx.dtMs;
    const dx = ctx.player.x - this.x;
    const dy = Math.abs(ctx.player.body.bottom - this.body.bottom);
    if (this.coolMs <= 0 && Math.abs(dx) < p.losRange && dy < p.losHeight && this.body.blocked.down) {
      this.dir = dx < 0 ? -1 : 1;
      this.chargeMs = p.chargeMs;
      AudioManager.sfx('bump');
      return;
    }
    this.walk(ctx);
  }
}
