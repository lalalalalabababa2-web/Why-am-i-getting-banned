// Small math helpers shared by every system.

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, v) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export const TAU = Math.PI * 2;

/** Wrap an angle to [-PI, PI]. */
export function wrapAngle(a) {
  a = (a + Math.PI) % TAU;
  if (a < 0) a += TAU;
  return a - Math.PI;
}

/** Move angle a toward b by at most step. */
export function approachAngle(a, b, step) {
  const d = wrapAngle(b - a);
  if (Math.abs(d) <= step) return b;
  return a + Math.sign(d) * step;
}

export function approach(v, target, step) {
  if (v < target) return Math.min(v + step, target);
  return Math.max(v - step, target);
}

/** Exponential smoothing factor that is frame-rate independent. */
export const damp = (rate, dt) => 1 - Math.exp(-rate * dt);

export const dist2 = (ax, az, bx, bz) => {
  const dx = ax - bx, dz = az - bz;
  return dx * dx + dz * dz;
};
export const dist = (ax, az, bx, bz) => Math.sqrt(dist2(ax, az, bx, bz));

/** Heading (radians) of a direction in the XZ plane; forward = (sin h, cos h). */
export const headingOf = (dx, dz) => Math.atan2(dx, dz);

/** Deterministic PRNG (mulberry32). */
export function makeRng(seed) {
  let s = seed >>> 0;
  const rng = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rng.range = (a, b) => a + (b - a) * rng();
  rng.int = (a, b) => Math.floor(a + (b - a + 1) * rng());
  rng.pick = (arr) => arr[Math.floor(rng() * arr.length)];
  rng.chance = (p) => rng() < p;
  return rng;
}

// A non-deterministic RNG for gameplay (spawns, AI choices).
export const rand = (a = 0, b = 1) => a + (b - a) * Math.random();
export const randInt = (a, b) => Math.floor(a + (b - a + 1) * Math.random());
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const chance = (p) => Math.random() < p;

/** Distance from point P to segment AB in 2D, and the param t. */
export function pointSegDist(px, pz, ax, az, bx, bz) {
  const abx = bx - ax, abz = bz - az;
  const l2 = abx * abx + abz * abz;
  let t = l2 > 0 ? ((px - ax) * abx + (pz - az) * abz) / l2 : 0;
  t = clamp(t, 0, 1);
  const cx = ax + abx * t, cz = az + abz * t;
  return { d: Math.hypot(px - cx, pz - cz), t, x: cx, z: cz };
}

export function formatMoney(n) {
  const s = Math.floor(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (n < 0 ? '-$' : '$') + s;
}

export function formatTime(sec) {
  sec = Math.max(0, Math.ceil(sec));
  const m = Math.floor(sec / 60), s = sec % 60;
  return m + ':' + (s < 10 ? '0' : '') + s;
}

/** Hex color helpers for vertex colors (returns linear-space THREE color via caller). */
export function hsl(h, s, l) {
  // returns css string
  return `hsl(${h},${s}%,${l}%)`;
}
