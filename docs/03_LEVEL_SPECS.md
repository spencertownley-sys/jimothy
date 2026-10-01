# JIMOTHY — Level Specifications

Conventions: tile = 48 px; standard level height = 15 tiles; "screens" = 1280 px wide (≈26.7 tiles). Difficulty is 1–5. Each level lists: length, par time, gimmick, enemy roster, item placements, the 3 geoduck hiding spots, and the exit. Level designers (or Claude Code building Tiled maps) should treat **1-1 as the tutorial-by-design**: every mechanic is introduced in a safe spot before it can kill you.

Design rules that apply everywhere:
- First enemy of a new type always appears on flat ground with room to retreat.
- Never require a sprint-jump before 2-2.
- A latte trail always points the way through an ambiguous jump.
- At least one "joke screen" per level — a visual gag that doesn't affect play.
- Checkpoint (Coffee Stand) at ~55% of length.

---

## WORLD 1 — BALLARD
*Palette:* teal-grey sky, warm porch lights, mossy greens. *Music:* "Drizzle on Market St" (ukulele + soft synth, 100 bpm).
*Parallax:* far = cedar silhouettes + Olympics; mid = Craftsman houses; near = ferns + fence.

### 1-1 "Welcome to Ballard" — Difficulty 1 · 9 screens · par 1:30
- **Teaches:** run, jump, lattes, ? Chalkboard block (Teriyaki Bowl), stomp a Seagull, crouch under a low porch, one-way platforms (recycling bins), checkpoint, Ferry Ticket exit.
- **Enemies:** Seagull ×6 (walkers only), Hopping Cone ×2 (late).
- **Screens:**
  1. Jimothy's stump + the "LUXE MICRO-LOFTS" sign. Flat ground. 5 lattes in an arc teaching jump height.
  2. First Seagull walking toward you on flat ground. Chalkboard ? block above → **Teriyaki Bowl**.
  3. Recycling bins (blue/green/black) as rising steps. Latte row on top. **Geoduck #1** — behind the compost bin, needs you to crouch-walk under a porch.
  4. Porch overhang requires crouch (gap 1 tile). Joke: a "FREE" box of CRT monitors on the curb.
  5. Checkpoint coffee stand. Two seagulls in a row — stomp combo.
  6. Small pit (3 tiles) — first required jump. Pallet platforms.
  7. Hopping Cone intro, flat area. Mossy brick row overhead (breakable when Big).
  8. **Geoduck #2** — inside a storm drain (Down to enter) → bonus room with 20 lattes.
  9. **Geoduck #3** — on top of the last cedar; reachable by bouncing off the final Seagull with jump held. Exit: Ferry Ticket at a bus stop; the 44 bus pulls up and Jimothy boards.

### 1-2 "The Locks" — Difficulty 2 · 11 screens · par 2:00
- **Gimmick:** Salmon ladder — water steps rising left-to-right; **Leaping Salmon** act as timed platforms (surface for 1.2s). Lock gates open/close as doors.
- **Enemies:** Seagull ×5 (2 swoopers — intro), Crow ×3 (intro: stomp → shell slides, kills a seagull row to teach it), Banana Slug ×2.
- **Items:** Flannel Shirt in a hidden block above the first lock gate (invincibility runs through a crow+seagull gauntlet).
- **Geoducks:** (1) under the first lock gate when it's down; (2) end of the salmon ladder, skip the last salmon and drop; (3) carried by a crow — stomp it mid-flight over the canal.
- **Joke screen:** A sea lion ("Herschel") lounging, eating a salmon, immune to everything. Tourists' cameras flash.
- **Exit:** ride a lock boat.

### 1-3 "Golden Gardens at Dusk" — Difficulty 2 · 8 screens + arena · par 1:45
- **Gimmick:** Beach sand (slightly lower friction), driftwood logs as see-saw platforms, bonfires are hazards (jump over).
- **Enemies:** Seagull ×8 (swoopers dive for your Teriyaki — losing power-up on hit), Runaway Cart ×1 (intro, parking lot screen).
- **Mini-boss: CANADA GOOSE** (arena 1.5 screens, driftwood platforms). Pattern: honk-telegraph → charge across the ground (jump over) → flap-hop toward your platform → stunned 2s (stomp window). 3 stomps. Phase 2 after 2 hits: charges twice. Drops Loyalty Star.
- **Geoducks:** (1) buried — crouch-pound? No — just at the bottom of a sand dip you must *not* jump over; (2) on the bathhouse roof via log see-saw launch; (3) awarded for beating the Goose without taking damage *or* found inside the arena's hidden block if you lose it (never gate geoducks on skill alone).
- **Exit:** sunset; Jimothy hops on a kayak that drifts off.
- **Postcard:** *"Jimothy has acquired: sand. In places."*

