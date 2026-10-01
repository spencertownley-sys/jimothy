import { describe, expect, it } from 'vitest';
import { LocalStorageAdapter, SAVE_KEY } from '../../src/core/save/LocalStorageAdapter';
import { freshSave, migrate } from '../../src/core/save/SaveV1';

class MemStorage {
  map = new Map<string, string>();
  getItem(k: string): string | null {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.map.set(k, v);
  }
  removeItem(k: string): void {
    this.map.delete(k);
  }
}

describe('save system', () => {
  it('round-trips through the adapter', () => {
    const store = new MemStorage();
    const adapter = new LocalStorageAdapter(store);
    const s = freshSave();
    s.cleared.push('1-1');
    s.geoducks['1-1'] = [true, false, true];
    s.bestTimes['1-1'] = 81234;
    adapter.save(s);
    const back = adapter.load();
    expect(back.cleared).toEqual(['1-1']);
    expect(back.geoducks['1-1']).toEqual([true, false, true]);
    expect(back.bestTimes['1-1']).toBe(81234);
  });

  it('corrupt JSON → fresh save, no throw', () => {
    const store = new MemStorage();
    store.setItem(SAVE_KEY, '{not json');
    const adapter = new LocalStorageAdapter(store);
    expect(adapter.load()).toEqual(freshSave());
  });

  it('migration respects the schema version and repairs partial data', () => {
    expect(migrate({ v: 99 })).toEqual(freshSave());
    const repaired = migrate({ v: 1, unlocked: ['1-2'], options: { musicVol: 5, touchLayout: 'classic' } });
    expect(repaired.unlocked).toEqual(['1-1', '1-2']);
    expect(repaired.options.musicVol).toBe(1);
    expect(repaired.options.touchLayout).toBe('classic');
    expect(repaired.options.drizzle).toBe(true);
  });

  it('survives a missing storage backend', () => {
    const adapter = new LocalStorageAdapter(null);
    expect(() => adapter.save(freshSave())).not.toThrow();
    expect(adapter.load()).toEqual(freshSave());
  });
});
