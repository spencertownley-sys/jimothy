# JIMOTHY — Technical Specification

**Version:** 1.0 · **Date:** 2026-09-30

---

## 1. Architecture overview

### 1.1 One codebase, two shells
```
┌──────────────────────────────────────────────┐
│  Game Core (TypeScript, framework-agnostic)  │
│  physics · entities · level loader · input   │
│  abstraction · audio · save system           │
└───────────────┬──────────────────────────────┘
                │ renders via
┌───────────────▼──────────────────────────────┐
│  Phaser 3 (WebGL/Canvas) — scenes, sprites,  │
│  tilemaps, camera, tweens                    │
└───────────────┬──────────────────────────────┘
       ┌────────┴─────────┐
┌──────▼──────┐    ┌──────▼─────────────────┐
│ Browser v1  │    │ Capacitor shell (v2)   │
│ Vite static │    │ iOS + Android, landscape│
│ build       │    │ lock, haptics, IAP-ready│
└─────────────┘    └────────────────────────┘
```
The browser build *is* the mobile build. Capacitor wraps the same `dist/` folder. No rewrite for v2.

### 1.2 Stack decision table
| Layer | Choice | Rationale | Rejected |
|---|---|---|---|
| Engine | **Phaser 3.80+** (Arcade Physics) | Mature 2D platformer engine, tilemap + Tiled support, WebGL w/ Canvas fallback, huge community, runs well in Capacitor. Arcade physics is exactly Mario-grade (AABB, no rotation). | Unity (overkill, WebGL bloat, bad mobile web), Godot web export (large wasm, slower mobile), PixiJS raw (would rebuild physics/tilemaps), Kaboom (less control). |
| Language | **TypeScript** | Type safety for entity/level data, refactor safety for a solo dev + Claude Code. | JS |
| Bundler | **Vite** | Fast dev, trivial static output, easy Capacitor hand-off. | Webpack |
| Level editing | **Tiled** (.tmj JSON) | Visual level design; Phaser native import; object layers for enemies/items. | Hand-written JSON (too slow for 14 levels) |
| Sprites | Texture atlases via **free-tex-packer** CLI or TexturePacker | One draw call per atlas; mobile GPU friendly. | Loose PNGs |
| Audio | **Howler.js** via Phaser's Web Audio | Mobile unlock handling, sprite sheets for SFX. | — |
| Mobile shell | **Capacitor 6** | Web-first; native plugins for haptics, status bar, orientation lock, later IAP/ads. | Cordova (dead), React Native (not for canvas games) |
| Hosting (v1) | **GitHub Pages** or **Cloudflare Pages** | Static, free, custom domain; matches your existing setups. | Vercel (fine too) |
| Save data | **localStorage** (v1) → Capacitor Preferences (v2) behind a `SaveAdapter` | No backend needed. | Supabase (not needed until leaderboards) |
| Analytics | None in v1 (privacy, simplicity). Optional Plausible later. | — |
| Testing | Vitest (core logic), Playwright (smoke: level loads, input, no console errors) | — |
| CI | GitHub Actions: lint → test → build → deploy on `main` | — |

### 1.3 Key architectural decisions
1. **Fixed timestep physics (60 Hz) decoupled from render.** Mario feel requires deterministic jumps. Phaser Arcade uses variable delta by default; we set `physics.arcade.fps = 60` and `fixedStep = true`.
2. **Logical resolution 1280×720, `Scale.FIT` + `CENTER_BOTH`.** Letterbox on odd aspect ratios. Pixel density: `resolution = Math.min(devicePixelRatio, 2)`.
3. **Input abstraction layer.** All gameplay reads from an `InputState { left, right, down, jump, a, b, start }` frame snapshot. Keyboard, gamepad, and touch each write to it. Nothing in gameplay knows about key codes.
4. **Data-driven entities.** Enemies/items are defined in `src/data/entities.ts` (speed, hp, behavior id, atlas frame). Tiled object `type` maps to an entity id. Adding an enemy = one data entry + one behavior class.
5. **Levels are Tiled maps + a tiny manifest.** `levels.json` lists `id, world, file, music, parallaxSet, timeLimit?, exits`.

---