---

## WORLD 2 — PIKE PLACE
*Palette:* warm neon pinks and ambers under a slate sky. *Music:* "Fish Toss Shuffle" (upright bass, brushes, 118 bpm).
*Parallax:* far = Sound + Olympics + ferry; mid = market arcade + sign (generic "PUBLIC MARKET"); near = stalls, produce.

### 2-1 "Market Arcade" — Difficulty 2 · 12 screens · par 2:15
- **Gimmick:** **Flying Salmon** — fishmongers throw salmon in arcs between stalls; they're moving platforms you ride. Flower stalls = bounce pads (dahlias). Produce crates = breakable bricks.
- **Enemies:** Crow ×6 (they steal lattes — a crow touching a latte removes it), Seagull ×4, Freeze ×1 (**intro** — a tourist blocking the aisle staring at a phone; teaches "go around / above").
- **Items:** Teriyaki Bowl (×2), Double Shot in a hidden block above the pig.
- **Geoducks:** (1) ride the longest salmon arc to the upper arcade; (2) inside a fish-ice display — bump from below; (3) at the far end of the "Sanitary Market" alley behind a crow nest.
- **Joke screen:** The brass pig. Standing on it for 3s makes it oink and spit 10 lattes.
- **Exit:** Jimothy hops into a fish-delivery hand truck.

### 2-2 "The Gum Wall" — Difficulty 3 · 10 screens, vertical descent then ascent · par 2:30
- **Gimmick:** Gum wall is **sticky** — touching it sets vertical speed to -40 px/s (slow slide) and lets you wall-slide (no wall-jump). Post Alley ramps. Hazard: discarded gum blobs on the floor = SLIME physics.
- **Enemies:** Banana Slug ×5, Hopping Cone ×4, Rogue E-Scooter ×3 (**intro** — a horn honk 0.8s before it enters from off-screen; always on a flat corridor).
- **Items:** Yellow Rain Jacket (first appearance, in a ? block mid-alley) — teaches A-button Rain Drop throw against a slug line.
- **Geoducks:** (1) slide down the far gum wall past the normal landing; (2) hidden alcove behind a theater door — Down; (3) top of the alley, requires a sprint-jump off an e-scooter tipped as a trampoline (first *required* sprint-jump in the game — telegraphed with a latte arc).
- **Joke screen:** a tourist taking a selfie with the gum; a crow adds a piece.
- **Exit:** elevator down to the waterfront.

### 2-3 "Waterfront Run" — Difficulty 3 · 13 screens, **gentle auto-chase** · par 2:00
- **Gimmick:** A **Seagull Flock** chases from the left at walk+10% speed — not deadly if you keep moving; if it catches you it steals your power-up (not a life). Great Wheel gondolas as moving platforms. Piers with gaps.
- **Enemies:** Seagull swoopers ×10 (from the flock), Runaway Cart ×2, Freeze ×2.
- **Items:** Double Shot early (feels great during a chase), Flannel mid-level.
- **Geoducks:** (1) bottom gondola of the wheel; (2) end of a side pier — costs you time but flock pauses at piers; (3) in the aquarium window (bump).
- **Joke screen:** a "World's Largest Fry" statue the gulls worship.
- **Exit:** leap onto a departing water taxi.
- **Postcard:** *"Jimothy has acquired: a fish. He does not know why."*

---

## WORLD 3 — SEATTLE CENTER (night)
*Palette:* indigo, electric orange & blue (glass sculpture glow), string-light gold. *Music:* "Needle Nights" (synthwave, 120 bpm).
*Parallax:* far = Space Needle + skyline + stars; mid = museum curves + fountain; near = sculpture glass + lamp posts.

