import Phaser from 'phaser';
import { CONFIG } from '../../config';
import { AudioManager } from '../../core/audio/AudioManager';
import type { Player } from '../Player';

type GeyserMode = 'idle' | 'warn' | 'on';

/**
 * A Fountain Plaza jet: a bronze nozzle in the paving that fires on a 2 s cycle. While it's on,
 * stepping into the column launches Jimothy to the top of the jet (five tiles for most); falling back in while it's still
 * on launches him again, so you can "ride" a jet or hop along a row of them. Never harmful.
 * The nozzle bubbles for a moment before it fires so the rhythm is readable.
 */
export class Geyser {
  private jet: Phaser.GameObjects.Image;
  private bubbles?: Phaser.GameObjects.Image;
  private t: number;
  private mode: GeyserMode = 'idle';
  private readonly heightPx: number;
  private readonly halfW: number;
  private readonly jetW: number;

  constructor(
    private scene: Phaser.Scene,
    private x: number,
    private groundY: number,
    heightTiles: number,
    phaseMs: number,
    /** a wide jet is several nozzles firing together (the triple geyser) */
    nozzles = 1,
  ) {
    this.heightPx = heightTiles * CONFIG.TILE;
    this.halfW = CONFIG.GEYSER.HALF_W + (nozzles - 1) * CONFIG.TILE * 0.5;
    this.t = ((phaseMs % CONFIG.GEYSER.PERIOD_MS) + CONFIG.GEYSER.PERIOD_MS) % CONFIG.GEYSER.PERIOD_MS;
    scene.add.image(x, groundY + 6, 'blocks', 'geyser_base').setOrigin(0.5, 1).setDepth(5).setScale(Math.min(nozzles, 2.2), 1);
    this.jet = scene.add.image(x, groundY - 6, 'blocks', 'geyser_jet').setOrigin(0.5, 1).setDepth(9).setAlpha(0.92);
    this.jetW = 0.62 * nozzles;
    this.jet.setScale(this.jetW, 0.02).setVisible(false);
  }

  private get near(): boolean {
    return Math.abs(this.x - this.scene.cameras.main.midPoint.x) < CONFIG.WIDTH * 0.7;
  }

  fixedUpdate(dtMs: number, player: Player): void {
    const G = CONFIG.GEYSER;
    this.t = (this.t + dtMs) % G.PERIOD_MS;
    // the cycle: off, then a short bubbling warning, then the jet
    const offMs = G.PERIOD_MS - G.ON_MS;
    const mode: GeyserMode = this.t >= offMs ? 'on' : this.t >= offMs - G.WARN_MS ? 'warn' : 'idle';
    if (mode !== this.mode) this.enter(mode);
    if (this.mode !== 'on' || player.fsm === 'Dead') return;
    const pb = player.body;
    const top = this.groundY - this.heightPx;
    const inside = pb.right > this.x - this.halfW && pb.left < this.x + this.halfW && pb.bottom > top && pb.top < this.groundY;
    if (!inside) return;
    // Push him just hard enough to peak at the top of the jet (plus a little bob), so falling back
    // in rides the jet instead of ratcheting higher. A rise already under way is never cut short.
    const need = -Math.sqrt(2 * CONFIG.GRAVITY * Math.max(pb.bottom - top, G.BOB_PX));
    if (pb.velocity.y > need * G.RELAUNCH_FRAC) {
      // holding jump floats a little higher (how you reach the lamp wire)
      player.launch(need, false);
      if (this.near && pb.velocity.y > 0) AudioManager.sfx('splash');
    }
  }

  private enter(mode: GeyserMode): void {
    this.mode = mode;
    const s = this.scene;
    if (mode === 'warn') {
      this.bubbles?.destroy();
      const b = s.add.image(this.x, this.groundY - 6, 'blocks', 'splash').setOrigin(0.5, 1).setDepth(9).setScale(0.45).setAlpha(0.85);
      this.bubbles = b;
      s.tweens.add({ targets: b, scaleY: 0.7, duration: 110, yoyo: true, repeat: -1 });
      return;
    }
    this.bubbles?.destroy();
    this.bubbles = undefined;
    s.tweens.killTweensOf(this.jet);
    if (mode === 'on') {
      if (this.near) AudioManager.sfx('geyser');
      const full = this.heightPx / this.jet.height;
      this.jet.setVisible(true).setScale(this.jetW, 0.05);
      s.tweens.add({ targets: this.jet, scaleY: full, duration: 140, ease: 'Quad.out' });
      s.tweens.add({ targets: this.jet, scaleX: this.jetW * 1.12, duration: 120, yoyo: true, repeat: -1, delay: 140 });
      return;
    }
    s.tweens.add({ targets: this.jet, scaleY: 0.02, scaleX: this.jetW * 0.8, duration: 180, ease: 'Quad.in', onComplete: () => this.jet.setVisible(false) });
  }
}
