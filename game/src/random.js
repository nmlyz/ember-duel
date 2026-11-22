// Seeded random numbers for Ember Duel. Every shuffle, draw and AI tie-break
// in the game comes from one of these, so a game started from a seed replays
// exactly the same way every time. No Math.random anywhere in game logic.

export function makeRng(seed) {
  let s = (seed >>> 0) || 1;
  return {
    next() {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    int(n) {
      return Math.floor(this.next() * n);
    },
    pick(array) {
      return array[this.int(array.length)];
    },
  };
}

/** Fisher-Yates shuffle driven by the seeded rng; returns a new array. */
export function shuffle(array, rng) {
  const out = array.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = rng.int(i + 1);
    const tmp = out[i]; out[i] = out[j]; out[j] = tmp;
  }
  return out;
}
