import Phaser from 'phaser';
import { CONFIG } from '../config';
import { getProp, objectType, type TiledObjectLike } from '../core/tiled';
import type { LevelDef } from './LevelDef';

export interface LoadedLevel {
  map: Phaser.Tilemaps.Tilemap;
  ground: Phaser.Tilemaps.TilemapLayer;
  oneway: Phaser.Tilemaps.TilemapLayer | null;
  decor: Phaser.Tilemaps.TilemapLayer | null;
  hazards: Phaser.Tilemaps.TilemapLayer | null;
  objects: TiledObjectLike[];
  spawns: Map<string, { x: number; y: number }>;
  widthPx: number;
  heightPx: number;
  music: string;
  parallaxSet: string;
  par: number;
  name: string;
}

const TILESET_IMAGE_KEY: Record<string, string> = { ballard: 'tiles:ballard' };

/**
 * Turns a Tiled .tmj into collision layers + a list of objects to spawn. Layer names are
 * load-bearing (CLAUDE.md §Level conventions): ground · oneway · decor · hazards · objects.
 */
export function loadLevel(scene: Phaser.Scene, def: LevelDef): LoadedLevel {
  const key = `map:${def.id}`;
  if (!scene.cache.tilemap.exists(key)) throw new Error(`map "${key}" is not loaded`);
  const map = scene.make.tilemap({ key });
  const tilesets: Phaser.Tilemaps.Tileset[] = [];
  for (const ts of map.tilesets) {
    const imageKey = TILESET_IMAGE_KEY[ts.name] ?? `tiles:${ts.name}`;
    const added = map.addTilesetImage(ts.name, imageKey, CONFIG.TILE, CONFIG.TILE, 2, 4);
    if (added) tilesets.push(added);
    else console.warn(`[level] tileset image "${imageKey}" missing`);
  }

  const ground = map.createLayer('ground', tilesets, 0, 0);
  if (!ground) throw new Error(`level ${def.id}: missing "ground" layer`);
  ground.setDepth(4);
  ground.setCollisionByExclusion([-1, 0]);

  const oneway = map.createLayer('oneway', tilesets, 0, 0);
  if (oneway) {
    oneway.setDepth(4);
    oneway.setCollisionByExclusion([-1, 0]);
    // One-way: only the top face collides, and only when coming down onto it.
    oneway.forEachTile((tile) => {
      if (tile.index > 0) tile.setCollision(false, false, true, false, false);
    });
    oneway.calculateFacesWithin(0, 0, map.width, map.height);
  }

  const decor = map.createLayer('decor', tilesets, 0, 0);
  decor?.setDepth(6);
  const hazards = map.createLayer('hazards', tilesets, 0, 0);
  hazards?.setDepth(5);

  const objectLayer = map.getObjectLayer('objects');
  const objects = (objectLayer?.objects ?? []) as unknown as TiledObjectLike[];
  const spawns = new Map<string, { x: number; y: number }>();
  for (const obj of objects) {
    if (objectType(obj) === 'player_spawn') {
      const x = (obj.x ?? 0) + (obj.width ?? 0) / 2;
      const y = (obj.y ?? 0) + (obj.height ?? 0);
      spawns.set(obj.name || 'start', { x, y });
    }
  }
  if (!spawns.has('start')) {
    const first = spawns.values().next().value as { x: number; y: number } | undefined;
    spawns.set('start', first ?? { x: CONFIG.TILE * 2, y: CONFIG.TILE * 13 });
  }

  const mapProps = { properties: map.properties as unknown as { name: string; value: unknown }[] };
  return {
    map,
    ground,
    oneway,
    decor,
    hazards,
    objects,
    spawns,
    widthPx: map.widthInPixels,
    heightPx: map.heightInPixels,
    music: getProp(mapProps, 'music', def.music),
    parallaxSet: getProp(mapProps, 'parallaxSet', def.parallaxSet),
    par: getProp(mapProps, 'par', def.par),
    name: getProp(mapProps, 'name', def.name),
  };
}
