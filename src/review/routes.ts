import { CONFIG } from '../config';
import type { GameScene } from '../scenes/GameScene';
import type { RouteCmd } from './Autopilot';

const T = CONFIG.TILE;

/** Mover legs (see GameScene.reviewMover). */
const GATE_DOWN = 2;
const GATE_RISING = 3;
const SALMON_TOP = 2;

const leg = (col: number, n: number) => (gs: GameScene): boolean => gs.reviewMover(col)?.leg === n;

/** A live enemy of this kind within `range` px of the column. */
const enemyNear = (gs: GameScene, id: string, col: number, range: number) =>
  gs.enemySnapshot().find((e) => e.id === id && e.alive && Math.abs(e.x - (col * T + T / 2)) < range);

/**
 * The intended way through each level, for the route review (ReviewScene). Columns are tile
 * columns (x / 48), the same numbers as the ASCII maps in scripts/gen-level.mjs. Between
 * instructions the autopilot hops walls and gaps by itself, so a route only spells out the
 * moments that matter: blocks to bonk, geoducks to grab, things to wait for.
 */
/** Wait on the first arena ledge for the goose to land dizzy, then drop on it. */
function gooseRound(note: string): RouteCmd[] {
  const goose = (gs: GameScene): number => (gs.reviewBoss()?.x ?? gs.player.x) / T - 0.5;
  // a short run-up: 2½ tiles short of wherever it landed (never into the left wall)
  const runUp = (gs: GameScene): number => Math.max(217, goose(gs) - 2.5);
  const alive = (gs: GameScene): boolean => gs.reviewBoss() !== undefined;
  const round: RouteCmd[] = [
    { to: 218, note },
    { until: (gs) => { const g = gs.reviewBoss(); return !g || g.mode === 'stun'; } },
    { to: runUp, tol: 20, sprint: true, noJump: true, note: 'Dizzy! Stomp it' },
    { jump: 300, to: goose, sprint: true, done: (gs) => gs.reviewBoss()?.mode !== 'stun' },
    { until: (gs) => { const g = gs.reviewBoss(); return !g || g.mode !== 'stun'; }, max: 2500 },
  ];
  return round.map((c) => ({ ...c, when: alive }));
}

