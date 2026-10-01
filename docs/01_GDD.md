# JIMOTHY: A Seattle Story — Game Design Document

**Version:** 1.0 · **Date:** 2026-09-30 · **Owner:** Spencer Townley
**Genre:** 2D side-scrolling platformer (Mario-style) · **Platforms:** Browser (v1) → iOS/Android landscape (v2)
**Art direction:** Painterly, luminous — Ori and the Blind Forest meets MapleStory

---

## 1. Pitch

Jimothy — Ballard's short-spined, no-necked, "built different" raccoon who became Seattle's unofficial mascot in summer 2026 — has lost his cedar-tree den to a "luxury microstudio" development. He sets out across Seattle to find a new home, trotting through Ballard, Pike Place, Seattle Center, the Fremont underbelly and a Puget Sound ferry, collecting lattes, dodging seagulls and surviving the Seattle Freeze.

Simple, nostalgic Mario-feel: run, jump, crouch, stomp enemies, collect 100 lattes for a 1-up. Every tile, enemy and item is a Seattle trope, staple or inside joke. The game is a love letter, not a parody.

**Tone:** cozy, wet, glowing, funny. Think a rainy Thursday in October that somehow feels great.

---

## 2. Player fantasy & design pillars

| Pillar | What it means in the game |
|---|---|
| **Instantly readable** | If you've played Mario you can play this in 5 seconds. One jump, one run, one crouch. No tutorial screens. |
| **Seattle in every pixel** | Every asset is a recognizable local thing. Locals should laugh out loud once per screen. Non-locals should still find it charming. |
| **Short & replayable** | ~45–60 min first clear. Collect-all and speedrun hooks for repeat play. |
| **Phone-first feel, browser-first ship** | Designed around a 16:9 landscape phone from day 1 (touch zones, safe areas, 60 fps on mid-range Android), even though v1 ships in the browser. |

---

## 3. Core mechanics (Mario-derived)

### 3.1 Movement
- **Run** left/right with acceleration & friction (not instant). Hold **B** to sprint (1.6× speed, longer jump).
- **Jump** with variable height: tap = short hop, hold = full jump (hold window 0.25s). Coyote time 90ms, jump buffer 120ms.
- **Crouch** (down): shrinks hitbox to ½ height; Jimothy is *already* short, so crouch makes him a flat fuzzy pancake ("Jimothy going under things is the whole bit").
- **Stomp**: landing on an enemy from above defeats it and gives a small bounce; hold jump during bounce for a higher bounce.
- **No wall-jump, no double-jump, no dash** in v1. Keep it pure.

### 3.2 Power-ups (the "Mushroom / Fire Flower" tier)
| Power-up | Seattle item | Effect |
|---|---|---|
| Small → Big | **Teriyaki Bowl** | Jimothy grows 1.3×, can take one hit. Breaks Chalkboard Blocks when bumped from below. |
| Big → Super | **Yellow Rain Jacket** | Weather-proof: rain-puddle hazards don't slow you; press **A** to throw a **Rain Drop** projectile (bounces like a fireball). |
| Invincibility | **Flannel Shirt** | 10s star-power; music swaps to grunge riff; Jimothy glows plaid. |
| 1-Up | **Loyalty Star** (green star) | Extra life. Also awarded every 100 lattes. |
| Speed boost (temp) | **Double Shot** (two coffee cups) | 8s of permanent sprint speed. |

### 3.3 Collectibles
- **Lattes** (the coin): 100 = 1-up. Spin, float, glow.
- **Geoducks** (3 per level): hidden big collectibles — the "Star Coins". Unlock a bonus level and the gallery.
- **Ferry Ticket**: end-of-level token instead of a flagpole — Jimothy hops onto a ferry/bus/monorail that carries him off-screen.

### 3.4 Lives, damage, checkpoints
- 3 hearts shown as **raccoon paw hearts**. Small Jimothy = 1 hit → death. Big = 2. Super = 3.
- Mid-level checkpoint: a **Coffee Stand** with a steaming cup. Touch to activate.
- Game over → continue from world map with lives reset to 3. No permadeath; it's a cozy game.

### 3.5 Blocks & interactables
| Block | Seattle flavor | Behavior |
|---|---|---|
| ? Block | **Chalkboard Menu Sign** ("?" written in chalk) | Bump from below → item/latte |
| Brick | **Mossy Cobblestone / Shipping Pallet** | Breaks when Big |
| Pipe | **Storm Drain / Salmon Ladder** | Enter with Down → bonus room |
| Trampoline | **Rental E-Scooter (tipped over)** | Big bounce |
| Moving platform | **Monorail car / Ferry deck crate / Floating log** | Rides |
| Hazard tile | **Pothole Puddle** | Slows unless Rain Jacket; bottomless in some spots |

---

## 4. Enemies (all stompable unless noted)

| Enemy | Role | Behavior | Inside joke |
|---|---|---|---|
| **Seagull** (with fry) | Goomba | Waddles; some swoop in arcs | Stole your fry at the waterfront |
| **Crow** | Koopa | Walks; stomp → becomes rolling **shiny coin** shell | Seattle crows remember your face |
| **The Freeze** (pedestrian on phone) | Hammer Bro | Stands still, emits an icy aura pulse every 3s that knocks you back. Can't stomp; must go around or throw Rain Drops. | The Seattle Freeze |
| **Rogue E-Scooter** | Bullet Bill | Rolls fast across the screen, horn sound | Scooters everywhere |
| **Hopping Cone** | Spiny-lite | Hops toward you; stomp okay | Eternal road construction |
| **Banana Slug** | Slow | Leaves slippery slime trail (ice physics) | PNW slug |
| **Runaway Cart** | Chargin' Chuck | Charges when you're in line of sight | QFC parking lot |
| **Canada Goose** | Mini-boss | Honks, charges, flaps for a short hop; 3 stomps | Green Lake geese |
| **Bridge Troll** | Final boss | Slams, throws VW-sized rusty car husks, dandelion seed storm | Fremont Troll (original design, see Art Spec) |

