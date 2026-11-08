import { Haptics } from '../core/haptics';
import { getInput } from '../core/input';
import type { InputKey } from '../core/input/InputState';
import { AudioManager } from '../core/audio/AudioManager';

/** True on phones/tablets, or when forced via ?touch=1 for desktop testing. */
export function wantsTouchControls(): boolean {
  if (typeof window === 'undefined') return false;
  if (new URLSearchParams(window.location.search).get('touch') === '1') return true;
  return window.matchMedia?.('(pointer: coarse)').matches ?? false;
}

const CSS = `
.jt-shell { display: flex; width: 100%; height: 100%; align-items: stretch; background: #10201c; }
.jt-shell > #game { flex: 1 1 auto; min-width: 0; height: 100%; }
.jt-panel {
  flex: 0 0 clamp(128px, 18vw, 210px); position: relative; display: flex; flex-direction: column;
  align-items: center; justify-content: space-between; box-sizing: border-box;
  background: #14271f url("assets/ui/panel.jpg") center / cover;
  box-shadow: inset 0 0 24px rgba(0,0,0,.55);
  touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;
  padding-top: max(10px, env(safe-area-inset-top)); padding-bottom: max(14px, env(safe-area-inset-bottom));
}
.jt-left { padding-left: max(6px, env(safe-area-inset-left)); padding-right: 6px; border-right: 3px solid #2a1a0e; }
.jt-right { padding-right: max(6px, env(safe-area-inset-right)); padding-left: 6px; border-left: 3px solid #2a1a0e; }
.jt-btn {
  display: block; aspect-ratio: 1; background: center / contain no-repeat; border: 0; padding: 0;
  filter: drop-shadow(0 4px 6px rgba(0,0,0,.55)); transition: transform 60ms ease-out, filter 60ms;
  -webkit-tap-highlight-color: transparent; touch-action: none;
}
.jt-btn.is-down { transform: scale(.9) translateY(2px); filter: brightness(1.25) drop-shadow(0 1px 2px rgba(0,0,0,.6)); }
.jt-pause { width: 46%; max-width: 64px; background-image: url("assets/ui/btn_pause.png"); }
.jt-dpad { width: 96%; max-width: 200px; background-image: url("assets/ui/dpad.png"); margin-bottom: 6%; }
.jt-dpad.d-left { transform: perspective(300px) rotateY(-14deg); }
.jt-dpad.d-right { transform: perspective(300px) rotateY(14deg); }
.jt-dpad.d-down { transform: perspective(300px) rotateX(-14deg); }
.jt-dpad.d-up { transform: perspective(300px) rotateX(14deg); }
.jt-jump { width: 82%; max-width: 168px; background-image: url("assets/ui/btn_jump.png"); }
.jt-row { display: flex; width: 100%; justify-content: space-between; align-items: flex-end; margin-bottom: 4%; }
.jt-a { width: 50%; max-width: 104px; background-image: url("assets/ui/btn_a.png"); margin-top: -8%; }
.jt-b { width: 46%; max-width: 96px; background-image: url("assets/ui/btn_b.png"); margin-top: 18%; }
.jt-spacer { flex: 1 1 auto; }
`;

const DIRS: readonly InputKey[] = ['left', 'right', 'down', 'jump'];

/**
 * Builds the off-screen controller: two wooden side panels with Higgsfield-painted buttons,
 * placed beside the game canvas (never over it). Left: pause + d-pad (up on the d-pad also
 * jumps). Right: a big jump button with A (throw) and B (sprint) below. Multi-touch; a thumb can
 * slide across the d-pad without lifting. Writes only into TouchSource.
 */
