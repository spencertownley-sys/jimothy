#!/usr/bin/env bash
# Builds every in-game image from Higgsfield output: character, enemy and item sprites are cut
# from the concept sheets in art/concept; tiles, blocks, props and parallax layers come from
# the generations in art/higgsfield. Nothing is hand-drawn. Re-run, then `npm run pack:atlases`.
#
# Needs ImageMagick (`convert`). Every cut is a flood-fill from the sheet's neutral grey
# corners so the painterly rim light survives; crops are generous and trimmed afterwards.
set -euo pipefail
cd "$(dirname "$0")/.."
C=art/concept
OUT=art/sprites
rm -rf "$OUT"
mkdir -p "$OUT"/{jimothy,enemies,items,blocks,ui,props}

# cut <sheet> <geometry WxH+X+Y> <target-height> <out.png>
cut() {
  local sheet="$1" geo="$2" h="$3" out="$4"
  local w hh
  w=${geo%%x*}; hh=${geo#*x}; hh=${hh%%+*}
  convert "$sheet" -crop "$geo" +repage -alpha set -fuzz 9% -fill none \
    -draw "matte 2,2 floodfill" -draw "matte $((w-3)),2 floodfill" \
    -draw "matte 2,$((hh-3)) floodfill" -draw "matte $((w-3)),$((hh-3)) floodfill" \
    -trim +repage -resize "x$h" "$out"
}

# ---- Jimothy (approved v3 sheet; sheet 27 for power-up looks) -----------------------
J=$C/21_jimothy_sheet_v3.jpg
P=$C/27_jimothy_powerups_v3.jpg
cut $J 290x360+60+100   72 $OUT/jimothy/small_idle.png
cut $J 380x340+379+115  72 $OUT/jimothy/small_lope.png
cut $J 310x310+778+105  72 $OUT/jimothy/small_hop.png
cut $J 345x195+1065+260 40 $OUT/jimothy/small_crouch.png
cut $J 300x340+1382+115 72 $OUT/jimothy/small_hurt.png
cut $J 310x340+1690+115 72 $OUT/jimothy/small_victory.png
cut $J 340x520+328+540  72 $OUT/jimothy/small_look.png
# Big = 1.3x per the GDD. Idle comes from the "fuller cheeks" big pose on sheet 27.
cut $P 540x490+1045+60  94 $OUT/jimothy/big_idle.png
cut $J 380x340+379+115  94 $OUT/jimothy/big_lope.png
cut $J 310x310+778+105  94 $OUT/jimothy/big_hop.png
cut $J 345x195+1065+260 52 $OUT/jimothy/big_crouch.png
cut $J 300x340+1382+115 94 $OUT/jimothy/big_hurt.png
cut $J 310x340+1690+115 94 $OUT/jimothy/big_victory.png
cut $J 340x520+328+540  94 $OUT/jimothy/big_look.png
cut $P 470x500+410+580  94 $OUT/jimothy/jacket_idle.png
cut $P 540x490+1105+590 94 $OUT/jimothy/flannel_idle.png

# ---- Enemies ----------------------------------------------------------------------
E=$C/07_enemy_sheet.jpg
cut $E 565x290+110+90   44 $OUT/enemies/seagull.png
cut $E 450x310+810+60   44 $OUT/enemies/crow.png
cut $E 470x490+1410+50  96 $OUT/enemies/freeze.png
cut $E 420x320+175+400  56 $OUT/enemies/scooter.png
cut $E 230x310+920+405  56 $OUT/enemies/cone.png
cut $E 505x220+1390+510 36 $OUT/enemies/slug.png
cut $E 380x335+175+765  64 $OUT/enemies/cart.png
cut $E 365x365+1505+725 80 $OUT/enemies/goose.png

# ---- Items ------------------------------------------------------------------------
I=$C/08_collectibles_sheet.jpg
cut $I 250x280+150+80   36 $OUT/items/latte.png
cut $I 290x280+490+70   40 $OUT/items/salmon.png
cut $I 270x270+880+80   40 $OUT/items/flower.png
cut $I 270x250+1270+90  44 $OUT/items/geoduck.png
cut $I 260x280+1660+70  40 $OUT/items/star.png
cut $I 270x270+880+440  40 $OUT/items/flannel.png
cut $I 270x280+1290+430 40 $OUT/items/jacket.png
cut $I 290x260+1660+450 40 $OUT/items/teriyaki.png
cut $I 290x250+880+805  40 $OUT/items/ticket.png
cut $I 250x265+1680+800 32 $OUT/ui/heart_full.png
# No Double Shot concept yet: two lattes side by side.
convert $OUT/items/latte.png \( $OUT/items/latte.png \) +append -resize x40 $OUT/items/doubleshot.png
convert $OUT/ui/heart_full.png -colorspace Gray -alpha on -channel A -evaluate multiply 0.45 +channel $OUT/ui/heart_empty.png
convert $OUT/items/geoduck.png -fill '#1C2426' -colorize 85% $OUT/ui/geoduck_silhouette.png

# ---- Higgsfield helpers ---------------------------------------------------------------
HF=art/higgsfield
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# cutfill <src> <geometry> <out> <resize-args...>: crop, flood-fill the grey ground from the
# corners (keeps glows and rim light), trim, resize.
cutfill() {
  local src="$1" geo="$2" out="$3"; shift 3
  local w=${geo%%x*} hh=${geo#*x}; hh=${hh%%+*}
  convert "$src" -crop "$geo" +repage -alpha set -fuzz 8% -fill none \
    -draw "matte 2,2 floodfill" -draw "matte $((w-3)),2 floodfill" \
    -draw "matte 2,$((hh-3)) floodfill" -draw "matte $((w-3)),$((hh-3)) floodfill" \
    -trim +repage "$@" "$out"
}
# keyout <src> <out> <fuzz>: remove every pixel near the sheet's background colour (for
# objects with enclosed gaps, like fence pickets).
keyout() {
  local bg; bg=$(convert "$1" -format '%[pixel:p{5,5}]' info:)
  convert "$1" -alpha set -fuzz "$3" -transparent "$bg" "$2"
}
# mirror <in> <out>: append a flopped copy so the strip wraps seamlessly left-right.
mirror() { convert "$1" \( +clone -flop \) +append +repage "$2"; }

# ---- Blocks -------------------------------------------------------------------------
# Chalkboard "?" block: keep the golden glow around the frame. The 2048 px sheet is scaled so
# the wooden frame is ~48 px; the glow spills past it (the body is still 48x48).
convert $HF/05_qblock.jpg -resize 72x72 -alpha set -fuzz 6% -fill none \
  -draw "matte 1,1 floodfill" -draw "matte 70,1 floodfill" -draw "matte 1,70 floodfill" -draw "matte 70,70 floodfill" \
  $OUT/blocks/qblock.png
convert $HF/06_qblock_used.jpg -resize 72x72 -alpha set -fuzz 6% -fill none \
  -draw "matte 1,1 floodfill" -draw "matte 70,1 floodfill" -draw "matte 1,70 floodfill" -draw "matte 70,70 floodfill" \
  $OUT/blocks/qblock_used.png
cutfill $HF/07_brick.jpg 1300x1340+376+352 $OUT/blocks/brick.png -resize '48x48!'
cutfill $HF/17_fx.jpg 360x290+1040+430 $OUT/blocks/brick_bit.png -resize x20
cutfill $HF/17_fx.jpg 260x330+156+400 $OUT/blocks/raindrop.png -resize x18
cutfill $HF/17_fx.jpg 470x330+500+375 $OUT/blocks/puff.png -resize x28
cutfill $HF/17_fx.jpg 450x450+1493+345 $OUT/blocks/sparkle.png -resize 96x96
# Coffee stand checkpoint: full colour when lit, dim and desaturated before you touch it.
cutfill $HF/08_coffee_stand.jpg 1240x1560+414+120 $OUT/blocks/checkpoint_on.png -resize x96
convert $OUT/blocks/checkpoint_on.png -modulate 62,25 $OUT/blocks/checkpoint_off.png
cutfill $HF/09_bus.jpg 1640x660+186+130 $OUT/blocks/bus.png -resize x110

# ---- Props (decor sprites placed by `prop` objects in the map) ------------------------
cutfill $HF/00_cedar.jpg 1080x1960+140+60 $OUT/props/cedar.png -resize x430
P=$HF/10_props_a.jpg
cutfill $P 640x420+40+100   $OUT/props/stump.png    -resize x64
cutfill $P 660x500+710+60   $OUT/props/fern.png     -resize x60
cutfill $P 380x470+1530+55  $OUT/props/lantern.png  -resize x44
cutfill $P 330x560+180+555  $OUT/props/busstop.png  -resize x150
cutfill $P 780x320+590+700  $OUT/props/puddle.png   -resize 96x
B=$HF/11_props_b.jpg
cutfill $B 720x700+50+255   $OUT/props/freebox.png  -resize x96
cutfill $B 380x400+747+480  $OUT/props/compost.png  -resize x62
cutfill $B 275x380+1140+486 $OUT/props/bin_blue.png  -resize x72
cutfill $B 275x380+1425+486 $OUT/props/bin_green.png -resize x72
cutfill $B 270x380+1712+486 $OUT/props/bin_black.png -resize x72
convert $HF/12_porch.jpg -crop 96x380+699+328 +repage -resize '14x96!' $OUT/props/column.png
cutfill $HF/13_signboard.jpg 1280x1290+370+150 $OUT/props/signboard.png -resize 320x

# ---- World 1 tileset (48 px tiles, 1 px extrusion, margin 2 / spacing 4) ---------------
T=$TMP/tiles; mkdir -p $T
put() { cp "$1" $T/$(printf '%02d' "$2").png; }
crop48() { convert "$1" -crop "48x48+$2+$3" +repage "$4"; }
# Sidewalk ground (ids 1-4 top, 5-8 soil underneath): a 2-tile-tall strip, mirrored to wrap.
convert $HF/02_ground_sidewalk.jpg -resize x96 -crop 96x96+40+0 +repage $TMP/side96.png
mirror $TMP/side96.png $TMP/side.png
for i in 0 1 2 3; do crop48 $TMP/side.png $((i*48)) 0 $T/top.png; put $T/top.png $((1+i)); crop48 $TMP/side.png $((i*48)) 48 $T/soil.png; put $T/soil.png $((5+i)); done
# Grass ground (ids 9-12 top, 13-16 soil). The grey sky above the blades is keyed out.
keyout $HF/03_ground_grass.jpg $TMP/grass_k.png 7%
convert $TMP/grass_k.png -resize x96 -crop 96x96+40+0 +repage $TMP/grass96.png
mirror $TMP/grass96.png $TMP/grass.png
for i in 0 1 2 3; do crop48 $TMP/grass.png $((i*48)) 0 $T/top.png; put $T/top.png $((9+i)); crop48 $TMP/grass.png $((i*48)) 48 $T/soil.png; put $T/soil.png $((13+i)); done
# Mossy cobblestone (ids 17-20): the four quadrants of one 96 px patch, slightly darkened so
# walls sit back from the gameplay layer. Tiles repeat as a 2x2 block (no mirroring).
convert $HF/04_cobble_texture.jpg -resize 176x176 -crop 96x96+40+40 +repage -modulate 78,80 $TMP/cob.png
crop48 $TMP/cob.png 0 0 $T/a.png;   put $T/a.png 17
crop48 $TMP/cob.png 48 0 $T/b.png;  put $T/b.png 18
crop48 $TMP/cob.png 0 48 $T/c2.png; put $T/c2.png 19
crop48 $TMP/cob.png 48 48 $T/d.png; put $T/d.png 20
# Wooden picket fence: ids 21-22 the top half (one-way platforms), 23-24 the lower half
# (fence body under stepped platforms). Keyed out globally so the gaps between pickets clear.
convert $HF/01_fence.jpg -crop 2048x423+0+238 +repage $TMP/fence_c.png
keyout $TMP/fence_c.png $TMP/fence_k.png 9%
convert $TMP/fence_k.png -resize x96 -crop 48x96+60+0 +repage $TMP/fence48.png
mirror $TMP/fence48.png $TMP/fence.png
crop48 $TMP/fence.png 0 0 $T/f.png;   put $T/f.png 21
crop48 $TMP/fence.png 48 0 $T/f.png;  put $T/f.png 22
crop48 $TMP/fence.png 0 48 $T/f.png;  put $T/f.png 23
crop48 $TMP/fence.png 48 48 $T/f.png; put $T/f.png 24
# Craftsman porch roof shingles (ids 25-26 upper row, 27-28 eave row), solid.
convert $HF/12_porch.jpg -crop 1000x200+500+125 +repage -resize 'x96!' -crop 48x96+80+0 +repage $TMP/roof48.png
mirror $TMP/roof48.png $TMP/roof.png
crop48 $TMP/roof.png 0 0 $T/r.png;   put $T/r.png 25
crop48 $TMP/roof.png 48 0 $T/r.png;  put $T/r.png 26
crop48 $TMP/roof.png 0 48 $T/r.png;  put $T/r.png 27
crop48 $TMP/roof.png 48 48 $T/r.png; put $T/r.png 28
# Storm drain grate (ids 29-30), solid.
cutfill $HF/10_props_a.jpg 640x330+1362+690 $TMP/drain.png -resize '96x48!'
crop48 $TMP/drain.png 0 0 $T/d.png;  put $T/d.png 29
crop48 $TMP/drain.png 48 0 $T/d.png; put $T/d.png 30
# Pothole puddle (id 31, hazard): from the enemy sheet, sat on the bottom edge of its tile.
cutfill $C/07_enemy_sheet.jpg 680x220+690+850 $TMP/pot.png -resize 48x
convert -size 48x48 xc:none $TMP/pot.png -gravity south -composite $T/p.png; put $T/p.png 31
convert -size 48x48 xc:none $T/32.png
for f in $T/[0-9][0-9].png; do
  convert "$f" -set option:distort:viewport 50x50-1-1 -virtual-pixel edge -distort SRT 0 +repage "$f"
done
montage $T/[0-9][0-9].png -tile 8x -geometry 50x50+1+1 -background none -depth 8 public/assets/tilesets/ballard.png
identify public/assets/tilesets/ballard.png

# ---- Backgrounds -------------------------------------------------------------------
BG=public/assets/backgrounds
# far: sky, Olympics and distant cedars, mirrored so it wraps.
convert $HF/14_bg_far.jpg -resize x720 $TMP/far.png
mirror $TMP/far.png $TMP/far2.png
convert $TMP/far2.png -quality 84 $BG/bg_ballard_far.jpg
# mid: craftsman houses with their grey ground keyed out.
convert $HF/15_bg_mid.jpg -crop 2048x740+0+20 +repage -alpha set -fuzz 7% -fill none \
  -draw "matte 2,2 floodfill" -draw "matte 2045,2 floodfill" -resize x430 $TMP/mid.png
mirror $TMP/mid.png $BG/bg_ballard_mid.png
# near: ferns along the bottom edge.
convert $HF/16_bg_near.jpg -alpha set -fuzz 8% -fill none \
  -draw "matte 2,2 floodfill" -draw "matte 2045,2 floodfill" -resize x260 -modulate 62,70 $TMP/near.png
mirror $TMP/near.png $BG/bg_ballard_near.png
# title key art + world map backdrop (both from the concept set)
convert $C/23_title_key_art_v3.jpg -resize 1280x720^ -gravity center -extent 1280x720 -quality 85 $BG/title_keyart.jpg
convert $C/03_bg_world1_ballard.jpg -resize 1280x720^ -gravity center -extent 1280x720 -blur 0x6 -modulate 70,80 -quality 80 $BG/worldmap.jpg
# ---- Touch controller (DOM panels beside the game, not over it) -----------------------
UI=public/assets/ui; mkdir -p $UI
uicut() { # uicut <src> <out> <size>: flood-fill the grey ground away, trim, square-pad, resize
  local src="$1" out="$2" size="$3"
  convert "$src" -alpha set -fuzz 9% -fill none \
    -draw "matte 2,2 floodfill" -draw "matte 2045,2 floodfill" -draw "matte 2,2045 floodfill" -draw "matte 2045,2045 floodfill" \
    -trim +repage "$TMP/uicut.png"
  local side; side=$(convert "$TMP/uicut.png" -format '%[fx:max(w,h)]' info:)
  convert "$TMP/uicut.png" -gravity center -background none -extent "${side}x${side}" \
    -resize "${size}x${size}" -depth 8 "$out"
}
uicut $HF/20_btn_dpad.jpg  $UI/dpad.png  256
uicut $HF/21_btn_a.jpg     $UI/btn_a.png 176
uicut $HF/22_btn_b.jpg     $UI/btn_b.png 176
uicut $HF/23_btn_jump.jpg  $UI/btn_jump.png 196
uicut $HF/24_btn_pause.jpg $UI/btn_pause.png 112
convert $HF/25_panel_wood.jpg -resize 360x -quality 80 $UI/panel.jpg
# World 1 map (Ballard: the neighbourhood, the Locks, Golden Gardens)
convert $HF/26_map_ballard.jpg -resize '1280x720!' -quality 86 $BG/map_ballard.jpg
# Opening scene panels (story beats: the den, the porch, the truck, the stump)
ST=public/assets/story; mkdir -p $ST
for n in den porch truck stump; do
  f=$(ls $HF/3?_story_$n.jpg)
  convert "$f" -resize '1280x720^' -gravity center -extent 1280x720 -quality 84 $ST/$n.jpg
done

# ======================================================================================
# 1-2 "The Locks" and 1-3 "Golden Gardens at Dusk" (art/higgsfield 40-66)
# ======================================================================================
# ---- Enemies: crow (walk / shell / flying with a geoduck), Canada Goose boss poses --------
cutfill $HF/46_crow_sheet.jpg 649x467+1311+382 $OUT/enemies/crow_walk.png -resize x48
cutfill $HF/46_crow_sheet.jpg 465x460+117+358  $OUT/enemies/crow_shell.png -resize x40
cutfill $HF/46_crow_sheet.jpg 665x768+641+144  $OUT/enemies/crow_fly.png -resize x84
G=$HF/57_goose_sheet.jpg
cutfill $G 303x543+96+300   $OUT/enemies/goose_honk.png   -resize x124
cutfill $G 618x344+464+498  $OUT/enemies/goose_charge.png -resize x82
cutfill $G 466x536+1065+275 $OUT/enemies/goose_flap.png   -resize x118
cutfill $G 342x357+1608+491 $OUT/enemies/goose_stun.png   -resize x86
cutfill $HF/66_cart_logpile.jpg 721x742+158+209 $OUT/enemies/cart_run.png -resize x66
# ---- Mechanism sprites (blocks atlas) -----------------------------------------------------
cutfill $HF/44_lock_gate.jpg 523x1457+313+304 $OUT/blocks/lockgate.png -resize '96x264!'
cutfill $HF/45_salmon.jpg 1373x644+296+253 $OUT/blocks/salmon.png -resize 132x
cutfill $HF/53_seesaw.jpg 1498x232+285+170 $OUT/blocks/seesaw_log.png -resize 300x
cutfill $HF/53_seesaw.jpg 420x300+720+470 $OUT/blocks/seesaw_rock.png -resize x70
cutfill $HF/54_bonfire.jpg 1414x1229+317+505 $OUT/blocks/bonfire.png -resize x84
cutfill $HF/48_lock_boat.jpg 980x353+491+259 $OUT/blocks/boat.png -resize x120
cutfill $HF/56_kayak.jpg 1634x280+222+305 $OUT/blocks/kayak.png -resize 220x
cutfill $HF/49_locks_props.jpg 427x179+66+555 $OUT/blocks/slime.png -resize '96x26!'
cutfill $HF/66_cart_logpile.jpg 888x581+1038+331 $OUT/blocks/logpile.png -resize x96
# ---- Props ----------------------------------------------------------------------------------
cutfill $HF/47_sea_lion.jpg 1407x803+376+181 $OUT/props/sealion.png -resize x150
L=$HF/49_locks_props.jpg
cutfill $L 257x338+543+407  $OUT/props/bollard.png   -resize x56
cutfill $L 370x244+860+518  $OUT/props/rope.png      -resize x36
cutfill $L 295x401+1279+350 $OUT/props/lifering.png  -resize x80
cutfill $L 283x378+1662+365 $OUT/props/fishwindow.png -resize x96
cutfill $HF/55_bathhouse.jpg 1605x760+222+198 $OUT/props/bathhouse.png -resize x300
BP=$HF/58_beach_props.jpg
cutfill $BP 350x406+49+320   $OUT/props/dunegrass.png  -resize x70
cutfill $BP 569x364+434+393  $OUT/props/picnic.png     -resize x72
cutfill $BP 310x319+1004+432 $OUT/props/driftstump.png -resize x60
cutfill $BP 247x359+1333+366 $OUT/props/beachsign.png  -resize x84
cutfill $BP 401x310+1604+427 $OUT/props/stones.png     -resize x52
# ---- Tilesets: locks (concrete lock wall + dock) and beach (sand + driftwood) ---------------
# Same grid as ballard (8 columns, 48 px, 1 px extrusion). 16 tiles each:
#   1-4 surface top · 5-8 body · 9-10 one-way platform · 11-14 deep body · 15 hazard-free blank · 16 blank
tileset() { # tileset <name> <surface-src> <platform-src> <platform-geo> [rows of sky to drop] [wall-src]
  local name="$1" surf="$2" plat="$3" pgeo="$4" D=$TMP/ts_$1
  mkdir -p $D
  convert "$surf" -crop "2048x$((869-${5:-0}))+0+${5:-0}" +repage -resize x192 -crop 96x192+60+0 +repage $TMP/surf96.png
  mirror $TMP/surf96.png $TMP/surf.png
  for i in 0 1 2 3; do
    crop48 $TMP/surf.png $((i*48)) 0 $D/$(printf '%02d' $((1+i))).png
    crop48 $TMP/surf.png $((i*48)) 48 $D/$(printf '%02d' $((5+i))).png
    crop48 $TMP/surf.png $((i*48)) 96 $D/$(printf '%02d' $((11+i))).png
  done
  convert "$plat" -crop "$pgeo" +repage -resize 'x48!' $TMP/plat_c.png
  convert $TMP/plat_c.png -crop 48x48+90+0 +repage $TMP/plat48.png
  mirror $TMP/plat48.png $TMP/plat.png
  crop48 $TMP/plat.png 0 0 $D/09.png
  crop48 $TMP/plat.png 48 0 $D/10.png
  convert -size 48x48 xc:none $D/15.png
  convert -size 48x48 xc:none $D/16.png
  # optional third row: 17-20 a 2x2 wall patch (the sticky gum wall), 21 a gum splat hazard
  if [ -n "${6:-}" ]; then
    convert "$6" -resize 192x192 -crop 96x96+48+48 +repage $TMP/wall96.png
    crop48 $TMP/wall96.png 0 0 $D/17.png; crop48 $TMP/wall96.png 48 0 $D/18.png
    crop48 $TMP/wall96.png 0 48 $D/19.png; crop48 $TMP/wall96.png 48 48 $D/20.png
    convert $OUT/blocks/slime.png -modulate 105,150,50 -resize 46x16! $TMP/gumsplat.png
    convert -size 48x48 xc:none $TMP/gumsplat.png -gravity south -geometry +0+1 -composite $D/21.png
    for i in 22 23 24; do convert -size 48x48 xc:none $D/$i.png; done
  fi
  for f in $D/[0-9][0-9].png; do
    convert "$f" -set option:distort:viewport 50x50-1-1 -virtual-pixel edge -distort SRT 0 +repage "$f"
  done
  montage $D/[0-9][0-9].png -tile 8x -geometry 50x50+1+1 -background none -depth 8 public/assets/tilesets/$name.png
  identify public/assets/tilesets/$name.png
}
tileset locks $HF/42_concrete_tex.jpg $HF/64_dock_planks.jpg 1600x230+200+350
tileset beach $HF/52_sand_tex.jpg $HF/65_driftwood_platform.jpg 1300x210+640+275 118
# ---- Water (a tiling strip drawn in front of Jimothy over canals and the Sound) ------------
convert $HF/43_water_tex.jpg -resize x300 -crop 384x200+0+36 +repage $TMP/water.png
mirror $TMP/water.png $TMP/water2.png
convert $TMP/water2.png -depth 8 $BG/water.png
convert $TMP/water2.png -modulate 105,90,330 -fill '#ff9a5a' -colorize 18% -depth 8 $BG/water_dusk.png
# ---- Parallax --------------------------------------------------------------------------
convert $HF/40_locks_far.jpg -resize x720 $TMP/lf.png; mirror $TMP/lf.png $TMP/lf2.png
convert $TMP/lf2.png -quality 84 $BG/bg_locks_far.jpg
convert $HF/41_locks_mid.jpg -alpha set -fuzz 7% -fill none \
  -draw "matte 2,2 floodfill" -draw "matte 2045,2 floodfill" -draw "matte 2,866 floodfill" -draw "matte 2045,866 floodfill" \
  -trim +repage -resize x400 $TMP/lm.png
mirror $TMP/lm.png $BG/bg_locks_mid.png
convert $HF/50_dusk_far.jpg -resize x720 $TMP/df.png; mirror $TMP/df.png $TMP/df2.png
convert $TMP/df2.png -quality 84 $BG/bg_beach_far.jpg
# the grey shows through the branches too, so key it out everywhere (not just a flood fill)
convert $HF/51_dunes_mid.jpg -crop 2048x800+0+0 +repage $TMP/dm_c.png
dbg=$(convert $TMP/dm_c.png -format '%[pixel:p{2040,5}]' info:)
convert $TMP/dm_c.png -alpha set -fuzz 9% -transparent "$dbg" $TMP/dm_k.png
convert $TMP/dm_k.png -trim +repage -resize x380 $TMP/dm.png
mirror $TMP/dm.png $BG/bg_beach_mid.png
# ---- Story panels: 1-2 and 1-3 cutscenes, World 1 postcard ---------------------------------
for pair in 60:locks_truck 61:herschel 62:goose_gang 63:postcard_w1; do
  n=${pair%%:*}; name=${pair#*:}
  f=$(ls $HF/${n}_*.jpg)
  convert "$f" -resize '1280x720^' -gravity center -extent 1280x720 -quality 84 $ST/$name.jpg
done

# ======================================================================================
# World 2 — Pike Place: 2-1 Market Arcade, 2-2 The Gum Wall, 2-3 Waterfront Run (70-94)
# ======================================================================================
# ---- Enemies -------------------------------------------------------------------------------
cutfill $HF/82_freeze_sheet.jpg 350x919+202+133 $OUT/enemies/freeze_idle.png -resize x96
cutfill $HF/82_freeze_sheet.jpg 349x949+707+122 $OUT/enemies/freeze_thaw.png -resize x98
cutfill $HF/83_scooter_sheet.jpg 849x649+88+261 $OUT/enemies/scooter_run.png -resize x58
cutfill $HF/88_seagull_flock.jpg 1622x1004+169+98 $OUT/enemies/flock.png -resize x300
# ---- Mechanisms and vehicles (blocks atlas) -------------------------------------------------
cutfill $HF/82_freeze_sheet.jpg 777x488+1174+416 $OUT/blocks/frost_ring.png -resize 220x
cutfill $HF/83_scooter_sheet.jpg 739x273+1108+642 $OUT/blocks/scooter_pad.png -resize 110x
cutfill $HF/80_market_stalls.jpg 481x606+861+257 $OUT/blocks/dahlia.png -resize x84
cutfill $HF/80_market_stalls.jpg 510x438+1437+435 $OUT/blocks/crate.png -resize '48x48!'
cutfill $HF/80_market_stalls.jpg 674x579+93+321 $OUT/blocks/icebox.png -resize 72x
cutfill $HF/86_waterfront_props.jpg 525x472+757+450 $OUT/blocks/aquarium.png -resize 64x
cutfill $HF/81_brass_pig.jpg 1082x916+485+152 $OUT/blocks/pig.png -resize x110
cutfill $HF/86_waterfront_props.jpg 510x569+1372+373 $OUT/blocks/handtruck.png -resize x110
cutfill $HF/87_water_taxi.jpg 1110x434+487+299 $OUT/blocks/watertaxi.png -resize x140
cutfill $HF/84_alley_props.jpg 523x721+581+209 $OUT/blocks/elevator.png -resize x150
cutfill $HF/85_great_wheel.jpg 560x540+1250+320 $OUT/blocks/gondola.png -resize 96x
cutfill $HF/79_fishmonger.jpg 542x1023+387+67 $OUT/blocks/fishmonger_throw.png -resize x150
cutfill $HF/79_fishmonger.jpg 620x1080+1200+60 $OUT/blocks/fishmonger_catch.png -resize x150
# ---- Props ----------------------------------------------------------------------------------
cutfill $HF/85_great_wheel.jpg 786x971+227+83 $OUT/props/wheel.png -resize x480
cutfill $HF/86_waterfront_props.jpg 403x806+196+138 $OUT/props/fry.png -resize x260
cutfill $HF/84_alley_props.jpg 520x777+39+157 $OUT/props/stagedoor.png -resize x150
cutfill $HF/84_alley_props.jpg 322x582+1105+346 $OUT/props/tourist.png -resize x110
cutfill $HF/84_alley_props.jpg 577x441+1431+484 $OUT/props/crownest.png -resize x60
cutfill $HF/80_market_stalls.jpg 674x579+93+321 $OUT/props/fishstall.png -resize x110
# ---- Tilesets: market (2-1), alley with the sticky gum wall (2-2), pier (2-3) ---------------
tileset market $HF/73_market_floor_tex.jpg $HF/64_dock_planks.jpg 1600x230+200+350 30
tileset alley $HF/75_cobble_alley_tex.jpg $HF/64_dock_planks.jpg 1600x230+200+350 110 $HF/74_gum_wall_tex.jpg
tileset pier $HF/78_boardwalk_tex.jpg $HF/78_boardwalk_tex.jpg 1600x120+200+135 130
# ---- Parallax --------------------------------------------------------------------------
convert $HF/70_pike_far.jpg -resize x720 $TMP/pf.png; mirror $TMP/pf.png $TMP/pf2.png
convert $TMP/pf2.png -quality 84 $BG/bg_pike_far.jpg
keygrey() { # keygrey <src> <out> <height> [sample-x sample-y]: global key of the flat grey
  local bg; bg=$(convert "$1" -format "%[pixel:p{${4:-2040},${5:-5}}]" info:)
  convert "$1" -alpha set -fuzz 8% -transparent "$bg" -trim +repage -resize "x$3" $TMP/kg.png
  mirror $TMP/kg.png "$2"
}
# the market facade has the neon sign on it, so no mirroring (it would read backwards) and only
# the outer grey is keyed (flood fill), not grey shades inside the buildings
pbg=$(convert $HF/71_pike_mid.jpg -format '%[pixel:p{5,5}]' info:)
convert $HF/71_pike_mid.jpg -alpha set -fuzz 6% -fill none \
  -draw "matte 2,2 floodfill" -draw "matte 2045,2 floodfill" -draw "matte 1024,2 floodfill" \
  -fuzz 2.5% -transparent "$pbg" -trim +repage -resize x420 $BG/bg_pike_mid.png
keygrey $HF/72_pike_near.jpg $BG/bg_pike_near.png 240
keygrey $HF/76_alley_mid.jpg $BG/bg_alley_mid.png 460 1024 5
keygrey $HF/77_waterfront_mid.jpg $BG/bg_waterfront_mid.png 400
# World 2 map (Pike Place and the waterfront only)
convert $HF/89_map_pike.jpg -resize '1280x720!' -quality 86 $BG/map_pike.jpg
# ---- Story panels -------------------------------------------------------------------------------
for pair in 90:market 91:fishmonger 92:gumwall 93:waterfront 94:postcard_w2; do
  n=${pair%%:*}; name=${pair#*:}
  f=$(ls $HF/${n}_*.jpg)
  convert "$f" -resize '1280x720^' -gravity center -extent 1280x720 -quality 84 $ST/$name.jpg
done
echo "art generated"
