# CLAUDE.md — JIMOTHY: A Seattle Story

> Primary instruction set for Claude Code. Read fully before writing code.
> Companion docs live in `docs/`. When this file and a doc disagree, **this file wins** for build order and conventions; the docs win for game content (levels, enemies, art).

---

## Project overview

**What:** A Mario-style 2D side-scrolling platformer starring Jimothy, the real-life short-spined raccoon from Ballard who became Seattle's unofficial mascot in summer 2026. Every tile, enemy and item is a Seattle trope or inside joke. Painterly Ori-meets-MapleStory art.

**Who:** Casual players on a browser first (v1), then on phones held landscape via a Capacitor app (v2). Same codebase.

**MVP (end of a successful first build session):**
- Boot → Title → World Map → play **1-1 through 1-3** (incl. Goose mini-boss) → Level Clear → back to map
- Player controller with Mario feel (constants in `docs/02_TECH_SPEC.md §3`)
- Keyboard + gamepad + touch input through one `InputState`
- Lattes, 3 geoducks per level, ? blocks, bricks, drains, checkpoints, Ferry Ticket exit
- Power-ups: Teriyaki (big), Rain Jacket (throw), Flannel (invincible), Loyalty Star (1-up), Double Shot
- Enemies: Seagull, Crow, Freeze, Hopping Cone, Banana Slug, Runaway Cart, Canada Goose
- HUD, pause, game over, save to localStorage
- **Placeholder art is fine** (colored rectangles + labels) if final sprites aren't cut yet — but wire up the atlas loading so swapping is a file replace.
- Then Worlds 2–5 and the secret level, in order, per `docs/03_LEVEL_SPECS.md`.

---

## Stack

| Layer | Tech | Notes |
|---|---|---|
| Engine | Phaser 3.80+ | Arcade Physics, `fixedStep: true`, `fps: 60` |
| Lang | TypeScript 5, strict | |
| Build | Vite 5 | static `dist/` |
| Levels | Tiled `.tmj` | layer names are load-bearing (see §Level conventions) |
| Audio | Phaser Sound (Web Audio) | Howler not required unless Phaser's sprite support falls short |
| Mobile | Capacitor 6 (v2) | don't add until v1 ships; keep `TouchControls` in v1 anyway |
| Tests | Vitest, Playwright | Chromium is pre-installed in this environment; don't `playwright install` |
| Hosting | GitHub Pages via Actions | `base: './'` in Vite config |

No backend. No analytics. No external scripts.

---

## File & folder structure
```
jimothy/
├── CLAUDE.md
├── docs/                         # GDD, tech spec, level specs, art/audio spec, asset manifest, QA
├── art/                          # concept art (not shipped)
├── public/assets/
│   ├── atlases/  backgrounds/  maps/  audio/  fonts/
├── src/
│   ├── main.ts  config.ts
│   ├── core/{input,physics,save,audio}/
│   ├── entities/{Player.ts, enemies/, items/, blocks/}
│   ├── levels/{LevelLoader.ts, Parallax.ts, levels.json}
│   ├── scenes/{Boot,Title,WorldMap,Game,HUD,Pause,LevelClear,GameOver}Scene.ts
│   ├── ui/TouchControls.ts
│   └── data/{entities.ts, powerups.ts}
├── tests/{unit,e2e}/
├── scripts/pack-atlases.mjs
├── .github/workflows/deploy.yml
├── vite.config.ts  tsconfig.json  package.json
```

---

## Build steps — follow in order, commit after each

### Step 1 — Scaffold
- [ ] `npm create vite@latest . -- --template vanilla-ts`; install `phaser`, dev: `vitest`, `@playwright/test`, `eslint`, `prettier`, `free-tex-packer-cli`
- [ ] `src/main.ts`: Phaser config — `width:1280, height:720, scale:{mode:FIT, autoCenter:CENTER_BOTH}`, `physics:{default:'arcade', arcade:{gravity:{y:2200}, fps:60, fixedStep:true}}`, `pixelArt:false`, `roundPixels:true`, `backgroundColor:'#1F3A33'`
- [ ] `src/config.ts` with every constant from Tech Spec §3 (export as `const` object)
- [ ] `index.html`: full-viewport canvas, `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`, prevent arrow/space scrolling
- [ ] ESLint + Prettier; `npm run lint`, `npm run test`, `npm run build` all pass on empty project

