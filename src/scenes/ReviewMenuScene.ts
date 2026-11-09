import Phaser from 'phaser';
import { CONFIG } from '../config';
import { getInput } from '../core/input';
import { LEVELS } from '../levels/LevelDef';
import { ROUTES } from '../review/routes';
import { Menu } from '../ui/Menu';
import { COLORS, uiText } from '../ui/text';

/** Pick a level to watch in the route review. Every built level is listed, locked or not. */
export class ReviewMenuScene extends Phaser.Scene {
  private menu!: Menu;
  private input_ = getInput().state;

  constructor() {
    super({ key: 'ReviewMenu' });
  }

  create(data: { focus?: string } = {}): void {
    const W = CONFIG.WIDTH;
    const H = CONFIG.HEIGHT;
    this.input_.reset();
    if (this.textures.exists('bg:title')) this.add.image(W / 2, H / 2, 'bg:title').setAlpha(0.35);
    this.cameras.main.setBackgroundColor(COLORS.cedar);
    uiText(this, W / 2, 56, 'ROUTE REVIEW', { fontSize: 48, color: COLORS.amber }).setOrigin(0.5);
    uiText(this, W / 2, 104, 'Watch each level played the intended way. Jimothy can’t lose a life here.', { fontSize: 20, color: COLORS.mist, display: false }).setOrigin(0.5);
    const levels = LEVELS.filter((l) => l.file);
    const items = levels.map((l) => ({
      label: `${l.id}  ${l.name}${ROUTES[l.id] ? '' : '  (no route yet)'}`,
      onSelect: () => this.scene.start('Review', { levelId: l.id }),
    }));
    items.push({ label: 'Back', onSelect: () => this.scene.start('Title') });
    this.add.rectangle(W / 2, H / 2 + 60, 640, 520, 0x233b31, 0.92).setStrokeStyle(4, 0x8a6a40);
    this.menu = new Menu(this, W / 2 - 280, 190, items, { gap: 46, fontSize: 26, width: 560 });
    this.menu.onCancel = () => this.scene.start('Title');
    const i = levels.findIndex((l) => l.id === data.focus);
    if (i > 0) this.menu.setIndex(i);
  }

  override update(): void {
    this.input_.update();
    this.menu.update(this.input_);
  }
}
