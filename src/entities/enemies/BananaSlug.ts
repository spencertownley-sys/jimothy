import Phaser from 'phaser';
import { CONFIG } from '../../config';
import type { TiledObjectLike } from '../../core/tiled';
import { ENEMIES } from '../../data/entities';
import { Enemy, type EnemyContext } from './Enemy';

/** Pacific Northwest banana slug: slow, harmless-looking, leaves a slippery trail behind it. */
export class BananaSlug extends Enemy {
  private sinceSlime = 0;
  private lastX: number;

  constructor(scene: Phaser.Scene, x: number, y: number, obj?: TiledObjectLike) {
    super(scene, x, y, ENEMIES.slug, obj);
    this.lastX = x;
  }

  protected override behave(ctx: EnemyContext): void {
    this.walk(ctx);
    this.sinceSlime += Math.abs(this.x - this.lastX);
    this.lastX = this.x;
    if (this.body.blocked.down && this.sinceSlime >= CONFIG.SLIME.DROP_EVERY_PX) {
      this.sinceSlime = 0;
      ctx.slime(this.x - this.dir * 20, this.body.bottom);
    }
  }
}