## 2. Project structure
```
jimothy/
├── CLAUDE.md
├── docs/                      # this bundle
├── art/                       # concept art + source PSD/PNGs (not shipped)
├── public/
│   └── assets/
│       ├── atlases/           # jimothy.png/.json, enemies, items, tiles, ui
│       ├── backgrounds/       # per-world parallax layers (far/mid/near)
│       ├── maps/              # Tiled .tmj per level
│       ├── audio/             # music/*.ogg+.m4a, sfx sprite
│       └── fonts/
├── src/
│   ├── main.ts                # Phaser.Game config
│   ├── config.ts              # constants: gravity, speeds, resolution
│   ├── core/
│   │   ├── input/             # InputState, KeyboardSource, GamepadSource, TouchSource
│   │   ├── physics/           # PlayerController (state machine), constants
│   │   ├── save/              # SaveAdapter, LocalStorageAdapter
│   │   └── audio/             # AudioManager (music crossfade, sfx pool)
│   ├── entities/
│   │   ├── Player.ts
│   │   ├── enemies/           # Seagull.ts, Crow.ts, Freeze.ts, Scooter.ts ...
│   │   ├── items/             # Latte.ts, Geoduck.ts, PowerUp.ts
│   │   └── blocks/            # QuestionBlock.ts, Brick.ts, Drain.ts
│   ├── levels/
│   │   ├── LevelLoader.ts     # Tiled → tilemap + spawns
│   │   ├── Parallax.ts
│   │   └── levels.json
│   ├── scenes/
│   │   ├── BootScene.ts       # preload atlases
│   │   ├── TitleScene.ts
│   │   ├── WorldMapScene.ts
│   │   ├── GameScene.ts
│   │   ├── HUDScene.ts        # runs in parallel over GameScene
│   │   ├── PauseScene.ts
│   │   ├── LevelClearScene.ts
│   │   └── GameOverScene.ts
│   ├── ui/                    # TouchControls.ts, buttons, text styles
│   └── data/
│       ├── entities.ts
│       └── powerups.ts
├── tests/                     # vitest + playwright
├── capacitor.config.ts        # v2
├── vite.config.ts
└── package.json
```

---