export const ROUTES: Record<string, RouteCmd[]> = {
  '1-1': [
    { note: 'Welcome to Ballard: run right' },
    { to: 34, note: 'Jump into the ? block from below' },
    { jump: 300 },
    { wait: 650, note: 'The Teriyaki rises out and slides off to the right' },
    { to: 46, note: 'Chase it down: Teriyaki makes Jimothy big' },
    { to: 71, note: 'Up the fence steps and over the rooftops' },
    { to: 80, crouch: true, note: 'Big Jimothy crouches (↓) to fit under the building: Geoduck #1' },
    { to: 194, note: 'Hop the potholes and gaps; stomp what you like' },
    { to: 197, note: 'This drain (hold ↓) leads to the Storm Drain bonus room and Geoduck #2' },
    { to: 219, note: 'Climb the fences on the right for Geoduck #3' },
    { jump: 300, to: 222 },
    { jump: 300, to: 226 },
    { to: 236, note: 'Ride the 44 home: the bus stop is the exit' },
  ],
  '1-2': [
    { note: 'The Locks: stomp the crow, then kick its shell into the gulls' },
    { to: 52 },
    { to: 62, note: 'Up the lock wall' },
    { until: leg(64, GATE_DOWN), note: 'Wait for lock gate #1 to sink into its slot' },
    { to: 64, tol: 6, noJump: true, note: 'Drop into the slot: Geoduck #1 is down there' },
    { until: leg(64, GATE_RISING), note: 'Stand on the gate: it lifts you out like an elevator' },
    { until: (gs) => (gs.reviewMover(64)?.progress ?? 0) > 0.75 },
    { to: 68, note: 'Hop off onto the lock wall' },
    { to: 113, note: 'Down to the canal path; banana slug trails are slippery' },
    { until: leg(116, GATE_DOWN), note: 'Gate #2: wait for it to sink' },
    { to: 160, note: 'Herschel the sea lion is immune to everything. Checkpoint ahead' },
    { to: 165, note: 'The salmon ladder: ride each fish at the top of its leap' },
    { until: leg(168, SALMON_TOP) },
    { jump: 300, to: 168 },
    { jump: 300, to: 171 },
    { until: leg(175, SALMON_TOP) },
    { jump: 300, to: 175 },
    { jump: 300, to: 178 },
    { until: leg(182, SALMON_TOP) },
    { jump: 300, to: 182 },
    { jump: 300, to: 185 },
    { until: leg(189, SALMON_TOP) },
    { jump: 300, to: 189 },
    { jump: 300, to: 192 },
    { to: 197, note: 'Skip the last salmon: drop to the low dock for Geoduck #2' },
    { until: leg(197, 1), note: 'The last salmon lifts you back up' },
    { until: (gs) => (gs.reviewMover(197)?.leg ?? 0) === SALMON_TOP },
    { jump: 300, to: 202 },
    { to: 222, note: 'A crow is carrying Geoduck #3 over the canal' },
    { jump: 300, to: 226 },
    { until: (gs) => { const c = enemyNear(gs, 'crow', 229, 500); return !c || Math.abs(c.x - gs.player.x) < 90; }, note: 'Jump as it passes overhead and stomp it' },
    { jump: 300, dir: 0 },
    { jump: 300, to: 232 },
    { jump: 300, to: 237 },
    { to: 284, note: 'All aboard the lock boat' },
  ],
  '1-3': [
    { note: 'Golden Gardens at dusk: swooping gulls dive at big Jimothy' },
    { to: 58, note: 'Jump the runaway cart and the bonfire' },
    { to: 63, note: 'The lattes say jump the dip; Geoduck #1 says drop in' },
    { to: 89, note: 'The driftwood see-saw by the bathhouse' },
    { jump: 300, to: 94.6, keep: true, done: (gs) => gs.player.body.velocity.y < -950, note: 'Land on the see-saw\u2019s right end holding jump: big launch' },
    { to: 101, air: true, holdJump: true, sprint: true, note: 'Steer onto the bathhouse roof: Geoduck #2' },
    { to: 101 },
    { to: 118, note: 'Hop the bonfires; checkpoint between them' },
    { to: 145, note: 'Jump the tidal inlet' },
    { to: 212, note: 'Driftwood ledges, one more bonfire… BEWARE OF GOOSE' },
    { to: 221, note: 'Into the arena: the walls drop behind you' },
    ...gooseRound('Keep clear. It honks, charges, hits the wall, then hops at you'),
    ...gooseRound('Three stomps. After the second it charges there and back'),
    ...gooseRound('Again: wait for the hop'),
    ...gooseRound('Again: wait for the hop'),
    ...gooseRound('Again: wait for the hop'),
    ...gooseRound('Again: wait for the hop'),
    { to: 245, note: 'Not a scratch: Geoduck #3 appears over the middle ledge' },
    { to: 239.5, sprint: true, noJump: true, tol: 20 },
    { jump: 300, to: 234.6, sprint: true },
    { to: 233.9, tol: 6, noJump: true },
    { jump: 300, dir: 0 },
    { to: 258, note: 'Paddle off in the kayak' },
  ],
  '1-1-bonus': [
    { note: 'Storm Drain: lattes along the pipes' },
    { to: 5 },
    { jump: 300, to: 9 },
    { to: 14 },
    { jump: 300, to: 17 },
    { to: 19, note: 'Geoduck #2 sits on the top ledge' },
    { to: 23, note: 'Hold ↓ on the drain to climb back out to 1-1' },
    { press: 'down', ms: 400 },
  ],
};

export function routeFor(levelId: string): RouteCmd[] {
  return ROUTES[levelId] ?? [{ note: 'No route written for this level yet: running right' }];
}
