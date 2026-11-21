// Procedural low-poly models: vehicles (one geometry per type) and human body parts.
// Vertex colour = base colour; attribute `paint` (0..1) = how much the per-instance colour tints it.

import * as THREE from 'three';

export function makePaintMaterial(opts = {}) {
  const m = new THREE.MeshLambertMaterial({ vertexColors: true, ...opts });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float paint;')
      .replace('vColor.xyz *= instanceColor.xyz;', 'vColor.xyz = mix(vColor.xyz, vColor.xyz * instanceColor.xyz, paint);');
  };
  m.customProgramCacheKey = () => 'paint-v1';
  return m;
}

/** Accumulates flat-shaded quads with colour + paint mask. */
class PartBuilder {
  constructor() { this.p = []; this.n = []; this.c = []; this.k = []; }
  quad(a, b, c, d, col, paint) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l; ny /= l; nz /= l;
    for (const v of [a, b, c, a, c, d]) {
      this.p.push(v[0], v[1], v[2]);
      this.n.push(nx, ny, nz);
      this.c.push(col[0], col[1], col[2]);
      this.k.push(paint);
    }
  }
  /** Frustum-like prism: bottom rect (±bw, br..bf) at y0, top rect (±tw, tr..tf) at y1. */
  prism(bw, br, bf, y0, tw, tr, tf, y1, cols, paints, xo = 0) {
    const [cf, cb, cl, cr, ct] = cols;
    const [pf, pb, pl, pr, pt] = paints;
    const X = (x) => x + xo;
    this.quad([X(-bw), y0, bf], [X(bw), y0, bf], [X(tw), y1, tf], [X(-tw), y1, tf], cf, pf); // front
    this.quad([X(bw), y0, br], [X(-bw), y0, br], [X(-tw), y1, tr], [X(tw), y1, tr], cb, pb); // back
    this.quad([X(bw), y0, bf], [X(bw), y0, br], [X(tw), y1, tr], [X(tw), y1, tf], cl, pl); // left (+x)
    this.quad([X(-bw), y0, br], [X(-bw), y0, bf], [X(-tw), y1, tf], [X(-tw), y1, tr], cr, pr); // right (-x)
    if (ct) this.quad([X(-tw), y1, tf], [X(tw), y1, tf], [X(tw), y1, tr], [X(-tw), y1, tr], ct, pt); // top
  }
  box(x0, y0, z0, x1, y1, z1, col, paint, opts = {}) {
    const cx = (x0 + x1) / 2, hw = (x1 - x0) / 2;
    const cols = [col, col, col, col, col];
    if (opts.front) cols[0] = opts.front;
    if (opts.back) cols[1] = opts.back;
    const paints = [paint, paint, paint, paint, paint];
    if (opts.front) paints[0] = opts.frontPaint ?? 0;
    if (opts.back) paints[1] = opts.backPaint ?? 0;
    this.prism(hw, z0, z1, y0, hw, z0, z1, y1, cols, paints, cx);
    if (opts.bottom) this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], opts.bottom, 0);
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('paint', new THREE.Float32BufferAttribute(this.k, 1));
    g.computeBoundingSphere();
    return g;
  }
}

const lin = (hex) => {
  const c = new THREE.Color(hex);
  return [c.r, c.g, c.b];
};
const WHITE = [1, 1, 1];
const GLASS = lin(0x1a2533);
const DARK = lin(0x1c1d20);
const CHROME = lin(0xb8bcc2);
const GRILLE = lin(0x0e0f11);

