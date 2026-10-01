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
echo "art generated"
