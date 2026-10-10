import Phaser from 'phaser';
import { CONFIG } from '../config';
import { AudioManager } from '../core/audio/AudioManager';
import { getInput } from '../core/input';
import { newRun, RUN_KEY, type RunState } from '../core/run';
import { Save } from '../core/save/Save';
import { FIRST_LEVEL } from '../core/save/SaveV1';
import { STORIES } from '../data/stories';
import { mapLevels, type LevelDef } from '../levels/LevelDef';
import { COLORS, uiText } from '../ui/text';

interface MapData {
  toast?: string;
  focus?: string;
  /** level just cleared: the 44 bus drives from here to `focus` */
  from?: string;
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

    // World 1 shows only Ballard: the neighbourhood, the Locks and Golden Gardens.
    if (this.textures.exists('bg:map_ballard')) this.add.image(W / 2, H / 2, 'bg:map_ballard');
    else if (this.textures.exists('bg:worldmap')) this.add.image(W / 2, H / 2, 'bg:worldmap');
    else this.cameras.main.setBackgroundColor(COLORS.cedar);
    uiText(this, W / 2, 46, 'WORLD 1  ·  BALLARD', { fontSize: 40, color: COLORS.amber }).setOrigin(0.5).setStroke(COLORS.ink, 8);

    // the 44's route between stops: cream dashes on a dark outline so they read over the houses
    const g = this.add.graphics();
    for (const [width, color, alpha] of [[9, 0x1c2426, 0.55], [5, 0xf4efe6, 0.95]] as const) {
      g.lineStyle(width, color, alpha);
      for (let i = 0; i < this.levels.length - 1; i++) {
        const a = this.levels[i].map!;
        const b = this.levels[i + 1].map!;
        const steps = Math.max(8, Math.round(Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y) / 22));
        for (let s = 1; s < steps - 1; s += 2) {
          const p0 = s / steps;
          const p1 = (s + 1) / steps;
          g.lineBetween(a.x + (b.x - a.x) * p0, a.y + (b.y - a.y) * p0, a.x + (b.x - a.x) * p1, a.y + (b.y - a.y) * p1);
        }
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
      uiText(this, lvl.map!.x, lvl.map!.y + 44, `${lvl.id}  ${lvl.name}`, { fontSize: 20 }).setOrigin(0.5).setStroke(COLORS.ink, 5);
      if (!lvl.file) uiText(this, lvl.map!.x, lvl.map!.y + 68, 'coming soon', { fontSize: 15, color: COLORS.paper, display: false }).setOrigin(0.5).setStroke(COLORS.ink, 4);
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
    const from = data?.from ? this.levels.find((l) => l.id === data.from) : undefined;
    if (from?.map && from !== this.levels[this.index]) this.rideBus(from.map, this.levels[this.index].map!);
    AudioManager.music('title');
    if (data?.toast) this.toast(data.toast);
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

  /** The 44 bus carries Jimothy along the route to the next stop after a level clear. */
  private rideBus(a: { x: number; y: number }, b: { x: number; y: number }): void {
    this.busy = true;
    this.cursor.setVisible(false);
    const bus = this.add.image(a.x, a.y, 'blocks', 'bus').setOrigin(0.5, 1).setScale(0.36).setDepth(6);
    bus.setFlipX(b.x < a.x);
    this.tweens.add({
      targets: bus,
      x: b.x,
      y: b.y - 6,
      delay: 500,
      duration: 1900,
      ease: 'Sine.inOut',
      onUpdate: () => bus.setAngle(Math.sin(this.time.now / 70) * 2),
      onComplete: () => {
        AudioManager.sfx('menu_select');
        this.tweens.add({ targets: bus, alpha: 0, duration: 300, onComplete: () => bus.destroy() });
        this.cursor.setVisible(true);
        this.busy = false;
      },
    });
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
    // A level's cutscene plays on the way in until the level has been cleared once.
    const story = STORIES[lvl.id] && !Save.get().cleared.includes(lvl.id) ? lvl.id : undefined;
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      if (story) this.scene.start('Intro', { story, then: { scene: 'Game', data: { levelId: lvl.id } } });
      else this.scene.start('Game', { levelId: lvl.id });
    });
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
