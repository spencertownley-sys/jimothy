import Phaser from 'phaser';
import { CONFIG } from '../config';
import { AudioManager } from '../core/audio/AudioManager';
import { Haptics } from '../core/haptics';
import { getInput } from '../core/input';
import { Save } from '../core/save/Save';
import { Menu } from '../ui/Menu';
import { COLORS, uiText } from '../ui/text';

interface OptionsData {
  back: string;
  levelId?: string;
  resumeGame?: boolean;
}

export class OptionsScene extends Phaser.Scene {
  private menu!: Menu;
  private input_ = getInput().state;
  private data_!: OptionsData;

  constructor() {
    super({ key: 'Options' });
  }

  create(data: OptionsData): void {
    this.data_ = data;
    const W = CONFIG.WIDTH;
    const H = CONFIG.HEIGHT;
    this.cameras.main.setBackgroundColor(COLORS.cedar);
    this.add.rectangle(W / 2, H / 2, 820, 560, 0x233b31, 0.95).setStrokeStyle(6, 0x8a6a40);
    uiText(this, W / 2, 110, 'OPTIONS', { fontSize: 44, color: COLORS.amber }).setOrigin(0.5);
    const o = Save.get().options;
    const step = (v: number, d: number): number => Math.round(Phaser.Math.Clamp(v + d, 0, 1) * 10) / 10;
    const pct = (v: number): string => `${'▮'.repeat(Math.round(v * 10))}${'▯'.repeat(10 - Math.round(v * 10))}`;
    const onOff = (v: boolean): string => (v ? 'On' : 'Off');
    const commit = (): void => {
      Save.commit();
      AudioManager.applyVolumes();
      getInput().refreshFromSave();
    };
    this.menu = new Menu(this, W / 2 - 340, 172, [
      { label: 'Music', value: () => pct(o.musicVol), onLeft: () => { o.musicVol = step(o.musicVol, -0.1); commit(); }, onRight: () => { o.musicVol = step(o.musicVol, 0.1); commit(); } },
      { label: 'Sound', value: () => pct(o.sfxVol), onLeft: () => { o.sfxVol = step(o.sfxVol, -0.1); commit(); }, onRight: () => { o.sfxVol = step(o.sfxVol, 0.1); commit(); } },
      { label: 'Timer', value: () => onOff(o.showTimer), onLeft: () => { o.showTimer = !o.showTimer; commit(); }, onRight: () => { o.showTimer = !o.showTimer; commit(); } },
      { label: 'Drizzle', value: () => onOff(o.drizzle), onLeft: () => { o.drizzle = !o.drizzle; commit(); }, onRight: () => { o.drizzle = !o.drizzle; commit(); } },
      { label: 'Reduce motion', value: () => onOff(o.reduceMotion), onLeft: () => { o.reduceMotion = !o.reduceMotion; commit(); }, onRight: () => { o.reduceMotion = !o.reduceMotion; commit(); } },
      { label: 'Vibration', value: () => onOff(o.haptics), onLeft: () => { o.haptics = !o.haptics; commit(); if (o.haptics) Haptics.pulse('bump'); }, onRight: () => { o.haptics = !o.haptics; commit(); if (o.haptics) Haptics.pulse('bump'); } },
      { label: 'Gamepad', value: () => (o.gamepadPreset === 'modern' ? 'Modern (A = jump)' : 'Classic (↑ = jump)'), onLeft: () => { o.gamepadPreset = o.gamepadPreset === 'classic' ? 'modern' : 'classic'; commit(); }, onRight: () => { o.gamepadPreset = o.gamepadPreset === 'classic' ? 'modern' : 'classic'; commit(); } },
      { label: 'Back', onSelect: () => this.back() },
    ], { gap: 44, fontSize: 26, width: 680 });
    this.menu.onCancel = () => this.back();
    uiText(this, W / 2, H - 70, 'Key remapping arrives in v1.1', { fontSize: 16, color: COLORS.mist, display: false }).setOrigin(0.5);
    this.input_.reset();
  }

  override update(): void {
    this.input_.update();
    this.menu.update(this.input_);
  }

  private back(): void {
    if (this.data_.resumeGame) {
      this.scene.stop();
      this.scene.launch('Pause', { levelId: this.data_.levelId });
      return;
    }
    this.scene.start(this.data_.back);
  }
}
