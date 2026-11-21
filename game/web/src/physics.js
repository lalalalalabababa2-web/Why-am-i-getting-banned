// Static collision world (spatial hash of AABBs and circles), ground height, raycasts.

import { clamp } from './util.js';
import { CITY, CURB, PIER, WATER_LEVEL, isOnRoad, landSdf, nodeX } from './world/citygen.js';
import { coastHeight, quayH } from './world/citymesh.js';

const CELL = 16;
const OFF = 4096;
const key = (ix, iz) => (ix + OFF) * 8192 + (iz + OFF);

export class Physics {
  constructor(city) {
    this.city = city;
    this.grid = new Map();
    this.cols = [];
    this.stamp = 1;
    for (const b of city.boxes) this.add({ t: 0, minX: b.minX, maxX: b.maxX, minZ: b.minZ, maxZ: b.maxZ, h: b.h, s: 0 });
    for (const c of city.circles) this.add({ t: 1, x: c.x, z: c.z, r: c.r, h: c.h, s: 0, minX: c.x - c.r, maxX: c.x + c.r, minZ: c.z - c.r, maxZ: c.z + c.r });
    this.ramps = city.ramps.map((r) => ({
      ...r, s: Math.sin(r.h), c: Math.cos(r.h), y0: r.y0 || 0,
    }));
    this.docksX = nodeX(4) + 20;
    this._res = { x: 0, z: 0, nx: 0, nz: 0, hit: false, depth: 0 };
  }

  add(col) {
    const i = this.cols.length;
    this.cols.push(col);
    const x0 = Math.floor(col.minX / CELL), x1 = Math.floor(col.maxX / CELL);
    const z0 = Math.floor(col.minZ / CELL), z1 = Math.floor(col.maxZ / CELL);
    for (let ix = x0; ix <= x1; ix++) {
      for (let iz = z0; iz <= z1; iz++) {
        const k = key(ix, iz);
        let arr = this.grid.get(k);
        if (!arr) this.grid.set(k, (arr = []));
        arr.push(i);
      }
    }
  }

  /** Calls fn(collider) once for every collider overlapping the rect. */
  query(minX, minZ, maxX, maxZ, fn) {
    const st = ++this.stamp;
    const x0 = Math.floor(minX / CELL), x1 = Math.floor(maxX / CELL);
    const z0 = Math.floor(minZ / CELL), z1 = Math.floor(maxZ / CELL);
    for (let ix = x0; ix <= x1; ix++) {
      for (let iz = z0; iz <= z1; iz++) {
        const arr = this.grid.get(key(ix, iz));
        if (!arr) continue;
        for (let k = 0; k < arr.length; k++) {
          const c = this.cols[arr[k]];
          if (c.s === st) continue;
          c.s = st;
          if (fn(c) === true) return;
        }
      }
    }
  }

  /**
   * Push a vertical cylinder (x,z,r, feet at y) out of static colliders.
   * Returns a shared result object: {x,z,hit,nx,nz,depth}.
   */
  resolveCircle(x, z, r, y = 0) {
    const res = this._res;
    res.hit = false; res.nx = 0; res.nz = 0; res.depth = 0;
    for (let iter = 0; iter < 2; iter++) {
      let moved = false;
      this.query(x - r, z - r, x + r, z + r, (c) => {
        if (y > c.h - 0.2) return;
        if (c.t === 0) {
          const cx = clamp(x, c.minX, c.maxX), cz = clamp(z, c.minZ, c.maxZ);
          let dx = x - cx, dz = z - cz;
          const d2 = dx * dx + dz * dz;
          if (d2 >= r * r) return;
          let nx, nz, pen;
          if (d2 > 1e-10) {
            const d = Math.sqrt(d2);
            nx = dx / d; nz = dz / d; pen = r - d;
          } else {
            // centre inside the box: leave by the nearest side
            const l = x - c.minX, rr = c.maxX - x, t = z - c.minZ, b = c.maxZ - z;
            const m = Math.min(l, rr, t, b);
            if (m === l) { nx = -1; nz = 0; pen = l + r; }
            else if (m === rr) { nx = 1; nz = 0; pen = rr + r; }
            else if (m === t) { nx = 0; nz = -1; pen = t + r; }
            else { nx = 0; nz = 1; pen = b + r; }
          }
          x += nx * pen; z += nz * pen;
          res.nx += nx * pen; res.nz += nz * pen;
          res.depth = Math.max(res.depth, pen);
          res.hit = moved = true;
        } else {
          const dx = x - c.x, dz = z - c.z;
          const rr = r + c.r;
          const d2 = dx * dx + dz * dz;
          if (d2 >= rr * rr) return;
          const d = Math.sqrt(d2) || 1e-5;
          const pen = rr - d;
          const nx = dx / d, nz = dz / d;
          x += nx * pen; z += nz * pen;
          res.nx += nx * pen; res.nz += nz * pen;
          res.depth = Math.max(res.depth, pen);
          res.hit = moved = true;
        }
      });
      if (!moved) break;
    }
    if (res.hit) {
      const l = Math.hypot(res.nx, res.nz) || 1;
      res.nx /= l; res.nz /= l;
    }
    res.x = x; res.z = z;
    return res;
  }

