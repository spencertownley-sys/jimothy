import Phaser from 'phaser';
import { CONFIG } from '../../config';
import { AudioManager } from '../../core/audio/AudioManager';
import { Haptics } from '../../core/haptics';

export interface BlockHost {
  spawnFromBlock(item: string, x: number, y: number): void;
  spawnBrickBits(x: number, y: number): void;
}

/**
 * Chalkboard Menu Sign with a glowing chalk "?". Bump from below → item. The art carries a
 * baked golden glow; on top of that it pulses (WebGL glow FX where available) and sits in a
 * slowly turning ring of sparkles, so it reads as "hit me" from across the screen. Once used
 * it goes dark.
 */
export class QuestionBlock extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.StaticBody;
  used = false;
  readonly item: string;
  private sparkle?: Phaser.GameObjects.Image;
  private glow?: Phaser.FX.Glow;
  private pulse?: Phaser.Tweens.Tween;

  /** Hidden blocks are invisible and only solid from below until bumped (Mario's 1-up blocks). */
  hidden: boolean;

  constructor(scene: Phaser.Scene, x: number, y: number, item: string, hidden = false) {
    super(scene, x, y, 'blocks', 'qblock');
    this.item = item;
    this.hidden = hidden;
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setDepth(4);
    // the frame is larger than a tile because of the baked glow; collide on the tile only
    this.body.setSize(CONFIG.TILE, CONFIG.TILE);
    this.body.updateFromGameObject();
    if (hidden) {
      this.setVisible(false);
      this.body.checkCollision.up = false;
      this.body.checkCollision.left = false;
      this.body.checkCollision.right = false;
      return;
    }

    if (scene.textures.get('blocks').has('sparkle')) {
      this.sparkle = scene.add.image(x, y, 'blocks', 'sparkle').setDepth(3).setAlpha(0.75).setBlendMode(Phaser.BlendModes.ADD);
      scene.tweens.add({ targets: this.sparkle, angle: 360, duration: 9000, repeat: -1 });
      scene.tweens.add({ targets: this.sparkle, alpha: 0.35, scale: 0.9, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
    // preFX exists only under WebGL; the pulse below still works on Canvas.
    this.glow = this.preFX?.addGlow(0xffd27a, 2, 0, false, 0.1, 12);
    this.pulse = scene.tweens.add({
      targets: this.glow ?? this,
      ...(this.glow ? { outerStrength: 6 } : { alpha: 0.82 }),
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  bump(host: BlockHost): void {
    Haptics.pulse('bump');
    if (this.used) {
      AudioManager.sfx('bump');
      return;
    }
    this.used = true;
    if (this.hidden) {
      this.hidden = false;
      this.setVisible(true);
      this.body.checkCollision.up = true;
      this.body.checkCollision.left = true;
      this.body.checkCollision.right = true;
    }
    this.setFrame('qblock_used');
    this.body.setSize(CONFIG.TILE, CONFIG.TILE);
    this.pulse?.stop();
    if (this.glow) this.preFX?.remove(this.glow);
    this.setAlpha(1);
    if (this.sparkle) {
      const s = this.sparkle;
      this.scene.tweens.killTweensOf(s);
      this.scene.tweens.add({ targets: s, alpha: 0, scale: 1.6, duration: 300, onComplete: () => s.destroy() });
    }
    AudioManager.sfx('bump');
    this.scene.tweens.add({ targets: this, y: this.y - 12, duration: 90, yoyo: true, ease: 'Quad.out' });
    host.spawnFromBlock(this.item, this.x, this.y);
  }

  override destroy(fromScene?: boolean): void {
    this.sparkle?.destroy();
    super.destroy(fromScene);
  }
}
