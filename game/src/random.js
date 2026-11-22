// Seeded random numbers (mulberry32) so staged screenshots and the
// autopilot are reproducible: the same seed always deals the same frame.

/** A small deterministic generator returning floats in [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick one element of an array with a seeded generator. */
export function pick(rng, items) {
  return items[Math.floor(rng() * items.length)];
}

/** A float in [min, max) from a seeded generator. */
export function range(rng, min, max) {
  return min + rng() * (max - min);
}
