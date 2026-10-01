import Phaser from 'phaser';
import type { TiledObjectLike } from '../../core/tiled';
import type { Enemy } from './Enemy';
import { HoppingCone } from './HoppingCone';
import { Seagull } from './Seagull';

type Factory = (scene: Phaser.Scene, x: number, y: number, obj?: TiledObjectLike) => Enemy;

/** Tiled `enemy:<id>` → class. Adding an enemy = one data entry + one behavior class + one line here. */
export const ENEMY_FACTORIES: Record<string, Factory> = {
  seagull: (s, x, y, o) => new Seagull(s, x, y, o),
  cone: (s, x, y, o) => new HoppingCone(s, x, y, o),
};

const warned = new Set<string>();

export function spawnEnemy(scene: Phaser.Scene, id: string, x: number, y: number, obj?: TiledObjectLike): Enemy | undefined {
  const make = ENEMY_FACTORIES[id];
  if (!make) {
    if (!warned.has(id)) {
      warned.add(id);
      console.warn(`[level] no enemy class for "enemy:${id}" yet — skipped`);
    }
    return undefined;
  }
  return make(scene, x, y, obj);
}

export { Enemy } from './Enemy';
export type { EnemyContext } from './Enemy';
