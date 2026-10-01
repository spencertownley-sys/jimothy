import Phaser from 'phaser';
import { CONFIG } from '../config';
import { getInput } from '../core/input';
import { Save } from '../core/save/Save';
import { COLORS, uiText } from '../ui/text';

const CREDITS = [
  'JIMOTHY: A Seattle Story',
  '',
  'Design, art direction & words — Spencer Townley',
  'Concept art — Higgsfield (nano_banana_pro)',
  'Engine — Phaser 3 · Built with Claude Code',
  'Placeholder music & sound — synthesized in-game',
  '',
  'Jimothy is a real, wild raccoon. Please admire from a distance.',
  'Wildlife tip: if you see him, leave him be — WDFW says so too.',
  '',
  'Unofficial fan game. Not affiliated with any person, business,',
  'or the City of Seattle. No real brands depicted.',
  '',
  'Praise Jimothy.',
];

export class CreditsScene extends Phaser.Scene {
  private input_ = getInput().state;

  constructor() {
    super({ key: 'Credits' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.cedar);
    uiText(this, CONFIG.WIDTH / 2, 70, 'CREDITS', { fontSize: 44, color: COLORS.amber }).setOrigin(0.5);
    uiText(this, CONFIG.WIDTH / 2, 150, CREDITS.join('\n'), { fontSize: 22, align: 'center', display: false }).setOrigin(0.5, 0);
    uiText(this, CONFIG.WIDTH / 2, CONFIG.HEIGHT - 40, 'any button to go back', { fontSize: 16, color: COLORS.mist, display: false }).setOrigin(0.5);
    this.input_.reset();
  }

  override update(): void {
    this.input_.update();
    if (this.input_.justPressed('a') || this.input_.justPressed('b') || this.input_.justPressed('start')) this.scene.start('Title');
  }
}

export class GalleryScene extends Phaser.Scene {
  private input_ = getInput().state;

  constructor() {
    super({ key: 'Gallery' });
  }

  create(): void {
    const W = CONFIG.WIDTH;
    this.cameras.main.setBackgroundColor(COLORS.cedar);
    uiText(this, W / 2, 70, 'GALLERY', { fontSize: 44, color: COLORS.amber }).setOrigin(0.5);
    const n = Save.totalGeoducks();
    uiText(this, W / 2, 140, `Geoducks found: ${n}`, { fontSize: 28 }).setOrigin(0.5);
    const cards = [
      ['The Stump', 1, 'Where it all started. A cedar, a raccoon, a development notice.'],
      ['Built Different', 2, 'Short spine, long legs, zero neck, infinite dignity.'],
      ['Welcome to Ballard', 3, 'The 44 bus has seen things.'],
    ] as const;
    cards.forEach(([title, need, blurb], i) => {
      const y = 230 + i * 120;
      const unlocked = n >= need;
      this.add.rectangle(W / 2, y, 760, 100, unlocked ? 0x233b31 : 0x1c2426, 0.9).setStrokeStyle(3, unlocked ? 0x8a6a40 : 0x3a3633);
      uiText(this, W / 2 - 360, y - 22, unlocked ? title : '???', { fontSize: 26, color: unlocked ? COLORS.amber : COLORS.mist }).setOrigin(0, 0.5);
      uiText(this, W / 2 - 360, y + 18, unlocked ? blurb : `Find ${need} geoduck${need > 1 ? 's' : ''} to unlock`, { fontSize: 18, display: false }).setOrigin(0, 0.5);
    });
    uiText(this, W / 2, CONFIG.HEIGHT - 40, 'any button to go back', { fontSize: 16, color: COLORS.mist, display: false }).setOrigin(0.5);
    this.input_.reset();
  }

  override update(): void {
    this.input_.update();
    if (this.input_.justPressed('a') || this.input_.justPressed('b') || this.input_.justPressed('start')) this.scene.start('Title');
  }
}