// --------------------------------------------------------------------------------------------
// Vehicle catalogue. Physics in vehicle.js reads the same table.
// --------------------------------------------------------------------------------------------
export const VTYPES = {
  compact: {
    name: 'Pico', len: 3.9, wid: 1.76, hgt: 1.48, clear: 0.28, belt: 0.86, wheelR: 0.32, wheelbase: 2.45,
    cab: [-1.5, 0.95, -1.05, 0.35], maxSpeed: 37, accel: 9.5, brake: 24, grip: 7.6, steer: 0.62, mass: 0.9,
    health: 700, price: 0, colors: [0xff5a5f, 0x3fa7ff, 0xffd23f, 0x7bd389, 0xf4f4f4, 0xff9f1c, 0xb07cff],
  },
  sedan: {
    name: 'Cruiser', len: 4.7, wid: 1.86, hgt: 1.46, clear: 0.28, belt: 0.88, wheelR: 0.34, wheelbase: 2.8,
    cab: [-1.65, 1.15, -1.15, 0.45], maxSpeed: 45, accel: 10.5, brake: 25, grip: 7.6, steer: 0.6, mass: 1.0,
    health: 900, colors: [0x2b2f36, 0xd9dde2, 0x8a1c24, 0x1f3b73, 0x3d5c4a, 0xb9a27a, 0x6b6f76, 0xffffff],
  },
  taxi: {
    name: 'Cab', base: 'sedan', len: 4.7, wid: 1.86, hgt: 1.46, clear: 0.28, belt: 0.88, wheelR: 0.34, wheelbase: 2.8,
    cab: [-1.65, 1.15, -1.15, 0.45], maxSpeed: 44, accel: 10.5, brake: 25, grip: 7.6, steer: 0.6, mass: 1.0,
    health: 900, colors: [0xffc21a],
  },
  police: {
    name: 'Interceptor', base: 'sedan', len: 4.8, wid: 1.9, hgt: 1.48, clear: 0.28, belt: 0.9, wheelR: 0.35, wheelbase: 2.85,
    cab: [-1.7, 1.15, -1.15, 0.45], maxSpeed: 56, accel: 15, brake: 28, grip: 8.8, steer: 0.62, mass: 1.15,
    health: 1100, colors: [0xf4f6f8],
  },
  sports: {
    name: 'Vortex GT', len: 4.45, wid: 1.96, hgt: 1.22, clear: 0.22, belt: 0.74, wheelR: 0.35, wheelbase: 2.65,
    cab: [-1.35, 0.85, -0.85, 0.2], maxSpeed: 64, accel: 17, brake: 30, grip: 9.6, steer: 0.58, mass: 0.95,
    health: 800, spoiler: true, colors: [0xff2bd6, 0x22f3ff, 0xff3b3b, 0xfff23d, 0x9dff2e, 0xff7a1a, 0x101012],
  },
  muscle: {
    name: 'Bruiser', len: 4.9, wid: 1.98, hgt: 1.36, clear: 0.26, belt: 0.86, wheelR: 0.36, wheelbase: 2.9,
    cab: [-1.55, 0.7, -1.0, 0.3], maxSpeed: 56, accel: 15.5, brake: 24, grip: 6.4, steer: 0.6, mass: 1.15,
    health: 1000, spoiler: true, stripes: true, colors: [0xff7a1a, 0x1f3b73, 0x101012, 0xc81d25, 0xf4f4f4, 0x2a9d8f],
  },
  suv: {
    name: 'Ranger', len: 4.85, wid: 2.0, hgt: 1.86, clear: 0.38, belt: 1.12, wheelR: 0.4, wheelbase: 2.9,
    cab: [-2.1, 1.35, -1.85, 0.95], maxSpeed: 43, accel: 9.8, brake: 23, grip: 7.2, steer: 0.58, mass: 1.35,
    health: 1200, colors: [0x101012, 0xf4f4f4, 0x4a5a6a, 0x8a1c24, 0x2f4f3a, 0xc2b280],
  },
  van: {
    name: 'Hauler', len: 5.2, wid: 2.05, hgt: 2.35, clear: 0.34, belt: 1.2, wheelR: 0.38, wheelbase: 3.1,
    cab: [-2.5, 1.55, -2.45, 1.25], maxSpeed: 35, accel: 7.5, brake: 20, grip: 6.6, steer: 0.55, mass: 1.6,
    health: 1300, van: true, colors: [0xf4f4f4, 0xe9e2cf, 0x5b8fb9, 0xd64545],
  },
  truck: {
    name: 'Mule', len: 7.4, wid: 2.4, hgt: 3.3, clear: 0.42, belt: 1.35, wheelR: 0.5, wheelbase: 4.6,
    cab: [2.0, 3.6, 2.2, 3.3], maxSpeed: 30, accel: 6, brake: 18, grip: 6.5, steer: 0.5, mass: 2.8,
    health: 1800, truck: true, colors: [0xd64545, 0x2b6cb0, 0xf4f4f4, 0xe9b949],
  },
  super: {
    name: 'Stingray', len: 4.55, wid: 2.04, hgt: 1.12, clear: 0.2, belt: 0.68, wheelR: 0.36, wheelbase: 2.7,
    cab: [-1.0, 0.55, -0.45, 0.05], maxSpeed: 74, accel: 21, brake: 33, grip: 10.4, steer: 0.56, mass: 0.95,
    health: 750, spoiler: true, colors: [0xff2020, 0xfff23d, 0x22f3ff, 0xff2bd6, 0xf4f4f4],
  },
};
export const VTYPE_KEYS = Object.keys(VTYPES);

