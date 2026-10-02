import Phaser from 'phaser';
import { AudioManager } from '../../core/audio/AudioManager';
import { Haptics } from '../../core/haptics';

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
    // touch zone: the lower 90 % of the stand, a little narrower than the art
    const w = this.width * 0.6;
    const h = this.height * 0.9;
    this.body.setSize(w, h);
    this.body.setOffset((this.width - w) / 2, this.height - h);
  }

  activate(): void {
    if (this.activated) return;
    this.activated = true;
    this.setFrame('checkpoint_on');
    AudioManager.sfx('checkpoint');
    Haptics.pulse('checkpoint');
    this.scene.tweens.add({ targets: this, scaleY: 1.08, duration: 120, yoyo: true });
  }
}
