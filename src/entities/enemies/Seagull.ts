import Phaser from 'phaser';
import { AudioManager } from '../../core/audio/AudioManager';
import { getProp, type TiledObjectLike } from '../../core/tiled';
import { ENEMIES } from '../../data/entities';
import { Enemy, type EnemyContext } from './Enemy';

/** Goomba with a fry. `swoop: true` in Tiled makes it glide in a sine arc instead of walking. */
export class Seagull extends Enemy {
  private swoop: boolean;
  private baseY: number;
  private t = 0;
  private squawked = false;

  constructor(scene: Phaser.Scene, x: number, y: number, obj?: TiledObjectLike) {
    super(scene, x, y, ENEMIES.seagull, obj);
    this.swoop = getProp(obj, 'swoop', false);
    this.baseY = y;
    if (this.swoop) this.body.setAllowGravity(false);
  }

  protected override behave(ctx: EnemyContext): void {
    // one squawk when it first comes into view, so you hear it coming
    if (!this.squawked && Math.abs(this.x - ctx.player.x) < 560) {
      this.squawked = true;
      AudioManager.sfx('squawk');
    }
    if (!this.swoop) {
      this.walk(ctx);
      return;
    }
    this.t += ctx.dtMs / 1000;
    const amp = this.def.params.swoopAmp;
    const hz = this.def.params.swoopHz;
    if (this.body.blocked.left) this.dir = 1;
    else if (this.body.blocked.right) this.dir = -1;
    this.body.setVelocityX(this.dir * this.def.speed * 1.6);
    // drive y through the body (setting y directly desyncs it from the physics sub-steps)
    const target = this.baseY + Math.sin(this.t * Math.PI * 2 * hz) * amp;
    this.body.setVelocityY((target - this.bodyAnchorY()) / (ctx.dtMs / 1000));
    this.applyFacing();
  }
}
