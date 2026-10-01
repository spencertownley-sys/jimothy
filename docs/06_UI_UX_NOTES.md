# JIMOTHY — UI/UX Notes

## Principles
1. **Zero-text onboarding.** 1-1 teaches everything. The only instruction text in the game is "Press Start".
2. **Readable in the rain.** HUD elements have a soft dark backing blur; drizzle layer never crosses the HUD.
3. **Thumbs first.** All interactive UI is placed in the bottom corners or top-center on mobile; nothing critical mid-screen edges.
4. **Cozy, not clinical.** Paper textures, chalk lettering, rounded corners, gentle bounces (200 ms ease-out-back).

## Screen specs (1280×720 logical)

### Title
- Key art full-bleed (`art/02`), logo centered top (`art/13` direction), drizzle particles, puddle ripple on logo every 4 s.
- "PRESS START" pulses (1.2 s) bottom-center; on touch devices reads "TAP TO START".
- After start: menu list (New Game / Continue / Options / Gallery / Credits) as chalkboard sign; selection = chalk underline.
- Idle 20 s → attract mode (replays 1-1 ghost input) like an arcade.

### World map
- Hand-painted Seattle map, slight parallax with cursor/d-pad; nodes glow when unlocked; dotted ferry route animates for World 5.
- Node card: level name, best time, 3 geoduck slots.
- Postcards appear here between worlds (1 panel, Start to skip).

### Gameplay HUD
- Top-left: 3 paw hearts (full = cream pad; empty = outline), latte icon + 2-digit count, 3 geoduck silhouettes.
- Top-right: optional timer (mm:ss.t), hidden by default.
- Power-up change: brief 0.4 s HUD icon swap with sparkle; no text.
- Checkpoint touched: coffee stand steams + small "☕" toast top-center 1 s.

### Pause
- Dim 60%, paper card centered: Resume / Restart level / Options / World Map. Pause also shows controls diagram for current input device (the only place controls are explained).

### Options
- Music / SFX sliders (chalk marks), Timer on/off, Drizzle on/off, Touch layout (Classic / Jump Button), Control remap (keyboard & pad), Reduce motion (disables deck tilt visual + screen shake).

### Level clear
- Ferry Ticket slides in, gets hole-punched (sfx), stats tick up: lattes → lives (every 100), geoducks, time vs par ("Local" if under par, "Tourist" if over — gentle joke, no penalty).

### Game over
- Jimothy silhouette on a wet sidewalk, "Jimothy will return." Continue / World Map.

## Touch control layout (mobile, landscape)
- D-pad center at (12% W, 72% H), radius 90 px; dead zone 20 px; 8-way read as 4-way + diagonals ignore up (jump is separate).
- A at (90% W, 68% H), B at (82% W, 80% H), each 84 px; Jump (optional) at (90% W, 48% H).
- Pause at top-center (50% W, 6% H), 44 px.
- Opacity 0.4 idle → 0.7 pressed; haptic tick on press (v2).
- Everything positionable in Options via drag (saved).

## Accessibility
- Color-independent cues: enemies telegraph with shape/animation, not color alone.
- Reduce motion toggle; drizzle toggle.
- Hold-to-jump fully optional (tap gives a clearable 2-tile jump everywhere needed).
- No flashing > 3 Hz; Flannel glow cycles slowly.
- All UI reachable by keyboard and gamepad; focus ring = chalk circle.

## Copy (complete list of in-game text)
"PRESS START" · "TAP TO START" · menu labels · level names · "Jimothy will return." · "Local" / "Tourist" · postcards (5 lines, GDD §6) · intro sign "COMING SOON: LUXE MICRO-LOFTS — STUDIOS FROM $2,950" · ferry sign "PLEASE DO NOT FEED JIMOTHY" · ending "Praise Jimothy." · credits + wildlife note.
