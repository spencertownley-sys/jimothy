export {};
declare global {
  interface Window {
    __jimothy?: { player: () => { x: number; y: number; fsm: string } | undefined; debug: () => string; levelId: () => string; teleport: (x: number, y: number) => void; power: (kind: string) => void; items: () => { kind: string; x: number; y: number }[]; enemies: () => { x: number; y: number; alive: boolean; id: string }[]; audio: () => { files: Record<string, string>; playing: string | null }; activeScenes: () => string[]; start: (scene: string, data?: object) => void; geoducks: () => boolean[]; review: () => { charting: boolean; seeking: boolean; step: number; total: number; ended: boolean; playing: boolean; beats: { kind: string; text: string; step: number }[]; x: number; y: number; cmd: number } | undefined };
  }
}
