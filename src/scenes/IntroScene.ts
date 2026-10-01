import Phaser from 'phaser';
import { CONFIG } from '../config';
import { AudioManager } from '../core/audio/AudioManager';
import { getInput } from '../core/input';
import { COLORS, uiText } from '../ui/text';

/** 3 panels, ~10 s, no dialogue. Start skips (GDD §6). */
export class IntroScene extends Phaser.Scene {
  private panel = 0;
  private timer = 0;
  private input_ = getInput().state;
  private layer!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'Intro' });
  }

  create(): void {
    this.panel = 0;
    this.timer = 0;
    this.input_.reset();
    this.cameras.main.setBackgroundColor(0x1c2426);
    this.layer = this.add.container(0, 0);
    uiText(this, CONFIG.WIDTH - 24, CONFIG.HEIGHT - 24, 'START to skip', { fontSize: 16, color: COLORS.mist, display: false }).setOrigin(1);
    this.showPanel();
  }

  private showPanel(): void {
    this.layer.removeAll(true);
    const W = CONFIG.WIDTH;
    const H = CONFIG.HEIGHT;
    const frame = this.add.rectangle(W / 2, H / 2, 900, 480, 0x6e9aa6, 1).setStrokeStyle(8, 0xf4efe6);
    this.layer.add(frame);
    const ground = this.add.rectangle(W / 2, H / 2 + 200, 900, 80, 0x3b3128);
    this.layer.add(ground);
    if (this.panel === 0) {
      // Jimothy in his cedar
      const trunk = this.add.rectangle(W / 2 + 120, H / 2 + 40, 90, 260, 0x5a3c22);
      const crown = this.add.triangle(W / 2 + 120, H / 2 - 150, 0, 220, 130, 0, 260, 220, 0x2f5e45).setOrigin(0.5, 0.5);
      const j = this.add.image(W / 2 - 120, H / 2 + 160, 'jimothy', 'small_idle').setOrigin(0.5, 1).setScale(2);
      this.layer.add([crown, trunk, j]);
    } else if (this.panel === 1) {
      AudioManager.sfx('brick');
      const board = this.add.rectangle(W / 2, H / 2 - 20, 620, 260, 0xf4efe6).setStrokeStyle(6, 0x1c2426);
      const t = uiText(this, W / 2, H / 2 - 20, 'COMING SOON\nLUXE MICRO-LOFTS\nSTUDIOS FROM $2,950', { fontSize: 40, color: COLORS.ink, align: 'center', stroke: false });
      t.setOrigin(0.5);
      const stump = this.add.image(W / 2 - 330, H / 2 + 160, 'jimothy', 'small_look').setOrigin(0.5, 1).setScale(1.6);
      this.layer.add([board, t, stump]);
    } else {
      const j = this.add.image(W / 2 - 300, H / 2 + 160, 'jimothy', 'small_lope').setOrigin(0.5, 1).setScale(2);
      this.layer.add(j);
      this.tweens.add({ targets: j, x: W / 2 + 380, duration: 2600, ease: 'Linear' });
      this.time.addEvent({ delay: 140, repeat: 18, callback: () => j.setFrame(j.frame.name === 'small_lope' ? 'small_idle' : 'small_lope') });
    }
  }

  override update(_t: number, delta: number): void {
    this.input_.update();
    if (this.input_.justPressed('start') || this.input_.justPressed('a')) {
      this.scene.start('WorldMap');
      return;
    }
    this.timer += delta;
    if (this.timer > 3200) {
      this.timer = 0;
      this.panel++;
      if (this.panel > 2) this.scene.start('WorldMap');
      else this.showPanel();
    }
  }
}
