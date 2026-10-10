import Phaser from 'phaser';
import { CONFIG } from '../../config';
import { AudioManager } from '../../core/audio/AudioManager';
import { Haptics } from '../../core/haptics';
import { getProp, type TiledObjectLike } from '../../core/tiled';
import type { EnemyDef } from '../../data/entities';
import type { Player } from '../Player';

export interface EnemyContext {
  player: Player;
  cameraCenterX: number;
  worldHeight: number;
  dtMs: number;
  /** True if a solid/one-way tile exists at the world point. */
  solidAt(x: number, y: number): boolean;
  puff(x: number, y: number): void;
  /** every other live enemy (shells plough through them) */
  others(): Enemy[];
  /** banana-slug trail: a slippery decal on the ground at (x, feetY) */
  slime(x: number, feetY: number): void;
  /** a carried geoduck falls free (the 1-2 crow) */
  dropGeoduck(index: number, x: number, y: number): void;
  /** the mini-boss is down: open the arena, drop the reward */
  bossDefeated(boss: Enemy): void;
  shake(ms: number, intensity: number): void;
}

/** Base enemy: walker by default. Subclasses override `behave`. */
export class Enemy extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  readonly def: EnemyDef;
  dir: 1 | -1 = -1;
  hp: number;
  alive = true;
  turnAtEdges: boolean;
  protected frozen = false;
  /** Mini-bosses ignore Flannel and Rain Drops; only stomps count. */
  readonly isBoss: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number, def: EnemyDef, obj?: TiledObjectLike) {
    super(scene, x, y, 'enemies', def.frame);
    this.def = def;
    this.hp = def.hp;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1);
    this.setDepth(8);
    this.dir = getProp(obj, 'dir', -1) < 0 ? -1 : 1;
    this.turnAtEdges = getProp(obj, 'turnAtEdges', def.turnAtEdges);
    const fw = this.frame.realWidth;
    const fh = this.frame.realHeight;
    this.body.setSize(def.w, def.h, false);
    this.body.setOffset((fw - def.w) / 2, fh - def.h);
    this.body.setMaxVelocityY(CONFIG.MAX_FALL_SPEED);
    this.applyFacing();
  }

  /**
   * Sprite y as the physics body sees it right now. Between the sub-steps of one frame the body
   * moves but the sprite only catches up afterwards, so velocity-driven paths must aim from here.
   */
  protected bodyAnchorY(): number {
    return this.body.y - (this.body.offset.y - this.displayOriginY) * this.scaleY;
  }

  /** Swap to another pose and keep the feet planted (origin is bottom-centre). */
  protected setPose(frame: string, w: number, h: number): void {
    if (this.frame.name !== frame) this.setFrame(frame);
    const fw = this.frame.realWidth;
    const fh = this.frame.realHeight;
    this.body.setSize(w, h, false);
    this.body.setOffset((fw - w) / 2, fh - h);
  }

  protected applyFacing(): void {
    // concept art faces right
    this.setFlipX(this.dir < 0);
  }

  fixedUpdate(ctx: EnemyContext): void {
    if (!this.alive) return;
    if (this.y > ctx.worldHeight + CONFIG.ENEMY_DESPAWN_MARGIN) {
      this.destroy();
      return;
    }
    // Enemies far from the camera sleep (perf budget: ≤150 bodies).
    const far = Math.abs(this.x - ctx.cameraCenterX) > CONFIG.WIDTH * CONFIG.ENEMY_FREEZE_SCREENS;
    if (far !== this.frozen) {
      this.frozen = far;
      this.body.enable = !far;
      if (far) this.body.setVelocity(0, 0);
    }
    if (this.frozen) return;
    this.behave(ctx);
  }

  protected behave(ctx: EnemyContext): void {
    this.walk(ctx);
  }

  protected walk(ctx: EnemyContext): void {
    if (this.body.blocked.left) this.dir = 1;
    else if (this.body.blocked.right) this.dir = -1;
    else if (this.turnAtEdges && this.body.blocked.down) {
      const aheadX = this.x + this.dir * (this.def.w / 2 + 4);
      if (!ctx.solidAt(aheadX, this.y + 4)) this.dir = this.dir === 1 ? -1 : 1;
    }
    this.body.setVelocityX(this.dir * this.def.speed);
    this.applyFacing();
  }

  /** Player landed on us. Returns true if the stomp counted. */
  onStomp(ctx: EnemyContext): boolean {
    if (!this.def.stompable || !this.alive) return false;
    this.hp -= 1;
    AudioManager.sfx('stomp');
    Haptics.pulse('stomp');
    if (this.hp <= 0) this.squish(ctx);
    return true;
  }

  /** Walked into the player from the side/below. */
  onHitPlayer(player: Player): void {
    if (player.flannelMs > 0) {
      this.defeat(player.x < this.x ? 1 : -1);
      return;
    }
    player.hurt();
  }

  /** Killed by Flannel, shells, Rain Drops: flip and fall off-screen. */
  defeat(dirX: 1 | -1): void {
    if (!this.alive) return;
    this.alive = false;
    AudioManager.sfx('stomp');
    this.body.checkCollision.none = true;
    this.body.setVelocity(dirX * 160, -420);
    this.setFlipY(true);
    this.scene.time.delayedCall(1500, () => this.destroy());
  }

  protected squish(ctx: EnemyContext): void {
    this.alive = false;
    ctx.puff(this.x, this.y - this.def.h / 2);
    this.body.enable = false;
    this.setScale(1, 0.35);
    this.setTint(0xbbbbbb);
    this.scene.time.delayedCall(300, () => this.destroy());
  }
}