### Step 2 — Input abstraction
- [ ] `core/input/InputState.ts`: `{left,right,down,jump,a,b,start}` + `justPressed()` edge detection, snapshot per fixed step
- [ ] `KeyboardSource` (←→↓ ↑=jump, A=a, S=b, Space=start; remappable map object), `GamepadSource` (standard mapping), `TouchSource` (fed by `ui/TouchControls.ts`)
- [ ] `TouchControls`: renders when `matchMedia('(pointer: coarse)')` or option forced; d-pad left 35%, A/B right 30%, optional Jump button; multi-touch; 48 px min targets; respects `env(safe-area-inset-*)`
- [ ] Unit tests for edge detection and simultaneous sources

### Step 3 — Player controller
- [ ] `entities/Player.ts` state machine: Idle, Run, Jump, Fall, Crouch, CrouchWalk, Skid, Hurt, Dead, Grow, Shrink, Throw, Victory
- [ ] Variable jump (hold ≤ 250 ms → gravity × 0.45), coyote 90 ms, buffer 120 ms, run-jump bonus, stomp bounce (-420 / -640 held)
- [ ] Hitbox swaps: small 56×48, big 72×62, crouch 56×24 — keep **feet anchored** when swapping
- [ ] Power state: `small | big | jacket`; `flannel` timer; `doubleShot` timer
- [ ] Debug overlay (toggle with backtick): state name, vx/vy, grounded, coyote/buffer timers
- [ ] Test: with given constants, full-hold jump apex ≈ 4.0 tiles, tap jump ≈ 2.0 tiles (assert within ±0.2 tile in a headless sim)

### Step 4 — Level loader & tiles
- [ ] `levels/levels.json` manifest: `{id, world, name, file, music, parallaxSet, timeLimit, autoScroll, wind}`
- [ ] `LevelLoader.ts`: load `.tmj`, create layers `ground` (collide), `oneway` (collide-up only via `checkCollision`), `decor`, `hazards`; spawn from `objects` by `type`
- [ ] `Parallax.ts`: 3 tileSprites with scroll factors 0.1 / 0.4 / 0.75; world-tinted sky
- [ ] Camera: deadzone 200×120, lerp 0.12, clamp to map bounds, slight look-ahead in facing direction (60 px)
- [ ] Build **1-1** in Tiled per `docs/03_LEVEL_SPECS.md` (a generated `.tmj` is acceptable; add a `scripts/gen-level.mjs` helper if faster)

### Step 5 — Items & blocks
- [ ] `Latte` (6f spin, 100 → 1-up), `Geoduck` (3/level, persists in save), `PowerUp` (rises from block, walks like a mushroom for Teriyaki; Jacket/Flannel/Star behave likewise; Double Shot static)
- [ ] `QuestionBlock` (bump from below, content from Tiled prop `item`), `Brick` (breaks when big, bounces when small), `Drain` (Down → `targetLevel`/`targetSpawn`), `ScooterPad` (trampoline), `MovingPlatform` (Tiled polyline path), `Checkpoint`, `Exit` (Ferry Ticket → LevelClear)
- [ ] Hazard tiles: `pothole` slows 50% unless jacket; `pit` kills

### Step 6 — Enemies
- [ ] `entities/enemies/Enemy.ts` base: stompable flag, `onStomp`, `onHitPlayer`, freeze when > 1.5 screens from camera, despawn on fall
- [ ] Seagull (walk, swoop variant via Tiled prop), Crow (→ shell state, shell kills enemies, can hurt player), Freeze (static, pulse every 3 s, knockback, not stompable, `thawed` for 3 s after Rain Drop), HoppingCone, BananaSlug (slime trail tiles → friction 400), RunawayCart (charge on LOS), CanadaGoose (mini-boss state machine per 1-3), RogueScooter (horn 0.8 s then cross-screen)
- [ ] Rain Drop projectile (bounces, 1 hit, max 2 on screen)
- [ ] Data table `data/entities.ts` drives speeds/hp/frames

