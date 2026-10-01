# JIMOTHY — Art & Audio Specification

---

## 1. Art direction

**One line:** *Ori's luminous, misty, hand-painted atmosphere, with MapleStory's chunky, rounded, instantly-readable characters — set in a Seattle that is always ten minutes after a rain shower.*

### 1.1 Style rules
| Rule | Do | Don't |
|---|---|---|
| Rendering | Soft painterly shading, visible brush texture, rim-light on every character | Flat vector, cel-shading with hard black outlines, pixel art |
| Light | Everything has a glow source: porch lights, neon, lattes steam-glow, puddles reflect | Flat ambient light |
| Weather | Light drizzle particle layer on most levels (toggle in options); wet surfaces = subtle specular strip | Heavy rain that hides gameplay |
| Silhouette | Every enemy/item readable as a black shape at 48 px | Detail that muddies at sprite scale |
| Color | Teal–grey base + warm amber accents; each world adds one signature hue (see §3) | Saturated primaries everywhere |
| Characters | Round, big eyes, short limbs, squash & stretch | Realistic animal anatomy |
| Text in-world | Chalkboard hand lettering, neon script | Real brand logos/fonts |

### 1.2 Palette (base tokens)
```
--sky-teal       #6E9AA6
--mist           #B8C9CE
--cedar-dark     #1F3A33
--moss           #5E8C5A
--porch-amber    #F2B35B
--neon-coral     #FF6F61
--puddle-blue    #8FB7C7
--jimothy-grey   #8E8A86
--jimothy-dark   #3A3633
--jimothy-cream  #E6DED3
--ui-ink         #1C2426
--ui-paper       #F4EFE6
```

---

## 2. Jimothy — character spec

**Faithful to the real raccoon.** Jimothy has short spine syndrome; the whole appeal is that he does *not* look like a regular raccoon. Every asset must hit all of these:

| Trait | Spec | Common failure (reject) |
|---|---|---|
| **Torso** | One severely compressed, solid, perfectly **spherical** ball. No chest-vs-hindquarters distinction. Stocky and dense, not fat/soft. | Elongated or pear-shaped body; "chubby normal raccoon" |
| **Neck** | **None.** Head fuses straight into round shoulders — a permanent shrug, head pressed down into the body. | Any visible neck or head-on-a-stalk |
| **Tail** | **Short, stubby, truncated nub** with 2–3 rings. Enhances the ball silhouette. | Long flowing bushy tail (v1/v2 sheets got this wrong) |
| **Legs** | Normal-length limbs on a tiny body → read as **comically long and thin**. Stiff, awkward, heavy-set, slightly spider-like lope. | Short stubby cartoon legs |
| **Posture** | **Quadruped**, on all fours, always. Moves with rectangular stiffness, like a small person in a badly fitting raccoon suit. | Upright/bipedal poses |
| **Face** | **Wide, flat, rectangular**; short blunt snout, not a pointed wedge. | Pointy fox-like muzzle |
| **Eyes** | Set **forward** on the front of the face, direct and human-like; with the mask he looks like a person in novelty glasses. Default expression: deadpan stare. | Side-set animal eyes; big anime sparkle eyes |
| **Fur** | Standard grey/black/white, but exceptionally **thick, dense, fluffy** because it's compressed onto a small body. | Sleek or short fur |

Reference sheets: `art/21_jimothy_sheet_v3.png` (poses) and `art/22_jimothy_expressions_v3.png` (face/turnaround) are the **approved** direction. `art/01` (upright chubby) and `art/11` (long tail) are rejected — kept only for comparison.

**Sprite sizes (logical px):** small 56×48 (wide, not tall), big 72×62, crouch 56×24. Atlas drawn at 2× for retina.

