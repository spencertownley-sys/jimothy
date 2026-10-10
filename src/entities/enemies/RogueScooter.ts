import Phaser from 'phaser';
import { CONFIG } from '../../config';
import { AudioManager } from '../../core/audio/AudioManager';
import type { TiledObjectLike } from '../../core/tiled';
import { ENEMIES } from '../../data/entities';
import type { Player } from '../Player';
import { Enemy, type EnemyContext } from './Enemy';

type ScooterMode = 'parked' | 'horn' | 'ride';

/**
 * Rogue E-Scooter (Bullet Bill). Placed in the map where it should trigger: when Jimothy gets
 * close it honks, a warning flashes at the screen edge for 0.8 s, then it shoots in from
 * off-screen along the corridor. Stompable.
 */
export class RogueScooter extends Enemy {
  private mode: ScooterMode = 'parked';
  private hornMs = 0;
  private warn?: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, obj?: TiledObjectLike) {
    super(scene, x, y, ENEMIES.scooter, obj);
    this.setVisible(false);
    this.body.setAllowGravity(false);
    this.body.checkCollision.none = true;
  }

  protected override behave(ctx: EnemyContext): void {
    const p = this.def.params;
    const cam = this.scene.cameras.main;
    switch (this.mode) {
      case 'parked':
        this.body.setVelocity(0, 0);
        if (ctx.player.x > this.x - p.triggerPx && ctx.player.fsm !== 'Dead') {
          this.mode = 'horn';
          this.hornMs = p.hornMs;
          this.dir = ctx.player.x < this.x ? -1 : 1;
          AudioManager.sfx('horn');
          const wx = this.dir < 0 ? CONFIG.WIDTH - 40 : 40;
          this.warn = this.scene.add.text(wx, this.y - cam.scrollY - 24, '!', { fontFamily: 'sans-serif', fontSize: '56px', fontStyle: 'bold', color: '#c6f24e' })
            .setOrigin(0.5).setScrollFactor(0).setDepth(60).setStroke('#1c2426', 8);
          this.scene.tweens.add({ targets: this.warn, alpha: 0.2, duration: 120, yoyo: true, repeat: -1 });
        }
        return;
      case 'horn':
        this.hornMs -= ctx.dtMs;
        this.warn?.setY(this.y - cam.scrollY - 24);
        if (this.hornMs > 0) return;
        this.warn?.destroy();
        this.warn = undefined;
        this.mode = 'ride';
        // come in from just outside the camera on the side it honked from
        this.body.reset(this.dir < 0 ? cam.scrollX + CONFIG.WIDTH + 60 : cam.scrollX - 60, this.y);
        this.setVisible(true);
        this.body.checkCollision.none = false;
        this.body.setAllowGravity(true);
        this.applyFacing();
        return;
      case 'ride':
        // the art faces left
        this.setFlipX(this.dir > 0);
        this.body.setVelocityX(this.dir * this.def.speed);
        if ((this.dir < 0 && this.x < cam.scrollX - 300) || (this.dir > 0 && this.x > cam.scrollX + CONFIG.WIDTH + 300)) this.destroy();
    }
  }

  protected override applyFacing(): void {
    this.setFlipX(this.dir > 0);
  }

  override onStomp(ctx: EnemyContext): boolean {
    if (this.mode !== 'ride') return false;
    return super.onStomp(ctx);
  }

  override onHitPlayer(player: Player): void {
    if (this.mode !== 'ride') return;
    super.onHitPlayer(player);
  }

  override destroy(fromScene?: boolean): void {
    this.warn?.destroy();
    super.destroy(fromScene);
  }
}
