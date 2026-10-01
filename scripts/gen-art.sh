#!/usr/bin/env bash
# Cuts placeholder-quality sprites out of the Higgsfield concept sheets in art/concept,
# draws the World 1 tileset and parallax layers, and leaves everything under art/sprites
# and public/assets. Re-run after swapping a concept sheet; then `npm run pack:atlases`.
#
# Needs ImageMagick (`convert`). Every cut is a flood-fill from the sheet's neutral grey
# corners so the painterly rim light survives; crops are generous and trimmed afterwards.
set -euo pipefail
cd "$(dirname "$0")/.."
C=art/concept
OUT=art/sprites
rm -rf "$OUT"
mkdir -p "$OUT"/{jimothy,enemies,items,blocks,ui}

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

# ---- Blocks (drawn, no concept art) -----------------------------------------------
# Chalkboard "?" menu sign
convert -size 48x48 xc:'#5a3c22' -fill '#233b31' -draw 'roundrectangle 4,4 43,43 4,4' \
  -fill '#F4EFE6' -font DejaVu-Sans-Bold -pointsize 30 -gravity center -annotate +0+1 '?' \
  -stroke '#8a6a40' -strokewidth 2 -fill none -draw 'roundrectangle 1,1 46,46 5,5' \
  $OUT/blocks/qblock.png
convert -size 48x48 xc:'#5a3c22' -fill '#1b2d26' -draw 'roundrectangle 4,4 43,43 4,4' \
  -stroke '#8a6a40' -strokewidth 2 -fill none -draw 'roundrectangle 1,1 46,46 5,5' \
  $OUT/blocks/qblock_used.png
# Mossy cobblestone brick
convert -size 48x48 xc:'#6f6a60' -fill '#7d786d' -draw 'roundrectangle 2,2 22,22 5,5' \
  -draw 'roundrectangle 26,2 46,22 5,5' -draw 'roundrectangle 2,26 22,46 5,5' -draw 'roundrectangle 26,26 46,46 5,5' \
  -fill '#5E8C5A' -draw 'circle 24,24 24,20' -draw 'circle 6,44 6,41' -draw 'circle 44,8 44,6' \
  $OUT/blocks/brick.png
# Brick fragment for the break puff
convert -size 20x20 xc:none -fill '#7d786d' -draw 'roundrectangle 1,1 18,18 4,4' $OUT/blocks/brick_bit.png
# Coffee stand checkpoint: inactive (grey cup) and active (amber cup + steam)
convert -size 64x96 xc:none -fill '#5a3c22' -draw 'rectangle 6,40 58,92' -fill '#8a6a40' -draw 'rectangle 6,40 58,48' \
  -fill '#233b31' -draw 'roundrectangle 12,50 52,84 3,3' -fill '#F4EFE6' -font DejaVu-Sans-Bold -pointsize 11 -gravity north -annotate +0+56 'COFFEE' \
  -fill '#9a9a9a' -draw 'roundrectangle 22,14 42,38 3,3' -fill '#bdbdbd' -draw 'rectangle 20,12 44,18' \
  $OUT/blocks/checkpoint_off.png
convert -size 64x96 xc:none -fill '#5a3c22' -draw 'rectangle 6,40 58,92' -fill '#8a6a40' -draw 'rectangle 6,40 58,48' \
  -fill '#233b31' -draw 'roundrectangle 12,50 52,84 3,3' -fill '#F4EFE6' -font DejaVu-Sans-Bold -pointsize 11 -gravity north -annotate +0+56 'COFFEE' \
  -fill '#F2B35B' -draw 'roundrectangle 22,14 42,38 3,3' -fill '#F4EFE6' -draw 'rectangle 20,12 44,18' \
  -fill '#ffffff80' -draw 'ellipse 32,6 4,5 0,360' \
  $OUT/blocks/checkpoint_on.png