**Animation list (frames @ 12 fps unless noted):**
| Anim | Frames | Notes |
|---|---|---|
| idle | 6 | breathing squash; blink every ~3s (separate 2-frame overlay) |
| lope | 8 | stiff long-legged lope; ball body barely bobs while legs do all the work; ears bounce |
| sprint | 8 | legs blur, body stays rigid; motion lines (tail is a nub — it doesn't stream) |
| jump_up | 2 | legs dangle straight down (he doesn't tuck — too stiff), pure ball on top |
| jump_apex | 1 | deadpan stare at camera |
| fall | 2 | legs splayed, worried |
| land | 2 | big squash |
| crouch | 2 | pancake; eyes peek |
| crouch_walk | 4 | shuffle |
| skid | 1 | turning while running |
| hurt | 2 | flash white, blown back |
| die | 4 | classic hop-then-fall, ball shape, X eyes |
| grow / shrink | 3 each | alternating frames, 0.4s freeze |
| throw (Rain Jacket) | 3 | little paw flick |
| victory | 6 | tail up, tiny bounce |
| look_at_camera | 2 | used in 5-2 and on idle timeout (every 8s idle) |

**Power-up looks:** Big = same model 1.3×, cheeks fuller. Rain Jacket = yellow slicker with hood down, drops roll off. Flannel = plaid overlay that scrolls; glow outline cycles hue.

---

## 3. World style sheets
| World | Signature hue | Parallax far | Parallax mid | Parallax near | Ground tiles |
|---|---|---|---|---|---|
| 1 Ballard | moss green | cedar silhouettes, Olympics, breaking clouds | Craftsman houses, Locks | ferns, fence, recycling bins | wet sidewalk, moss cobble, pallets |
| 2 Pike Place | neon coral | Sound, ferry, Olympics | market arcade, generic "PUBLIC MARKET" neon, clock w/o logo | stalls, flowers, produce | cobblestone, market tile, gum wall (sticky) |
| 3 Seattle Center | electric orange/blue | Needle, skyline, stars | museum curves, fountain | glass sculptures, lamp posts | plaza stone, monorail roof, wet concrete |
| 4 Fremont | sodium orange | bridge underside | brick, rocket, signpost | ivy, bikes, graffiti | mossy stone, rebar, pillars |
| 5 Ferry | silver/white-green | Olympics, clouds | water, orcas, islands | railings, life rings | steel deck plate, crates, benches |

Each parallax layer delivered as a seamlessly tiling PNG, 2560×720 (far), 2560×720 (mid), 2560×400 (near, alpha). Backgrounds in `art/03–06, 12` are *concept paintings*; production layers are split from them or repainted to tile.

---

## 4. Enemy & boss design notes
- All stompable enemies have a **"squished" frame** (1 frame, 0.3s) and pop a tiny puff.
- **Seagull:** white/grey, red-rimmed eye, fry in beak. Walk 4f, swoop 3f, squish 1f.
- **Crow:** glossy blue-black, shiny coin in beak. Walk 4f, shell (coin rolling) 4f.
- **The Freeze:** puffy jacket + fleece vest, hood, phone glow; frost spiral aura (shader or 6f overlay). Thawed variant: looks up, small smile, 2f.
- **E-Scooter:** riderless, headlight on, speed lines. 2f roll.
- **Hopping Cone:** orange cone with spring. 3f hop.
- **Banana Slug:** 4f crawl, slime trail decal.
- **Runaway Cart:** 2f roll, child-seat flap, one squeaky wheel.
- **Canada Goose:** 4f walk, 3f honk, 4f charge, 2f flap-hop, 1f stunned (stars).
- **Bridge Troll (original):** mossy grey stone, single hubcap eye, long shaggy stone fingers, oversized flannel, dandelions on shoulders. Explicitly **not** a replica of any real sculpture: different pose (he stands/crouches freely), different face (one eye is a hubcap but the face is broad and grumpy-cute), colored flannel, and he moves. Anim: idle 4f, slam 5f, throw 4f, dazed 2f, yawn 4f, sit 3f.

---

## 5. Items & UI icons
Icon sheet: `art/08_collectibles_sheet.png`. Production: each icon 64×64 @2×, soft glow baked in.
- Latte (coin) 6f spin · Geoduck 4f wobble · Loyalty Star (plain green star + cup glyph, **not** a Starbucks logo) · Teriyaki Bowl · Rain Jacket · Flannel · Double Shot · Ferry Ticket · Paw Heart (full/empty) · Chalkboard "?" block 4f chalk shimmer · Coffee Stand checkpoint (steam 4f when active).

**HUD:** top-left, 24 px margin, paw hearts ×3, latte icon + count (hand-lettered numerals font), 3 geoduck silhouettes (fill when found). Timer top-right (off by default).
**Touch controls:** circular d-pad, two round A/B buttons, optional Jump button; 40% opacity idle, 70% when pressed; `art/09_gameplay_mockup.png` shows target layout.
**Font:** a free rounded hand-painted display font for titles (e.g., "Baloo 2" or "Fredoka" from Google Fonts, both OFL) and "Nunito" for body. Logo direction: `art/13_logo_concept.png`.

---

## 6. VFX
- Drizzle particle layer (toggleable), puddle ripples on land, steam from lattes and coffee stands, stomp puff, latte sparkle pickup, geoduck rainbow pop, Flannel plaid glow, Rain Drop splash, Freeze frost pulse ring, geyser spray, ferry spray + wind streaks, dandelion seeds (boss).

---

## 7. Audio

### 7.1 Music (loopable, OGG + M4A, -14 LUFS)
| Track | Where | Vibe | BPM |
|---|---|---|---|
| "Rain on Market St" | Title / World Map | ukulele, soft synth pad, rain bed | 90 |
| "Ballard Drizzle" | World 1 | cozy indie-folk, glockenspiel | 100 |
| "Fish Toss Shuffle" | World 2 | upright bass, brushes, muted trumpet | 118 |
| "Needle Nights" | World 3 | synthwave, arpeggios | 120 |
| "Center of the Universe" | World 4 | lo-fi guitar, vinyl crackle | 92 |
| "Troll Under the Bridge" | Boss | grunge-tinged drums, distorted bass | 140 |
| "Crossing" | World 5 | piano, strings, gull calls | 80 |
| "Flannel Power" | invincibility | 10s grunge riff loop | 150 |
| "Praise Jimothy" | Credits | full band, warm | 96 |

Source: Epidemic Sound (connected) or Higgsfield audio gen; keep stems if possible for the boss remix.

### 7.2 SFX (~40, in one Howler sprite)
jump (tiny chirp), land, stomp, crouch rustle, latte pickup (espresso "tink"), 100-latte 1-up (steam whistle + "Jimothy!" squeak), geoduck (squelch + sparkle), power-up grow (coffee pour), shrink/hurt (sad trill), death (gull laugh, then soft), block bump (chalk tap), brick break, drain enter (gurgle), checkpoint (cup clink), ferry ticket punch, level clear jingle, seagull squawk ×3, crow caw ×2, shell roll, freeze pulse (ice crackle), thaw ("oh, hey"), scooter horn, cone boing, slug squelch, cart rattle, goose honk ×2, troll slam, troll throw, car crunch, troll yawn, geyser, wind gust, orca blow, monorail hum, menu move/select/back, pause.

**Jimothy's voice:** squeaky trills, no words. The one word in the game is the 1-up "Jimothy!" (crowd-chant style).

---

## 8. Asset production pipeline
1. Concept → Higgsfield (`nano_banana_pro`) on neutral grey backgrounds (done for sheets).
2. Cut-out → `remove_background` (Higgsfield) or Adobe `image_remove_background`; hand-clean edges.
3. Frames → Higgsfield image-to-image for pose variants from the v2 sheet, *or* hand-animate in Aseprite/Spine from the sheet.
4. Pack → `free-tex-packer-cli` into atlases ≤ 2048².
5. Parallax → split concept paintings into far/mid/near, make them tile (clone-stamp seams), export 2560 wide.
6. Tiles → 48 px tileset per world (ground, one-way, decor, hazard) with 1 px extrusion to avoid seams.
