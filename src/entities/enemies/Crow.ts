import Phaser from 'phaser';
import { CONFIG } from '../../config';
import { AudioManager } from '../../core/audio/AudioManager';
import { Haptics } from '../../core/haptics';
import { getProp, type TiledObjectLike } from '../../core/tiled';
import { ENEMIES } from '../../data/entities';
import type { Player } from '../Player';
import { Enemy, type EnemyContext } from './Enemy';

type CrowMode = 'walk' | 'shell' | 'slide' | 'fly';

/**
 * The Koopa of Seattle: stomp a crow and it tucks into a feathery ball; touch or stomp the ball
 * and it slides, bowling over every enemy in its path. A moving shell hurts Jimothy from the
 * side, exactly like Mario's. `fly: true` makes a crow that patrols the air, carrying a geoduck
 * (`carries: <index>`) that it drops when stomped.
 */
export class Crow extends Enemy {
  private mode: CrowMode = 'walk';
  private kickGraceMs = 0;
  private readonly carries: number;
  private readonly homeX: number;
  private readonly homeY: number;
  private t = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, obj?: TiledObjectLike) {
    super(scene, x, y, ENEMIES.crow, obj);
    this.carries = getProp(obj, 'carries', -1);
    this.homeX = x;
    this.homeY = y;
    if (getProp(obj, 'fly', false)) {
      this.mode = 'fly';
      this.body.setAllowGravity(false);
      this.setPose('crow_fly', 56, 46);
      this.body.setOffset(this.body.offset.x, 4);
      this.setDepth(9);
    }
  }

  get sliding(): boolean {
    return this.mode === 'slide';
  }

  protected override behave(ctx: EnemyContext): void {
    if (this.kickGraceMs > 0) this.kickGraceMs -= ctx.dtMs;
    switch (this.mode) {
      case 'walk':
        this.walk(ctx);
        // Pike Place crows help themselves to your lattes
        ctx.stealLattes(this.body.left, this.body.top - 8, this.body.right, this.body.bottom);
        return;
      case 'shell':
        this.body.setVelocityX(0);
        return;
      case 'slide':
        this.slide(ctx);
        return;
      case 'fly':
        this.fly(ctx);
    }
  }

  private slide(ctx: EnemyContext): void {
    if (this.body.blocked.left) this.dir = 1;
    else if (this.body.blocked.right) this.dir = -1;
    this.body.setVelocityX(this.dir * this.def.params.shellSpeed);
    this.setAngle(this.angle + this.dir * 18);
    // bowl over everything in the way
    const me = this.body;
    for (const o of ctx.others()) {
      if (o === this || !o.alive || !o.body || !o.body.enable) continue;
      const ob = o.body;
      if (me.right > ob.left && me.left < ob.right && me.bottom > ob.top && me.top < ob.bottom) {
        if (o.isBoss) continue;
        o.defeat(this.dir);
        ctx.puff(o.x, o.y - 20);
      }
    }
  }

  private fly(ctx: EnemyContext): void {
    this.t += ctx.dtMs / 1000;
    const range = this.def.params.flyRange;
    if (this.x < this.homeX - range) this.dir = 1;
    else if (this.x > this.homeX + range) this.dir = -1;
    this.body.setVelocityX(this.dir * this.def.speed);
    const target = this.homeY + Math.sin(this.t * Math.PI * 2 * this.def.params.flyHz) * this.def.params.flyAmp;
    this.body.setVelocityY((target - this.bodyAnchorY()) / (ctx.dtMs / 1000));
    this.applyFacing();
  }

  private tuck(): void {
    this.mode = 'shell';
    this.setAngle(0);
    this.body.setVelocityX(0);
    this.setPose('crow_shell', this.def.params.shellW, this.def.params.shellH);
    // the same stomp can't also kick it on the next step
    this.kickGraceMs = CONFIG.SHELL_KICK_GRACE_MS;
  }

  private kick(dir: 1 | -1): void {
    this.mode = 'slide';
    this.dir = dir;
    this.kickGraceMs = CONFIG.SHELL_KICK_GRACE_MS;
    AudioManager.sfx('bump');
    Haptics.pulse('stomp');
  }

  override onStomp(ctx: EnemyContext): boolean {
    if (!this.alive) return false;
    const away: 1 | -1 = ctx.player.x < this.x ? 1 : -1;
    switch (this.mode) {
      case 'fly':
        AudioManager.sfx('stomp');
        Haptics.pulse('stomp');
        if (this.carries >= 0) ctx.dropGeoduck(this.carries, this.x, this.y - 30);
        this.defeat(away);
        return true;
      case 'walk':
        AudioManager.sfx('stomp');
        Haptics.pulse('stomp');
        ctx.puff(this.x, this.y - 20);
        this.tuck();
        return true;
      case 'shell':
        if (this.kickGraceMs <= 0) this.kick(away);
        return true;
      case 'slide':
        AudioManager.sfx('stomp');
        this.tuck();
        return true;
    }
  }

  override onHitPlayer(player: Player): void {
    if (player.flannelMs > 0) {
      this.defeat(player.x < this.x ? 1 : -1);
      return;
    }
    if (this.mode === 'shell') {
      // walking into a still shell kicks it, Mario rules
      if (this.kickGraceMs <= 0) this.kick(player.x < this.x ? 1 : -1);
      return;
    }
    if (this.mode === 'slide' && this.kickGraceMs > 0) return;
    player.hurt();
  }
}
