import Phaser from 'phaser';
import { CONFIG } from '../config';
import { AudioManager } from '../core/audio/AudioManager';
import { getInput } from '../core/input';
import { STORIES, type StoryBeat } from '../data/stories';
import { queueStory } from '../levels/worlds';
import { COLORS, FONT_BODY, uiText } from '../ui/text';

export interface StorySceneData {
  /** key into STORIES; defaults to the opening */
  story?: string;
  /** where to go afterwards (default: the world map) */
  then?: { scene: string; data?: object };
}


const FADE_MS = 550;
const TYPE_MS_PER_CHAR = 28;

/**
 * Story cutscenes: the ~30 s opening, the short scenes before 1-2 and 1-3 and the World 1
 * postcard. A / tap advances a panel, Start skips it all.
 */
export class IntroScene extends Phaser.Scene {
  private index = -1;
  private elapsed = 0;
  private input_ = getInput().state;
  private image?: Phaser.GameObjects.Image;
  private caption!: Phaser.GameObjects.Text;
  private typed = 0;
  private fullText = '';
  private leaving = false;
  private sfxTimers: Phaser.Time.TimerEvent[] = [];
  private tapped = false;

  constructor() {
    super({ key: 'Intro' });
  }

  private beats: StoryBeat[] = [];
  private then: { scene: string; data?: object } = { scene: 'WorldMap' };

  preload(): void {
    const data = this.sys.settings.data as StorySceneData | undefined;
    queueStory(this, data?.story ?? 'opening');
  }

  create(data?: StorySceneData): void {
    const story = STORIES[data?.story ?? 'opening'] ?? STORIES.opening;
    this.beats = story.beats;
    this.then = data?.then ?? { scene: 'WorldMap' };
    const W = CONFIG.WIDTH;
    const H = CONFIG.HEIGHT;
    this.index = -1;
    this.leaving = false;
    this.tapped = false;
    this.input_.reset();
    this.cameras.main.setBackgroundColor(0x0d1a17);
    this.add.rectangle(W / 2, H - 78, W, 156, 0x0d1a17, 0.72).setDepth(10);
    this.caption = this.add
      .text(W / 2, H - 78, '', {
        fontFamily: FONT_BODY,
        fontSize: '30px',
        fontStyle: 'bold',
        color: COLORS.paper,
        align: 'center',
        lineSpacing: 8,
      })
      .setOrigin(0.5)
      .setStroke(COLORS.ink, 5)
      .setResolution(2)
      .setDepth(11);
    uiText(this, W - 22, 22, 'A next  ·  START skip', { fontSize: 16, color: COLORS.mist, display: false }).setOrigin(1, 0).setDepth(12);
    // dots: which panel we're on
    this.dots = this.beats.map((_, i) => this.add.circle(W / 2 - (this.beats.length - 1) * 11 + i * 22, H - 14, 5, 0xf4efe6, 0.3).setDepth(12));
    this.input.on('pointerdown', () => (this.tapped = true));
    this.dots.forEach((d) => d.setVisible(this.beats.length > 1));
    AudioManager.music(story.music);
    this.next();
  }

  private dots: Phaser.GameObjects.Arc[] = [];

  private next(): void {
    this.index++;
    for (const t of this.sfxTimers) t.remove(false);
    this.sfxTimers = [];
    if (this.index >= this.beats.length) {
      this.finish();
      return;
    }
    const beat = this.beats[this.index];
    const W = CONFIG.WIDTH;
    const H = CONFIG.HEIGHT;
    const prev = this.image;
    if (prev) this.tweens.add({ targets: prev, alpha: 0, duration: FADE_MS, onComplete: () => prev.destroy() });

    const key = this.textures.exists(beat.image) ? beat.image : 'bg:title';
    const img = this.add.image(W / 2, H / 2, key).setAlpha(0).setDepth(1 + this.index);
    const cover = Math.max(W / img.width, H / img.height);
    const [z0, z1] = beat.zoom;
    // Ken Burns: scale and drift toward the beat's focus point over the hold time
    const drift = (z: number): { x: number; y: number } => {
      const extraW = img.width * cover * z - W;
      const extraH = img.height * cover * z - H;
      return { x: W / 2 + extraW * (0.5 - beat.focus.x), y: H / 2 + extraH * (0.5 - beat.focus.y) };
    };
    const start = drift(z0);
    const end = drift(z1);
    img.setScale(cover * z0).setPosition(start.x, start.y);
    this.tweens.add({ targets: img, alpha: 1, duration: FADE_MS });
    this.tweens.add({ targets: img, scale: cover * z1, x: end.x, y: end.y, duration: beat.holdMs + FADE_MS, ease: 'Sine.inOut' });
    this.image = img;

    for (const s of beat.sfx ?? []) this.sfxTimers.push(this.time.delayedCall(s.at, () => AudioManager.sfx(s.name)));
    this.fullText = beat.caption;
    this.typed = 0;
    this.caption.setText('');
    this.elapsed = 0;
    this.dots.forEach((d, i) => d.setFillStyle(0xf4efe6, i === this.index ? 1 : 0.3));
  }

  private finish(): void {
    if (this.leaving) return;
    this.leaving = true;
    for (const t of this.sfxTimers) t.remove(false);
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(this.then.scene, this.then.data));
  }

  override update(_t: number, delta: number): void {
    this.input_.update();
    if (this.leaving) return;
    if (this.input_.justPressed('start')) {
      this.finish();
      return;
    }
    const advance = this.input_.justPressed('a') || this.input_.justPressed('jump') || this.tapped;
    this.tapped = false;
    if (advance) {
      // first press finishes the caption, the next one moves on
      if (this.typed < this.fullText.length) this.typed = this.fullText.length;
      else {
        this.next();
        return;
      }
    }
    this.elapsed += delta;
    if (this.typed < this.fullText.length) {
      this.typed = Math.min(this.fullText.length, Math.floor(this.elapsed / TYPE_MS_PER_CHAR));
    }
    if (this.caption.text.length !== this.typed) this.caption.setText(this.fullText.slice(0, this.typed));
    if (this.elapsed >= this.beats[this.index].holdMs) this.next();
  }
}
