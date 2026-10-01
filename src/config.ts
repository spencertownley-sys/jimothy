// Every tunable number in the game lives here (Tech Spec §3). Gameplay code never carries
// magic numbers. Units: px, px/s, px/s², ms at the 1280×720 logical resolution.
export const CONFIG = {
  WIDTH: 1280,
  HEIGHT: 720,
  TILE: 48,
  FIXED_FPS: 60,

  GRAVITY: 2200,
  WALK_MAX: 260,
  RUN_MAX: 420,
  CROUCH_WALK_MAX: 110,
  ACCEL_GROUND: 1800,
  ACCEL_AIR: 1200,
  FRICTION: 2400,
  AIR_DRAG: 300,
  SLIME_FRICTION: 400,
  MAX_FALL_SPEED: 1100,

  JUMP_VELOCITY: -760,
  JUMP_HOLD_MS: 250,
  // The spec lists 0.45 here, but with GRAVITY 2200 / JUMP_VELOCITY -760 that gives a 4.6-tile
  // full jump. 0.6 lands the full-hold apex on the spec's ≈4.0 tiles (see tests/unit/jump.test.ts).
  JUMP_HOLD_GRAVITY_SCALE: 0.6,
  // Releasing early trims upward speed so a tap reads as a ≈2-tile hop (Mario-style jump cut).
  JUMP_CUT_FACTOR: 0.85,
  RUN_JUMP_BONUS: -90,
  RUN_JUMP_THRESHOLD: 350,
  COYOTE_MS: 90,
  JUMP_BUFFER_MS: 120,
  STOMP_BOUNCE: -420,
  STOMP_BOUNCE_HELD: -640,
  SKID_MIN_SPEED: 150,

  HURT_IFRAMES_MS: 1500,
  KNOCKBACK_IFRAMES_MS: 400,
  GROW_FREEZE_MS: 400,
  DEATH_HOP_VELOCITY: -620,
  DEATH_WAIT_MS: 1800,

  HITBOX: {
    small: { w: 56, h: 48 },
    big: { w: 72, h: 62 },
    crouchSmall: { w: 56, h: 24 },
    crouchBig: { w: 72, h: 30 },
  },

  POTHOLE_SLOW: 0.5,
  FLANNEL_MS: 10000,
  DOUBLE_SHOT_MS: 8000,
  POWERUP_WALK_SPEED: 120,
  POWERUP_RISE_MS: 500,
  LATTES_PER_LIFE: 100,
  START_LIVES: 3,
  LATTE_BLOCK_BURST: 1,

  STOMP_TOLERANCE: 14,
  ENEMY_FREEZE_SCREENS: 1.5,
  ENEMY_DESPAWN_MARGIN: 200,
  RAINDROP_MAX: 2,

  CAMERA: { DEADZONE_W: 200, DEADZONE_H: 120, LERP: 0.12, LOOKAHEAD: 60, LOOKAHEAD_LERP: 0.05 },
  PARALLAX_FACTORS: [0.1, 0.4, 0.75] as const,
  MUSIC_CROSSFADE_MS: 600,
  TILE_BIAS: 24,

  EXIT_BUS_MS: 1400,
  IDLE_LOOK_MS: 8000,
  DEBUG_KEY: 'Backquote',
} as const;

export type PowerState = 'small' | 'big' | 'jacket';