/**
 * Build one vehicle body geometry. Front = +Z, left = +X, ground at y = 0.
 * cab = [rearBottomZ, frontBottomZ, rearTopZ, frontTopZ] as offsets from the body's centre.
 */
export function buildVehicleGeometry(key) {
  const T = VTYPES[key];
  const b = new PartBuilder();
  const L = T.len, W = T.wid / 2, H = T.hgt;
  const y0 = T.clear, y1 = T.belt;
  const zf = L / 2, zr = -L / 2;

  if (T.truck) {
    // cab at the front, cargo box behind
    const cabR = zf - 2.3;
    b.box(-W, y0, cabR, W, 1.7, zf - 0.15, WHITE, 1, { front: GRILLE });
    b.prism(W - 0.05, cabR, zf - 0.35, 1.7, W - 0.15, cabR, zf - 0.85, 3.0, [GLASS, WHITE, GLASS, GLASS, WHITE], [0, 1, 0, 0, 1]);
    b.box(-W, 0.9, zr + 0.2, W, H, cabR - 0.25, lin(0xf2f2f2), 0, { back: lin(0xd8d8d8) });
    b.box(-W + 0.1, y0, zr + 0.2, W - 0.1, 0.9, cabR, DARK, 0);
    b.box(-W, y0, zf - 0.15, W, 0.75, zf + 0.12, CHROME, 0);
    b.box(-W, y0, zr, W, 0.7, zr + 0.25, DARK, 0);
    return b.build();
  }
  if (T.van) {
    b.box(-W, y0, zr + 0.1, W, y1, zf - 0.6, WHITE, 1, { bottom: DARK });
    // hood + windscreen slope to the tall roof
    b.prism(W, zf - 0.6, zf - 0.05, y0, W, zf - 0.6, zf - 0.25, y1, [GRILLE, WHITE, WHITE, WHITE, WHITE], [0, 1, 1, 1, 1]);
    b.prism(W, zr + 0.1, zf - 0.6, y1, W - 0.06, zr + 0.1, zf - 1.3, H, [GLASS, WHITE, WHITE, WHITE, WHITE], [0, 1, 1, 1, 1]);
    // side windows on the cab section
    b.box(W - 0.04, y1 + 0.15, zf - 2.2, W + 0.01, H - 0.25, zf - 1.1, GLASS, 0);
    b.box(-W - 0.01, y1 + 0.15, zf - 2.2, -W + 0.04, H - 0.25, zf - 1.1, GLASS, 0);
    bumpers(b, W, zf, zr, y0);
    return b.build();
  }

  // body
  const nose = T.spoiler ? 0.18 : 0.1;
  b.box(-W, y0, zr, W, y1, zf - 0.35, WHITE, 1, { back: WHITE, backPaint: 1, bottom: DARK });
  // sloped nose
  b.prism(W, zf - 0.35, zf, y0, W, zf - 0.35, zf - nose - 0.25, y1, [GRILLE, WHITE, WHITE, WHITE, WHITE], [0, 1, 1, 1, 1]);
  // cabin / glasshouse
  const [cr, cf, tr, tf] = T.cab;
  const inset = 0.08, topInset = T.key === 'super' ? 0.3 : 0.24;
  const cabTopY = H;
  b.prism(W - inset, cr, cf, y1, W - topInset, tr, tf, cabTopY, [GLASS, GLASS, GLASS, GLASS, WHITE], [0, 0, 0, 0, 1]);
  // door pillars (B-pillar) for some depth
  const pm = (cr + cf) / 2;
  b.box(W - 0.2, y1, pm - 0.06, W - inset + 0.005, cabTopY - 0.04, pm + 0.06, WHITE, 1);
  b.box(-W + inset - 0.005, y1, pm - 0.06, -W + 0.2, cabTopY - 0.04, pm + 0.06, WHITE, 1);
  bumpers(b, W, zf, zr, y0);
  // mirrors
  b.box(W, y1 - 0.05, cf - 0.15, W + 0.16, y1 + 0.1, cf, WHITE, 1);
  b.box(-W - 0.16, y1 - 0.05, cf - 0.15, -W, y1 + 0.1, cf, WHITE, 1);
  if (T.spoiler) {
    b.box(-W + 0.1, y1 + 0.25, zr + 0.05, W - 0.1, y1 + 0.32, zr + 0.4, WHITE, 1);
    b.box(-W + 0.3, y1, zr + 0.15, -W + 0.4, y1 + 0.25, zr + 0.3, DARK, 0);
    b.box(W - 0.4, y1, zr + 0.15, W - 0.3, y1 + 0.25, zr + 0.3, DARK, 0);
  }
  if (T.stripes) {
    b.box(-0.35, y1 + 0.003, zr + 0.3, -0.12, y1 + 0.006, cr, lin(0xffffff), 0);
    b.box(0.12, y1 + 0.003, zr + 0.3, 0.35, y1 + 0.006, cr, lin(0xffffff), 0);
    b.box(-0.35, y1 + 0.003, cf, -0.12, y1 + 0.006, zf - 0.4, lin(0xffffff), 0);
    b.box(0.12, y1 + 0.003, cf, 0.35, y1 + 0.006, zf - 0.4, lin(0xffffff), 0);
  }
  if (key === 'police') {
    // black and white: dark lower doors, light bar base, push bar
    b.box(W - 0.005, y0 + 0.08, cr - 0.4, W + 0.01, y1 - 0.12, cf + 0.2, lin(0x14161a), 0);
    b.box(-W - 0.01, y0 + 0.08, cr - 0.4, -W + 0.005, y1 - 0.12, cf + 0.2, lin(0x14161a), 0);
    b.box(-0.62, H, -0.1, 0.62, H + 0.1, 0.18, DARK, 0);
    b.box(-W + 0.25, y0 + 0.05, zf, W - 0.25, y1 - 0.1, zf + 0.22, DARK, 0);
    // POLICE stripe
    b.box(W - 0.002, y1 - 0.28, cr, W + 0.012, y1 - 0.16, cf, lin(0x2f6bff), 0);
    b.box(-W - 0.012, y1 - 0.28, cr, -W + 0.002, y1 - 0.16, cf, lin(0x2f6bff), 0);
  }
  if (key === 'taxi') {
    b.box(-0.35, H, -0.15, 0.35, H + 0.26, 0.15, lin(0xfff3c4), 0);
    b.box(W - 0.002, y1 - 0.3, zr + 0.4, W + 0.012, y1 - 0.22, zf - 0.6, lin(0x111111), 0);
    b.box(-W - 0.012, y1 - 0.3, zr + 0.4, -W + 0.002, y1 - 0.22, zf - 0.6, lin(0x111111), 0);
  }
  return b.build();
}