export function mountTouchPanels(gameEl: HTMLElement): void {
  if (document.querySelector('.jt-shell')) return;
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const shell = document.createElement('div');
  shell.className = 'jt-shell';
  gameEl.parentElement?.insertBefore(shell, gameEl);
  const left = panel('jt-panel jt-left');
  const right = panel('jt-panel jt-right');
  shell.append(left, gameEl, right);

  const touch = getInput().touch;

  // left: pause on top, d-pad at thumb height
  const pause = button('jt-btn jt-pause', 'Pause');
  const dpad = button('jt-btn jt-dpad', 'Direction pad');
  left.append(pause, spacer(), dpad);
  holdButton(pause, 'start');
  dpadControl(dpad);

  // right: jump on top, B and A below
  const jump = button('jt-btn jt-jump', 'Jump');
  const row = document.createElement('div');
  row.className = 'jt-row';
  const b = button('jt-btn jt-b', 'B: sprint');
  const a = button('jt-btn jt-a', 'A: throw');
  row.append(b, a);
  right.append(spacer(), jump, row);
  holdButton(jump, 'jump');
  holdButton(a, 'a');
  holdButton(b, 'b');

  // never let a stuck finger keep Jimothy running
  window.addEventListener('blur', () => touch.clear());
  document.addEventListener('visibilitychange', () => document.hidden && touch.clear());

  function panel(cls: string): HTMLDivElement {
    const el = document.createElement('div');
    el.className = cls;
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    return el;
  }

  function spacer(): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'jt-spacer';
    return el;
  }

  function button(cls: string, label: string): HTMLDivElement {
    const el = document.createElement('div');
    el.className = cls;
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', label);
    return el;
  }

  function firstTouch(): void {
    AudioManager.unlock();
  }

  function holdButton(el: HTMLElement, key: InputKey): void {
    const pointers = new Set<number>();
    const update = (): void => {
      el.classList.toggle('is-down', pointers.size > 0);
    };
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      firstTouch();
      el.setPointerCapture?.(e.pointerId);
      if (pointers.size === 0) {
        touch.press(key);
        Haptics.pulse('tap');
      }
      pointers.add(e.pointerId);
      update();
    });
    const up = (e: PointerEvent): void => {
      pointers.delete(e.pointerId);
      if (pointers.size === 0) touch.release(key);
      update();
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', up);
  }

  function dpadControl(el: HTMLElement): void {
    let pointer: number | null = null;
    let last = '';
    const apply = (e: PointerEvent): void => {
      const r = el.getBoundingClientRect();
      // -1..1 from the d-pad centre
      const dx = ((e.clientX - r.left) / r.width) * 2 - 1;
      const dy = ((e.clientY - r.top) / r.height) * 2 - 1;
      const keys: InputKey[] = [];
      if (Math.hypot(dx, dy) > 0.2) {
        if (dx < -0.3) keys.push('left');
        if (dx > 0.3) keys.push('right');
        if (dy > 0.35) keys.push('down');
        if (dy < -0.45 && Math.abs(dx) < 0.55) keys.push('jump');
      }
      const sig = keys.join(',');
      if (sig !== last) {
        if (keys.length) Haptics.pulse('tap');
        last = sig;
      }
      touch.setHeld(keys, DIRS);
      el.classList.remove('d-left', 'd-right', 'd-down', 'd-up');
      if (keys.includes('left')) el.classList.add('d-left');
      if (keys.includes('right')) el.classList.add('d-right');
      if (keys.includes('down')) el.classList.add('d-down');
      if (keys.includes('jump')) el.classList.add('d-up');
    };
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      firstTouch();
      pointer = e.pointerId;
      el.setPointerCapture?.(e.pointerId);
      apply(e);
    });
    el.addEventListener('pointermove', (e) => {
      if (e.pointerId === pointer) apply(e);
    });
    const end = (e: PointerEvent): void => {
      if (e.pointerId !== pointer) return;
      pointer = null;
      last = '';
      touch.setHeld([], DIRS);
      el.classList.remove('d-left', 'd-right', 'd-down', 'd-up');
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('lostpointercapture', end);
  }
}