# The 44 bus that picks Jimothy up at the exit
convert -size 200x90 xc:none -fill '#2e6b5e' -draw 'roundrectangle 4,10 196,80 10,10' \
  -fill '#B8C9CE' -draw 'rectangle 14,20 60,46' -draw 'rectangle 70,20 116,46' -draw 'rectangle 126,20 172,46' \
  -fill '#F2B35B' -draw 'rectangle 150,2 196,12' -fill '#1C2426' -font DejaVu-Sans-Bold -pointsize 10 -gravity northeast -annotate +8+1 '44 BALLARD' \
  -fill '#1C2426' -draw 'circle 40,82 40,70' -draw 'circle 160,82 160,70' \
  $OUT/blocks/bus.png
# Rain drop projectile (for the Rain Jacket)
convert -size 16x16 xc:none -fill '#8FB7C7' -draw 'circle 8,8 8,2' -fill '#ffffff' -draw 'circle 6,6 6,4' $OUT/blocks/raindrop.png
# Puff for stomps / brick breaks
convert -size 24x24 xc:none -fill '#ffffffb0' -draw 'circle 12,12 12,3' $OUT/blocks/puff.png

# ---- World 1 tileset (48 px, extruded 1 px, margin 1 / spacing 2) -------------------
T=/tmp/jimothy-tiles; rm -rf $T; mkdir -p $T
tile() { # tile <index> <draw commands...>
  local i="$1"; shift
  convert -size 48x48 "$@" $T/$(printf '%02d' $i).png
}
tile 1  xc:'#6d7f82' -fill '#8a9c9e' -draw 'rectangle 0,0 47,6' -fill '#5E8C5A' -draw 'rectangle 0,0 47,3' -fill '#5c6d70' -draw 'line 24,8 24,47' -draw 'line 0,30 47,30'   # sidewalk top
tile 2  xc:'#3b3128' -fill '#463a2f' -draw 'rectangle 6,10 20,20' -draw 'rectangle 28,30 44,40'                                                   # dirt fill
tile 3  xc:'#3b3128' -fill '#5E8C5A' -draw 'rectangle 0,0 47,10' -fill '#6fa36a' -draw 'rectangle 0,0 47,4' -fill '#4e7a4a' -draw 'line 10,10 10,14' -draw 'line 30,10 30,16'  # grass top
tile 4  xc:'#6f6a60' -fill '#7d786d' -draw 'roundrectangle 2,2 22,22 5,5' -draw 'roundrectangle 26,2 46,22 5,5' -draw 'roundrectangle 2,26 22,46 5,5' -draw 'roundrectangle 26,26 46,46 5,5' -fill '#5E8C5A' -draw 'circle 24,24 24,21'  # cobble wall
tile 5  xc:none -fill '#a7793f' -draw 'rectangle 0,4 47,12' -draw 'rectangle 0,18 47,26' -draw 'rectangle 0,32 47,40' -fill '#7a5527' -draw 'rectangle 4,4 8,44' -draw 'rectangle 40,4 44,44'  # pallet (one-way)
tile 6  xc:none -fill '#2f6fb5' -draw 'roundrectangle 0,14 47,47 6,6' -fill '#4a8ad6' -draw 'rectangle 0,14 47,22'  # blue bin lid
tile 7  xc:none -fill '#3f8c48' -draw 'roundrectangle 0,14 47,47 6,6' -fill '#5ba864' -draw 'rectangle 0,14 47,22'  # green bin lid
tile 8  xc:none -fill '#2b2b2b' -draw 'roundrectangle 0,14 47,47 6,6' -fill '#474747' -draw 'rectangle 0,14 47,22'  # black bin lid
tile 9  xc:'#2f6fb5' -fill '#255c99' -draw 'rectangle 6,0 10,47' -draw 'rectangle 36,0 40,47' -fill '#B8C9CE' -draw 'circle 24,24 24,18'  # blue bin body
tile 10 xc:'#3f8c48' -fill '#33733b' -draw 'rectangle 6,0 10,47' -draw 'rectangle 36,0 40,47' -fill '#B8C9CE' -draw 'circle 24,24 24,18'  # green bin body
tile 11 xc:'#2b2b2b' -fill '#1e1e1e' -draw 'rectangle 6,0 10,47' -draw 'rectangle 36,0 40,47' -fill '#B8C9CE' -draw 'circle 24,24 24,18'  # black bin body
tile 12 xc:'#2a3a3a' -fill '#394f4f' -draw 'rectangle 0,0 47,6' -draw 'rectangle 0,16 47,22' -draw 'rectangle 0,32 47,38' -fill '#5E8C5A' -draw 'circle 10,12 10,9'  # porch roof (solid)
tile 13 xc:none -fill '#e8e2d6' -draw 'rectangle 18,0 30,47' -fill '#cfc7b8' -draw 'rectangle 26,0 30,47'  # porch post (decor)
tile 14 xc:none -fill '#5a3c22' -draw 'rectangle 12,0 36,47' -fill '#6f4a2a' -draw 'rectangle 16,0 22,47' -fill '#5E8C5A' -draw 'circle 32,30 32,27'  # cedar trunk (decor)
tile 15 xc:none -fill '#2f5e45' -draw 'polygon 24,0 47,47 0,47' -fill '#3f7a58' -draw 'polygon 24,8 40,40 8,40'  # cedar foliage (decor)
tile 16 xc:none -fill '#2b3c44' -draw 'ellipse 24,30 23,14 0,360' -fill '#8FB7C7' -draw 'ellipse 24,30 23,14 0,360' -fill '#2b3c44' -draw 'ellipse 24,30 20,11 0,360' -fill '#4b6a78' -draw 'ellipse 18,27 6,3 0,360'  # pothole (hazard)
tile 17 xc:none -fill '#6f4a2a' -draw 'rectangle 8,16 40,47' -fill '#c9a070' -draw 'ellipse 24,16 16,6 0,360' -fill '#a67c4e' -draw 'ellipse 24,16 10,3 0,360'  # stump (decor)
tile 18 xc:'#4d4a43' -fill '#57544c' -draw 'rectangle 2,2 22,22' -draw 'rectangle 26,26 46,46'  # stone fill (solid)
tile 19 xc:none -fill '#6b4a2d' -draw 'roundrectangle 0,14 47,47 6,6' -fill '#8a6a40' -draw 'rectangle 0,14 47,22'  # compost bin lid (one-way)
tile 20 xc:'#6b4a2d' -fill '#553a22' -draw 'rectangle 6,0 10,47' -draw 'rectangle 36,0 40,47' -fill '#5E8C5A' -draw 'circle 24,24 24,18'  # compost body (solid)
tile 21 xc:none -fill '#8a9c9e' -draw 'rectangle 22,8 26,47' -fill '#2e6b5e' -draw 'roundrectangle 8,0 40,18 3,3' -fill '#F4EFE6' -font DejaVu-Sans-Bold -pointsize 10 -gravity north -annotate +0+3 '44'  # bus stop sign (decor)
tile 22 xc:none -fill '#d9d2c3' -draw 'roundrectangle 6,10 42,42 4,4' -fill '#1C2426' -draw 'rectangle 11,15 37,35' -fill '#4a8ad6' -draw 'rectangle 13,17 35,33'  # CRT monitor (decor)
tile 23 xc:none -fill '#b08a5a' -draw 'rectangle 2,20 46,47' -fill '#F4EFE6' -font DejaVu-Sans-Bold -pointsize 12 -gravity center -annotate +0+8 'FREE'  # free box (decor)
tile 24 xc:none -fill '#4d4a43' -draw 'roundrectangle 0,8 47,47 4,4' -fill '#1C2426' -draw 'rectangle 6,16 41,20' -draw 'rectangle 6,26 41,30' -draw 'rectangle 6,36 41,40'  # storm drain grate (solid)
tile 25 xc:none -fill '#8FB7C7' -draw 'ellipse 24,40 22,6 0,360' -fill '#b8d4de' -draw 'ellipse 20,39 10,2 0,360'  # puddle (decor)
tile 26 xc:none -fill '#5E8C5A' -draw 'polygon 24,47 8,20 14,18 24,40 34,18 40,20' -draw 'polygon 24,47 2,32 6,30 24,42 42,30 46,32'  # fern (decor)
tile 27 xc:none -fill '#e8e2d6' -draw 'rectangle 4,0 8,47' -draw 'rectangle 22,0 26,47' -draw 'rectangle 40,0 44,47' -draw 'rectangle 0,10 47,14' -draw 'rectangle 0,30 47,34'  # fence (decor)
tile 28 xc:none -fill '#F2B35B' -draw 'circle 24,20 24,12' -fill '#ffd98a' -draw 'circle 24,20 24,7'  # porch light (decor)
tile 29 xc:none -fill '#5a3c22' -draw 'roundrectangle 0,18 47,30 6,6' -fill '#3f7a58' -draw 'ellipse 12,16 10,6 0,360' -draw 'ellipse 36,16 10,6 0,360'  # cedar branch (one-way)
tile 30 xc:none -fill '#3f7a58' -draw 'ellipse 24,30 24,16 0,360' -fill '#2f5e45' -draw 'ellipse 24,34 18,10 0,360'  # cedar bough (decor)
# extrude each tile by 1 px (edge pixels duplicated), then lay out 8 per row with 2 px spacing / 1 px margin
for f in $T/*.png; do
  convert "$f" -set option:distort:viewport 50x50-1-1 -virtual-pixel edge -distort SRT 0 +repage "$f"
done
montage $T/*.png -tile 8x -geometry 50x50+1+1 -background none -depth 8 public/assets/tilesets/ballard.png
# montage adds 1 px border around each cell → 2 px between tiles, 1 px margin. Verify size: 8*52 = 416 wide.
identify public/assets/tilesets/ballard.png

# ---- Backgrounds -------------------------------------------------------------------
B=public/assets/backgrounds
# far: the Ballard concept painting, mirrored so it tiles seamlessly; softened and sat on the
# ground line (y=624) so painted bins/signs never read as platforms. Sky color fills the rest.
convert $C/03_bg_world1_ballard.jpg -resize x600 \( +clone -flop \) +append -blur 0x1.2 -modulate 92,78 \
  -gravity south -background '#6E9AA6' -splice 0x96 +repage -quality 82 $B/bg_ballard_far.jpg
# mid: faint craftsman-house and cedar silhouettes (mist layer)
convert -size 1280x720 xc:none -fill '#1F3A3326' \
  -draw 'polygon 60,720 60,430 160,340 260,430 260,720' -draw 'polygon 420,720 420,470 520,390 620,470 620,720' \
  -draw 'polygon 860,720 860,440 980,350 1100,440 1100,720' \
  -fill '#1F3A332e' -draw 'polygon 340,720 340,260 370,120 400,260 400,720' -draw 'polygon 720,720 720,220 760,60 800,220 800,720' \
  -draw 'polygon 1180,720 1180,280 1210,150 1240,280 1240,720' \
  $B/bg_ballard_mid.png
# near: fence line + ferns, alpha, sits behind the ground tiles
convert -size 1280x400 xc:none -fill '#1F3A33aa' -draw 'rectangle 0,330 1280,336' -draw 'rectangle 0,360 1280,366' \
  -fill '#1F3A33cc' -draw 'rectangle 40,300 48,400' -draw 'rectangle 240,300 248,400' -draw 'rectangle 440,300 448,400' -draw 'rectangle 640,300 648,400' -draw 'rectangle 840,300 848,400' -draw 'rectangle 1040,300 1048,400' \
  -fill '#2f5e45cc' -draw 'polygon 120,400 90,330 100,326 120,380 140,326 150,330' -draw 'polygon 560,400 530,320 540,316 560,380 580,316 590,320' -draw 'polygon 980,400 950,330 960,326 980,380 1000,326 1010,330' \
  $B/bg_ballard_near.png
# title key art + world map backdrop
convert $C/23_title_key_art_v3.jpg -resize 1280x720^ -gravity center -extent 1280x720 -quality 85 $B/title_keyart.jpg
convert $C/03_bg_world1_ballard.jpg -resize 1280x720^ -gravity center -extent 1280x720 -blur 0x6 -modulate 70,80 -quality 80 $B/worldmap.jpg
echo "art generated"
