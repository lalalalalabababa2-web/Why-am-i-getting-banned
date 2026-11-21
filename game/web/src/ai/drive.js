// Shared driving helpers for every AI driver: polyline following, steering/throttle, road routing.

import { G } from '../state.js';
import { clamp, wrapAngle, rand } from '../util.js';
import { ROAD_HALF, LANES } from '../world/citygen.js';

/** Follows a polyline of {x,z} points with a lookahead target. */
export class PathFollower {
  constructor(points = []) {
    this.pts = points;
    this.i = 0;
  }
  set(points) { this.pts = points; this.i = 0; }
  get done() { return this.i >= this.pts.length - 1; }
  /** Advance along the path for position (x,z); returns lookahead target and distance left. */
  target(x, z, look) {
    const P = this.pts;
    if (P.length < 2) return P.length ? { x: P[0].x, z: P[0].z, left: Math.hypot(P[0].x - x, P[0].z - z), proj: P[0] } : null;
    // advance segment index while we are past the end of the current segment
    while (this.i < P.length - 1) {
      const a = P[this.i], b = P[this.i + 1];
      const abx = b.x - a.x, abz = b.z - a.z;
      const l2 = abx * abx + abz * abz || 1;
      const t = ((x - a.x) * abx + (z - a.z) * abz) / l2;
      if (t > 1) this.i++;
      else break;
    }
    if (this.i >= P.length - 1) {
      const e = P[P.length - 1];
      return { x: e.x, z: e.z, left: Math.hypot(e.x - x, e.z - z), proj: e };
    }
    const a = P[this.i], b = P[this.i + 1];
    const abx = b.x - a.x, abz = b.z - a.z;
    const l = Math.hypot(abx, abz) || 1;
    let t = clamp(((x - a.x) * abx + (z - a.z) * abz) / (l * l), 0, 1);
    let px = a.x + abx * t, pz = a.z + abz * t;
    const proj = { x: px, z: pz };
    // walk forward by `look`
    let rem = look;
    let k = this.i;
    let segLeft = l * (1 - t);
    let tx = px, tz = pz;
    let left = segLeft;
    for (let j = k + 1; j < P.length - 1; j++) left += Math.hypot(P[j + 1].x - P[j].x, P[j + 1].z - P[j].z);
    while (rem > 0) {
      const A = k === this.i ? { x: px, z: pz } : P[k];
      const B = P[k + 1];
      const sl = Math.hypot(B.x - A.x, B.z - A.z);
      if (sl >= rem || k + 1 >= P.length - 1) {
        const f = sl > 0 ? Math.min(1, rem / sl) : 1;
        tx = A.x + (B.x - A.x) * f; tz = A.z + (B.z - A.z) * f;
        break;
      }
      rem -= sl;
      k++;
    }
    return { x: tx, z: tz, left, proj };
  }
}

/** Set throttle/steer to drive toward (tx,tz) at targetSpeed. Handles reversing when stuck. */
export function steerToward(v, tx, tz, targetSpeed, dt, mem) {
  const desired = Math.atan2(tx - v.x, tz - v.z);
  const err = wrapAngle(desired - v.h);
  const vF = v.vx * Math.sin(v.h) + v.vz * Math.cos(v.h);
  mem.stuckT = mem.stuckT || 0;
  mem.revT = mem.revT || 0;
  if (mem.revT > 0) {
    mem.revT -= dt;
    v.throttle = -0.8;
    v.steer = clamp(err * 2, -1, 1);
    v.handbrake = false;
    return;
  }
  // target behind us and slow: three-point turn by reversing
  let steer = clamp(-err * 2.3, -1, 1);
  let thr;
  const diff = targetSpeed - vF;
  if (diff > 0.5) thr = clamp(diff * 0.35, 0.25, 1);
  else if (diff < -1.2) thr = -clamp(-diff * 0.25, 0.2, 1);
  else thr = 0;
  // slow down for sharp corners
  const sharp = Math.abs(err);
  if (sharp > 0.6 && vF > 9) thr = Math.min(thr, -0.4);
  v.handbrake = false;
  v.throttle = thr;
  v.steer = steer;
  // stuck detection
  if (thr > 0.2 && Math.abs(vF) < 0.8) mem.stuckT += dt;
  else mem.stuckT = Math.max(0, mem.stuckT - dt * 2);
  if (mem.stuckT > 1.4) {
    mem.stuckT = 0;
    mem.revT = rand(0.9, 1.5);
  }
}

