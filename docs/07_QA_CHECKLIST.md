# JIMOTHY — QA & Launch Checklist

## 1. Feel (do with a gamepad and with keyboard; every level)
- [ ] Tap jump ≈ 2 tiles, full jump ≈ 4 tiles, run-jump clears a 5-tile gap
- [ ] Coyote time: walking off a ledge and jumping within ~90 ms works
- [ ] Jump buffer: pressing jump just before landing jumps on landing
- [ ] Skid frame shows when reversing at speed; no "ice" feel on normal ground
- [ ] Crouch under 1-tile gaps works at any speed; can't get stuck when standing up under a ceiling (stays crouched)
- [ ] Stomp bounce feels good; holding jump bounces higher; can chain 3 enemies
- [ ] Growing never clips Jimothy into floors/ceilings
- [ ] Hurt gives i-frames with flicker; no double-hit from Freeze pulses
- [ ] Camera never shows outside map; look-ahead doesn't jitter when flipping direction

## 2. Controls
- [ ] Keyboard: ←→↓↑ A S Space exactly as GDD §7; page never scrolls
- [ ] Remap persists in save
- [ ] Gamepad hot-plug works; "Modern" preset (A = jump) works
- [ ] Touch (Chrome Android, Safari iOS, landscape): d-pad slide ←→↓ without lifting; A/B simultaneous; swipe-up jump; optional Jump button; 48 px targets; safe areas honored
- [ ] Rotating to portrait shows "Rotate your phone" overlay and pauses

## 3. Content (per level, use `03_LEVEL_SPECS.md`)
- [ ] All 3 geoducks reachable; none require a frame-perfect trick
- [ ] Checkpoint at ~55%; respawn has no enemies within 2 tiles
- [ ] Every new mechanic appears first in a safe spot
- [ ] Par time achievable by designer within 1.3×
- [ ] "Joke screen" present and readable at 720p
- [ ] No softlocks (walled-in without power-up, stuck in a drain, etc.)
- [ ] Exit always triggers Level Clear; map unlock advances

## 4. Bosses
- [ ] Goose: telegraphs ≥ 0.8 s; 3 stomps; drops Star
- [ ] Troll: both phases, pillar destruction, car husks sit 4 s, Rain Drop daze works, checkpoint on phase 2, friend animation plays

## 5. Systems
- [ ] Save/load round-trips; corrupt JSON → fresh save (no crash); schema version respected
- [ ] 100 lattes → 1-up with sfx; counter rolls to 0
- [ ] Game Over → continue with 3 lives at world map
- [ ] Pause stops physics & audio; resume is clean; pause during Grow/Shrink freeze ok
- [ ] Audio unlocks on first input on iOS Safari; mutes on tab hide; music crossfades between worlds; Flannel ducks music
- [ ] Missing asset → placeholder, logged once, no crash

## 6. Performance
- [ ] 60 fps at 1280×720 on a 2019 laptop (Chrome, Firefox, Safari)
- [ ] ≥ 50 fps on Pixel 6a / iPhone 12 in Chrome/Safari; no GC hitches > 50 ms during play (Perf tab)
- [ ] Initial load ≤ 6 MB; Worlds 2–5 lazy-load
- [ ] No console errors/warnings on any level (Playwright asserts)

## 7. Legal / brand
- [ ] No real logos (coffee chain, market clock lockup, sports teams, Fremont sculptures' exact likeness)
- [ ] Credits include "Jimothy is a real, wild raccoon. Please admire from a distance." + WDFW-style note
- [ ] Fonts/music/SFX licensed (OFL / Epidemic / CC0) and listed in `CREDITS.md`
- [ ] Title/credits say "unofficial fan game; not affiliated with any person, business, or the City of Seattle"

## 8. Browser launch
- [ ] Favicon, OG image (key art), title "Jimothy: A Seattle Story"
- [ ] GitHub Pages deploy from `main` green; custom domain + HTTPS if used
- [ ] 404 falls back to index
- [ ] Works on Chrome, Firefox, Safari, Edge (latest 2)
- [ ] Share a screenshot from every world — would a Seattleite post it?

## 9. v2 mobile launch (later)
- [ ] Capacitor landscape lock; haptics; background pause; safe areas
- [ ] App icon, screenshots, privacy label "no data collected"
- [ ] TestFlight / internal testing round with 5 people; collect "where did you die" notes
