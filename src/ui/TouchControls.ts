import { Haptics } from '../core/haptics';
import { getInput } from '../core/input';
import type { InputKey } from '../core/input/InputState';
import { AudioManager } from '../core/audio/AudioManager';
import { dpadKeys } from './dpad';

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
.jt-btn { position: relative; }
/* iPhone haptics: a real iOS switch, invisible, under the thumb (see nativeTick) */
.jt-tick { position: absolute; inset: 0; opacity: 0.01; overflow: hidden; -webkit-tap-highlight-color: transparent; }
.jt-tick input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; }
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
  holdButton(pause, 'start', 'pause');
  dpadControl(dpad);

  // right: jump on top, B and A below
  const jump = button('jt-btn jt-jump', 'Jump');
  const row = document.createElement('div');
  row.className = 'jt-row';
  const b = button('jt-btn jt-b', 'B: sprint');
  const a = button('jt-btn jt-a', 'A: throw');
  row.append(b, a);
  right.append(spacer(), jump, row);
  for (const el of [pause, dpad, jump, a, b]) nativeTick(el);
  holdButton(jump, 'jump', 'jumpButton');
  holdButton(a, 'a', 'aButton');
  holdButton(b, 'b', 'bButton');

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

  /**
   * iPhone Safari has no Vibration API, and it ignores a switch toggled from code outside a
   * gesture. But a real <input type=checkbox switch> toggled by a real finger always plays the
   * system tick (iOS 18+). So every button carries one, invisible, under the thumb: lifting the
   * finger toggles it and iOS buzzes. Touch pointers are implicitly captured to what they first
   * touched, so the tap lands on the switch and still bubbles to the button's handlers.
   */
  function nativeTick(el: HTMLElement): void {
    if (!Haptics.iosNative) return;
    const label = document.createElement('label');
    label.className = 'jt-tick';
    label.setAttribute('aria-hidden', 'true');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    input.tabIndex = -1;
    label.appendChild(input);
    // Vibration off in Options: stop the toggle, and with it the tick
    label.addEventListener('click', (e) => {
      if (!Haptics.enabled()) e.preventDefault();
    });
    el.appendChild(label);
  }

  function firstTouch(): void {
    AudioManager.unlock();
  }

  // Each control holds its keys under its own name (see TouchSource): the d-pad letting go of
  // `jump` must never release the Jump button a second thumb is still pressing.
  function holdButton(el: HTMLElement, key: InputKey, owner: string): void {
    const pointers = new Set<number>();
    const update = (): void => {
      el.classList.toggle('is-down', pointers.size > 0);
    };
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      firstTouch();
      // a touch is already captured to what it landed on (the tick switch); capturing it to the
      // button instead would send the click there and the switch would never toggle
      if (e.pointerType !== 'touch') el.setPointerCapture?.(e.pointerId);
      if (pointers.size === 0) Haptics.pulse('tap');
      // press every time (it's idempotent): if a lost pointerup left `pointers` stale, the button
      // must still work on the next touch
      touch.press(key, owner);
      pointers.add(e.pointerId);
      update();
    });
    const up = (e: PointerEvent): void => {
      pointers.delete(e.pointerId);
      if (pointers.size === 0) touch.release(key, owner);
      update();
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', up);
    // touch.clear() on blur drops the key; forget the fingers too so the next touch starts clean
    window.addEventListener('blur', () => {
      pointers.clear();
      update();
    });
  }

  function dpadControl(el: HTMLElement): void {
    const OWNER = 'dpad';
    let pointer: number | null = null;
    let keys: InputKey[] = [];
    const show = (): void => {
      el.classList.toggle('d-left', keys.includes('left'));
      el.classList.toggle('d-right', keys.includes('right'));
      el.classList.toggle('d-down', keys.includes('down'));
      el.classList.toggle('d-up', keys.includes('jump'));
    };
    const apply = (e: PointerEvent): void => {
      const r = el.getBoundingClientRect();
      // -1..1 from the d-pad centre
      const dx = ((e.clientX - r.left) / r.width) * 2 - 1;
      const dy = ((e.clientY - r.top) / r.height) * 2 - 1;
      const next = dpadKeys(dx, dy, keys);
      // a buzz each time the thumb rolls onto a new direction, like the click of a real d-pad
      if (next.some((k) => !keys.includes(k))) Haptics.pulse('tap');
      keys = next;
      touch.setHeld(keys, DIRS, OWNER);
      show();
    };
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      firstTouch();
      pointer = e.pointerId;
      keys = [];
      if (e.pointerType !== 'touch') el.setPointerCapture?.(e.pointerId);
      apply(e);
    });
    el.addEventListener('pointermove', (e) => {
      if (e.pointerId === pointer) apply(e);
    });
    const end = (e: PointerEvent): void => {
      if (e.pointerId !== pointer) return;
      pointer = null;
      keys = [];
      touch.setHeld([], DIRS, OWNER);
      show();
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('lostpointercapture', end);
  }
}