### 3-1 "Fountain Plaza" — Difficulty 3 · 11 screens · par 2:00
- **Gimmick:** **Geysers** — fountain jets fire on a 2s cycle and launch Jimothy ~5 tiles up (ride them). Wet plaza = slight slide.
- **Enemies:** Freeze ×4 (now in groups of 2 — "the line"), Crow ×4, Hopping Cone ×3.
- **Items:** Rain Jacket (makes geysers harmless? they're never harmful — jacket just gives Rain Drop), Teriyaki.
- **Geoducks:** (1) ride the triple geyser to the lamp wire; (2) behind the glass sculpture garden (crouch through a tube); (3) hidden block at the base of the Needle leg.
- **Joke screen:** Kids in a fountain at midnight, parent on phone (a Freeze that is harmless and smiling).
- **Exit:** Monorail station — doors open.

### 3-2 "Monorail" — Difficulty 4 · **auto-scroller** 14 screens · par 2:20
- **Gimmick:** Camera auto-scrolls at 140 px/s following a Monorail car. The car roof is the main platform; it passes under signal gantries you must crouch for and gaps where you hop to parallel platforms (billboards, the museum's wavy roof) and back. Fall = death.
- **Enemies:** Crow ×8 (swooping from above), Rogue E-Scooter ×2 (riding on the car behind you?? — no: on parallel elevated bike lane), Seagull swoopers ×6.
- **Items:** Double Shot early, Flannel at midpoint (there is no checkpoint on an auto-scroller; instead the level is short and death restarts at the station).
- **Geoducks:** (1) above the first gantry — jump *over* instead of ducking; (2) on the museum roof detour; (3) in the car's rear window — drop to the back of the car during the last straight.
- **Joke screen:** a billboard for "SEATTLE'S BEST WORST TRAFFIC" with a cartoon of the viaduct.
- **Exit:** Westlake station.

### 3-3 "The Line" — Difficulty 4 · gauntlet 9 screens · par 1:45
- **Boss-ish:** No creature boss; it's a **Freeze gauntlet** — a long line of people waiting for a hot new restaurant. Freezes pulse in sequence (wave pattern) and you traverse above them on awnings and umbrellas (umbrellas pop up only when it's raining — rain cycles every 6s; locals don't use umbrellas, so they're all tourists). Rain Jacket Rain Drops thaw a Freeze for 3s (they look at you and say "oh, hey").
- **Enemies:** Freeze ×14, Crow ×3.
- **Geoducks:** (1) at the end of the line — the restaurant's "sold out" sign; (2) under an awning; (3) given by a thawed Freeze at the midpoint (throw 3 Rain Drops at the same one — a friendly nod to "you can crack the Freeze with persistence").
- **Exit:** the restaurant's back door → Fremont.
- **Postcard:** *"Jimothy waited 40 minutes. The restaurant was fine."*

---

## WORLD 4 — FREMONT
*Palette:* mossy teal shadows, sodium orange streetlights, graffiti pops. *Music:* "Center of the Universe" (lo-fi guitars, 92 bpm, then boss remix).
*Parallax:* far = Aurora Bridge underside + sky; mid = brick buildings, rocket silhouette; near = ivy, bikes, signposts.

### 4-1 "Sunday Market" — Difficulty 3 · 10 screens · par 1:50
- **Gimmick:** Market canopies are trampolines in a row; vintage furniture stacks as stairs; **Solstice cyclists** zip by as 1-second moving platforms (ride a bike!).
- **Enemies:** Runaway Cart ×3, Banana Slug ×4, Seagull ×3.
- **Items:** Teriyaki, Flannel.
- **Geoducks:** (1) ride a cyclist the full length; (2) inside the "big guy statue"'s pedestal (bump); (3) top of the rocket — three trampoline canopies in a row.
- **Joke screen:** The directional signpost ("Center of the Universe · Rapture 0 mi"); a dinosaur topiary.
- **Exit:** down the stairs to the bridge underside.

### 4-2 "Under the Bridge" — Difficulty 4 · **vertical** (10 tall × 6 wide screens) · par 2:30
- **Gimmick:** Climb the bridge's underside via mossy pillars, ivy-covered rebar, and dripping water that makes patches slick. Crows roost everywhere. Lights flicker (purely visual).
- **Enemies:** Crow ×10, Hopping Cone ×4, Banana Slug ×4 (on vertical surfaces — they drip slime downward).
- **Items:** Rain Jacket (essential for boss), Teriyaki ×2.
- **Geoducks:** (1) behind a waterfall; (2) at the very top, above the boss door, in a crow nest; (3) in a hidden drain mid-climb.
- **Exit:** boss door — a giant hubcap.

### 4-BOSS "The Bridge Troll" — Difficulty 5 · arena 2 screens wide, 1.5 tall · par 2:00
*Original design — a giant mossy stone troll, one hubcap eye, oversized flannel; see Art Spec §4.*
- **Arena:** flat ground, three stone pillars (platforms) that the troll breaks one by one in phase 2, a stream of Rain Drops available from leaking pipes if you lost the Jacket.
- **Phase 1 (3 hits):** Slam telegraph (raises fist 0.8s) → shockwave along the ground (jump) → he's dazed; **stomp his head** from a pillar. Between slams he lobs a **rusty car husk** that arcs and sits as a temporary platform for 4s.
- **Phase 2 (3 hits):** Dandelion seed storm (wind pushes left, like World 5 preview); he smashes a pillar each slam; cars come two at a time. Hit his hubcap eye with 3 Rain Drops to daze him OR stomp from a car husk.
- **Defeat:** He yawns, sits down, and Jimothy curls up on his head. Troll becomes a friend (ending gallery card).
- **Checkpoint:** entering phase 2.
- **Postcard:** *"Jimothy has acquired: a very large friend."*

---

## WORLD 5 — THE FERRY
*Palette:* silver water, grey-blue sky, white/green ferry, orange life rings. *Music:* "Crossing" (piano + strings + gull calls, 80 bpm).
*Parallax:* far = Olympics + clouds; mid = water + orcas + distant islands; near = railings + life rings.

### 5-1 "Walk-On Passenger" — Difficulty 4 · 14 screens · par 2:45
- **Gimmick:** **Deck tilt** — the whole level gently rolls ±6° on a 5s cycle (visual only, but one-way crates slide 1 tile left/right with it). **Wind gusts** (telegraphed by spray + sound) push 120 px/s for 1.5s. **Orcas** breach as 2s moving platforms over the open-water gap screens.
- **Enemies:** Seagull swoopers ×10 (they want your fries — the Teriyaki Bowl), Runaway Cart ×2 (car deck), Freeze ×3 (passengers at the rail), Canada Goose rematch ×1 (mini, 2 stomps, on the sun deck).
- **Items:** all power-ups appear once; Double Shot before the orca screens.
- **Geoducks:** (1) in the snack bar (bump the pretzel sign); (2) ride an orca all the way; (3) on the bridge wing above the captain, during the final gust (gust carries you up with a jump).
- **Joke screen:** a car-deck sign "PLEASE DO NOT FEED JIMOTHY"; the car passengers all take photos.
- **Exit:** ramp onto Bainbridge.

### 5-2 "Home" — Difficulty 1 · 5 screens · par 0:50
- **Design:** A deliberate exhale. Forest path, fading light, no enemies except 3 friendly crows that drop lattes. Lattes spell out a path to a cedar grove.
- **Beat:** The last ? block gives nothing — Jimothy looks at the camera. The mother raccoon waits at the cedar. Jimothy climbs into the hollow. Camera pans up to Rainier. **"Praise Jimothy."** Credits.
- **Geoducks:** none (or all three sitting in plain sight for completionists).

---

## SECRET — "Capitol Hill After Dark" (unlock: 30 geoducks) — Difficulty 5 · 12 screens · par 2:30
- Neon, karaoke bar with a **Crow DJ** mini-boss (sound waves as hazards), rainbow crosswalk = Flannel strip (invincibility whole screen), bubble-tea bounce pads, the "cal anderson cone" sculpture.
- Enemies: everything, dense. Reward: gallery "Jimothy at the club" card and a golden Jimothy trophy on the title screen.

---

## Summary table
| Level | Diff | Screens | Par | New mechanic/enemy |
|---|---|---|---|---|
| 1-1 | 1 | 9 | 1:30 | everything basic |
| 1-2 | 2 | 11 | 2:00 | Crow shell, swooping gulls, slug slime, timed salmon |
| 1-3 | 2 | 8+A | 1:45 | Runaway Cart, GOOSE mini-boss |
| 2-1 | 2 | 12 | 2:15 | Flying salmon platforms, Freeze, latte-stealing crows |
| 2-2 | 3 | 10 | 2:30 | Sticky wall slide, E-Scooter, Rain Jacket |
| 2-3 | 3 | 13 | 2:00 | Chase |
| 3-1 | 3 | 11 | 2:00 | Geysers, Freeze pairs |
| 3-2 | 4 | 14 | 2:20 | Auto-scroll |
| 3-3 | 4 | 9 | 1:45 | Freeze gauntlet, thawing |
| 4-1 | 3 | 10 | 1:50 | Trampolines row, cyclist rides |
| 4-2 | 4 | vertical | 2:30 | Vertical climb |
| 4-B | 5 | arena | 2:00 | Troll boss |
| 5-1 | 4 | 14 | 2:45 | Tilt, wind, orcas |
| 5-2 | 1 | 5 | 0:50 | — |
| S | 5 | 12 | 2:30 | Crow DJ |
