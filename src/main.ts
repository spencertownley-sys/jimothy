import Phaser from 'phaser';
import { CONFIG } from './config';
import { AudioManager } from './core/audio/AudioManager';
import { BootScene } from './scenes/BootScene';
import { CreditsScene, GalleryScene } from './scenes/CreditsScene';
import { GameOverScene } from './scenes/GameOverScene';
import { GameScene } from './scenes/GameScene';
import { HUDScene } from './scenes/HUDScene';
import { IntroScene } from './scenes/IntroScene';
import { LevelClearScene } from './scenes/LevelClearScene';
import { OptionsScene } from './scenes/OptionsScene';
import { PauseScene } from './scenes/PauseScene';
import { TitleScene } from './scenes/TitleScene';
import { WorldMapScene } from './scenes/WorldMapScene';
import { mountTouchPanels, wantsTouchControls } from './ui/TouchControls';

// Phones get a wooden controller on both sides of the game instead of buttons drawn over it.
const gameEl = document.getElementById('game');
if (gameEl && wantsTouchControls()) mountTouchPanels(gameEl);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: CONFIG.WIDTH,
  height: CONFIG.HEIGHT,
  backgroundColor: '#1F3A33',
  pixelArt: false,
  roundPixels: true,
  antialias: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: CONFIG.WIDTH,
    height: CONFIG.HEIGHT,
  },
  // panicMax 0: never clamp delta after a hitch, so Arcade's fixed-step catch-up keeps the sim
  // real-time (and deterministic) even when the browser drops frames.
  fps: { target: CONFIG.FIXED_FPS, panicMax: 0 },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: CONFIG.GRAVITY },
      fps: CONFIG.FIXED_FPS,
      fixedStep: true,
      tileBias: CONFIG.TILE_BIAS,
      debug: new URLSearchParams(window.location.search).get('debug') === '1',
    },
  },
  input: { keyboard: true, gamepad: false, touch: true, activePointers: 4 },
  scene: [
    BootScene, TitleScene, IntroScene, WorldMapScene, GameScene, HUDScene, PauseScene,
    OptionsScene, CreditsScene, GalleryScene, LevelClearScene, GameOverScene,
  ],
});

// Start fetching music and sound effects right away; they decode on the first input.
AudioManager.preload('assets/audio/');

// Web Audio needs a user gesture: route *every* first input through unlock().
for (const ev of ['keydown', 'pointerdown', 'touchstart'] as const) {
  window.addEventListener(ev, () => AudioManager.unlock(), { capture: true, passive: true });
}
window.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    const gs = game.scene.getScene('Game');
    if (gs && game.scene.isActive('Game') && !game.scene.isActive('Pause')) {
      AudioManager.setPaused(true);
      game.scene.pause('Game');
      game.scene.start('Pause', { levelId: (gs.registry.get('run') as { levelId?: string } | undefined)?.levelId ?? '1-1' });
    }
  }
});

// test hooks (Playwright reads these)
declare global {
  interface Window {
    __jimothy?: { game: Phaser.Game; player: () => { x: number; y: number; fsm: string } | undefined; debug: () => string; levelId: () => string; teleport: (x: number, y: number) => void; power: (kind: 'teriyaki' | 'jacket' | 'flannel' | 'star' | 'doubleshot') => void; items: () => { kind: string; x: number; y: number }[]; enemies: () => { x: number; y: number; alive: boolean; id: string }[]; audio: () => { files: Record<string, string>; playing: string | null }; activeScenes: () => string[] };
  }
}
window.__jimothy = {
  game,
  player: () => {
    const s = game.scene.getScene('Game') as GameScene | null;
    const p = s && game.scene.isActive('Game') ? s.player : undefined;
    return p ? { x: p.x, y: p.y, fsm: p.fsm } : undefined;
  },
  debug: () => {
    const s = game.scene.getScene('Game') as GameScene | null;
    return s && game.scene.isActive('Game') && s.player ? `${s.player.debugInfo()} fps=${game.loop.actualFps.toFixed(0)}` : 'no game scene';
  },
  levelId: () => {
    const s = game.scene.getScene('Game') as GameScene | null;
    return s && game.scene.isActive('Game') ? s.levelId : '';
  },
  teleport: (x: number, y: number) => {
    const s = game.scene.getScene('Game') as GameScene | null;
    if (s && game.scene.isActive('Game')) s.teleport(x, y);
  },
  power: (kind) => {
    const s = game.scene.getScene('Game') as GameScene | null;
    if (s && game.scene.isActive('Game')) s.devPower(kind);
  },
  items: () => {
    const s = game.scene.getScene('Game') as GameScene | null;
    return s && game.scene.isActive('Game') ? s.itemSnapshot() : [];
  },
  enemies: () => {
    const s = game.scene.getScene('Game') as GameScene | null;
    return s && game.scene.isActive('Game') ? s.enemySnapshot() : [];
  },
  audio: () => ({ files: AudioManager.status(), playing: AudioManager.playing }),
  activeScenes: () => game.scene.getScenes(true).map((s) => s.scene.key),
};
