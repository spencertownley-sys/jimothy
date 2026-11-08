import Phaser from 'phaser';
import { AudioManager } from '../core/audio/AudioManager';
import type { InputState } from '../core/input/InputState';
import { COLORS, uiText } from './text';

export interface MenuItem {
  label: string;
  /** Optional value shown right-aligned (options rows). */
  value?: () => string;
  onLeft?: () => void;
  onRight?: () => void;
  onSelect?: () => void;
  disabled?: boolean;
}

/** Chalkboard-style vertical menu driven only by InputState (keyboard, pad, touch alike). */
export class Menu {
  index = 0;
  private texts: Phaser.GameObjects.Text[] = [];
  private values: Phaser.GameObjects.Text[] = [];
  private underline: Phaser.GameObjects.Rectangle;
  private items: MenuItem[];
  private scene: Phaser.Scene;
  private gap: number;
  private container: Phaser.GameObjects.Container;
  onCancel?: () => void;
  private pointerIndex = -1;

  constructor(scene: Phaser.Scene, x: number, y: number, items: MenuItem[], opts: { gap?: number; fontSize?: number; width?: number } = {}) {
    this.scene = scene;
    this.items = items;
    this.gap = opts.gap ?? 48;
    const fontSize = opts.fontSize ?? 30;
    const width = opts.width ?? 420;
    this.container = scene.add.container(0, 0);
    items.forEach((item, i) => {
      const t = uiText(scene, x, y + i * this.gap, item.label, { fontSize, color: item.disabled ? '#8e8a86' : COLORS.paper });
      t.setOrigin(0, 0.5);
      t.setInteractive({ useHandCursor: !item.disabled });
      t.on('pointerover', () => this.setIndex(i));
      t.on('pointerdown', () => {
        this.setIndex(i);
        this.pointerIndex = i;
      });
      this.texts.push(t);
      const v = uiText(scene, x + width, y + i * this.gap, item.value ? item.value() : '', { fontSize, color: COLORS.amber });
      v.setOrigin(1, 0.5);
      this.values.push(v);
      this.container.add([t, v]);
    });
    this.underline = scene.add.rectangle(x, y + 18, 60, 4, COLORS.amberHex).setOrigin(0, 0.5);
    this.container.add(this.underline);
    this.container.setDepth(5);
    this.setIndex(0);
  }

  setDepth(d: number): void {
    this.container.setDepth(d);
  }

  private setIndex(i: number): void {
    if (i === this.index && this.underline.width > 0) return;
    this.index = i;
    const t = this.texts[i];
    this.scene.tweens.add({ targets: this.underline, x: t.x, y: t.y + 18, width: t.width, duration: 120, ease: 'Back.out' });
    this.texts.forEach((txt, j) => txt.setColor(j === i ? COLORS.amber : this.items[j].disabled ? '#8e8a86' : COLORS.paper));
  }

  refresh(): void {
    this.items.forEach((item, i) => this.values[i].setText(item.value ? item.value() : ''));
  }

  update(input: InputState): void {
    const n = this.items.length;
    if (input.justPressed('down')) {
      AudioManager.sfx('menu_move');
      this.setIndex((this.index + 1) % n);
    } else if (input.justPressed('jump')) {
      AudioManager.sfx('menu_move');
      this.setIndex((this.index - 1 + n) % n);
    }
    const item = this.items[this.index];
    if (input.justPressed('left') && item.onLeft) {
      item.onLeft();
      AudioManager.sfx('menu_move');
      this.refresh();
    } else if (input.justPressed('right') && item.onRight) {
      item.onRight();
      AudioManager.sfx('menu_move');
      this.refresh();
    }
    const selectNow = input.justPressed('a') || input.justPressed('start') || this.pointerIndex === this.index;
    this.pointerIndex = -1;
    if (selectNow) {
      if (item.disabled) {
        AudioManager.sfx('menu_back');
      } else if (item.onSelect) {
        AudioManager.sfx('menu_select');
        item.onSelect();
      } else if (item.onRight) {
        item.onRight();
        this.refresh();
      }
      return;
    }
    if (input.justPressed('b') && this.onCancel) {
      AudioManager.sfx('menu_back');
      this.onCancel();
    }
  }

  destroy(): void {
    this.container.destroy(true);
  }
}
