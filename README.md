# JIMOTHY: A Seattle Story

A cozy Mario-style platformer starring Jimothy, Ballard's short-spined raccoon. Phaser 3 +
TypeScript + Vite; browser first, landscape phone (Capacitor) later, one codebase.

**Status:** World 1-1 "Welcome to Ballard" is playable end to end — Boot → Title → Intro → World
Map → 1-1 (with the storm-drain bonus room) → Level Clear → back to the map, with saving. See
`CLAUDE.md` for the build plan and `docs/` for the design bundle.

## Run it

```
npm install
npm run dev          # http://localhost:5173
```

Controls: ← → move · ↓ crouch · ↑ jump · **A** throw (Rain Jacket) · **S** sprint · **Space** pause.
Gamepad: d-pad / stick, Up = jump, A/B buttons (Options → "Modern" puts jump on A).
Touch controls appear automatically on phones; add `?touch=1` to force them on desktop.
Backtick toggles the debug overlay; `?debug=1` draws physics bodies.

## Scripts

| Command | What it does |
|---|---|
| `npm run build` | typecheck + static build to `dist/` (`base: './'`, so it works from any Pages subpath) |
| `npm run lint` / `npm run test` | ESLint · Vitest (input edge detection, jump-feel sim, save migration) |
| `npm run test:e2e` | Playwright smoke test: boots, starts 1-1, runs right, no console errors. Set `CHROMIUM_PATH` to use a preinstalled Chromium. |
| `npm run gen:art` | builds every sprite, the World 1 tileset and the parallax layers from the Higgsfield images (needs ImageMagick) |
| `npm run pack:atlases` | packs `art/sprites/*` into `public/assets/atlases/*.png + .json` |
| `npm run gen:level` | regenerates `public/assets/maps/1-1.tmj` and `1-1-bonus.tmj` from `scripts/gen-level.mjs` |
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
single pose for now (no frame-by-frame animation yet). All music and SFX are synthesized in
`AudioManager` until real tracks land in `public/assets/audio/`.

Deviation from the spec worth knowing: `JUMP_HOLD_GRAVITY_SCALE` is 0.6 (spec says 0.45) because
with the spec's gravity and jump velocity 0.45 gives a 4.6-tile jump; 0.6 lands the full jump on
the spec's 4.0 tiles (asserted in `tests/unit/jump.test.ts`).

## Deploying

`npm run build` → upload `dist/`. This repository's GitHub Pages serves the blog from the branch
root, so the game is not auto-deployed yet; a workflow that builds `jimothy/` into a `play/`
subfolder is the next step.
