import Phaser from 'phaser';

/** One leg of a mover's loop: hold or travel to a height (0 = rest/bottom, 1 = top) over `ms`. */
export interface MoverLeg {
  to: 0 | 1;
  ms: number;
  ease?: (t: number) => number;
}

/**
 * A solid that rides a fixed up/down loop: the leaping salmon of the fish ladder and the
 * Ballard Locks gates. Driven by velocity, never by setting `y`, so Arcade separation carries
 * Jimothy along when he stands on top. Everything is in fixed steps (no `delta`).
 */
export class Mover extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  readonly topY: number;
  readonly restY: number;
  private legs: MoverLeg[];
  private leg = 0;
  private legMs = 0;
  private from = 0;
  /** extra pause, e.g. a gate waiting for Jimothy to get out from underneath */
  holdMs = 0;
  /** called when a leg starts (salmon splash, gate clank) */
  onLeg?: (leg: MoverLeg, index: number) => void;

  constructor(
    scene: Phaser.Scene,
    x: number,
    topY: number,
    restY: number,
    frame: string,
    legs: MoverLeg[],
    phaseMs: number,
  ) {
    super(scene, x, restY, 'blocks', frame);
    this.topY = topY;
    this.restY = restY;
    this.legs = legs;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 0);
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    this.body.pushable = false;
    // start part-way through the loop so neighbouring salmon don't leap in unison
    let t = phaseMs;
    const total = legs.reduce((a, l) => a + l.ms, 0);
    t = ((t % total) + total) % total;
    let level = legs[legs.length - 1].to as number;
    while (t >= this.legs[this.leg].ms) {
      t -= this.legs[this.leg].ms;
      level = this.legs[this.leg].to;
      this.leg = (this.leg + 1) % this.legs.length;
    }
    this.from = level;
    this.legMs = t;
    this.y = this.yAt(this.level());
  }

  private yAt(level: number): number {
    return this.restY + (this.topY - this.restY) * level;
  }

  private level(): number {
    const l = this.legs[this.leg];
    const t = Math.min(1, this.legMs / l.ms);
    const e = l.ease ? l.ease(t) : t;
    return this.from + (l.to - this.from) * e;
  }

  /** 0 at rest, 1 at the top. */
  get progress(): number {
    return this.level();
  }

  get legIndex(): number {
    return this.leg;
  }

  fixedUpdate(dtMs: number): void {
    if (this.holdMs > 0) {
      this.holdMs -= dtMs;
      this.body.setVelocityY(0);
      return;
    }
    this.legMs += dtMs;
    while (this.legMs >= this.legs[this.leg].ms) {
      this.legMs -= this.legs[this.leg].ms;
      this.from = this.legs[this.leg].to;
      this.leg = (this.leg + 1) % this.legs.length;
      this.onLeg?.(this.legs[this.leg], this.leg);
    }
    // Aim from where the body is now: between sub-steps of one frame the sprite lags the body.
    const target = this.yAt(this.level());
    const now = this.body.y - (this.body.offset.y - this.displayOriginY) * this.scaleY;
    this.body.setVelocityY((target - now) / (dtMs / 1000));
  }
}
