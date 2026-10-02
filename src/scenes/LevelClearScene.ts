import Phaser from 'phaser';
import { CONFIG } from '../config';
import { AudioManager } from '../core/audio/AudioManager';
import { getInput } from '../core/input';
import { COLORS, uiText } from '../ui/text';

export interface LevelClearData {
  levelId: string;
  name: string;
  timeMs: number;
  par: number;
  lattes: number;
  geoducks: boolean[];
  lives: number;
  next?: string;
}

const fmt = (ms: number): string => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;

/** Ferry Ticket slides in, gets hole-punched, stats tick up. "Local" if under par, "Tourist" if over. */
export class LevelClearScene extends Phaser.Scene {
  private input_ = getInput().state;
  private ready = false;
  private data_!: LevelClearData;

  constructor() {
    super({ key: 'LevelClear' });
  }

  create(data: LevelClearData): void {
    this.data_ = data;
    this.ready = false;
    const W = CONFIG.WIDTH;
    const H = CONFIG.HEIGHT;
    this.cameras.main.setBackgroundColor(0x1f3a33);
    this.input_.reset();
    uiText(this, W / 2, 80, 'LEVEL CLEAR', { fontSize: 52, color: COLORS.amber }).setOrigin(0.5);
    uiText(this, W / 2, 140, `${data.levelId}  ${data.name}`, { fontSize: 28 }).setOrigin(0.5);

    const ticket = this.add.container(W + 300, H / 2 + 20);
    const card = this.add.rectangle(0, 0, 620, 300, 0xf4efe6).setStrokeStyle(6, 0x8fb7c7);
    const stripe = this.add.rectangle(-250, 0, 90, 300, 0x8fb7c7);
    const icon = this.add.image(-250, -40, 'items', 'ticket').setScale(1.5);
    const label = uiText(this, -250, 60, 'FERRY', { fontSize: 22, color: COLORS.ink, stroke: false }).setOrigin(0.5);
    const stats = uiText(this, -170, -110, '', { fontSize: 26, color: COLORS.ink, stroke: false, display: false }).setOrigin(0, 0);
    ticket.add([card, stripe, icon, label, stats]);
    this.tweens.add({
      targets: ticket, x: W / 2, duration: 600, ease: 'Back.out',
      onComplete: () => {
        AudioManager.sfx('ticket');
        const hole = this.add.circle(240, -100, 22, 0x1f3a33);
        ticket.add(hole);
        this.cameras.main.shake(120, 0.004);
        this.tickStats(stats);
      },
    });
  }

  private tickStats(stats: Phaser.GameObjects.Text): void {
    const d = this.data_;
    const underPar = d.par > 0 && d.timeMs <= d.par * 1000;
    const verdict = d.par > 0 ? (underPar ? 'Local' : 'Tourist') : '';
    const lines = [
      `Time   ${fmt(d.timeMs)}${d.par ? `   (par ${fmt(d.par * 1000)})   ${verdict}` : ''}`,
      `Lattes ${d.lattes}`,
      `Geoducks ${d.geoducks.filter(Boolean).length} / 3`,
      `Lives  ${d.lives}`,
    ];
    let i = 0;
    const next = (): void => {
      if (i >= lines.length) {
        this.ready = true;
        uiText(this, CONFIG.WIDTH / 2, CONFIG.HEIGHT - 60, 'START to continue', { fontSize: 24, color: COLORS.mist }).setOrigin(0.5);
        return;
      }
      stats.setText(lines.slice(0, i + 1).join('\n'));
      AudioManager.sfx('latte');
      i++;
      this.time.delayedCall(350, next);
    };
    next();
  }

  override update(): void {
    this.input_.update();
    if (!this.ready) return;
    if (this.input_.justPressed('start') || this.input_.justPressed('a')) {
      // ride the bus from the level just cleared to the next stop on the map
      this.scene.start('WorldMap', { focus: this.data_.next ?? this.data_.levelId, from: this.data_.levelId });
    }
  }
}
