# JIMOTHY — Asset Manifest

Status key: ✅ concept done (in `art/`) · 🔧 needs production cut/animation · ⬜ not started

## A. Concept art delivered (Higgsfield, nano_banana_pro, 2K)
| File | Purpose | Status / notes |
|---|---|---|
| `art/01_jimothy_character_sheet.png` | Hero sheet v1 (upright, chubby) | ❌ Rejected — generic raccoon |
| `art/11_jimothy_character_sheet_v2.png` | Hero sheet v2 (quadruped but long tail, normal face) | ❌ Rejected — still a regular raccoon |
| `art/21_jimothy_sheet_v3.png` | Hero pose sheet v3 (sphere body, no neck, stub tail, long legs, flat face) | ✅ **Approved** → 🔧 cut frames |
| `art/22_jimothy_expressions_v3.png` | Expressions + turnaround v3 | ✅ **Approved** → 🔧 |
| `art/26_jimothy_story_beats_v3.png` | Troll friend / ferry / home panels | ✅ reference for postcards & ending |
| `art/02_title_key_art.png` | Title screen background (old Jimothy) | ❌ superseded by `23` |
| `art/23_title_key_art_v3.png` | Title screen background | ✅ |
| `art/09_gameplay_mockup.png` | HUD mockup (old Jimothy) | ❌ superseded by `24` |
| `art/24_gameplay_mockup_v3.png` | HUD + touch layout target | ✅ reference only |
| `art/13_logo_concept.png` | Logo (old Jimothy on the Y) | ❌ superseded by `25` |
| `art/25_logo_concept_v3.png` | Logo/title treatment | ✅ → 🔧 vectorize / rebuild in font |
| `art/03_bg_world1_ballard.png` | World 1 parallax concept | ✅ → 🔧 split to 3 tiling layers |
| `art/04_bg_world2_pike_place.png` | World 2 parallax concept | ✅ → 🔧 split; **replace "PUBLIC MARKET CENTER" lettering + clock with generic neon** before ship |
| `art/05_bg_world3_seattle_center.png` | World 3 parallax concept | ✅ → 🔧 split |
| `art/06_bg_world4_under_the_bridge.png` | World 4 / boss arena concept | ✅ → 🔧 split |
| `art/12_bg_world5_ferry.png` | World 5 parallax concept | ✅ → 🔧 split |
| `art/07_enemy_sheet.png` | 9 enemies, side view | ✅ → 🔧 cut + animate |
| `art/08_collectibles_sheet.png` | 15 items/icons | ✅ → 🔧 cut to 64×64 @2×; **replace "FERRY"/"Jimothy"/"12" text if it renders badly at size** |
| `art/10_boss_troll_sheet.png` | Bridge Troll (original design) | ✅ → 🔧 cut + animate (ignore the old-style Jimothy cameo in panel 3; use `26`) |

## B. Production sprites needed (per `docs/04_ART_AUDIO_SPEC.md`)
| Atlas | Contents | Frames (approx) | Status |
|---|---|---|---|
| `jimothy` | all hero anims × 3 power states | ~60 × 3 | ⬜ |
| `enemies_w1` | seagull, crow, cone, slug, cart, goose | ~45 | ⬜ |
| `enemies_w2` | + freeze, scooter, salmon platform | ~25 | ⬜ |
| `enemies_boss` | troll | ~25 | ⬜ |
| `items` | lattes, geoducks, power-ups, blocks, checkpoint, ticket | ~40 | ⬜ |
| `ui` | hearts, counters, buttons, d-pad, frames, postcards | ~40 | ⬜ |
| `tiles_w1..w5` | 48 px tilesets (ground/oneway/decor/hazard) | ~64 each | ⬜ |
| `bg_w1..w5` | far/mid/near tiling layers, 2560 wide | 3 each | ⬜ |
| `fx` | drizzle, puffs, sparkles, splash, frost ring, seeds | ~30 | ⬜ |

## C. Audio
| Asset | Count | Source | Status |
|---|---|---|---|
| Music tracks | 9 | Epidemic Sound search or Higgsfield audio | ⬜ |
| SFX | ~40 | Epidemic Sound SFX / freesound (CC0) / generated | ⬜ |
| Jimothy squeaks | 6 | generated / recorded | ⬜ |

## D. Fonts (OFL)
Display: Baloo 2 or Fredoka · Body: Nunito · Numerals: same as display.

## E. Store/marketing (v2)
App icon 1024², landscape screenshots ×5 per platform (one per world), 15-s trailer (Higgsfield video from key art), privacy label "no data collected".

## F. Higgsfield prompt recipe (for consistent new assets)
Append to every prompt: *"Painterly luminous Ori and the Blind Forest meets MapleStory game art style, soft rim light, flat neutral light-grey background, consistent scale, no text, no labels, no watermark."*
Hero descriptor (paste verbatim — every clause matters): *"JIMOTHY, the viral Seattle raccoon with short spine syndrome — a severely compressed, solid, perfectly spherical torso with no distinction between chest and hindquarters; NO neck, head fused directly into round shoulders like a permanent shrug; an unusually SHORT STUBBY truncated tail nub (not a long tail); comically long thin legs under the tiny ball body giving a stiff, awkward, slightly spider-like lope, like a small person in a badly fitting raccoon suit; a wide, flat, rectangular face with a short blunt snout (not pointed) and forward-facing human-like eyes behind the black bandit mask, like novelty glasses; dense, exceptionally thick fluffy grey-black-white fur; quadruped, on all fours, never upright; default expression deadpan."*
Use `21_jimothy_sheet_v3.png` + `22_jimothy_expressions_v3.png` as image references for image-to-image pose variants.
