// Data table that drives every enemy: speeds, hp, hitboxes, atlas frames (Tech Spec §1.3 #4).
export type EnemyId = 'seagull' | 'crow' | 'freeze' | 'scooter' | 'cone' | 'slug' | 'cart' | 'goose';

export interface EnemyDef {
  id: EnemyId;
  frame: string;
  speed: number;
  hp: number;
  stompable: boolean;
  w: number;
  h: number;
  /** Walk off ledges (Goomba) or turn (red Koopa) by default; Tiled prop `turnAtEdges` overrides. */
  turnAtEdges: boolean;
  /** Extra per-type numbers. */
  params: Record<string, number>;
}

export const ENEMIES: Record<EnemyId, EnemyDef> = {
  seagull: { id: 'seagull', frame: 'seagull', speed: 70, hp: 1, stompable: true, w: 48, h: 36, turnAtEdges: false, params: { swoopAmp: 60, swoopHz: 0.6 } },
  crow: { id: 'crow', frame: 'crow_walk', speed: 90, hp: 1, stompable: true, w: 44, h: 36, turnAtEdges: true, params: { shellSpeed: 520, shellW: 38, shellH: 34, flyAmp: 40, flyHz: 0.5, flyRange: 220 } },
  freeze: { id: 'freeze', frame: 'freeze', speed: 0, hp: 1, stompable: false, w: 56, h: 90, turnAtEdges: false, params: { pulseMs: 3000, pulseRadius: 110, knockback: 420, thawMs: 3000 } },
  scooter: { id: 'scooter', frame: 'scooter', speed: 620, hp: 1, stompable: true, w: 60, h: 40, turnAtEdges: false, params: { hornMs: 800 } },
  cone: { id: 'cone', frame: 'cone', speed: 140, hp: 1, stompable: true, w: 32, h: 48, turnAtEdges: false, params: { hopVy: -520, hopEveryMs: 900 } },
  slug: { id: 'slug', frame: 'slug', speed: 35, hp: 1, stompable: true, w: 64, h: 28, turnAtEdges: true, params: {} },
  cart: { id: 'cart', frame: 'cart_run', speed: 60, hp: 1, stompable: true, w: 64, h: 56, turnAtEdges: true, params: { chargeSpeed: 380, losRange: 420, losHeight: 90, chargeMs: 1600, coolMs: 900 } },
  goose: { id: 'goose', frame: 'goose_honk', speed: 110, hp: 3, stompable: true, w: 70, h: 72, turnAtEdges: true, params: { chargeSpeed: 360, honkMs: 900, stunMs: 2000, idleMs: 700, hopVy: -980, hopMaxVx: 320, phase2Hp: 1, hurtMs: 700 } },
};

/** Tiled `enemy:<id>` → definition, or undefined (caller logs once). */
export function enemyDef(id: string): EnemyDef | undefined {
  return (ENEMIES as Record<string, EnemyDef>)[id];
}
