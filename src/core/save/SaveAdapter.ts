import type { SaveV1 } from './SaveV1';

/** Storage backend. localStorage in v1; Capacitor Preferences / cloud later without touching game code. */
export interface SaveAdapter {
  load(): SaveV1;
  save(data: SaveV1): void;
  clear(): void;
}