// ------------------------------------------------------------------------------------------
// Road routing
// ------------------------------------------------------------------------------------------
export function laneOffsetPoint(a, b, off, fromEnd, dist) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const l = Math.hypot(dx, dz) || 1;
  const ux = dx / l, uz = dz / l;
  const rx = -uz, rz = ux;
  if (fromEnd) return { x: b.x - ux * dist + rx * off, z: b.z - uz * dist + rz * off };
  return { x: a.x + ux * dist + rx * off, z: a.z + uz * dist + rz * off };
}

/** Points for driving A->B in lane offset off and then turning at B toward C. */
export function lanePath(a, b, c, off, offNext = off) {
  const pts = [];
  pts.push(laneOffsetPoint(a, b, off, false, ROAD_HALF + 1));
  const end = laneOffsetPoint(a, b, off, true, ROAD_HALF + 5.5);
  pts.push(end);
  if (c) {
    const start2 = laneOffsetPoint(b, c, offNext, false, ROAD_HALF + 1.5);
    // control point: intersection of the two lane lines
    const d1x = Math.sign(b.x - a.x), d1z = Math.sign(b.z - a.z);
    const d2x = Math.sign(c.x - b.x), d2z = Math.sign(c.z - b.z);
    const straight = d1x === d2x && d1z === d2z;
    if (!straight) {
      // lane line 1: end + d1*s ; lane line 2: start2 - d2*t ; perpendicular => corner
      let cx, cz;
      if (d1x !== 0) { cx = start2.x; cz = end.z; } else { cx = end.x; cz = start2.z; }
      for (const t of [0.25, 0.5, 0.75]) {
        const u = 1 - t;
        pts.push({ x: u * u * end.x + 2 * u * t * cx + t * t * start2.x, z: u * u * end.z + 2 * u * t * cz + t * t * start2.z });
      }
    }
    pts.push(start2);
  }
  return pts;
}

/** Pick the next node after arriving at `to` from `from`. */
export function chooseNext(city, from, to) {
  const opts = to.nb.filter((id) => id !== from.id);
  if (!opts.length) return city.nodes[from.id];
  // prefer going straight a bit more often
  const sx = Math.sign(to.x - from.x), sz = Math.sign(to.z - from.z);
  const straight = opts.find((id) => {
    const n = city.nodes[id];
    return Math.sign(n.x - to.x) === sx && Math.sign(n.z - to.z) === sz;
  });
  if (straight !== undefined && Math.random() < 0.45) return city.nodes[straight];
  return city.nodes[opts[Math.floor(Math.random() * opts.length)]];
}

/** Breadth-first route between two nodes on the road graph. Returns an array of nodes. */
export function route(city, start, goal) {
  if (!start || !goal) return [];
  if (start === goal) return [start];
  const prev = new Int32Array(city.nodes.length).fill(-1);
  const seen = new Uint8Array(city.nodes.length);
  const q = [start.id];
  seen[start.id] = 1;
  let head = 0;
  while (head < q.length) {
    const id = q[head++];
    if (id === goal.id) break;
    for (const nb of city.nodes[id].nb) {
      if (seen[nb]) continue;
      seen[nb] = 1;
      prev[nb] = id;
      q.push(nb);
    }
  }
  if (!seen[goal.id]) return [];
  const out = [];
  let id = goal.id;
  while (id !== -1) {
    out.push(city.nodes[id]);
    if (id === start.id) break;
    id = prev[id];
  }
  return out.reverse();
}

/** Light state for an approach along axis 'x' or 'z': 'g', 'y' or 'r'. */
export function lightState(node, axis, time) {
  const p = (time + node.phase) % 20;
  if (axis === 'x') return p < 8 ? 'g' : p < 10 ? 'y' : 'r';
  return p >= 10 && p < 18 ? 'g' : p >= 18 ? 'y' : 'r';
}

export { LANES };
