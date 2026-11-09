import Phaser from 'phaser';
import { CONFIG } from '../config';
import { AudioManager } from '../core/audio/AudioManager';
import { Haptics } from '../core/haptics';
import { getInput } from '../core/input';
import { levelById } from '../levels/LevelDef';
import { Autopilot } from '../review/Autopilot';
import { routeFor } from '../review/routes';
import { COLORS, uiText } from '../ui/text';
import { REVIEW_EVENTS, type GameScene, type ReviewBeat } from './GameScene';

export interface ReviewSceneData {
  levelId: string;
  /** where ✕ goes: the review menu (default), or back into the level at its last checkpoint */
  back?: 'menu' | 'game';
}

interface TimedBeat extends ReviewBeat {
  step: number;
}

const STEP_MS = 1000 / CONFIG.FIXED_FPS;
/** The review never runs longer than this (a broken route still ends). */
const MAX_STEPS = CONFIG.FIXED_FPS * 60 * 6;
/** Seeking to a beat lands this many steps before it, so you see the approach. */
const BEAT_LEAD_STEPS = 75;
/** Beats closer together than this are one stop for ◀◀ / ▶▶. */
const BEAT_MERGE_STEPS = 45;
const SKIP_STEPS = CONFIG.FIXED_FPS * 3;
/** ms of sim per rendered frame while charting / seeking (keeps the page responsive) */
const SEEK_BUDGET_MS = 14;
const SPEEDS = [0.25, 0.5, 1, 2, 4] as const;
const BEAT_COLORS: Record<ReviewBeat['kind'], number> = {
  checkpoint: 0x5e8c5a, geoduck: 0xff6f61, powerup: 0xf2b35b, block: 0xf2b35b, stomp: 0xb8c9ce,
  door: 0xb8c9ce, boss: 0xff6f61, clear: 0x5e8c5a, rescue: 0xd04a3a, note: 0xf4efe6,
};

/**
 * Route review: watch Jimothy play a level the way it's meant to be played, and scrub through
 * it. The real level runs (enemies, platforms, geysers) with Jimothy in god mode, driven by an
 * autopilot (src/review/routes.ts).
 *
 * This scene steps the Game scene itself, one fixed step at a time, so a run replays exactly:
 * going back restarts the level and fast-forwards to the earlier step. On entry the whole route
 * is charted once (fast-forward to the end) to lay out the timeline.
 */
export class ReviewScene extends Phaser.Scene {
  private levelId = '';
  private back: 'menu' | 'game' = 'menu';
  private gs?: GameScene;
  private pilot?: Autopilot;
  private step = 0;
  private ended = false;
  private ready = false;
  private charting = true;
  private totalSteps = 0;
  private beats: TimedBeat[] = [];
  private stops: TimedBeat[] = [];
  private trail: { x: number; y: number }[] = [];
  private seekTarget = -1;
  private playing = true;
  private speedIndex = 2;
  private acc = 0;
  private input_ = getInput().state;
  private trailGfx?: Phaser.GameObjects.Graphics;

  private ui!: {
    title: Phaser.GameObjects.Text;
    caption: Phaser.GameObjects.Text;
    next: Phaser.GameObjects.Text;
    status: Phaser.GameObjects.Text;
    time: Phaser.GameObjects.Text;
    play: Phaser.GameObjects.Text;
    speed: Phaser.GameObjects.Text;
    bar: Phaser.GameObjects.Rectangle;
    fill: Phaser.GameObjects.Rectangle;
    head: Phaser.GameObjects.Rectangle;
    ticks: Phaser.GameObjects.Graphics;
    veil: Phaser.GameObjects.Rectangle;
  };

  constructor() {
    super({ key: 'Review' });
  }

