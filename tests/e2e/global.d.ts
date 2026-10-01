export {};
declare global {
  interface Window {
    __jimothy?: { player: () => { x: number; y: number; fsm: string } | undefined; debug: () => string; levelId: () => string; teleport: (x: number, y: number) => void; items: () => { kind: string; x: number; y: number }[]; enemies: () => { x: number; y: number; alive: boolean; id: string }[]; activeScenes: () => string[] };
  }
}
