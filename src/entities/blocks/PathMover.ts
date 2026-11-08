import Phaser from 'phaser';

export interface PathPoint {
  /** top-centre of the sprite */
  x: number;
  y: number;
  /** false = caught / out of play: hidden and not solid */
  visible: boolean;
  /** -1 / 1: which way it's travelling (for flipping the art) */
  dir?: number;
}

/**
 * A one-way platform that follows a scripted path in both axes: thrown salmon arcing between
 * fishmongers, Ferris-wheel gondolas. Like Mover it is driven by velocity toward where the
 * path says it should be next step, so Arcade (plus the scene's carry logic) moves riders.
 */
export class PathMover extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  private t: number;
  private readonly path: (tMs: number) => PathPoint;
  private shown = true;
  /** called when it disappears (caught) or reappears (thrown) */
  onShow?: (visible: boolean, p: PathPoint) => void;

  constructor(scene: Phaser.Scene, frame: string, path: (tMs: number) => PathPoint, startMs: number, bodyW: number, bodyH: number, bodyTop: number) {
    const p0 = path(startMs);
    super(scene, p0.x, p0.y, 'blocks', frame);
    this.path = path;
    this.t = startMs;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 0);
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    this.body.pushable = false;
    this.body.setSize(bodyW, bodyH, false);
    this.body.setOffset((this.width - bodyW) / 2, bodyTop);
    this.body.checkCollision.down = false;
    this.body.checkCollision.left = false;
    this.body.checkCollision.right = false;
    this.applyShown(p0, true);
  }

  private nowX(): number {
    return this.body.x - (this.body.offset.x - this.displayOriginX) * this.scaleX;
  }

  private nowY(): number {
    return this.body.y - (this.body.offset.y - this.displayOriginY) * this.scaleY;
  }

  private applyShown(p: PathPoint, force = false): void {
    if (!force && p.visible === this.shown) return;
    this.shown = p.visible;
    this.setVisible(p.visible);
    this.body.enable = p.visible;
    if (p.visible) {
      // Body.reset puts the body at the sprite's top-left and ignores the body offset until the
      // next frame; place it properly now or the first velocity aim overshoots (and flings riders).
      this.body.reset(p.x, p.y);
      const bx = p.x + (this.body.offset.x - this.displayOriginX) * this.scaleX;
      const by = p.y + (this.body.offset.y - this.displayOriginY) * this.scaleY;
      this.body.position.set(bx, by);
      this.body.prev.set(bx, by);
      this.body.prevFrame.set(bx, by);
      this.body.updateCenter();
    }
    if (!force) this.onShow?.(p.visible, p);
  }

  fixedUpdate(dtMs: number): void {
    this.t += dtMs;
    const p = this.path(this.t);
    this.applyShown(p);
    if (!p.visible) return;
    if (p.dir) this.setFlipX(p.dir < 0);
    const dt = dtMs / 1000;
    this.body.setVelocity((p.x - this.nowX()) / dt, (p.y - this.nowY()) / dt);
  }
}

/** Parabolic throw from A to B and back, with a pause in each fishmonger's hands. */
export function throwPath(ax: number, bx: number, y: number, apexPx: number, flyMs: number, holdMs: number): (t: number) => PathPoint {
  const cycle = 2 * (flyMs + holdMs);
  return (t) => {
    const tc = ((t % cycle) + cycle) % cycle;
    const arc = (u: number): number => y - 4 * apexPx * u * (1 - u);
    if (tc < flyMs) {
      const u = tc / flyMs;
      return { x: ax + (bx - ax) * u, y: arc(u), visible: true, dir: Math.sign(bx - ax) };
    }
    if (tc < flyMs + holdMs) return { x: bx, y, visible: false };
    if (tc < 2 * flyMs + holdMs) {
      const u = (tc - flyMs - holdMs) / flyMs;
      return { x: bx + (ax - bx) * u, y: arc(u), visible: true, dir: Math.sign(ax - bx) };
    }
    return { x: ax, y, visible: false };
  };
}

/** A gondola hanging from a wheel turning clockwise. */
export function wheelPath(cx: number, cy: number, r: number, periodMs: number, phase: number): (t: number) => PathPoint {
  return (t) => {
    const a = phase + (t / periodMs) * Math.PI * 2;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, visible: true };
  };
}