### Step 7 — Scenes & flow
- [ ] Boot (preload per-world packs via `pack` JSON), Title (Press Start, options, gallery stub), WorldMap (nodes from `levels.json`; unlocked from save), Game, HUD (parallel scene; paw hearts, latte count, geoduck silhouettes, timer opt), Pause, LevelClear (ticket punch, lattes→lives), GameOver
- [ ] `core/save/SaveAdapter.ts` + `LocalStorageAdapter.ts`, schema `SaveV1`, migration hook
- [ ] Skippable 3-panel intro and 1-panel postcards (static images + Start to skip)

### Step 8 — Audio
- [ ] `AudioManager`: music crossfade (600 ms), ducking during Flannel, SFX pool, mobile unlock on first input, mute on `visibilitychange`
- [ ] Load placeholders (silent or simple tones) if real tracks aren't present; never crash on missing audio

### Step 9 — Worlds 2–5 + secret
- [ ] For each level in `docs/03_LEVEL_SPECS.md`: Tiled map, new mechanics (sticky wall, flying salmon, chase, geysers, auto-scroll, tilt/wind/orcas), boss
- [ ] One commit per level; smoke-test each via Playwright (loads, player can move 5 s, no console errors)

### Step 10 — Polish & QA
- [ ] Run `docs/07_QA_CHECKLIST.md`
- [ ] Lighthouse: initial load ≤ 6 MB, interactive < 3 s on fast 3G
- [ ] Deploy workflow to GitHub Pages

### Step 11 (v2) — Capacitor
- [ ] `npx cap init`, add ios/android, lock landscape, haptics on stomp/hurt/1-up, pause on background, safe areas → TouchControls
- [ ] Do **not** start this until Step 10 is done.

---

## Level conventions (Tiled)
- 48 px tiles; standard height 15 tiles; `infinite: false`
- Layer names exactly: `bg_far` `bg_mid` `bg_near` (optional image layers) · `ground` · `oneway` · `decor` · `hazards` · `objects`
- Object `type`s: `player_spawn` `checkpoint` `exit` `latte` `geoduck` `qblock` `brick` `drain` `scooter_pad` `moving_platform` `sign` `enemy:<id>`; props documented in Tech Spec §5
- Tileset images extruded 1 px (`tile-extruder`) to avoid seams at non-integer scales

## Conventions
- **Naming:** PascalCase classes/files for entities & scenes; camelCase everything else; constants `UPPER_SNAKE` in `config.ts`
- **No magic numbers in gameplay code** — everything tunable lives in `config.ts` or `data/*.ts`
- **No `any`.** Tiled object props parsed through a typed helper (`getProp<T>(obj, name, default)`)
- **Gameplay never reads key codes** — only `InputState`
- **Deterministic physics:** never use `delta` in player/enemy logic; fixed step only. Visual tweens may use delta.
- **Asset keys** = file basename (e.g., `atlas:jimothy`, `map:1-1`, `bgm:ballard`)
- **Comments:** explain *why* (feel decisions, Mario references), not what
- **Commits:** conventional (`feat(player): coyote time`), one feature per commit

## Environment variables
None in v1. (`VITE_BASE_PATH` optional for Pages subpath.)

## Gotchas
- Phaser Arcade one-way platforms: set `layer.setCollisionByProperty({oneway:true})` and `body.checkCollision.down/left/right = false` on those tiles; test crouch-drop-through is **not** a feature (Mario doesn't).
- Hitbox resize when growing: adjust `body.setSize` **and** `setOffset`, then push player up by the height delta so feet stay planted; otherwise he clips into the floor.
- Web Audio needs a user gesture — route *every* first input through `AudioManager.unlock()`.
- Arrow keys & space scroll the page — `preventDefault` in a capture-phase listener on `window`.
- `Scale.FIT` + `devicePixelRatio`: cap at 2 or low-end phones melt.
- Auto-scroller (3-2): kill the player if `x < camera.scrollX - 40`, not when off-screen bottom only.
- Freeze knockback must not chain-stun: 400 ms invulnerability after knockback.
- Don't ship real brand marks (coffee logo, market clock lockup, team logos). See GDD §12.

## Out of scope for this build
Multiplayer, leaderboards, level editor, IAP/ads, portrait mode, localization, cloud saves, achievements platform integration.