  create(data: ReviewSceneData): void {
    this.levelId = data.levelId;
    this.back = data.back ?? 'menu';
    this.step = 0;
    this.ended = false;
    this.ready = false;
    this.charting = true;
    this.totalSteps = 0;
    this.beats = [];
    this.stops = [];
    this.trail = [];
    this.seekTarget = -1;
    this.playing = true;
    this.acc = 0;
    this.input_.reset();
    Haptics.muted = true;
    this.buildUi();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      AudioManager.quiet = false;
      Haptics.muted = false;
      this.input.keyboard?.off('keydown-ESC', this.exit, this);
    });
    this.input.keyboard?.on('keydown-ESC', this.exit, this);
    this.startLevel();
  }

  /** test hook (Playwright): where the review is at */
  status(): { charting: boolean; seeking: boolean; step: number; total: number; ended: boolean; playing: boolean; beats: TimedBeat[]; x: number; y: number } {
    const p = this.gs?.player;
    return {
      charting: this.charting, seeking: this.seekTarget >= 0, step: this.step, total: this.totalSteps, ended: this.ended,
      playing: this.playing, beats: this.beats, x: p?.x ?? 0, y: p?.y ?? 0,
    };
  }

  // --- the level -------------------------------------------------------------------------------

  /** (Re)start the level from step 0. Charting, rewinds and replays all start here. */
  private startLevel(): void {
    this.ready = false;
    const game = this.scene.get('Game') as GameScene;
    game.events.once(Phaser.Scenes.Events.CREATE, () => this.onLevelCreated(game));
    if (this.scene.isActive('Game') || this.scene.isPaused('Game')) game.scene.restart({ levelId: this.levelId, review: true });
    else this.scene.launch('Game', { levelId: this.levelId, review: true });
  }

  private onLevelCreated(game: GameScene): void {
    // from here on this scene, not the scene manager, decides when the level advances
    this.scene.pause('Game');
    this.scene.bringToTop();
    this.gs = game;
    this.pilot = new Autopilot(routeFor(this.levelId));
    this.step = 0;
    this.ended = false;
    this.acc = 0;
    game.events.on(REVIEW_EVENTS.BEAT, this.onBeat, this);
    game.events.once(REVIEW_EVENTS.END, this.onEnd, this);
    game.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      game.events.off(REVIEW_EVENTS.BEAT, this.onBeat, this);
      game.events.off(REVIEW_EVENTS.END, this.onEnd, this);
    });
    this.trailGfx = game.add.graphics().setDepth(9);
    this.drawTrail();
    this.ready = true;
  }

  private onBeat(b: ReviewBeat): void {
    if (this.charting) this.beats.push({ ...b, step: this.step });
  }

  private onEnd(): void {
    this.ended = true;
  }

  /** Advance the level exactly one fixed step. */
  private advance(): void {
    const gs = this.gs;
    if (!gs || !this.pilot || this.ended) return;
    gs.reviewPad.snap = { ...this.pilot.next(gs) };
    gs.sys.step(this.step * STEP_MS, this.frameMs(gs));
    this.step += 1;
    if (this.charting && this.step % 3 === 0 && gs.player) this.trail.push({ x: gs.player.x, y: gs.player.y });
    if (this.step >= MAX_STEPS) this.ended = true;
  }

  /** The physics world's own step length: exactly one fixed step per call, no float drift. */
  private frameMs(gs: GameScene): number {
    return (gs.physics.world as unknown as { _frameTimeMS?: number })._frameTimeMS ?? STEP_MS;
  }

  // --- frame loop ------------------------------------------------------------------------------

  override update(_time: number, delta: number): void {
    this.input_.update();
    if (!this.ready) return;
    if (this.charting) {
      this.runFor(() => !this.ended);
      if (this.ended) this.finishCharting();
      this.refreshUi();
      return;
    }
    if (this.seekTarget >= 0) {
      this.runFor(() => this.step < this.seekTarget && !this.ended);
      if (this.step >= this.seekTarget || this.ended) {
        this.seekTarget = -1;
        AudioManager.quiet = false;
      }
      this.refreshUi();
      return;
    }
    this.handleInput();
    if (this.playing && !this.ended) {
      this.acc += Math.min(delta, 100) * SPEEDS[this.speedIndex];
      while (this.acc >= STEP_MS && !this.ended) {
        this.acc -= STEP_MS;
        this.advance();
      }
    }
    this.refreshUi();
  }

  /** Fast-forward within this frame's time budget. */
  private runFor(more: () => boolean): void {
    AudioManager.quiet = true;
    const t0 = performance.now();
    while (more() && performance.now() - t0 < SEEK_BUDGET_MS) this.advance();
  }

  private finishCharting(): void {
    this.charting = false;
    this.totalSteps = Math.max(1, this.step);
    this.beats.sort((a, b) => a.step - b.step);
    this.beats.unshift({ kind: 'note', text: 'Start', step: 0 });
    // one stop per cluster of beats, so ◀◀ / ▶▶ never feel stuck
    this.stops = [];
    for (const b of this.beats) {
      const last = this.stops[this.stops.length - 1];
      if (!last || b.step - last.step > BEAT_MERGE_STEPS) this.stops.push(b);
    }
    this.drawTicks();
    // back to the start for playback
    this.startLevel();
    AudioManager.quiet = false;
  }

  // --- seeking ---------------------------------------------------------------------------------

  private seek(target: number): void {
    if (this.charting) return;
    const t = Phaser.Math.Clamp(Math.round(target), 0, this.totalSteps);
    if (t === this.step) return;
    if (t < this.step) {
      this.startLevel();
      this.step = 0;
    }
    this.seekTarget = t;
    AudioManager.quiet = true;
  }

  private stopIndexAt(step: number): number {
    let i = 0;
    for (let k = 0; k < this.stops.length; k++) if (Math.max(0, this.stops[k].step - BEAT_LEAD_STEPS) <= step + 1) i = k;
    return i;
  }

  private nextBeat(): void {
    const target = this.stops.find((b) => Math.max(0, b.step - BEAT_LEAD_STEPS) > this.step + 1);
    if (target) this.seek(Math.max(0, target.step - BEAT_LEAD_STEPS));
    else this.seek(this.totalSteps);
  }

  private prevBeat(): void {
    let i = this.stopIndexAt(this.step);
    // just past a stop's mark: ◀◀ goes to the one before, like a music player
    if (this.step - Math.max(0, this.stops[i].step - BEAT_LEAD_STEPS) < 40 && i > 0) i -= 1;
    this.seek(Math.max(0, this.stops[i].step - BEAT_LEAD_STEPS));
  }

  private togglePlay(): void {
    if (this.ended) {
      this.seek(0);
      this.playing = true;
      return;
    }
    this.playing = !this.playing;
  }

  private changeSpeed(d: number): void {
    this.speedIndex = Phaser.Math.Clamp(this.speedIndex + d, 0, SPEEDS.length - 1);
  }

  private handleInput(): void {
    const i = this.input_;
    if (i.justPressed('right')) this.nextBeat();
    else if (i.justPressed('left')) this.prevBeat();
    else if (i.justPressed('start')) this.togglePlay();
    else if (i.justPressed('jump')) this.changeSpeed(1);
    else if (i.justPressed('down')) this.changeSpeed(-1);
    else if (i.justPressed('a')) this.seek(this.step - SKIP_STEPS);
    else if (i.justPressed('b')) this.seek(this.step + SKIP_STEPS);
  }

  private exit(): void {
    AudioManager.quiet = false;
    Haptics.muted = false;
    AudioManager.sfx('menu_back');
    this.scene.stop('HUD');
    this.scene.stop('Game');
    if (this.back === 'game') this.scene.start('Game', { levelId: this.levelId });
    else this.scene.start('ReviewMenu', { focus: this.levelId });
  }

  // --- drawing ---------------------------------------------------------------------------------

  /** The route as a dotted line through the level, with a flag at every beat. */
  private drawTrail(): void {
    const g = this.trailGfx;
    if (!g || this.trail.length === 0) return;
    g.clear();
    let last: { x: number; y: number } | undefined;
    for (const p of this.trail) {
      if (last && Phaser.Math.Distance.Between(last.x, last.y, p.x, p.y) < 16) continue;
      g.fillStyle(0x1c2426, 0.55).fillCircle(p.x, p.y - 24, 5);
      g.fillStyle(0xf2b35b, 0.9).fillCircle(p.x, p.y - 24, 3);
      last = p;
    }
    for (const b of this.beats) {
      const p = this.trail[Math.min(this.trail.length - 1, Math.floor(b.step / 3))];
      if (!p || b.step === 0) continue;
      g.fillStyle(0x1c2426, 0.8).fillCircle(p.x, p.y - 24, 9);
      g.fillStyle(BEAT_COLORS[b.kind], 1).fillCircle(p.x, p.y - 24, 6);
    }
  }

  private buildUi(): void {
    const W = CONFIG.WIDTH;
    const H = CONFIG.HEIGHT;
    const def = levelById(this.levelId);
    const veil = this.add.rectangle(W / 2, H / 2, W, H, 0x10201c, 0.55).setDepth(0);
    this.add.rectangle(W - 16, 16, 470, 46, 0x1c2426, 0.7).setOrigin(1, 0).setStrokeStyle(2, 0x8a6a40);
    const title = uiText(this, W - 30, 39, `ROUTE REVIEW  ·  ${this.levelId} ${def?.name ?? ''}`, { fontSize: 20, color: COLORS.amber }).setOrigin(1, 0.5);
    this.add.rectangle(0, H - 132, W, 132, 0x1c2426, 0.78).setOrigin(0, 0);
    const caption = uiText(this, 32, H - 112, '', { fontSize: 24, color: COLORS.paper }).setOrigin(0, 0.5);
    const next = uiText(this, W - 32, H - 112, '', { fontSize: 17, color: COLORS.mist, display: false }).setOrigin(1, 0.5);
    const barY = H - 80;
    const bar = this.add.rectangle(32, barY, W - 64, 12, 0x3a4a46).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
    const fill = this.add.rectangle(32, barY, 0, 12, 0xf2b35b).setOrigin(0, 0.5);
    const ticks = this.add.graphics();
    const head = this.add.rectangle(32, barY, 6, 26, 0xf4efe6).setOrigin(0.5);
    bar.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (this.charting) return;
      this.seek(((ptr.x - 32) / (W - 64)) * this.totalSteps);
    });
    const status = uiText(this, W / 2, H / 2, 'Charting the route…', { fontSize: 34, color: COLORS.amber }).setOrigin(0.5);
    const y = H - 34;
    const btn = (x: number, label: string, onTap: () => void, w = 92): Phaser.GameObjects.Text => {
      const bg = this.add.rectangle(x, y, w, 44, 0x2c3e38).setStrokeStyle(2, 0x8a6a40).setInteractive({ useHandCursor: true });
      const t = uiText(this, x, y, label, { fontSize: 20, color: COLORS.paper }).setOrigin(0.5);
      bg.on('pointerdown', () => {
        if (!this.charting) onTap();
      });
      return t;
    };
    btn(W / 2 - 250, '⏮ beat', () => this.prevBeat());
    btn(W / 2 - 150, '◀ 3s', () => this.seek(this.step - SKIP_STEPS));
    const play = btn(W / 2 - 50, '❚❚', () => this.togglePlay(), 92);
    btn(W / 2 + 50, '3s ▶', () => this.seek(this.step + SKIP_STEPS));
    btn(W / 2 + 150, 'beat ⏭', () => this.prevBeatOrNext(1));
    const speed = btn(W / 2 + 260, '1×', () => this.changeSpeed(this.speedIndex >= SPEEDS.length - 1 ? -(SPEEDS.length - 1) : 1), 80);
    btn(W - 70, '✕ exit', () => this.exit(), 100);
    const time = uiText(this, 32, y, '', { fontSize: 18, color: COLORS.mist, display: false }).setOrigin(0, 0.5);
    uiText(this, W - 30, 80, '← → beats  ·  ↑ ↓ speed  ·  Space play/pause  ·  A / S  ∓3 s  ·  Esc exit', { fontSize: 15, color: COLORS.mist, display: false }).setOrigin(1, 0.5);
    this.ui = { title, caption, next, status, time, play, speed, bar, fill, head, ticks, veil };
  }

  /** ⏭ button (kept separate so a tap during charting is ignored). */
  private prevBeatOrNext(d: 1 | -1): void {
    if (d > 0) this.nextBeat();
    else this.prevBeat();
  }

  private drawTicks(): void {
    const g = this.ui.ticks;
    const W = CONFIG.WIDTH - 64;
    const y = CONFIG.HEIGHT - 80;
    g.clear();
    for (const b of this.beats) {
      if (b.step === 0) continue;
      const x = 32 + (b.step / this.totalSteps) * W;
      g.fillStyle(0x1c2426, 1).fillRect(x - 3, y - 11, 6, 22);
      g.fillStyle(BEAT_COLORS[b.kind], 1).fillRect(x - 2, y - 10, 4, 20);
    }
  }

  private refreshUi(): void {
    const ui = this.ui;
    const fmt = (steps: number): string => {
      const s = Math.floor((steps * STEP_MS) / 1000);
      return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    };
    if (this.charting) {
      ui.status.setText(`Charting the route…  ${fmt(this.step)}`).setVisible(true);
      ui.veil.setVisible(true);
      ui.caption.setText('');
      ui.next.setText('');
      ui.time.setText('');
      return;
    }
    const seeking = this.seekTarget >= 0;
    ui.veil.setVisible(seeking);
    ui.status.setText(this.seekTarget >= 0 ? (this.seekTarget < this.step ? '⏪' : '⏩') : '').setVisible(seeking);
    const W = CONFIG.WIDTH - 64;
    const u = Math.min(1, this.step / this.totalSteps);
    ui.fill.width = W * u;
    ui.head.x = 32 + W * u;
    ui.time.setText(`${fmt(this.step)} / ${fmt(this.totalSteps)}`);
    ui.play.setText(this.ended ? '↺' : this.playing ? '❚❚' : '▶');
    ui.speed.setText(`${SPEEDS[this.speedIndex]}×`);
    // caption: the latest beat he's reached; and what's coming up
    let cur: TimedBeat | undefined;
    let upcoming: TimedBeat | undefined;
    for (const b of this.beats) {
      if (b.step <= this.step) cur = b;
      else if (!upcoming) upcoming = b;
    }
    const prefix = cur && cur.kind !== 'note' ? `${KIND_LABEL[cur.kind]}  ` : '';
    ui.caption.setText(cur ? `${prefix}${cur.text}` : '');
    ui.next.setText(upcoming ? `next: ${upcoming.text}` : this.ended ? 'end of the route' : '');
  }
}

const KIND_LABEL: Record<ReviewBeat['kind'], string> = {
  checkpoint: '☕', geoduck: '🐚', powerup: '★', block: '?', stomp: '⤓', door: '🚪', boss: '‼', clear: '🎟', rescue: '⚠', note: '',
};
