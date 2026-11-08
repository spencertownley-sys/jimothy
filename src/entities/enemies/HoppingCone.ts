import Phaser from 'phaser';
import { AudioManager } from '../../core/audio/AudioManager';
import type { TiledObjectLike } from '../../core/tiled';
import { ENEMIES } from '../../data/entities';
import { Enemy, type EnemyContext } from './Enemy';

/** Eternal road construction: an orange cone on a spring that hops toward you. Stompable. */
export class HoppingCone extends Enemy {
  private restMs = 400;

  constructor(scene: Phaser.Scene, x: number, y: number, obj?: TiledObjectLike) {
    super(scene, x, y, ENEMIES.cone, obj);
  }

  protected override behave(ctx: EnemyContext): void {
    if (this.body.blocked.down) {
      this.body.setVelocityX(0);
      this.restMs -= ctx.dtMs;
      if (this.restMs <= 0) {
        this.restMs = this.def.params.hopEveryMs;
        this.dir = ctx.player.x < this.x ? -1 : 1;
        this.body.setVelocity(this.dir * this.def.speed, this.def.params.hopVy);
        if (Math.abs(this.x - ctx.player.x) < 420) AudioManager.sfx('boing');
        this.applyFacing();
      }
    } else if (this.body.blocked.left || this.body.blocked.right) {
      this.dir = this.dir === 1 ? -1 : 1;
      this.body.setVelocityX(this.dir * this.def.speed);
    }
  }
}
