import Phaser from 'phaser';
import { CONFIG } from '../config';
import { bus, EV, type HudState } from '../core/events';
import { Save } from '../core/save/Save';
import { COLORS, uiText } from '../ui/text';

/** Runs in parallel over GameScene. Paw hearts, latte count, geoduck silhouettes, optional timer. */
export class HUDScene extends Phaser.Scene {
  private hearts: Phaser.GameObjects.Image[] = [];
  private latteText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private ducks: Phaser.GameObjects.Image[] = [];
  private timer!: Phaser.GameObjects.Text;
  private toastText!: Phaser.GameObjects.Text;
  private powerIcon!: Phaser.GameObjects.Image;
  private onUpdate = (s: HudState): void => this.apply(s);
  private onToast = (t: string): void => this.toast(t);
  private onPower = (kind: string): void => this.flashPower(kind);

  constructor() {
    super({ key: 'HUD' });
  }

  create(): void {
    this.add.rectangle(24, 24, 300, 120, 0x1c2426, 0.35).setOrigin(0);
    this.hearts = [0, 1, 2].map((i) => this.add.image(48 + i * 40, 50, 'ui', 'heart_full'));
    this.add.image(48, 100, 'items', 'latte').setScale(0.8);
    this.latteText = uiText(this, 72, 100, '×00', { fontSize: 26, color: COLORS.paper }).setOrigin(0, 0.5);
    this.ducks = [0, 1, 2].map((i) => this.add.image(170 + i * 50, 100, 'ui', 'geoduck_silhouette').setScale(0.75));
    this.livesText = uiText(this, 300, 50, '', { fontSize: 20, color: COLORS.mist, display: false }).setOrigin(1, 0.5);
    this.powerIcon = this.add.image(290, 100, 'items', 'teriyaki').setScale(0.7).setAlpha(0);
    this.timer = uiText(this, CONFIG.WIDTH - 24, 36, '', { fontSize: 26, color: COLORS.paper }).setOrigin(1, 0.5);
    this.toastText = uiText(this, CONFIG.WIDTH / 2, 60, '', { fontSize: 36, color: COLORS.amber }).setOrigin(0.5).setAlpha(0);
    bus.on(EV.HUD_UPDATE, this.onUpdate);
    bus.on(EV.HUD_TOAST, this.onToast);
    bus.on(EV.HUD_POWER, this.onPower);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      bus.off(EV.HUD_UPDATE, this.onUpdate);
      bus.off(EV.HUD_TOAST, this.onToast);
      bus.off(EV.HUD_POWER, this.onPower);
    });
  }

  private apply(s: HudState): void {
    this.hearts.forEach((h, i) => h.setFrame(i < s.hearts ? 'heart_full' : 'heart_empty'));
    this.latteText.setText(`×${String(s.lattes).padStart(2, '0')}`);
    this.livesText.setText(`🦝 ×${s.lives}`);
    this.ducks.forEach((d, i) => {
      if (s.geoducks[i]) d.setTexture('items', 'geoduck').setAlpha(1);
      else d.setTexture('ui', 'geoduck_silhouette').setAlpha(0.8);
    });
    if (Save.get().options.showTimer) {
      const ms = s.timeMs;
      this.timer.setText(`${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}.${Math.floor((ms % 1000) / 100)}`);
    } else this.timer.setText('');
  }

  private toast(text: string): void {
    this.toastText.setText(text).setAlpha(1).setScale(0.8);
    this.tweens.killTweensOf(this.toastText);
    this.tweens.add({ targets: this.toastText, scale: 1, duration: 200, ease: 'Back.out' });
    this.tweens.add({ targets: this.toastText, alpha: 0, delay: 1000, duration: 300 });
  }

  private flashPower(kind: string): void {
    const frame = this.textures.get('items').has(kind) ? kind : 'latte';
    this.powerIcon.setFrame(frame).setAlpha(1).setScale(0.4);
    this.tweens.killTweensOf(this.powerIcon);
    this.tweens.add({ targets: this.powerIcon, scale: 0.8, duration: 200, ease: 'Back.out' });
    this.tweens.add({ targets: this.powerIcon, alpha: 0, delay: 400, duration: 300 });
  }
}
