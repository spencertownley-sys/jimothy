import Phaser from 'phaser';
import { CONFIG } from '../config';
import { AudioManager } from '../core/audio/AudioManager';
import { getInput } from '../core/input';
import { RUN_KEY, type RunState } from '../core/run';
import { Menu } from '../ui/Menu';
import { COLORS, uiText } from '../ui/text';
import { wantsTouchControls } from '../ui/TouchControls';

export class PauseScene extends Phaser.Scene {
  private menu!: Menu;
  private input_ = getInput().state;
  private levelId = '';

  constructor() {
    super({ key: 'Pause' });
  }

  create(data: { levelId: string }): void {
    this.levelId = data.levelId;
    const W = CONFIG.WIDTH;
    const H = CONFIG.HEIGHT;
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.6);
    this.add.rectangle(W / 2, H / 2, 560, 420, 0xf4efe6, 1).setStrokeStyle(6, 0x8a6a40);
    uiText(this, W / 2, H / 2 - 160, 'PAUSED', { fontSize: 40, color: COLORS.ink, stroke: false }).setOrigin(0.5);
    const controls = wantsTouchControls()
      ? 'd-pad move/crouch · ↑ or swipe up jump · A throw · B sprint'
      : '← → move · ↓ crouch · ↑ jump · A throw · S sprint · Space pause';
    uiText(this, W / 2, H / 2 + 170, controls, { fontSize: 16, color: COLORS.ink, display: false, stroke: false }).setOrigin(0.5);
    this.menu = new Menu(this, W / 2 - 180, H / 2 - 80, [
      { label: 'Resume', onSelect: () => this.resume() },
      { label: 'Restart level', onSelect: () => this.restart() },
      { label: 'Options', onSelect: () => this.scene.start('Options', { back: 'Pause', levelId: this.levelId, resumeGame: true }) },
      { label: 'World Map', onSelect: () => this.toMap() },
    ], { gap: 54, fontSize: 30 });
    this.menu.onCancel = () => this.resume();
    this.input_.reset();
  }

  override update(): void {
    this.input_.update();
    if (this.input_.justPressed('start')) {
      this.resume();
      return;
    }
    this.menu.update(this.input_);
  }

  private resume(): void {
    AudioManager.setPaused(false);
    this.input_.reset();
    this.scene.stop();
    this.scene.resume('Game');
  }

  private restart(): void {
    AudioManager.setPaused(false);
    const run = this.registry.get(RUN_KEY) as RunState | undefined;
    if (run) {
      run.checkpoint = null;
      run.elapsedMs = 0;
      run.lattesThisLevel = 0;
    }
    this.scene.stop();
    const game = this.scene.get('Game');
    game.scene.restart({ levelId: this.levelId, spawn: 'start' });
  }

  private toMap(): void {
    AudioManager.setPaused(false);
    this.scene.stop();
    this.scene.stop('HUD');
    this.scene.stop('Game');
    this.scene.start('WorldMap', { focus: this.levelId });
  }
}
