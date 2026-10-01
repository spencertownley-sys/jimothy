import Phaser from 'phaser';
import { CONFIG, type PowerState } from '../config';
import { AudioManager } from '../core/audio/AudioManager';
import type { InputState } from '../core/input/InputState';
import { jumpGravityScale, startJump, type JumpState } from '../core/physics/jump';
import { powerAfterHit, type PowerUpKind } from '../data/powerups';

export type PlayerFsm =
  | 'Idle' | 'Run' | 'Jump' | 'Fall' | 'Crouch' | 'CrouchWalk' | 'Skid'
  | 'Hurt' | 'Dead' | 'Grow' | 'Shrink' | 'Throw' | 'Victory';

/** What the Player needs from the scene, kept narrow so it stays testable and portable. */
export interface PlayerHost {
  /** True when no solid tile or block occupies the world rect (used before standing up / growing). */
  isSpaceFree(x: number, y: number, w: number, h: number): boolean;
  onPlayerDied(): void;
  onPowerChanged(power: PowerState): void;
  onFlannel(active: boolean): void;
  onExtraLife(): void;
  onThrow(x: number, y: number, dir: 1 | -1): void;
}

const approach = (v: number, target: number, step: number): number =>
  v < target ? Math.min(v + step, target) : Math.max(v - step, target);

