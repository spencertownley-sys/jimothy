import type Phaser from 'phaser';
import { STORIES } from '../data/stories';
import { LEVELS, levelById } from './LevelDef';

export interface WorldDef {
  id: number;
  /** banner on the world map */
  name: string;
  /** painted map of just this neighbourhood */
  mapBg: string;
  /** textures this world needs beyond the boot pack: key → path under assets/ */
  images: Record<string, string>;
}

// The boot pack holds only what the title, the opening and 1-1 need; everything else loads on
// first use (QA checklist: initial load ≤ 6 MB).
export const WORLDS: Record<number, WorldDef> = {
  1: {
    id: 1,
    name: 'BALLARD',
    mapBg: 'bg:map_ballard',
    // 1-1 ships in the boot pack; the Locks and the beach load when you first go there
    images: {
      'tiles:locks': 'tilesets/locks.png',
      'tiles:beach': 'tilesets/beach.png',
      'bg:locks_far': 'backgrounds/bg_locks_far.jpg',
      'bg:locks_mid': 'backgrounds/bg_locks_mid.png',
      'bg:beach_far': 'backgrounds/bg_beach_far.jpg',
      'bg:beach_mid': 'backgrounds/bg_beach_mid.png',
      'bg:water': 'backgrounds/water.png',
      'bg:water_dusk': 'backgrounds/water_dusk.png',
    },
  },
  2: {
    id: 2,
    name: 'PIKE PLACE',
    mapBg: 'bg:map_pike',
    images: {
      'tiles:market': 'tilesets/market.png',
      'tiles:alley': 'tilesets/alley.png',
      'tiles:pier': 'tilesets/pier.png',
      'bg:pike_far': 'backgrounds/bg_pike_far.jpg',
      'bg:pike_mid': 'backgrounds/bg_pike_mid.png',
      'bg:pike_near': 'backgrounds/bg_pike_near.png',
      'bg:alley_mid': 'backgrounds/bg_alley_mid.png',
      'bg:waterfront_mid': 'backgrounds/bg_waterfront_mid.png',
      'bg:map_pike': 'backgrounds/map_pike.jpg',
      'bg:water': 'backgrounds/water.png',
    },
  },
};

export function worldOf(levelId: string | undefined): WorldDef {
  const def = levelId ? levelById(levelId) : undefined;
  return WORLDS[def?.world ?? 1] ?? WORLDS[1];
}

/** Queue everything a world needs that isn't loaded yet. Returns true if anything was queued. */
export function queueWorld(scene: Phaser.Scene, world: number): boolean {
  let queued = false;
  for (const [key, path] of Object.entries(WORLDS[world]?.images ?? {})) {
    if (scene.textures.exists(key)) continue;
    scene.load.image(key, `assets/${path}`);
    queued = true;
  }
  for (const lvl of LEVELS) {
    if (lvl.world !== world || !lvl.file || scene.cache.tilemap.exists(`map:${lvl.id}`)) continue;
    scene.load.tilemapTiledJSON(`map:${lvl.id}`, `assets/maps/${lvl.file}`);
    queued = true;
  }
  return queued;
}

/** Queue a cutscene's painted panels. */
export function queueStory(scene: Phaser.Scene, story: string): void {
  for (const beat of STORIES[story]?.beats ?? []) {
    if (scene.textures.exists(beat.image) || !beat.image.startsWith('story:')) continue;
    scene.load.image(beat.image, `assets/story/${beat.image.slice(6)}.jpg`);
  }
}