  /**
   * 2D segment test against static colliders, with a height check at the entry point.
   * Returns the hit fraction t in [0,1] (1 = clear). Optional y0/y1 give the ray height.
   */
  raycast(x0, z0, x1, z1, y0 = 1.5, y1 = 1.5, ignoreSmall = false) {
    const dx = x1 - x0, dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    let best = 1;
    const steps = Math.max(1, Math.ceil(len / 32));
    for (let s = 0; s < steps; s++) {
      const ta = s / steps, tb = (s + 1) / steps;
      if (ta > best) break;
      const ax = x0 + dx * ta, az = z0 + dz * ta, bx = x0 + dx * tb, bz = z0 + dz * tb;
      this.query(Math.min(ax, bx) - 0.5, Math.min(az, bz) - 0.5, Math.max(ax, bx) + 0.5, Math.max(az, bz) + 0.5, (c) => {
        let t;
        if (c.t === 0) t = segAabb(x0, z0, dx, dz, c);
        else {
          if (ignoreSmall && c.r < 1.5) return;
          t = segCircle(x0, z0, dx, dz, c.x, c.z, c.r);
        }
        if (t < best) {
          const y = y0 + (y1 - y0) * t;
          if (y <= c.h) best = t;
        }
      });
    }
    return best;
  }

  /** Line of sight between two points at eye height. */
  los(ax, az, bx, bz, ya = 1.6, yb = 1.6) {
    return this.raycast(ax, az, bx, bz, ya, yb, true) >= 0.999;
  }

  groundHeight(x, z) {
    let h;
    // pier deck + approach
    if (x >= PIER.x0 && x <= PIER.x1 && z >= PIER.z0 && z <= PIER.z1) {
      h = x < PIER.x0 + PIER.ramp ? 0.02 + ((x - PIER.x0) / PIER.ramp) * (PIER.y - 0.02) : PIER.y;
    } else if (x > CITY.minX && x < CITY.maxX && z > CITY.minZ && z < CITY.maxZ) {
      h = isOnRoad(this.city, x, z) ? 0 : CURB;
    } else if (x < this.docksX && z < CITY.minZ) {
      h = quayH(x, z);
    } else {
      h = coastHeight(x, z);
    }
    // ramps
    for (let k = 0; k < this.ramps.length; k++) {
      const r = this.ramps[k];
      const rx = x - r.x, rz = z - r.z;
      // local axes: lx along (cos h, -sin h), lz along (sin h, cos h)
      const lx = rx * r.c - rz * r.s;
      const lz = rx * r.s + rz * r.c;
      if (Math.abs(lx) < r.wid / 2 && Math.abs(lz) < r.len / 2) {
        const rh = r.y0 + r.height * ((lz + r.len / 2) / r.len);
        if (rh > h) h = rh;
      }
    }
    return h;
  }

  /** Water depth below the surface at (x,z): > 0 means water. */
  waterDepth(x, z) {
    const g = this.groundHeight(x, z);
    return WATER_LEVEL - g;
  }

  inBounds(x, z) {
    return landSdf(x, z) < 260;
  }
}

function segAabb(x0, z0, dx, dz, b) {
  let tmin = 0, tmax = 1;
  if (Math.abs(dx) < 1e-9) {
    if (x0 < b.minX || x0 > b.maxX) return Infinity;
  } else {
    let t1 = (b.minX - x0) / dx, t2 = (b.maxX - x0) / dx;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    if (t1 > tmin) tmin = t1;
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return Infinity;
  }
  if (Math.abs(dz) < 1e-9) {
    if (z0 < b.minZ || z0 > b.maxZ) return Infinity;
  } else {
    let t1 = (b.minZ - z0) / dz, t2 = (b.maxZ - z0) / dz;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    if (t1 > tmin) tmin = t1;
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return Infinity;
  }
  return tmin;
}

function segCircle(x0, z0, dx, dz, cx, cz, r) {
  const fx = x0 - cx, fz = z0 - cz;
  const a = dx * dx + dz * dz;
  const b = 2 * (fx * dx + fz * dz);
  const c = fx * fx + fz * fz - r * r;
  if (c < 0) return 0;
  const disc = b * b - 4 * a * c;
  if (disc < 0 || a < 1e-12) return Infinity;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  return t >= 0 && t <= 1 ? t : Infinity;
}

export { segAabb, segCircle };
