import Phaser from 'phaser';
import { CONFIG } from '../config';
import { AudioManager } from '../core/audio/AudioManager';
import { getInput } from '../core/input';
import { RUN_KEY, type RunState } from '../core/run';
import { Menu } from '../ui/Menu';
import { COLORS, uiText } from '../ui/text';

/** "Jimothy will return." Continue from the world map with lives reset to 3 — it's a cozy game. */
export class GameOverScene extends Phaser.Scene {
  private menu!: Menu;
  private input_ = getInput().state;

  constructor() {
    super({ key: 'GameOver' });
  }

  create(): void {
    const W = CONFIG.WIDTH;
    const H = CONFIG.HEIGHT;
    this.cameras.main.setBackgroundColor(0x1c2426);
    AudioManager.stopMusic();
    this.add.rectangle(W / 2, H / 2 + 200, W, 200, 0x2b3c44);
    const j = this.add.image(W / 2, H / 2 + 100, 'jimothy', 'small_look').setOrigin(0.5, 1).setScale(1.8).setTint(0x1c2426).setAlpha(0.8);
    this.tweens.add({ targets: j, alpha: 0.5, duration: 1500, yoyo: true, repeat: -1 });
    uiText(this, W / 2, 150, 'Jimothy will return.', { fontSize: 48, color: COLORS.paper }).setOrigin(0.5);
    this.menu = new Menu(this, W / 2 - 110, 240, [
      { label: 'Continue', onSelect: () => this.toMap() },
      { label: 'World Map', onSelect: () => this.toMap() },
    ], { gap: 50, fontSize: 30 });
    this.input_.reset();
  }

  private toMap(): void {
    const run = this.registry.get(RUN_KEY) as RunState | undefined;
    if (run) {
      run.lives = CONFIG.START_LIVES;
      run.power = 'small';
      run.checkpoint = null;
      run.elapsedMs = 0;
    }
    this.scene.start('WorldMap', { focus: run?.levelId });
  }

  override update(): void {
    this.input_.update();
    this.menu.update(this.input_);
  }
}
