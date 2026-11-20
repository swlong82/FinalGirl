// Deterministic mulberry32 RNG; state lives inside GameState so saves replay exactly.
export function nextRand(state: { rng: number }): number {
  let t = (state.rng = (state.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function rollD6(state: { rng: number }): number {
  return 1 + Math.floor(nextRand(state) * 6);
}

export function shuffle<T>(state: { rng: number }, arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(nextRand(state) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pick<T>(state: { rng: number }, arr: T[]): T {
  return arr[Math.floor(nextRand(state) * arr.length)];
}
