import Phaser from 'phaser';
import { getProp, objectRect, type TiledObjectLike } from '../../core/tiled';

const warned = new Set<string>();

/**
 * Decor sprite from the `props` atlas (trees, bins, ferns, porch columns…), placed by a Tiled
 * `prop` object. Height comes from the object rect; width keeps the art's aspect unless
 * `stretch` is set. `front` draws it over Jimothy, e.g. the compost bin hiding Geoduck #1.
 */
export function spawnProp(scene: Phaser.Scene, obj: TiledObjectLike): Phaser.GameObjects.Image | undefined {
  const sprite = getProp<string>(obj, 'sprite', '');
  // most decor lives in the props atlas; a few pieces borrow enemy art (the fry's worshipping gulls)
  const atlas = getProp<string>(obj, 'atlas', 'props');
  const tex = scene.textures.get(atlas);
  if (!sprite || !tex || !tex.has(sprite)) {
    if (!warned.has(sprite)) {
      warned.add(sprite);
      console.warn(`[level] prop sprite "${sprite}" missing from the props atlas`);
    }
    return undefined;
  }
  const r = objectRect(obj);
  const top = getProp<string>(obj, 'align', 'bottom') === 'top';
  const img = scene.add.image(r.centerX, top ? r.y : r.bottom, atlas, sprite).setOrigin(0.5, top ? 0 : 1).setFlipX(getProp(obj, 'flip', false));
  if (getProp(obj, 'stretch', false)) img.setDisplaySize(r.width, r.height);
  else img.setScale(r.height / img.height);
  img.setDepth(getProp(obj, 'front', false) ? 11 : 2);
  return img;
}
