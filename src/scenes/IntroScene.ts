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
    // Panel = a window onto the Ballard far background; the cedar, stump and sign are props.
    const PW = 900;
    const PH = 480;
    const floor = H / 2 + PH / 2 - 24;
    if (this.textures.exists('bg:ballard_far')) {
      const bg = this.add.image(W / 2, H / 2, 'bg:ballard_far');
      bg.setScale(PH / bg.height).setCrop((bg.width - PW / bg.scale) / 2, 0, PW / bg.scale, bg.height);
      this.layer.add(bg);
    } else {
      this.layer.add(this.add.rectangle(W / 2, H / 2, PW, PH, 0x6e9aa6));
    }
    this.layer.add(this.add.rectangle(W / 2, H / 2, PW, PH).setStrokeStyle(8, 0xf4efe6));
    const prop = (name: string, x: number, h: number): Phaser.GameObjects.Image => {
      const img = this.add.image(x, floor, 'props', name).setOrigin(0.5, 1);
      img.setScale(h / img.height);
      return img;
    };
    if (this.panel === 0) {
      // Jimothy in his cedar
      const tree = prop('cedar', W / 2 + 160, 430);
      const j = this.add.image(W / 2 - 120, floor, 'jimothy', 'small_idle').setOrigin(0.5, 1).setScale(2);
      this.layer.add([tree, j]);
    } else if (this.panel === 1) {
      AudioManager.sfx('brick');
      const board = prop('signboard', W / 2 + 60, 400);
      const t = uiText(this, board.x, floor - 400 * 0.6, 'COMING SOON\nLUXE MICRO-LOFTS\nSTUDIOS FROM $2,950', { fontSize: 30, align: 'center', stroke: false });
      t.setOrigin(0.5);
      const stump = prop('stump', W / 2 - 300, 80);
      const j = this.add.image(W / 2 - 300, floor - 70, 'jimothy', 'small_look').setOrigin(0.5, 1).setScale(1.6);
      this.layer.add([board, t, stump, j]);
    } else {
      const j = this.add.image(W / 2 - 300, floor, 'jimothy', 'small_lope').setOrigin(0.5, 1).setScale(2);
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
