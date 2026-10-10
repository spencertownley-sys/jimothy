# JIMOTHY: A Seattle Story

A cozy Mario-style platformer starring Jimothy, Ballard's short-spined raccoon. Phaser 3 +
TypeScript + Vite; browser first, landscape phone (Capacitor) later, one codebase.

**Status:** World 1 (Ballard) is playable end to end — Boot → Title → opening story scene → World
Map → 1-1 "Welcome to Ballard" (with the storm-drain bonus room) → 1-2 "The Locks" → 1-3 "Golden
Gardens at Dusk" (Canada Goose mini-boss) → the World 1 postcard, with saving. 1-2 and 1-3 each
open with a short painted cutscene the first time you enter them from the map. See
`CLAUDE.md` for the build plan and `docs/` for the design bundle.

## Run it

```
npm install
npm run dev          # http://localhost:5173
```

Controls: ← → move · ↓ crouch · ↑ jump · **A** throw (Rain Jacket) · **S** sprint · **Space** pause.
Gamepad: d-pad / stick, Up = jump, A/B buttons (Options → "Modern" puts jump on A).
On phones a wooden controller appears on both sides of the game (d-pad + pause on the left,
paw-print jump, A and B on the right) so your thumbs never cover the screen; add `?touch=1` to
force it on desktop. Vibration (Options → Vibration) pulses on block bumps, hits, stomps,
power-ups, 1-ups, geoducks, the checkpoint and level clear. It works in Android browsers and the
future Capacitor app; iPhone Safari gets a light tick where supported; browsers that block it
(including pages embedded in a cross-origin frame) just skip it.
Backtick toggles the debug overlay; `?debug=1` draws physics bodies.

## Scripts

| Command | What it does |
|---|---|
| `npm run build` | typecheck + static build to `dist/` (`base: './'`, so it works from any Pages subpath) |
| `npm run lint` / `npm run test` | ESLint · Vitest (input edge detection, jump-feel sim, save migration) |
| `npm run test:e2e` | Playwright smoke test: boots, starts 1-1, runs right, no console errors. Set `CHROMIUM_PATH` to use a preinstalled Chromium. |
| `npm run gen:art` | builds every sprite, the World 1 tilesets (Ballard, lock wall, beach), water and parallax layers and the story panels from the Higgsfield images (needs ImageMagick) |
| `npm run pack:atlases` | packs `art/sprites/*` into `public/assets/atlases/*.png + .json` |
| `npm run gen:level` | regenerates the World 1 maps (`1-1`, `1-1-bonus`, `1-2`, `1-3`) in `public/assets/maps/` from `scripts/gen-level.mjs` |
| `node scripts/dev/flow.mjs out/` | dev probe that drives the built game through the whole 1-1 flow and screenshots each screen |

## Layout

```
src/
  config.ts              every tunable (physics, camera, timers)
  core/input/            InputState + Keyboard/Gamepad/Touch sources — gameplay never reads key codes
  core/save/             SaveV1 schema, migration, LocalStorageAdapter
  core/audio/            AudioManager: synthesized placeholder SFX/music, crossfade, duck, unlock, mute on hide
  core/physics/jump.ts   the jump rules, shared by the Player and the headless feel test
  entities/              Player state machine, enemies (Seagull, Hopping Cone + base), items, blocks
  levels/                levels.json manifest, Tiled loader, parallax
  scenes/                Boot, Title, Intro, WorldMap, Game, HUD, Pause, Options, Gallery, Credits, LevelClear, GameOver
  ui/                    TouchControls overlay, Menu, text styles
public/assets/           atlases, backgrounds, tilesets, maps (Tiled .tmj)
art/concept              Higgsfield concept sheets (characters, enemies, items)
art/higgsfield           Higgsfield World 1 generations (tiles, blocks, props, backgrounds)
art/sprites              cut frames that get packed into atlases — replace a PNG and re-pack to swap art
```

## Art & audio

All art is Higgsfield output. Jimothy, enemies and items are cut from the concept sheets in
`art/concept`. Tiles, blocks, props (trees, bins, signs, porch) and parallax layers are cut from
the World 1 generations in `art/higgsfield`, listed with their job ids in that folder's README.
`npm run gen:art` rebuilds everything from those images; swapping art is a file replace there
followed by `npm run gen:art && npm run pack:atlases`. Decor is placed as `prop` objects in the
map so each sprite keeps its painted shape instead of being chopped into tiles. Each sprite is a
single pose for now (no frame-by-frame animation yet). Music and sound effects are Epidemic Sound recordings in `public/assets/audio/` (see
`CREDITS.md`), fetched at boot and decoded on the first tap or key press; the synthesized sounds
in `AudioManager` remain as a fallback for anything not loaded yet.

Deviation from the spec worth knowing: `JUMP_HOLD_GRAVITY_SCALE` is 0.6 (spec says 0.45) because
with the spec's gravity and jump velocity 0.45 gives a 4.6-tile jump; 0.6 lands the full jump on
the spec's 4.0 tiles (asserted in `tests/unit/jump.test.ts`).

## Deploying

`npm run build` → upload `dist/`. This repository's GitHub Pages serves the blog from the branch
root, so the game is not auto-deployed yet; a workflow that builds `jimothy/` into a `play/`
subfolder is the next step.
