import Phaser from 'phaser';
import { AudioManager } from '../../core/audio/AudioManager';
import { Haptics } from '../../core/haptics';
import type { TiledObjectLike } from '../../core/tiled';
import { ENEMIES } from '../../data/entities';
import type { Player } from '../Player';
import { Enemy, type EnemyContext } from './Enemy';

type GooseState = 'sleep' | 'idle' | 'honk' | 'charge' | 'hop' | 'stun' | 'gone';

const BODY = { w: 70, h: 72 };

/**
 * 1-3 mini-boss. Loop: honk (≥0.8 s telegraph, the only warning you need) → charge along the
 * sand (jump it) → flap-hop at your platform → land stunned for 2 s, the stomp window.
 * Three stomps. After the second it is furious and charges there-and-back before hopping.
 * Flannel and Rain Drops don't hurt it; only a stomp does, and only while it's dizzy.
 */
export class CanadaGoose extends Enemy {
  override readonly isBoss = true;
  mode: GooseState = 'sleep';
  private stateMs = 0;
  private charges = 0;
  private stars?: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number, obj?: TiledObjectLike) {
    super(scene, x, y, ENEMIES.goose, obj);
    this.setPose('goose_honk', BODY.w, BODY.h);
    this.dir = -1;
    this.applyFacing();
  }

  get phase2(): boolean {
    return this.hp <= this.def.params.phase2Hp;
  }

  /** The arena walls have closed: let's go. */
  wake(): void {
    if (this.mode !== 'sleep') return;
    this.enter('honk');
  }

  private enter(state: GooseState): void {
    this.mode = state;
    this.stateMs = 0;
    this.stars?.setVisible(state === 'stun');
    switch (state) {
      case 'idle':
        this.setPose('goose_honk', BODY.w, BODY.h);
        break;
      case 'honk':
        this.setPose('goose_honk', BODY.w, BODY.h);
        AudioManager.sfx('honk');
        // wobble on the spot (angle only: a scale tween would resize the hitbox)
        this.scene.tweens.add({ targets: this, angle: { from: -6, to: 6 }, duration: 110, yoyo: true, repeat: 3, onComplete: () => this.setAngle(0) });
        break;
      case 'charge':
        this.setPose('goose_charge', BODY.w, BODY.h - 10);
        break;
      case 'hop':
        this.setPose('goose_flap', BODY.w, BODY.h);
        break;
      case 'stun':
        this.setPose('goose_stun', BODY.w, BODY.h - 6);
        if (!this.stars) {
          this.stars = this.scene.add.image(this.x, this.y - 90, 'blocks', 'sparkle').setScale(0.5).setDepth(9).setBlendMode(Phaser.BlendModes.ADD);
          this.scene.tweens.add({ targets: this.stars, angle: 360, duration: 1200, repeat: -1 });
        }
        this.stars.setVisible(true);
        break;
      default:
        break;
    }
  }

  protected override behave(ctx: EnemyContext): void {
    const p = this.def.params;
    this.stateMs += ctx.dtMs;
    this.stars?.setPosition(this.x, this.y - 92);
    const towardPlayer: 1 | -1 = ctx.player.x < this.x ? -1 : 1;
    switch (this.mode) {
      case 'sleep':
        this.body.setVelocityX(0);
        return;
      case 'idle':
        this.body.setVelocityX(0);
        this.dir = towardPlayer;
        this.applyFacing();
        if (this.stateMs >= p.idleMs) this.enter('honk');
        return;
      case 'honk':
        this.body.setVelocityX(0);
        this.dir = towardPlayer;
        this.applyFacing();
        if (this.stateMs >= p.honkMs) {
          this.charges = 0;
          this.enter('charge');
          ctx.shake(160, 0.004);
        }
        return;
      case 'charge': {
        const speed = p.chargeSpeed * (this.phase2 ? 1.15 : 1);
        this.body.setVelocityX(this.dir * speed);
        this.applyFacing();
        const hitWall = (this.dir < 0 && this.body.blocked.left) || (this.dir > 0 && this.body.blocked.right);
        if (hitWall || this.stateMs > 4000) {
          this.charges += 1;
          ctx.shake(120, 0.006);
          AudioManager.sfx('bump');
          this.dir = this.dir === 1 ? -1 : 1;
          this.applyFacing();
          if (this.phase2 && this.charges < 2) this.stateMs = 0;
          else this.enter('hop');
        }
        return;
      }
      case 'hop':
        if (this.stateMs < 40) {
          // one flap toward wherever Jimothy is standing
          const vx = Phaser.Math.Clamp((ctx.player.x - this.x) * 1.1, -p.hopMaxVx, p.hopMaxVx);
          this.body.setVelocity(vx, p.hopVy);
          this.dir = vx < 0 ? -1 : 1;
          this.applyFacing();
          AudioManager.sfx('honk');
        } else if (this.body.blocked.down && this.stateMs > 200) {
          this.body.setVelocityX(0);
          ctx.puff(this.x, this.y - 10);
          ctx.shake(140, 0.006);
          this.enter('stun');
        }
        return;
      case 'stun':
        this.body.setVelocityX(0);
        if (this.stateMs >= p.stunMs) this.enter('idle');
        return;
      default:
        this.body.setVelocityX(0);
    }
  }

  override onStomp(ctx: EnemyContext): boolean {
    if (!this.alive) return false;
    if (this.mode !== 'stun') {
      // landing on an angry goose just bounces you off its back
      AudioManager.sfx('bump');
      return true;
    }
    this.hp -= 1;
    AudioManager.sfx('stomp');
    Haptics.pulse('stomp');
    ctx.shake(200, 0.008);
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(90, () => this.clearTint());
    if (this.hp <= 0) {
      this.mode = 'gone';
      this.alive = false;
      this.stars?.destroy();
      AudioManager.sfx('honk');
      this.setPose('goose_flap', BODY.w, BODY.h);
      this.body.checkCollision.none = true;
      this.body.setAllowGravity(false);
      this.body.setVelocity(0, 0);
      ctx.bossDefeated(this);
      this.scene.tweens.add({
        targets: this, x: this.x + 900, y: this.y - 520, angle: -12, duration: 2200, ease: 'Quad.in',
        onComplete: () => this.destroy(),
      });
      return true;
    }
    this.enter('honk');
    return true;
  }

  override onHitPlayer(player: Player): void {
    if (this.mode === 'stun' || this.mode === 'sleep' || !this.alive) return;
    if (player.hurt()) player.knockback(player.x < this.x ? -1 : 1, 360);
  }

  /** Rain Drops and shells bounce off. */
  override defeat(): void {
    AudioManager.sfx('honk');
  }

  override destroy(fromScene?: boolean): void {
    this.stars?.destroy();
    super.destroy(fromScene);
  }
}
