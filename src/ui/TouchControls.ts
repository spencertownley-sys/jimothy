import Phaser from 'phaser';
import { CONFIG } from '../config';
import { getInput } from '../core/input';
import type { InputSnapshot } from '../core/input/InputState';
import { Save } from '../core/save/Save';

/** True on phones/tablets, or when forced via ?touch=1 for desktop testing. */
export function wantsTouchControls(): boolean {
  if (typeof window === 'undefined') return false;
  if (new URLSearchParams(window.location.search).get('touch') === '1') return true;
  return window.matchMedia?.('(pointer: coarse)').matches ?? false;
}

/** Reads env(safe-area-inset-*) through a probe element; 0 on desktop. */
export function readSafeArea(): { top: number; right: number; bottom: number; left: number } {
  const out = { top: 0, right: 0, bottom: 0, left: 0 };
  if (typeof document === 'undefined') return out;
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top);padding-right:env(safe-area-inset-right);padding-bottom:env(safe-area-inset-bottom);padding-left:env(safe-area-inset-left)';
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  out.top = parseFloat(cs.paddingTop) || 0;
  out.right = parseFloat(cs.paddingRight) || 0;
  out.bottom = parseFloat(cs.paddingBottom) || 0;
  out.left = parseFloat(cs.paddingLeft) || 0;
  probe.remove();
  return out;
}

interface Button {
  key: keyof InputSnapshot;
  x: number;
  y: number;
  r: number;
  label: string;
  gfx: Phaser.GameObjects.Arc;
  pressed: boolean;
}

/**
 * Overlay scene: d-pad on the left 35 % of the screen, A/B (and optional Jump) on the right 30 %,
 * pause at top-center. Multi-touch; a finger sliding from ← to ↓ crouch-slides without lifting.
 * It only writes into TouchSource — gameplay still reads InputState.
 */
export class TouchControlsScene extends Phaser.Scene {
  private buttons: Button[] = [];
  private dpad!: { x: number; y: number; r: number; dead: number; base: Phaser.GameObjects.Arc; knob: Phaser.GameObjects.Arc };
  private pauseBtn!: Phaser.GameObjects.Arc;
  private pausePressed = false;

  constructor() {
    super({ key: 'Touch' });
  }

  create(): void {
    this.input.addPointer(3);
    const W = CONFIG.WIDTH;
    const H = CONFIG.HEIGHT;
    const safe = readSafeArea();
    // CSS px → logical px: the canvas is scaled to fit, so convert through the scale factor.
    const sx = this.scale.displayScale.x || 1;
    const sy = this.scale.displayScale.y || 1;
    const inset = { l: safe.left * sx, r: safe.right * sx, b: safe.bottom * sy, t: safe.top * sy };
    const layout = Save.get().options.touchLayout;

    const base = this.add.circle(0.12 * W + inset.l, 0.72 * H - inset.b, 90, 0xf4efe6, 0.4);
    const knob = this.add.circle(base.x, base.y, 34, 0xf4efe6, 0.5);
    this.dpad = { x: base.x, y: base.y, r: 90, dead: 20, base, knob };
    for (const [dx, dy, ch] of [[-58, 0, '◀'], [58, 0, '▶'], [0, 58, '▼']] as const) {
      this.add.text(base.x + dx, base.y + dy, ch, { fontSize: '22px', color: '#1C2426' }).setOrigin(0.5).setAlpha(0.6);
    }

    const mk = (key: keyof InputSnapshot, x: number, y: number, label: string): void => {
      const gfx = this.add.circle(x, y, 42, 0xf4efe6, 0.4);
      this.add.text(x, y, label, { fontSize: '26px', color: '#1C2426', fontStyle: 'bold' }).setOrigin(0.5).setAlpha(0.7);
      this.buttons.push({ key, x, y, r: 48, label, gfx, pressed: false });
    };
    mk('a', 0.9 * W - inset.r, 0.68 * H - inset.b, 'A');
    mk('b', 0.82 * W - inset.r, 0.8 * H - inset.b, 'B');
    if (layout === 'jumpButton') mk('jump', 0.9 * W - inset.r, 0.48 * H - inset.b, '↑');
    this.pauseBtn = this.add.circle(0.5 * W, 0.06 * H + inset.t, 22, 0xf4efe6, 0.4);
    this.add.text(this.pauseBtn.x, this.pauseBtn.y, '❚❚', { fontSize: '16px', color: '#1C2426' }).setOrigin(0.5).setAlpha(0.7);
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => getInput().touch.clear());
  }

  override update(): void {
    const snap: Partial<InputSnapshot> = {};
    const pointers = this.input.manager.pointers;
    let dpadActive = false;
    let pauseNow = false;
    for (const b of this.buttons) b.pressed = false;
    for (const p of pointers) {
      if (!p.isDown) continue;
      const x = p.x;
      const y = p.y;
      // d-pad zone: anything in the left 35 % claims the finger
      if (p.downX < CONFIG.WIDTH * 0.35) {
        dpadActive = true;
        const dx = x - this.dpad.x;
        const dy = y - this.dpad.y;
        const dist = Math.hypot(dx, dy);
        if (dist > this.dpad.dead) {
          const ang = Math.atan2(dy, dx);
          if (Math.abs(dx) > this.dpad.dead) {
            if (dx < 0) snap.left = true;
            else snap.right = true;
          }
          if (dy > this.dpad.dead && Math.abs(ang) > Math.PI / 6) snap.down = true;
        }
        // swipe-up from anywhere in the zone jumps
        if (p.downY - y > 36) snap.jump = true;
        const k = Math.min(dist, this.dpad.r) / Math.max(dist, 1);
        this.dpad.knob.setPosition(this.dpad.x + dx * k, this.dpad.y + dy * k);
        continue;
      }
      for (const b of this.buttons) {
        if (Math.hypot(x - b.x, y - b.y) <= b.r) {
          b.pressed = true;
          snap[b.key] = true;
        }
      }
      if (Math.hypot(x - this.pauseBtn.x, y - this.pauseBtn.y) <= 30) pauseNow = true;
    }
    if (!dpadActive) this.dpad.knob.setPosition(this.dpad.x, this.dpad.y);
    this.dpad.base.setAlpha(dpadActive ? 0.7 : 0.4);
    for (const b of this.buttons) b.gfx.setAlpha(b.pressed ? 0.7 : 0.4);
    if (pauseNow && !this.pausePressed) snap.start = true;
    this.pausePressed = pauseNow;
    getInput().touch.set(snap);
  }
}
