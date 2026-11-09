import { CONFIG } from '../config';
import type { GameScene } from '../scenes/GameScene';
import type { RouteCmd } from './Autopilot';

const T = CONFIG.TILE;

/** Mover legs (see GameScene.reviewMover). */
const GATE_DOWN = 2;
const GATE_RISING = 3;
const SALMON_TOP = 2;

const leg = (col: number, n: number) => (gs: GameScene): boolean => gs.reviewMover(col)?.leg === n;

/** The column a moving platform near `col` is at right now (to jump onto it). */
const moverCol = (col: number) => (gs: GameScene): number => (gs.reviewMover(col)?.x ?? col * T) / T - 0.5;

/**
 * A salmon toss from the left fishmonger at `handCol` is `ms` from leaving his hands. The fish is
 * solid only from above and climbs faster than Jimothy, so the way on is to jump *before* the
 * throw: he peaks just as it appears under him and lands on it on the way up.
 */
const throwIn = (handCol: number, ms: number) => (gs: GameScene): boolean => {
  const m = gs.reviewMover(handCol + 3);
  return Boolean(m && !m.visible && Math.abs(m.x - (handCol * T + T / 2)) < 2 * T && m.msToShow <= ms);
};

/** Board a salmon toss: stand under the hand, jump just before the throw, ride it to `offCol`. */
function rideToss(handCol: number, standCol: number, offCol: number, note: string): RouteCmd[] {
  return [
    { to: standCol, tol: 8, note },
    { until: throwIn(handCol, 420), note: 'Jump just before the throw…' },
    { jump: 300, to: moverCol(handCol + 3), done: (gs) => gs.player.lastGrounded },
    { until: (gs) => gs.player.x > offCol * T || !gs.player.lastGrounded, note: 'Ride it' },
  ];
}

