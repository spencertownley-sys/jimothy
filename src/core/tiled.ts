// Typed access to Tiled object/map properties. Nothing else in the game reads raw Tiled JSON.
export interface TiledProperty {
  name: string;
  type?: string;
  value: unknown;
}

export interface TiledObjectLike {
  id?: number;
  name?: string;
  type?: string;
  class?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  properties?: TiledProperty[] | Record<string, unknown>;
}

function lookup(obj: { properties?: TiledProperty[] | Record<string, unknown> } | undefined, name: string): unknown {
  const props = obj?.properties;
  if (!props) return undefined;
  if (Array.isArray(props)) return props.find((p) => p.name === name)?.value;
  return (props as Record<string, unknown>)[name];
}

export function getProp<T extends string | number | boolean>(obj: TiledObjectLike | undefined, name: string, fallback: T): T {
  const v = lookup(obj, name);
  if (typeof v === typeof fallback) return v as T;
  return fallback;
}

export function getPropOrUndefined<T extends string | number | boolean>(obj: TiledObjectLike | undefined, name: string): T | undefined {
  const v = lookup(obj, name);
  return v === undefined || v === null ? undefined : (v as T);
}

/** Tiled 1.9+ writes `class`; older files and Phaser's parser use `type`. */
export function objectType(obj: TiledObjectLike): string {
  return obj.type || obj.class || '';
}

export interface ObjectRect {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  bottom: number;
  centerY: number;
}

export function objectRect(obj: TiledObjectLike): ObjectRect {
  const x = obj.x ?? 0;
  const y = obj.y ?? 0;
  const width = obj.width ?? 0;
  const height = obj.height ?? 0;
  return { x, y, width, height, centerX: x + width / 2, bottom: y + height, centerY: y + height / 2 };
}
