import Phaser from 'phaser';
import { CONFIG } from '../../config';
import { AudioManager } from '../../core/audio/AudioManager';
import { bus, EV } from '../../core/events';
import type { TiledObjectLike } from '../../core/tiled';
import { ENEMIES } from '../../data/entities';
import type { Player } from '../Player';
import { Enemy, type EnemyContext } from './Enemy';

/**
 * The Seattle Freeze: a pedestrian staring at a phone who will not move for you. Every 3 s an
 * icy pulse shoves Jimothy back (no damage). Can't be stomped — you bounce off. A Rain Drop
 * (or a kicked shell) thaws them for 3 s: they look up, "oh, hey", and you can walk past.
 */
export class Freeze extends Enemy {
  private pulseMs: number;
  private thawMs = 0;
  private ring?: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number, obj?: TiledObjectLike) {
    super(scene, x, y, ENEMIES.freeze, obj);
    this.pulseMs = this.def.params.pulseMs * 0.5;
    this.body.setImmovable(true);
  }

  get thawed(): boolean {
    return this.thawMs > 0;
  }

  protected override behave(ctx: EnemyContext): void {
    this.body.setVelocityX(0);
    if (this.thawMs > 0) {
      this.thawMs -= ctx.dtMs;
      if (this.thawMs <= 0) this.setPose('freeze_idle', this.def.w, this.def.h);
      return;
    }
    this.pulseMs -= ctx.dtMs;
    if (this.pulseMs > 0) return;
    this.pulseMs = this.def.params.pulseMs;
    this.pulse(ctx);
  }

  private pulse(ctx: EnemyContext): void {
    const cy = this.y - this.def.h / 2;
    const near = Math.abs(this.x - ctx.cameraCenterX) < CONFIG.WIDTH * 0.6;
    if (near) AudioManager.sfx('freeze');
    if (this.scene.textures.get('blocks').has('frost_ring')) {
      this.ring?.destroy();
      const r = this.scene.add.image(this.x, cy + 20, 'blocks', 'frost_ring').setDepth(9).setScale(0.25).setAlpha(0.95);
      this.ring = r;
      const full = (this.def.params.pulseRadius * 2) / r.width;
      this.scene.tweens.add({ targets: r, scale: full, alpha: 0, duration: 420, ease: 'Quad.out', onComplete: () => r.destroy() });
    }
    const p = ctx.player;
    const d = Phaser.Math.Distance.Between(this.x, cy, p.x, p.y - p.body.height / 2);
    if (d < this.def.params.pulseRadius && p.flannelMs <= 0) p.knockback(p.x < this.x ? -1 : 1, this.def.params.knockback);
  }

  /** Bumping into the Freeze just shoves you away; it never hurts. */
  override onHitPlayer(player: Player): void {
    if (this.thawed || player.flannelMs > 0) return;
    player.knockback(player.x < this.x ? -1 : 1, this.def.params.knockback * 0.7);
  }

  override onStomp(): boolean {
    return false;
  }

  /** Rain Drops and shells thaw instead of defeating. */
  override defeat(): void {
    if (this.thawMs > 0) {
      this.thawMs = this.def.params.thawMs;
      return;
    }
    this.thawMs = this.def.params.thawMs;
    this.setPose('freeze_thaw', this.def.w, this.def.h);
    AudioManager.sfx('ding');
    bus.emit(EV.HUD_TOAST, 'oh, hey');
  }

  override destroy(fromScene?: boolean): void {
    this.ring?.destroy();
    super.destroy(fromScene);
  }
}