function bumpers(b, W, zf, zr, y0) {
  b.box(-W + 0.02, y0 - 0.05, zf - 0.05, W - 0.02, y0 + 0.28, zf + 0.12, DARK, 0);
  b.box(-W + 0.02, y0 - 0.05, zr - 0.12, W - 0.02, y0 + 0.28, zr + 0.05, DARK, 0);
}

/** Light positions per vehicle type: [x, y, z, kind] kind: 0 head, 1 tail, 2 siren red, 3 siren blue, 4 taxi */
export function vehicleLights(key) {
  const T = VTYPES[key];
  const W = T.wid / 2, L = T.len / 2;
  const hy = T.truck ? 0.95 : T.clear + (T.belt - T.clear) * 0.62;
  const out = [
    [W - 0.32, hy, L + 0.01, 0], [-W + 0.32, hy, L + 0.01, 0],
    [W - 0.25, hy + (T.van || T.truck ? 0.1 : 0.05), -L - 0.01, 1], [-W + 0.25, hy + (T.van || T.truck ? 0.1 : 0.05), -L - 0.01, 1],
  ];
  if (key === 'police') {
    out.push([0.35, T.hgt + 0.15, 0.04, 2], [-0.35, T.hgt + 0.15, 0.04, 3]);
  }
  return out;
}

