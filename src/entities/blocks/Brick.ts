import Phaser from 'phaser';
import { AudioManager } from '../../core/audio/AudioManager';
import type { Player } from '../Player';
import type { BlockHost } from './QuestionBlock';

/** Mossy cobblestone. Bounces when small, breaks when Big. */
export class Brick extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.StaticBody;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'blocks', 'brick');
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setDepth(4);
  }

  bump(player: Player, host: BlockHost): void {
    if (player.power === 'small') {
      AudioManager.sfx('bump');
      this.scene.tweens.add({ targets: this, y: this.y - 10, duration: 80, yoyo: true, ease: 'Quad.out' });
      return;
    }
    AudioManager.sfx('brick');
    host.spawnBrickBits(this.x, this.y);
    this.destroy();
  }
}