## 3. Physics & feel constants (tune in `config.ts`)
All values in px/s and px/s² at 1280×720 logical. Tile size **48 px** (Jimothy is ~1.25 tiles wide, 1 tile tall when small — he's wide, not tall).

| Constant | Value | Note |
|---|---|---|
| `GRAVITY` | 2200 | |
| `WALK_MAX` | 260 | |
| `RUN_MAX` | 420 | holding B |
| `ACCEL_GROUND` | 1800 | |
| `ACCEL_AIR` | 1200 | |
| `FRICTION` | 2400 | |
| `SLIME_FRICTION` | 400 | banana slug trail |
| `JUMP_VELOCITY` | -760 | initial |
| `JUMP_HOLD_GRAVITY_SCALE` | 0.45 | while holding ↑ for ≤ 0.25s |
| `RUN_JUMP_BONUS` | -90 | added when |vx| > 350 |
| `COYOTE_MS` | 90 | |
| `JUMP_BUFFER_MS` | 120 | |
| `STOMP_BOUNCE` | -420 | -640 if jump held |
| `HURT_IFRAMES_MS` | 1500 | flicker |
| `CROUCH_HITBOX` | 56×24 | normal 56×48 (small), 72×62 (big) |

Player state machine: `Idle → Run → Jump → Fall → Crouch → Hurt → Dead`, plus `Grow/Shrink` (freeze frame 0.4s like Mario) and `Victory`.

---

## 4. Input

```ts
interface InputState { left:boolean; right:boolean; down:boolean; jump:boolean; a:boolean; b:boolean; start:boolean }
```
- **Keyboard map (default):** ArrowLeft, ArrowRight, ArrowDown, ArrowUp=jump, KeyA=a, KeyS=b, Space=start. `preventDefault` on arrows + space so the page never scrolls.
- **Gamepad:** standard mapping; d-pad up = jump; buttons 0/1 = a/b; button 9 = start. "Modern" preset swaps jump to button 0.
- **Touch (v2 + browser fallback when `pointer: coarse`):** `TouchControls` scene overlays d-pad (left 35% of screen) and A/B (right 30%). Multi-touch; a finger sliding from ← to ↓ crouch-slides without lifting. Jump = swipe-up on d-pad zone OR a third "JUMP" button (default on; configurable).
- Input read once per fixed step; edge-detect `justPressed` inside `InputState`.

---

## 5. Level data (Tiled conventions)
- Map: orthogonal, 48×48 tiles, infinite = off. Height 15 tiles (720px) for standard levels; vertical levels up to 60 tiles.
- Layers (names are load-bearing):
  - `bg_far`, `bg_mid`, `bg_near` — **image layers** or handled by `Parallax.ts` via map property `parallaxSet`.
  - `ground` — tile layer, collides.
  - `oneway` — tile layer, platforms collidable from above only.
  - `decor` — tile layer, no collide.
  - `hazards` — tile layer, `pothole`, `spikes` (rare).
  - `objects` — object layer: `type` ∈ {`player_spawn`,`checkpoint`,`exit`,`latte`,`geoduck`,`qblock`,`brick`,`drain`,`scooter_pad`,`moving_platform`,`enemy:<id>`,`sign`}.
- Map properties: `music`, `parallaxSet`, `timeLimit` (0 = none), `wind` (float, world 5), `autoScroll` (px/s, 3-2).

---

## 6. Save data
```ts
interface SaveV1 {
  v: 1;
  unlocked: string[];               // level ids
  cleared: string[];
  geoducks: Record<string, boolean[]>; // levelId → [g1,g2,g3]
  lattesTotal: number;
  bestTimes: Record<string, number>;
  options: { musicVol:number; sfxVol:number; keymap:Record<string,string>; touchLayout:'classic'|'jumpButton'; showTimer:boolean }
}
```
Single slot v1. Versioned for migration. `SaveAdapter` interface so Capacitor Preferences / cloud can replace localStorage without touching game code.

---

## 7. Performance budget (mid-range Android, e.g. Pixel 6a / Galaxy A54)
- ≤ 6 texture atlases loaded per level, each ≤ 2048² 
- ≤ 150 active physics bodies; enemies outside camera ±1.5 screens are frozen
- Parallax: 3 layers max, each a tileSprite
- Target 60 fps; hard floor 30 fps with `physics.fixedStep` keeping gameplay deterministic
- Audio: OGG + M4A fallbacks; music streamed, SFX in one sprite file
- Initial load ≤ 6 MB for Boot+Title+World 1; later worlds lazy-loaded

---

## 8. Mobile (v2) specifics
- `capacitor.config.ts`: `ios.contentInset: 'always'`, orientation locked landscape via `@capacitor/screen-orientation`.
- Safe-area insets read from CSS env() and passed to `TouchControls`.
- Haptics on stomp / hurt / 1-up (`@capacitor/haptics`), light.
- Suspend/resume: pause game on `appStateChange` inactive; mute audio.
- Store assets: 1024 icon, landscape screenshots per device class, privacy nutrition label = "no data collected".

---

## 9. Testing strategy
| Layer | What | Tool |
|---|---|---|
| Unit | PlayerController state machine, jump math (given constants, apex height = N tiles), InputState edge detection, SaveAdapter migration | Vitest |
| Integration | Every level in `levels.json` loads without missing tiles/objects; every `enemy:<id>` resolves | Vitest + headless Phaser (`phaser-headless` config, `type: HEADLESS`) |
| E2E smoke | Boot → Title → start 1-1 → move right 5s → no console errors → screenshot | Playwright (Chromium pre-installed) |
| Manual | Feel pass per level with a gamepad; touch pass on real Android + iPhone | Checklist in `07_QA_CHECKLIST.md` |

---

## 10. Build & deploy
- `npm run dev` — Vite dev server
- `npm run build` — `dist/`
- `npm run pack:atlases` — rebuild atlases from `art/sprites/**`
- `npm run deploy` — GitHub Actions on push to `main` → Pages
- v2: `npx cap add ios android && npx cap sync` → Xcode / Android Studio

Environments: local → `preview` branch (Pages preview) → `main`.
Rollback: revert commit; Pages redeploys.

---

## 11. Security / privacy
- Static site, no backend, no PII, no cookies (localStorage only, game progress).
- No third-party scripts in v1.
- CSP: `default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:`.
