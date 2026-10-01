import Phaser from 'phaser';
import { CONFIG } from '../config';
import { AudioManager } from '../core/audio/AudioManager';
import { getInput } from '../core/input';
import { newRun, RUN_KEY, type RunState } from '../core/run';
import { Save } from '../core/save/Save';
import { FIRST_LEVEL } from '../core/save/SaveV1';
import { mapLevels, type LevelDef } from '../levels/LevelDef';
import { COLORS, uiText } from '../ui/text';
import { wantsTouchControls } from '../ui/TouchControls';

interface MapData {
  toast?: string;
  focus?: string;
}

export class WorldMapScene extends Phaser.Scene {
  private levels: LevelDef[] = [];
  private index = 0;
  private cursor!: Phaser.GameObjects.Image;
  private card!: { name: Phaser.GameObjects.Text; info: Phaser.GameObjects.Text; ducks: Phaser.GameObjects.Image[] };
  private toastText?: Phaser.GameObjects.Text;
  private input_ = getInput().state;
  private busy = false;

  constructor() {
    super({ key: 'WorldMap' });
  }

  create(data: MapData): void {
    const W = CONFIG.WIDTH;
    const H = CONFIG.HEIGHT;
    this.busy = false;
    this.input_.reset();
    this.levels = mapLevels();
    const save = Save.get();
    const focus = data?.focus ?? save.unlocked[save.unlocked.length - 1];
    this.index = Math.max(0, this.levels.findIndex((l) => l.id === focus));
    if (!save.unlocked.includes(this.levels[this.index].id)) this.index = 0;

    if (this.textures.exists('bg:worldmap')) this.add.image(W / 2, H / 2, 'bg:worldmap');
    else this.cameras.main.setBackgroundColor(COLORS.cedar);
    uiText(this, W / 2, 50, 'WORLD 1  ·  BALLARD', { fontSize: 40, color: COLORS.amber }).setOrigin(0.5);

    // dotted route between nodes
    const g = this.add.graphics();
    g.lineStyle(4, 0xf4efe6, 0.7);
    for (let i = 0; i < this.levels.length - 1; i++) {
      const a = this.levels[i].map!;
      const b = this.levels[i + 1].map!;
      const steps = 12;
      for (let s = 0; s < steps; s += 2) {
        const p0 = Phaser.Math.Linear(0, 1, s / steps);
        const p1 = Phaser.Math.Linear(0, 1, (s + 1) / steps);
        g.lineBetween(a.x + (b.x - a.x) * p0, a.y + (b.y - a.y) * p0, a.x + (b.x - a.x) * p1, a.y + (b.y - a.y) * p1);
      }
    }
    for (const lvl of this.levels) {
      const unlocked = save.unlocked.includes(lvl.id);
      const cleared = save.cleared.includes(lvl.id);
      const color = cleared ? 0x5e8c5a : unlocked ? 0xf2b35b : 0x8e8a86;
      const node = this.add.circle(lvl.map!.x, lvl.map!.y, 26, color).setStrokeStyle(5, 0x1c2426);
      node.setInteractive({ useHandCursor: unlocked });
      node.on('pointerdown', () => {
        const i = this.levels.indexOf(lvl);
        if (!save.unlocked.includes(lvl.id)) return;
        if (i === this.index) this.enter();
        else this.moveTo(i);
      });
      uiText(this, lvl.map!.x, lvl.map!.y + 46, lvl.id, { fontSize: 22 }).setOrigin(0.5);
      if (!lvl.file) uiText(this, lvl.map!.x, lvl.map!.y + 70, 'soon', { fontSize: 16, color: COLORS.mist, display: false }).setOrigin(0.5);
    }
    this.cursor = this.add.image(0, 0, 'jimothy', 'small_idle').setOrigin(0.5, 1).setDepth(5);
    this.tweens.add({ targets: this.cursor, y: '-=6', duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    const cardBg = this.add.rectangle(W / 2, H - 80, 700, 120, 0x233b31, 0.92).setStrokeStyle(4, 0x8a6a40);
    void cardBg;
    const name = uiText(this, W / 2 - 320, H - 112, '', { fontSize: 30, color: COLORS.amber }).setOrigin(0, 0.5);
    const info = uiText(this, W / 2 - 320, H - 66, '', { fontSize: 20, color: COLORS.paper, display: false }).setOrigin(0, 0.5);
    const ducks = [0, 1, 2].map((i) => this.add.image(W / 2 + 200 + i * 56, H - 80, 'items', 'geoduck').setScale(0.9));
    this.card = { name, info, ducks };
    uiText(this, W / 2, H - 16, '◀ ▶ choose   ·   A / START enter   ·   B back', { fontSize: 16, color: COLORS.mist, display: false }).setOrigin(0.5);
    this.placeCursor();
    AudioManager.music('title');
    if (data?.toast) this.toast(data.toast);
    if (wantsTouchControls() && !this.scene.isActive('Touch')) this.scene.launch('Touch');
    if (this.scene.isActive('HUD')) this.scene.stop('HUD');
  }

  private placeCursor(): void {
    const lvl = this.levels[this.index];
    this.cursor.setPosition(lvl.map!.x, lvl.map!.y - 20);
    const save = Save.get();
    this.card.name.setText(`${lvl.id}  ${lvl.name}`);
    const best = save.bestTimes[lvl.id];
    const fmt = (ms: number): string => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;
    this.card.info.setText(lvl.file ? (best !== undefined ? `Best ${fmt(best)}  ·  par ${fmt(lvl.par * 1000)}` : `par ${fmt(lvl.par * 1000)}`) : 'Coming soon — more of Seattle is on the way.');
    const found = save.geoducks[lvl.id] ?? [false, false, false];
    this.card.ducks.forEach((d, i) => d.setAlpha(found[i] ? 1 : 0.25));
  }

  private moveTo(i: number): void {
    if (i < 0 || i >= this.levels.length) return;
    if (!Save.get().unlocked.includes(this.levels[i].id)) {
      AudioManager.sfx('menu_back');
      return;
    }
    AudioManager.sfx('menu_move');
    this.index = i;
    this.placeCursor();
  }

  private toast(msg: string): void {
    this.toastText?.destroy();
    this.toastText = uiText(this, CONFIG.WIDTH / 2, 110, msg, { fontSize: 24, color: COLORS.paper }).setOrigin(0.5);
    this.tweens.add({ targets: this.toastText, alpha: 0, delay: 2200, duration: 500 });
  }

  private enter(): void {
    const lvl = this.levels[this.index];
    if (!lvl.file) {
      this.toast('Coming soon — Jimothy is still packing.');
      AudioManager.sfx('menu_back');
      return;
    }
    this.busy = true;
    AudioManager.sfx('menu_select');
    const prev = this.registry.get(RUN_KEY) as RunState | undefined;
    const run = newRun(lvl.id);
    if (prev) {
      run.lives = prev.lives;
      run.lattes = prev.lattes;
      run.power = prev.power;
    }
    const found = Save.get().geoducks[lvl.id] ?? [false, false, false];
    run.geoducksFound = [...found];
    this.registry.set(RUN_KEY, run);
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('Game', { levelId: lvl.id }));
  }

  override update(): void {
    this.input_.update();
    if (this.busy) return;
    if (this.input_.justPressed('right')) this.moveTo(this.index + 1);
    else if (this.input_.justPressed('left')) this.moveTo(this.index - 1);
    else if (this.input_.justPressed('a') || this.input_.justPressed('start')) this.enter();
    else if (this.input_.justPressed('b')) this.scene.start('Title');
    void FIRST_LEVEL;
  }
}