---

## 5. World structure (5 worlds · 14 levels · ~50 min)

| World | Theme | Levels | Gimmick | Boss |
|---|---|---|---|---|
| **1 · Ballard** | Craftsman houses, cedars, Locks | 1-1, 1-2, 1-3 | Tutorial through level design; recycling bins as platforms; salmon ladder "pipes" | Canada Goose (1-3) |
| **2 · Pike Place** | Market, fish throwers, gum wall, pig | 2-1, 2-2, 2-3 | Thrown salmon as moving platforms; gum wall is sticky (slow-fall climb); flower stalls as bounce pads | Giant Seagull Flock (chase) |
| **3 · Seattle Center** | Space Needle, Monorail, MoPOP-ish | 3-1, 3-2, 3-3 | Monorail auto-scroller; fountain geysers launch you; night, glowing | "The Line" — the Freeze crowd gauntlet |
| **4 · Fremont** | Under the bridge, rocket, statues, Sunday market | 4-1, 4-2 | Vertical level under the bridge; Lenin-esque statue is just "a big guy"; Solstice bikes zip by | **Bridge Troll** (4-BOSS) |
| **5 · The Ferry** | Puget Sound crossing to Bainbridge | 5-1 (long), 5-2 (home) | Rocking deck tilts platforms; orcas breach as platforms; wind gusts | None — Jimothy finds a new cedar. Credits. |

**Secret level:** "Capitol Hill After Dark" (unlock with 30 geoducks) — neon, karaoke bar, a very loud crow DJ.

Full level-by-level specs: `03_LEVEL_SPECS.md`.

---

## 6. Story (light, Mario-weight)

- **Opening (10s, 3 panels):** Jimothy in his cedar. Chainsaw sfx. "COMING SOON: LUXE MICRO-LOFTS — STUDIOS FROM $2,950." Jimothy's face. He trots off.
- **Between worlds (1 panel each):** a postcard with one line. E.g. after World 2: *"Jimothy has acquired: a fish. He does not know why."*
- **Ending:** Bainbridge cedar. The mother raccoon from the real story is there (brief, sweet). Pan up to Rainier. Title card: *"Praise Jimothy."* Credits over a rainy skyline.
- **No dialogue, no cutscenes longer than 10s.** Everything skippable with Start.

---

## 7. Controls

### Browser (v1)
| Action | Key |
|---|---|
| Move left / right | ← / → |
| Crouch / enter drain | ↓ |
| Jump | ↑ |
| **A** (throw / confirm) | **A** |
| **B** (sprint / cancel) | **S** |
| Start / Pause | **Space** |

Keys are remappable in Options (v1.1). Gamepad: D-pad/left stick, A=jump? **No** — keep parity: Up on d-pad = jump, A button = A, B button = B. (Offer "Modern" preset with A = jump as an option.)

### Mobile (v2, landscape)
- Left third of screen: virtual d-pad (left/right/down), rendered at 40% opacity, repositionable.
- Right third: two round buttons **A** and **B**; **swipe up / tap top-right zone** = jump. Also a dedicated **Jump** button option.
- Start = pause icon top-center.
- Touch targets ≥ 48dp; respect safe areas (notch, home indicator).

---

## 8. Screens
1. **Title** — key art, "Press Start", flicker of rain. Options / Gallery / Credits.
2. **World Map** — a hand-painted Seattle map; nodes per level, ferry route dotted; shows geoducks collected.
3. **Gameplay** — HUD top-left: paw hearts, latte counter, geoducks (3 silhouettes), timer (optional, off by default).
4. **Pause** — Resume / Restart level / Options / Map.
5. **Level Clear** — Ferry Ticket punch animation, stats, lattes → lives conversion.
6. **Game Over** — "Jimothy will return." Continue / Map.
7. **Gallery** — concept art + Jimothy lore cards unlocked by geoducks.
8. **Credits** — includes "Jimothy is a real raccoon. Please do not approach him." (He is wild; WDFW says leave him be.)

---

## 9. Scope — v1 (browser) must-haves
- All 14 levels + boss + secret level
- 5 power-ups, 9 enemies, all block types
- Keyboard + gamepad
- Save progress (localStorage → later cloud)
- Audio: 6 music tracks, ~40 SFX
- 60 fps at 1280×720 logical resolution, scales to any 16:9 window

## 10. Out of scope for v1
- Multiplayer, level editor, leaderboards, IAP, ads
- Vertical/portrait orientation
- Localization (English only; UI text is minimal by design)

---

## 11. Success metrics (soft, this is a passion project)
- First-time player finishes World 1 without quitting: ≥ 80%
- Median first clear: 40–60 min
- Shareability: at least one screenshot per world that a Seattleite would post

---

## 12. Legal / sensitivity notes
- Jimothy is a real wild animal; the game's credits/title screen include a one-line "don't approach wildlife" note. Keep tone affectionate.
- Use **no real trademarks or logos**: "coffee loyalty star" not Starbucks; "Chalkboard Menu"; "the ferry"; "rocket" not Fremont Rocket signage; the troll is an **original** design (see Art Spec §4). The *Public Market* sign in concept art is reference only — final in-game sign reads **"PUBLIC MARKET"** in generic neon with no clock logo lockup, or is stylized/partially obscured.
- Mariners/Seahawks references are generic (navy/green scarf, "12").