export function buildWheelGeometry() {
  const g = new THREE.CylinderGeometry(1, 1, 1, 12, 1);
  g.rotateZ(Math.PI / 2); // axle along x
  const n = g.attributes.position.count;
  const cols = new Float32Array(n * 3);
  const paint = new Float32Array(n);
  const pos = g.attributes.position;
  for (let i = 0; i < n; i++) {
    const r = Math.hypot(pos.getY(i), pos.getZ(i));
    const ax = Math.abs(pos.getX(i));
    // hub cap on the side faces near the centre
    const hub = ax > 0.49 && r < 0.6;
    const c = hub ? lin(0xc9ccd1) : lin(0x18191b);
    cols.set(c, i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  g.setAttribute('paint', new THREE.BufferAttribute(paint, 1));
  return g;
}

// --------------------------------------------------------------------------------------------
// Humans. Each part has its pivot at the joint. Character faces +Z, height ~1.8.
// --------------------------------------------------------------------------------------------
export function buildHumanParts() {
  const parts = {};
  const SKIN_PAINT = 1;
  {
    const b = new PartBuilder();
    b.box(-0.18, -0.12, -0.11, 0.18, 0.12, 0.11, WHITE, 1);
    // belt
    b.box(-0.185, 0.07, -0.115, 0.185, 0.12, 0.115, lin(0x2a2522), 0);
    parts.pelvis = b.build();
  }
  {
    const b = new PartBuilder();
    // torso tapers slightly toward the waist
    b.prism(0.18, -0.11, 0.11, 0, 0.23, -0.12, 0.12, 0.52, [WHITE, WHITE, WHITE, WHITE, WHITE], [1, 1, 1, 1, 1]);
    // collar
    b.box(-0.08, 0.5, -0.06, 0.08, 0.56, 0.08, lin(0xe9c9a8), 0.0);
    parts.torso = b.build();
  }
  {
    const b = new PartBuilder();
    b.box(-0.115, 0.04, -0.12, 0.115, 0.3, 0.12, WHITE, SKIN_PAINT);
    // neck
    b.box(-0.06, -0.02, -0.05, 0.06, 0.05, 0.05, WHITE, SKIN_PAINT);
    // eyes, brows and mouth on the face (+z)
    b.box(0.035, 0.17, 0.12, 0.07, 0.2, 0.125, lin(0x1a1a1a), 0);
    b.box(-0.07, 0.17, 0.12, -0.035, 0.2, 0.125, lin(0x1a1a1a), 0);
    b.box(-0.04, 0.095, 0.12, 0.04, 0.11, 0.124, lin(0x6a2a2a), 0);
    b.box(-0.02, 0.12, 0.12, 0.02, 0.16, 0.15, WHITE, SKIN_PAINT);
    parts.head = b.build();
  }
  {
    const b = new PartBuilder();
    b.box(-0.125, 0.24, -0.13, 0.125, 0.34, 0.11, WHITE, 1);
    b.box(-0.125, 0.12, -0.135, 0.125, 0.25, -0.08, WHITE, 1);
    parts.hair = b.build();
  }
  {
    const b = new PartBuilder();
    // arm hangs from the shoulder pivot
    b.box(-0.06, -0.6, -0.06, 0.06, 0, 0.06, WHITE, 1);
    b.box(-0.05, -0.7, -0.05, 0.05, -0.6, 0.06, WHITE, 1); // hand
    parts.arm = b.build();
  }
  {
    const b = new PartBuilder();
    b.box(-0.08, -0.84, -0.08, 0.08, 0, 0.08, WHITE, 1);
    b.box(-0.085, -0.93, -0.1, 0.085, -0.84, 0.15, lin(0x1d1b19), 0); // shoe
    parts.leg = b.build();
  }
  {
    const b = new PartBuilder();
    b.box(-0.03, -0.04, -0.05, 0.03, 0.05, 0.28, lin(0x202224), 0);
    b.box(-0.025, -0.15, -0.02, 0.025, -0.04, 0.05, lin(0x2c2e30), 0);
    parts.gun = b.build();
  }
  return parts;
}

export const SKIN_TONES = [0xffdbb5, 0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0x5c3a21, 0xffe0c4, 0xd8a47f];
export const HAIR_COLORS = [0x1b1410, 0x3b2314, 0x6a4a2a, 0xb89060, 0xe8d28a, 0x9a3a1a, 0x101010, 0xd0d0d0, 0xff4fa0, 0x22c3ff];
export const SHIRT_COLORS = [0xffffff, 0xff5a5f, 0x3fa7ff, 0xffd23f, 0x7bd389, 0xff9f1c, 0xb07cff, 0x22d3ee, 0xf472b6, 0x1f2937, 0xa3e635, 0xfb7185, 0x60a5fa, 0xfacc15];
export const PANTS_COLORS = [0x1f2a44, 0x2b2f36, 0x3b3f46, 0x6b5b45, 0xc2b280, 0xf4f4f4, 0x4a5a6a, 0x223344, 0x8a6a4a];
