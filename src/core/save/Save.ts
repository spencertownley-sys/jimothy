import { LocalStorageAdapter } from './LocalStorageAdapter';
import type { SaveAdapter } from './SaveAdapter';
import { freshSave, type SaveV1 } from './SaveV1';

/** Process-wide save handle. `Save.get()` is the live object; mutate it then `Save.commit()`. */
class SaveStore {
  private adapter: SaveAdapter = new LocalStorageAdapter();
  private data: SaveV1 | null = null;

  useAdapter(adapter: SaveAdapter): void {
    this.adapter = adapter;
    this.data = null;
  }

  get(): SaveV1 {
    if (!this.data) this.data = this.adapter.load();
    return this.data;
  }

  commit(): void {
    if (this.data) this.adapter.save(this.data);
  }

  reset(): void {
    this.data = freshSave();
    this.adapter.clear();
    this.commit();
  }

  hasProgress(): boolean {
    const s = this.get();
    return s.cleared.length > 0 || Object.keys(s.geoducks).length > 0 || s.lattesTotal > 0;
  }

  recordClear(levelId: string, timeMs: number, geoducks: boolean[], lattes: number, nextLevelId?: string): void {
    const s = this.get();
    if (!s.cleared.includes(levelId)) s.cleared.push(levelId);
    if (nextLevelId && !s.unlocked.includes(nextLevelId)) s.unlocked.push(nextLevelId);
    const prev = s.geoducks[levelId] ?? [false, false, false];
    s.geoducks[levelId] = prev.map((v, i) => v || geoducks[i] === true);
    s.lattesTotal += lattes;
    if (!(levelId in s.bestTimes) || timeMs < s.bestTimes[levelId]) s.bestTimes[levelId] = timeMs;
    this.commit();
  }

  recordGeoduck(levelId: string, index: number): void {
    const s = this.get();
    const prev = s.geoducks[levelId] ?? [false, false, false];
    prev[index] = true;
    s.geoducks[levelId] = prev;
    this.commit();
  }

  totalGeoducks(): number {
    return Object.values(this.get().geoducks).reduce((n, arr) => n + arr.filter(Boolean).length, 0);
  }
}

export const Save = new SaveStore();
