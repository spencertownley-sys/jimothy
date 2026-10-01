import type { SaveAdapter } from './SaveAdapter';
import { freshSave, migrate, type SaveV1 } from './SaveV1';

export const SAVE_KEY = 'jimothy.save';

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class LocalStorageAdapter implements SaveAdapter {
  private storage: StorageLike | null;
  private warned = false;

  constructor(storage?: StorageLike | null) {
    if (storage !== undefined) this.storage = storage;
    else {
      try {
        this.storage = typeof localStorage !== 'undefined' ? localStorage : null;
      } catch {
        this.storage = null; // privacy mode / blocked storage
      }
    }
  }

  load(): SaveV1 {
    if (!this.storage) return freshSave();
    try {
      const raw = this.storage.getItem(SAVE_KEY);
      if (!raw) return freshSave();
      return migrate(JSON.parse(raw));
    } catch (err) {
      if (!this.warned) {
        console.warn('[save] corrupt save, starting fresh', err);
        this.warned = true;
      }
      return freshSave();
    }
  }

  save(data: SaveV1): void {
    if (!this.storage) return;
    try {
      this.storage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (err) {
      if (!this.warned) {
        console.warn('[save] could not write save', err);
        this.warned = true;
      }
    }
  }

  clear(): void {
    try {
      this.storage?.removeItem(SAVE_KEY);
    } catch {
      /* ignore */
    }
  }
}
