import Phaser from 'phaser';
import { AudioManager } from '../../core/audio/AudioManager';

/** Coffee Stand. Touch to activate; the cup starts steaming. */
export class Checkpoint extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.StaticBody;
  readonly cpName: string;
  activated = false;

  constructor(scene: Phaser.Scene, x: number, y: number, name: string) {
    super(scene, x, y, 'blocks', 'checkpoint_off');
    this.cpName = name;
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setOrigin(0.5, 1);
    this.setDepth(2);
    this.body.setSize(40, 90);
    this.body.setOffset(12, 6);
  }

  activate(): void {
    if (this.activated) return;
    this.activated = true;
    this.setFrame('checkpoint_on');
    AudioManager.sfx('checkpoint');
    this.scene.tweens.add({ targets: this, scaleY: 1.08, duration: 120, yoyo: true });
  }
}
