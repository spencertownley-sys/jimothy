import Phaser from 'phaser';
import { CONFIG } from '../config';
import { AudioManager } from '../core/audio/AudioManager';
import type { Player } from './Player';

export interface FlockHost {
  /** a gull peels off the flock and swoops ahead */
  spawnSwooper(x: number, y: number): void;
  /** the flock caught Jimothy: it takes his power-up (or some lattes) */
  flockCaught(): void;
  /** the boardwalk ahead is a pier: the flock hangs back while he's on one */
  onPier(x: number): boolean;
}

/**
 * 2-3's gentle auto-chase: a huge seagull flock rolls in from the left a little faster than
 * Jimothy walks. It never kills — if it catches him it steals his power-up and backs off.
 * It waits while he's out on a side pier, and sends a swooper ahead now and then.
 */
export class Flock {
  /** x of the flock's leading edge */
  x: number;
  private img: Phaser.GameObjects.Image;
  private started = false;
  private swoopMs: number;
  private squawkMs = 0;
  swoopersLeft: number;

  constructor(
    scene: Phaser.Scene,
    startX: number,
    private speed: number,
    swoopers: number,
    private host: FlockHost,
  ) {
    this.x = startX;
    this.swoopersLeft = swoopers;
    this.swoopMs = CONFIG.FLOCK.SWOOP_EVERY_MS;
    this.img = scene.add.image(startX, 360, 'enemies', 'flock').setOrigin(1, 0.5).setDepth(13).setAlpha(0.95);
    scene.tweens.add({ targets: this.img, scaleY: 0.94, duration: 260, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  fixedUpdate(player: Player, dtMs: number, frozen: boolean): void {
    const dt = dtMs / 1000;
    if (!this.started) {
      // give him a head start: it sets off once he does
      if (Math.abs(player.body.velocity.x) > 10) this.started = true;
      else return;
    }
    if (!frozen && player.fsm !== 'Dead') {
      if (!this.host.onPier(player.x)) this.x += this.speed * dt;
      // never fall too far behind: the pressure is the point
      const lag = player.x - this.x;
      if (lag > CONFIG.WIDTH * CONFIG.FLOCK.MAX_LAG_SCREENS) this.x = player.x - CONFIG.WIDTH * CONFIG.FLOCK.MAX_LAG_SCREENS;
      if (this.x >= player.x - 10 && !player.invulnerable) {
        this.host.flockCaught();
        this.x = player.x - CONFIG.WIDTH * CONFIG.FLOCK.RETREAT_SCREENS;
      }
      this.swoopMs -= dtMs;
      if (this.swoopMs <= 0 && this.swoopersLeft > 0 && lag < CONFIG.WIDTH * 0.9) {
        this.swoopMs = CONFIG.FLOCK.SWOOP_EVERY_MS;
        this.swoopersLeft -= 1;
        this.host.spawnSwooper(this.x - 40, player.y - 70);
      }
      this.squawkMs -= dtMs;
      if (this.squawkMs <= 0 && lag < CONFIG.WIDTH * 0.7) {
        this.squawkMs = 2600;
        AudioManager.sfx('squawk');
      }
    }
    this.img.setPosition(this.x + 40, Phaser.Math.Linear(this.img.y, player.y - 120, 0.05));
  }

  destroy(): void {
    this.img.destroy();
  }
}