export class Player extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  fsm: PlayerFsm = 'Idle';
  power: PowerState = 'small';
  facing: 1 | -1 = 1;
  crouching = false;
  onSlime = false;
  inPothole = false;

  coyoteMs = 0;
  bufferMs = 0;
  iframesMs = 0;
  freezeMs = 0;
  flannelMs = 0;
  doubleShotMs = 0;
  private deadMs = 0;
  private idleMs = 0;
  private animMs = 0;
  private wasGrounded = false;
  /** grounded as seen by the last fixed step (collision flags are reset after each step) */
  lastGrounded = false;
  private lastFrame = '';
  private lastBox = '';
  private jump: JumpState = { vy: 0, holdMs: 0, jumping: false, cut: false };
  private host: PlayerHost;

  constructor(scene: Phaser.Scene, x: number, y: number, host: PlayerHost, power: PowerState = 'small') {
    super(scene, x, y, 'jimothy', 'small_idle');
    this.host = host;
    this.power = power;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1); // x,y = feet, so hitbox swaps keep him planted
    this.setDepth(10);
    this.body.setCollideWorldBounds(false);
    this.body.setMaxVelocityY(CONFIG.MAX_FALL_SPEED);
    this.applyPose(true);
  }

  get grounded(): boolean {
    return this.body.blocked.down || this.body.touching.down;
  }

  get invulnerable(): boolean {
    return this.iframesMs > 0 || this.flannelMs > 0;
  }

  /** Called once per physics step from the scene. Never reads delta for logic; dtMs is the fixed step. */
  fixedUpdate(input: InputState, dtMs: number): void {
    const dt = dtMs / 1000;
    this.tickTimers(dtMs);

    if (this.fsm === 'Dead') {
      this.deadMs += dtMs;
      if (this.deadMs >= CONFIG.DEATH_WAIT_MS) {
        this.deadMs = -Infinity;
        this.host.onPlayerDied();
      }
      return;
    }
    if (this.fsm === 'Victory') {
      this.body.setVelocityX(0);
      this.updateVisuals(dtMs);
      return;
    }
    if (this.freezeMs > 0) {
      // Grow/Shrink freeze frame (0.4 s), like Mario: the world keeps moving, Jimothy doesn't.
      this.body.setVelocity(0, 0);
      this.body.setAllowGravity(false);
      this.animMs += dtMs;
      this.applyPose();
      this.updateVisuals(dtMs);
      return;
    }
    this.body.setAllowGravity(true);

    const grounded = this.grounded;
    this.lastGrounded = grounded;
    if (grounded) {
      this.coyoteMs = CONFIG.COYOTE_MS;
      if (!this.wasGrounded) AudioManager.sfx('land');
      this.jump.jumping = false;
    } else {
      this.coyoteMs -= dtMs;
    }
    this.wasGrounded = grounded;
    if (input.justPressed('jump')) this.bufferMs = CONFIG.JUMP_BUFFER_MS;
    else this.bufferMs -= dtMs;

    // Crouch: flat fuzzy pancake. Stay crouched under a ceiling instead of clipping into it.
    const wantCrouch = input.get('down') && (grounded || this.crouching);
    if (wantCrouch) this.crouching = true;
    else if (this.crouching && this.canStandUp()) this.crouching = false;

    // Horizontal: acceleration + friction, never instant (GDD §3.1).
    const dir = input.axisX();
    const sprint = input.get('b') || this.doubleShotMs > 0;
    let max = this.crouching && grounded ? CONFIG.CROUCH_WALK_MAX : sprint ? CONFIG.RUN_MAX : CONFIG.WALK_MAX;
    if (this.inPothole && this.power !== 'jacket') max *= CONFIG.POTHOLE_SLOW;
    const accel = grounded ? CONFIG.ACCEL_GROUND : CONFIG.ACCEL_AIR;
    const friction = grounded ? (this.onSlime ? CONFIG.SLIME_FRICTION : CONFIG.FRICTION) : CONFIG.AIR_DRAG;
    let vx = this.body.velocity.x;
    let skidding = false;
    if (dir !== 0) {
      this.facing = dir;
      if (grounded && Math.sign(vx) === -dir && Math.abs(vx) > CONFIG.SKID_MIN_SPEED) skidding = true;
      if (Math.abs(vx) > max && Math.sign(vx) === dir) {
        vx = approach(vx, dir * max, friction * dt); // sprint released: ease back down
      } else {
        const a = skidding ? accel + friction * 0.5 : accel;
        vx = Phaser.Math.Clamp(vx + dir * a * dt, -max, max);
      }
    } else {
      vx = approach(vx, 0, friction * dt);
    }
    this.body.setVelocityX(vx);

    // Jump: buffered + coyote.
    if (this.bufferMs > 0 && this.coyoteMs > 0) {
      this.jump = startJump(vx);
      this.body.setVelocityY(this.jump.vy);
      this.bufferMs = 0;
      this.coyoteMs = 0;
      AudioManager.sfx('jump');
    }
    this.jump.vy = this.body.velocity.y;
    const gScale = jumpGravityScale(this.jump, input.get('jump'), dtMs);
    if (this.jump.vy !== this.body.velocity.y) this.body.setVelocityY(this.jump.vy); // jump cut
    this.body.setGravityY(CONFIG.GRAVITY * (gScale - 1)); // body gravity is added to the world's

    if (this.power === 'jacket' && input.justPressed('a') && !this.crouching) {
      this.host.onThrow(this.x + this.facing * 20, this.y - 30, this.facing);
      this.fsm = 'Throw';
      this.animMs = 0;
      AudioManager.sfx('throw');
    }

    // State resolution
    if (this.fsm === 'Throw' && this.animMs < 150) {
      /* hold the paw flick briefly */
    } else if (!grounded) this.fsm = this.body.velocity.y < 0 ? 'Jump' : 'Fall';
    else if (this.crouching) this.fsm = dir !== 0 ? 'CrouchWalk' : 'Crouch';
    else if (skidding) this.fsm = 'Skid';
    else if (Math.abs(vx) > 10) this.fsm = 'Run';
    else this.fsm = 'Idle';

    this.idleMs = this.fsm === 'Idle' ? this.idleMs + dtMs : 0;
    this.animMs += dtMs;
    this.applyPose();
    this.updateVisuals(dtMs);
  }

  private tickTimers(dtMs: number): void {
    if (this.iframesMs > 0) this.iframesMs -= dtMs;
    if (this.freezeMs > 0) {
      this.freezeMs -= dtMs;
      if (this.freezeMs <= 0) this.freezeMs = 0;
    }
    if (this.flannelMs > 0) {
      this.flannelMs -= dtMs;
      if (this.flannelMs <= 0) {
        this.flannelMs = 0;
        this.clearTint();
        this.host.onFlannel(false);
      }
    }
    if (this.doubleShotMs > 0) this.doubleShotMs = Math.max(0, this.doubleShotMs - dtMs);
  }

  private canStandUp(): boolean {
    const box = this.power === 'small' ? CONFIG.HITBOX.small : CONFIG.HITBOX.big;
    return this.host.isSpaceFree(this.x - box.w / 2, this.y - box.h, box.w, box.h - 1);
  }

  private poseFrame(): string {
    const p = this.power === 'small' ? 'small' : 'big';
    switch (this.fsm) {
      case 'Idle':
        if (this.power === 'jacket') return 'jacket_idle';
        return this.idleMs > CONFIG.IDLE_LOOK_MS ? `${p}_look` : `${p}_idle`;
      case 'Run': {
        const period = Math.abs(this.body.velocity.x) > CONFIG.WALK_MAX + 20 ? 90 : 140;
        return Math.floor(this.animMs / period) % 2 === 0 ? `${p}_lope` : `${p}_idle`;
      }
      case 'Skid':
        return `${p}_lope`;
      case 'Jump':
      case 'Fall':
        return `${p}_hop`;
      case 'Crouch':
      case 'CrouchWalk':
        return `${p}_crouch`;
      case 'Hurt':
      case 'Shrink':
      case 'Dead':
        return `${p}_hurt`;
      case 'Grow':
        return Math.floor(this.animMs / 100) % 2 === 0 ? 'small_idle' : 'big_idle';
      case 'Victory':
        return `${p}_victory`;
      case 'Throw':
        return 'jacket_idle';
    }
  }

  private applyPose(force = false): void {
    const frame = this.poseFrame();
    if (force || frame !== this.lastFrame) {
      this.lastFrame = frame;
      // updateOrigin=true: the display origin must follow the new frame height or the body and the
      // drawn sprite drift apart (feet-anchored origin stays 0.5/1).
      if (this.texture.has(frame)) this.setFrame(frame, true, true);
      this.lastBox = '';
    }
    this.setFlipX(this.facing < 0);
    this.applyHitbox();
  }

  private applyHitbox(): void {
    const key = `${this.power}:${this.crouching}:${this.frame.name}`;
    if (key === this.lastBox) return;
    this.lastBox = key;
    const box =
      this.power === 'small'
        ? this.crouching ? CONFIG.HITBOX.crouchSmall : CONFIG.HITBOX.small
        : this.crouching ? CONFIG.HITBOX.crouchBig : CONFIG.HITBOX.big;
    const fw = this.frame.realWidth;
    const fh = this.frame.realHeight;
    // Keep feet anchored: origin is (0.5, 1) so only the top of the box moves.
    this.body.setSize(box.w, box.h, false);
    this.body.setOffset((fw - box.w) / 2, fh - box.h);
  }

  private updateVisuals(dtMs: number): void {
    if (this.iframesMs > 0) this.setAlpha(Math.floor(this.iframesMs / 70) % 2 === 0 ? 1 : 0.35);
    else if (this.alpha !== 1) this.setAlpha(1);
    if (this.flannelMs > 0) {
      // slow plaid glow: < 3 Hz so it never reads as flashing
      const h = ((CONFIG.FLANNEL_MS - this.flannelMs) / 1200) % 1;
      const c = Phaser.Display.Color.HSVToRGB(h, 0.45, 1) as Phaser.Types.Display.ColorObject;
      this.setTint(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
    }
    void dtMs;
  }

  // --- interactions ------------------------------------------------------------------

  /** Stomp bounce. Hold jump during the bounce for a higher one. */
  bounce(held: boolean): void {
    const vy = held ? CONFIG.STOMP_BOUNCE_HELD : CONFIG.STOMP_BOUNCE;
    this.body.setVelocityY(vy);
    this.jump = { vy, holdMs: CONFIG.JUMP_HOLD_MS, jumping: true, cut: !held };
    this.coyoteMs = 0;
  }

  /** Returns true if the hit landed (false while invulnerable / frozen / dead). */
  hurt(): boolean {
    if (this.invulnerable || this.fsm === 'Dead' || this.fsm === 'Victory' || this.freezeMs > 0) return false;
    const next = powerAfterHit(this.power);
    if (next === 'dead') {
      this.die();
      return true;
    }
    AudioManager.sfx('hurt');
    this.power = next;
    this.iframesMs = CONFIG.HURT_IFRAMES_MS;
    this.freezeMs = CONFIG.GROW_FREEZE_MS;
    this.fsm = 'Shrink';
    this.animMs = 0;
    this.host.onPowerChanged(this.power);
    this.applyPose(true);
    return true;
  }

  /** Freeze-pulse style shove: no damage, short i-frames so pulses can't chain-stun. */
  knockback(dirX: 1 | -1, speed: number): void {
    if (this.fsm === 'Dead' || this.fsm === 'Victory') return;
    this.body.setVelocity(dirX * speed, -260);
    if (this.iframesMs < CONFIG.KNOCKBACK_IFRAMES_MS) this.iframesMs = CONFIG.KNOCKBACK_IFRAMES_MS;
  }

  die(): void {
    if (this.fsm === 'Dead') return;
    this.fsm = 'Dead';
    this.crouching = false;
    this.flannelMs = 0;
    this.clearTint();
    this.setAlpha(1);
    this.body.checkCollision.none = true;
    this.body.setAllowGravity(true);
    this.body.setGravityY(0);
    this.body.setVelocity(0, CONFIG.DEATH_HOP_VELOCITY);
    this.deadMs = 0;
    this.setDepth(60);
    AudioManager.sfx('die');
    this.applyPose(true);
  }

  /** Level-clear pose; the scene drives movement from here. */
  victory(): void {
    this.fsm = 'Victory';
    this.crouching = false;
    this.body.setVelocity(0, 0);
    this.applyPose(true);
  }

  applyPowerUp(kind: PowerUpKind): void {
    switch (kind) {
      case 'teriyaki':
        if (this.power === 'small') this.setPower('big', 'Grow');
        else AudioManager.sfx('latte');
        break;
      case 'jacket':
        if (this.power !== 'jacket') this.setPower('jacket', 'Grow');
        else AudioManager.sfx('latte');
        break;
      case 'flannel':
        this.flannelMs = CONFIG.FLANNEL_MS;
        AudioManager.sfx('flannel');
        this.host.onFlannel(true);
        break;
      case 'star':
        AudioManager.sfx('oneup');
        this.host.onExtraLife();
        break;
      case 'doubleshot':
        this.doubleShotMs = CONFIG.DOUBLE_SHOT_MS;
        AudioManager.sfx('latte');
        break;
    }
  }

  private setPower(power: PowerState, anim: 'Grow' | 'Shrink'): void {
    this.power = power;
    this.fsm = anim;
    this.freezeMs = CONFIG.GROW_FREEZE_MS;
    this.animMs = 0;
    AudioManager.sfx('grow');
    this.host.onPowerChanged(power);
    this.applyPose(true);
    // Growing under a low ceiling would clip him into it — stay crouched instead.
    if (!this.crouching && !this.canStandUp()) {
      this.crouching = true;
      this.applyPose(true);
    }
  }

  /** Restore carried state when re-entering a level (drains, checkpoints). */
  restorePower(power: PowerState): void {
    this.power = power;
    this.applyPose(true);
  }

  debugInfo(): string {
    const v = this.body.velocity;
    const b = this.body;
    return `${this.fsm} ${this.power} vx=${v.x.toFixed(0)} vy=${v.y.toFixed(0)} grounded=${this.lastGrounded} coyote=${Math.max(0, this.coyoteMs).toFixed(0)} buffer=${Math.max(0, this.bufferMs).toFixed(0)} crouch=${this.crouching} slime=${this.onSlime} pothole=${this.inPothole} frame=${this.frame.name} body=${b.x.toFixed(0)},${b.y.toFixed(0)} ${b.width}x${b.height} off=${b.offset.x},${b.offset.y}`;
  }
}