/** Stand in the fountain jet at `col` until it launches him, then steer (holding jump) to `landCol`. */
function rideJet(col: number, landCol: number, note: string, hopOn = false): RouteCmd[] {
  return [
    ...(hopOn ? [{ jump: 300, to: col, sprint: true, note: note || undefined } as RouteCmd] : []),
    { to: col, tol: 10, noJump: true, note: hopOn ? undefined : note || undefined },
    { until: (gs) => gs.player.body.velocity.y < -300, max: 4000 },
    { to: landCol, air: true, holdJump: true },
    { to: landCol },
  ];
}

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
  '2-1': [
    { note: 'Pike Place: fishmongers lob salmon across the gaps. Ride one' },
    ...rideToss(31, 31.4, 39.5, 'Stand under the fishmonger'),
    { to: 56, note: 'Bonk the ? block: Teriyaki' },
    { jump: 300 },
    { wait: 600 },
    { to: 59 },
    { to: 69, note: 'Over the Freeze on the stall awning' },
    ...rideToss(84, 84.4, 89.5, 'The long throw: ride it to its peak'),
    { until: (gs) => gs.player.lastGrounded && gs.player.y < 5 * T, max: 4000, note: 'It drops you on the upper arcade' },
    { to: 93, note: 'Geoduck #1' },
    { to: 110 },
    { to: 136, note: 'Dahlia buckets bounce you up to the flower-stall roofs' },
    { to: 143.5, note: 'The brass pig: stand on it for three seconds' },
    { wait: 3300 },
    { to: 172, note: 'Ten lattes. Checkpoint, then the second toss' },
    ...rideToss(176, 175.3, 184.5, 'Second toss over the gap'),
    { to: 196, note: 'Bump the fish-ice display from below: Geoduck #2' },
    { jump: 300 },
    { to: 189, noJump: true, note: 'Back up, then a running jump onto the display' },
    { to: 191.6, sprint: true, noJump: true, tol: 20 },
    { jump: 300, to: 196, sprint: true },
    { to: 238, note: 'Over the crow line' },
    { jump: 300, to: 241, keep: true, done: (gs) => gs.player.body.velocity.y < -950, note: 'Bounce on the dahlias holding jump: up to the Sanitary Market walkway' },
    { to: 245, air: true, holdJump: true },
    { to: 262, noJump: true, note: 'Geoduck #3 behind the crow nest' },
    { to: 310, note: 'Out on the delivery hand truck' },
  ],
  '2-2': [
    { note: 'The Gum Wall: down Post Alley and back up' },
    { to: 27, noJump: true, note: 'Most players drop onto the ledge. Leap past it instead…' },
    { to: 29.5, sprint: true, noJump: true, tol: 20 },
    { jump: 300, to: 40.6, sprint: true, note: '…and push into the gum wall: it slows the fall to a slide' },
    { to: 39.5, tol: 6, noJump: true, note: 'Geoduck #1 at the foot of the gum' },
    { jump: 300, dir: 0 },
    { to: 52, note: 'The low corridor: bonk the ? block for the Rain Jacket' },
    { jump: 300 },
    { wait: 650 },
    { to: 57 },
    { press: 'a', ms: 60, note: 'A throws Rain Drops at the slug line' },
    { wait: 300 },
    { press: 'a', ms: 60 },
    { to: 72, note: 'Gum blobs on the floor are slippery; a scooter honks, then shoots through' },
    { to: 76.5, tol: 8, note: 'The theater\u2019s stage door: press ↓' },
    { press: 'down', ms: 200 },
    { until: (gs) => gs.player.x > 120 * T, max: 1500 },
    { to: 137, note: 'A hidden alcove: Geoduck #2' },
    { to: 132.5, tol: 8 },
    { press: 'down', ms: 200, note: 'Back out through the door' },
    { until: (gs) => gs.player.x < 100 * T, max: 1500 },
    { to: 106, note: 'The courtyard. First, the tipped e-scooter' },
    { jump: 120, to: 110, keep: true, done: (gs) => gs.player.body.velocity.y < -1100, note: 'Hop onto it holding jump: a huge launch' },
    { to: 120.5, air: true, holdJump: true, sprint: true, note: 'Steer onto the high ledge: Geoduck #3' },
    { to: 120.5 },
    { to: 101, note: 'Climb the fire escapes' },
    { jump: 300, to: 99.5 },
    { jump: 300, to: 104.5 },
    { jump: 300, to: 99.5 },
    { jump: 300, to: 104.5 },
    { jump: 300, to: 99.5 },
    { jump: 300, to: 104.5 },
    { to: 125, note: 'The service elevator down to the waterfront' },
  ],
  '2-3': [
    { note: 'Waterfront Run: a flock of gulls chases you the whole way' },
    { to: 9, note: 'Double Shot early: sprint without holding B' },
    { jump: 300 },
    { to: 5, noJump: true, note: 'It sits on the block: a running jump onto it' },
    { to: 6.8, sprint: true, noJump: true, tol: 20 },
    { jump: 300, to: 9, sprint: true },
    { to: 60, note: 'Past the Freeze, to the Great Wheel' },
    { until: (gs) => { const d = gs.reviewGeoduck(0); return !d || (d.y > 6.6 * T && Math.abs(d.x - gs.player.x) < 2.5 * T); }, max: 17000, note: 'Geoduck #1 rides a gondola: wait for it to come round the bottom' },
    { jump: 300, to: (gs) => (gs.reviewGeoduck(0)?.x ?? gs.player.x) / T - 0.5, when: (gs) => gs.reviewGeoduck(0) !== undefined },
    { to: 103, note: 'Out on the side pier the flock waits for you: Geoduck #2 at the end' },
    { to: 100.5, noJump: true, note: 'Climb to the promenade' },
    { jump: 300, to: 100.5 },
    { jump: 300, to: 102 },
    { to: 141, note: 'The World\u2019s Largest Fry' },
    { to: 143, note: 'Flannel mid-run' },
    { jump: 300 },
    { wait: 500 },
    { to: 223, note: 'Checkpoint, a runaway cart, then the aquarium' },
    { to: 226, note: 'Bump the aquarium window from below: Geoduck #3' },
    { jump: 300 },
    { to: 219, noJump: true },
    { to: 221.6, sprint: true, noJump: true, tol: 20 },
    { jump: 300, to: 226, sprint: true },
    { to: 331, note: 'Piers and gaps to the water taxi' },
    { jump: 300, to: 337, sprint: true, note: 'Leap onto the departing water taxi' },
  ],
  '3-1': [
    { note: 'Fountain Plaza at night: jets fire every 2 s and launch you up' },
    { to: 35, note: 'Teriyaki in the ? block' },
    { jump: 300 },
    { wait: 650 },
    { to: 39 },
    ...rideJet(41, 47, 'The jet at the lip of the pit is the way across'),
    { to: 92, note: 'The Freeze pair, crows, a cone…' },
    ...rideJet(94, 99, 'The triple fountain: hold jump and ride it up to the lamp wire'),
    { to: 100, note: 'Geoduck #1 on the wire' },
    { to: 111, note: 'Rain Jacket in the ? block' },
    { jump: 300 },
    { wait: 650 },
    { to: 114, noJump: true },
    { to: 116.4, sprint: true, noJump: true, tol: 20 },
    ...rideJet(121.5, 126.5, 'Jet to jet across the gaps', true),
    ...rideJet(126.5, 132, ''),
    { to: 170, note: 'It is 12:04 AM. Checkpoint, then the glass garden' },
    { to: 186, crouch: true, note: 'Crouch (↓) through the glowing tube: Geoduck #2 inside' },
    { to: 197, noJump: true, note: 'Stepping-stone islands, each with a jet' },
    { to: 199.4, sprint: true, noJump: true, tol: 20 },
    ...rideJet(204.5, 209.5, '', true),
    ...rideJet(209.5, 214.5, ''),
    ...rideJet(214.5, 220, ''),
    { to: 231, note: 'A hidden block at the Needle\u2019s leg' },
    { jump: 300 },
    { to: 224, noJump: true, note: 'Geoduck #3 pops out on top: a running jump onto it' },
    { to: 226.6, sprint: true, noJump: true, tol: 20 },
    { jump: 300, to: 231, sprint: true },
    { to: 286, note: 'The monorail station: doors open' },
  ],
  '3-2': [
    { note: 'Monorail: the camera rides with the train. Fall off or fall behind and it\u2019s a life' },
    { ride: 0.35, until: (gs) => gs.player.x > 40.6 * T, note: 'Duck (↓) under signal gantries…' },
    { jump: 300, dir: 1, note: '…or jump the first one: Geoduck #1 sits over it' },
    { ride: 0.4, until: (gs) => gs.player.x > 101 * T, note: 'Crows dive from above; gulls swoop in fast' },
    { jump: 300, dir: 1, note: 'The line runs through the museum: hop onto its roof' },
    { ride: 0.45, until: (gs) => gs.player.x > 112.4 * T },
    { jump: 300, to: 117.5, sprint: true, note: 'Up to the detour on top: Geoduck #2' },
    { ride: 0.45, until: (gs) => gs.player.x > 205 * T, note: 'SEATTLE\u2019S BEST WORST TRAFFIC' },
    { ride: 0.45, until: (gs) => gs.player.x > 300 * T, note: 'Crouch the whole gantry run, then hurdle the crates' },
    { ride: 0.3, until: (gs) => gs.reviewGeoduck(2) === undefined || gs.reviewScrollX > 330 * T, note: 'The train pulls ahead: Geoduck #3 rides at the back of the car' },
    { to: (gs) => (gs.reviewGeoduck(2)?.x ?? gs.player.x) / T - 0.5, tol: 6, when: (gs) => gs.reviewGeoduck(2) !== undefined },
    { to: 369, note: 'Westlake station' },
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
