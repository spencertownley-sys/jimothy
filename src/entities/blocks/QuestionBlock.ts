import Phaser from 'phaser';
import { AudioManager } from '../../core/audio/AudioManager';

export interface BlockHost {
  spawnFromBlock(item: string, x: number, y: number): void;
  spawnBrickBits(x: number, y: number): void;
}

/** Chalkboard Menu Sign with a chalk "?". Bump from below → item. */
export class QuestionBlock extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.StaticBody;
  used = false;
  readonly item: string;

  constructor(scene: Phaser.Scene, x: number, y: number, item: string) {
    super(scene, x, y, 'blocks', 'qblock');
    this.item = item;
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setDepth(4);
  }

  bump(host: BlockHost): void {
    if (this.used) {
      AudioManager.sfx('bump');
      return;
    }
    this.used = true;
    this.setFrame('qblock_used');
    AudioManager.sfx('bump');
    this.scene.tweens.add({ targets: this, y: this.y - 12, duration: 90, yoyo: true, ease: 'Quad.out' });
    host.spawnFromBlock(this.item, this.x, this.y);
  }
}
