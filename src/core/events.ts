import Phaser from 'phaser';

export interface HudState {
  hearts: number;
  maxHearts: number;
  lattes: number;
  lives: number;
  geoducks: boolean[];
  timeMs: number;
  power: string;
}

/** Tiny game-wide bus so HUD / Game / Pause never hold references to each other. */
export const bus = new Phaser.Events.EventEmitter();

export const EV = {
  HUD_UPDATE: 'hud:update',
  HUD_TOAST: 'hud:toast',
  HUD_POWER: 'hud:power',
  HUD_SHOW: 'hud:show',
} as const;
