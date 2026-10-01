import Phaser from 'phaser';
import { CONFIG } from '../config';
import { AudioManager } from '../core/audio/AudioManager';
import { getInput } from '../core/input';
import { newRun, RUN_KEY } from '../core/run';
import { Save } from '../core/save/Save';
import { FIRST_LEVEL } from '../core/save/SaveV1';
import { Menu } from '../ui/Menu';
import { COLORS, uiText } from '../ui/text';
import { wantsTouchControls } from '../ui/TouchControls';

export class TitleScene extends Phaser.Scene {
  private menu?: Menu;
  private press!: Phaser.GameObjects.Text;
  private tapped = false;
  private input_ = getInput().state;

  constructor() {
    super({ key: 'Title' });
  }

  create(): void {
    const W = CONFIG.WIDTH;
    const H = CONFIG.HEIGHT;
    this.input_.reset();
    this.tapped = false;
    this.menu = undefined;
    if (this.textures.exists('bg:title')) this.add.image(W / 2, H / 2, 'bg:title');
    else this.cameras.main.setBackgroundColor(COLORS.cedar);
    this.add.rectangle(W / 2, H / 2, W, H, 0x1f3a33, 0.25);
    this.add.rectangle(W / 2, H - 70, W, 140, 0x1c2426, 0.35);

    const logo = uiText(this, W / 2, 120, 'JIMOTHY', { fontSize: 112, color: COLORS.amber });
    logo.setOrigin(0.5).setStroke(COLORS.ink, 14).setShadow(0, 6, '#1c2426', 12, true, true);
    const sub = uiText(this, W / 2, 205, 'A  S E A T T L E  S T O R Y', { fontSize: 30, color: COLORS.paper });
    sub.setOrigin(0.5);
    // puddle ripple on the logo every 4 s
    this.time.addEvent({ delay: 4000, loop: true, callback: () => this.tweens.add({ targets: logo, scaleX: 1.03, scaleY: 0.97, duration: 180, yoyo: true }) });

    if (Save.get().options.drizzle) {
      this.add.particles(0, 0, 'fx:drop', {
        x: { min: 0, max: W }, y: -12, lifespan: 1100, speedY: { min: 620, max: 820 }, speedX: -50,
        quantity: 2, frequency: 40, alpha: { start: 0.5, end: 0.05 }, scaleY: { min: 0.6, max: 1.4 },
      }).setDepth(2);
    }

    this.press = uiText(this, W / 2, H - 110, wantsTouchControls() ? 'TAP TO START' : 'PRESS START', { fontSize: 34, color: COLORS.paper }).setOrigin(0.5);
    this.tweens.add({ targets: this.press, alpha: 0.25, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    uiText(this, W / 2, H - 28, 'Jimothy is a real, wild raccoon. Please admire from a distance.  ·  Unofficial fan game, not affiliated with anyone.', {
      fontSize: 15, color: COLORS.mist, display: false,
    }).setOrigin(0.5);
    this.input.on('pointerdown', () => (this.tapped = true));
    if (wantsTouchControls() && !this.scene.isActive('Touch')) this.scene.launch('Touch');
  }

  override update(): void {
    this.input_.update();
    if (!this.menu) {
      if (this.input_.justPressed('start') || this.input_.justPressed('a') || this.tapped) {
        this.tapped = false;
        AudioManager.unlock();
        AudioManager.music('title');
        AudioManager.sfx('menu_select');
        this.showMenu();
      }
      return;
    }
    this.menu.update(this.input_);
  }

  private showMenu(): void {
    this.press.destroy();
    const W = CONFIG.WIDTH;
    this.add.rectangle(W / 2, 470, 460, 300, 0x233b31, 0.92).setStrokeStyle(4, 0x8a6a40);
    this.menu = new Menu(this, W / 2 - 170, 360, [
      { label: 'New Game', onSelect: () => this.newGame() },
      { label: 'Continue', disabled: !Save.hasProgress(), onSelect: () => this.scene.start('WorldMap') },
      { label: 'Options', onSelect: () => this.scene.start('Options', { back: 'Title' }) },
      { label: 'Gallery', onSelect: () => this.scene.start('Gallery') },
      { label: 'Credits', onSelect: () => this.scene.start('Credits') },
    ], { gap: 52, fontSize: 32 });
  }

  private newGame(): void {
    Save.reset();
    this.registry.set(RUN_KEY, newRun(FIRST_LEVEL));
    this.scene.start('Intro');
  }
}
