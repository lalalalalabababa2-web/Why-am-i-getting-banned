// Pedestrians (sidewalk walking, panic, fighting back), beachgoers, and hostile combat brains
// used by gangs, mission enemies and cops on foot.

import { G } from '../state.js';
import { spawnHuman } from '../human.js';
import { clamp, rand, randInt, pick, chance, wrapAngle } from '../util.js';
import { ROAD_HALF, X0, Z0, BLOCK, NX, NZ, CITY, LAND } from '../world/citygen.js';

const C = ROAD_HALF + 2.3;

function cornerPos(n, sx, sz) {
  return { x: n.x + sx * C, z: n.z + sz * C };
}

/** Sidewalk neighbours of a corner (node, sx, sz). */
function cornerNeighbours(city, n, sx, sz) {
  const out = [];
  const nx = city.nodeAtGrid(n.i + sx, n.j);
  const nz = city.nodeAtGrid(n.i, n.j + sz);
  const ex = nx && city.getEdge(n.id, nx.id);
  const ez = nz && city.getEdge(n.id, nz.id);
  if (ex) out.push({ n: nx, sx: -sx, sz, kind: 'walk' });
  if (ez) out.push({ n: nz, sx, sz: -sz, kind: 'walk' });
  // crosswalks at the same intersection
  if (ez) out.push({ n, sx: -sx, sz, kind: 'cross' });
  if (ex) out.push({ n, sx, sz: -sz, kind: 'cross' });
  return out;
}

export class PedBrain {
  constructor(h) {
    this.h = h;
    this.mode = 'walk';
    this.cur = null;
    this.prev = null;
    this.tgt = null;
    this.speed = rand(1.15, 1.65);
    this.t = 0;
    this.fleeFrom = null;
    this.fleeT = 0;
    this.fight = null;
    this.home = null;
  }

  place(n, sx, sz) {
    this.cur = { n, sx, sz };
    this.pickNext();
  }

  pickNext() {
    const city = G.city;
    const c = this.cur;
    let nb = cornerNeighbours(city, c.n, c.sx, c.sz);
    // fewer road crossings than walks
    if (nb.length > 1 && this.prev) {
      nb = nb.filter((o) => !(o.n === this.prev.n && o.sx === this.prev.sx && o.sz === this.prev.sz));
    }
    if (!nb.length) nb = cornerNeighbours(city, c.n, c.sx, c.sz);
    if (!nb.length) { this.mode = 'idle'; this.t = 5; return; }
    let choice = pick(nb);
    if (choice.kind === 'cross' && chance(0.55)) {
      const walks = nb.filter((o) => o.kind === 'walk');
      if (walks.length) choice = pick(walks);
    }
    this.prev = this.cur;
    this.cur = choice;
    const p = cornerPos(choice.n, choice.sx, choice.sz);
    this.tgt = { x: p.x + rand(-0.8, 0.8), z: p.z + rand(-0.8, 0.8) };
  }

  /** Snap back onto the sidewalk graph after fleeing. */
  resnap() {
    const city = G.city;
    const h = this.h;
    const i = clamp(Math.round((h.x - X0) / BLOCK), 0, NX - 1), j = clamp(Math.round((h.z - Z0) / BLOCK), 0, NZ - 1);
    const n = city.nodeAtGrid(i, j);
    if (!n || !n.nb.length) { this.mode = 'wander'; this.home = { x: h.x, z: h.z }; return; }
    const sx = h.x >= n.x ? 1 : -1, sz = h.z >= n.z ? 1 : -1;
    this.prev = null;
    this.cur = { n, sx, sz };
    const p = cornerPos(n, sx, sz);
    this.tgt = p;
  }

  flee(x, z, t) {
    if (!this.h.alive) return;
    this.mode = 'flee';
    this.fleeFrom = { x, z };
    this.fleeT = t;
    this.h.cower = false;
  }

  onDamage(by, amount, cause) {
    const h = this.h;
    if (!h.alive || !by) return;
    if (cause === 'melee' && by.isPlayer && chance(0.3) && h.kind === 'ped') {
      this.mode = 'fight';
      this.fight = by;
      this.t = 12;
      return;
    }
    this.flee(by.x, by.z, rand(8, 14));
  }

  update(dt) {
    const h = this.h;
    if (!h.alive || h.state !== 'normal') { h.moveSpeed = 0; return; }
    h.faceH = null;
    switch (this.mode) {
      case 'walk': {
        if (!this.tgt) { this.resnap(); break; }
        const dx = this.tgt.x - h.x, dz = this.tgt.z - h.z;
        const d = Math.hypot(dx, dz);
        if (d < 1.0) this.pickNext();
        else {
          h.moveX = dx / d; h.moveZ = dz / d;
          h.moveSpeed = this.speed;
        }
        if (h.blocked > 1.5) { h.blocked = 0; this.pickNext(); }
        if (chance(dt * 0.025)) { this.mode = 'idle'; this.t = rand(2, 6); }
        break;
      }
      case 'idle': {
        h.moveSpeed = 0;
        this.t -= dt;
        if (this.t <= 0) this.mode = this.home ? 'wander' : 'walk';
        break;
      }
      case 'wander': {
        if (!this.home) this.home = { x: h.x, z: h.z };
        if (!this.tgt || Math.hypot(this.tgt.x - h.x, this.tgt.z - h.z) < 1 || h.blocked > 1.2) {
          h.blocked = 0;
          this.tgt = { x: this.home.x + rand(-14, 14), z: this.home.z + rand(-14, 14) };
          if (chance(0.4)) { this.mode = 'idle'; this.t = rand(3, 9); break; }
        }
        const dx = this.tgt.x - h.x, dz = this.tgt.z - h.z, d = Math.hypot(dx, dz) || 1;
        h.moveX = dx / d; h.moveZ = dz / d; h.moveSpeed = this.speed * 0.8;
        break;
      }
      case 'flee': {
        this.fleeT -= dt;
        let dx = h.x - this.fleeFrom.x, dz = h.z - this.fleeFrom.z;
        const d = Math.hypot(dx, dz) || 1;
        dx /= d; dz /= d;
        if (h.blocked > 0.4) {
          // slide along the obstacle
          const s = this.slide || (this.slide = chance(0.5) ? 1 : -1);
          const tx = -dz * s, tz = dx * s;
          dx = tx; dz = tz;
          if (h.blocked > 2) { h.blocked = 0; this.slide = -s; }
        }
        h.moveX = dx; h.moveZ = dz;
        h.moveSpeed = 5.6;
        if (this.fleeT <= 0) { this.mode = 'walk'; this.resnap(); }
        break;
      }
      case 'cower': {
        h.moveSpeed = 0;
        h.cower = true;
        this.t -= dt;
        if (this.t <= 0) { h.cower = false; this.flee(this.fleeFrom.x, this.fleeFrom.z, rand(6, 10)); }
        break;
      }
      case 'fight': {
        const f = this.fight;
        this.t -= dt;
        if (!f || !f.alive || this.t <= 0 || f.vehicle) { this.mode = 'walk'; this.resnap(); break; }
        const dx = f.x - h.x, dz = f.z - h.z, d = Math.hypot(dx, dz) || 1;
        h.faceH = Math.atan2(dx, dz);
        if (d > 25) { this.mode = 'walk'; this.resnap(); break; }
        if (d > 1.3) { h.moveX = dx / d; h.moveZ = dz / d; h.moveSpeed = 4.5; }
        else { h.moveSpeed = 0; G.weapons.fire(h, { target: f }); }
        break;
      }
    }
  }
}

/** Shoots or punches a target; used by gangs, mission enemies and cops on foot. */
export class CombatBrain {
  constructor(h, opts = {}) {
    this.h = h;
    this.home = { x: h.x, z: h.z };
    this.hostile = opts.hostile ?? false;
    this.target = null;
    this.accuracy = opts.accuracy ?? 0.3;
    this.aggro = opts.aggro ?? 22;
    this.keep = opts.keep ?? rand(7, 13);
    this.strafeT = 0;
    this.strafe = 1;
    this.losT = 0;
    this.los = false;
    this.group = opts.group || null;
    this.leash = opts.leash ?? 120;
    this.loseT = 0;
  }

  onDamage(by) {
    if (by && by !== this.h) {
      this.hostile = true;
      this.target = by;
      if (this.group) for (const m of this.group) if (m.ai && m.ai !== this && m.alive) { m.ai.hostile = true; m.ai.target = m.ai.target || by; }
    }
  }

  update(dt) {
    const h = this.h;
    if (!h.alive || h.state !== 'normal') { h.moveSpeed = 0; return; }
    const pl = G.player.human;
    if (!this.target && pl.alive) {
      const d = Math.hypot(pl.x - h.x, pl.z - h.z);
      if (this.hostile && d < 60) this.target = pl;
      else if (d < this.aggro * 0.5 && G.player.armed() && !pl.vehicle) { this.hostile = true; this.target = pl; }
    }
    const t = this.target;
    if (!t || !t.alive || t.removed) {
      this.target = null;
      // idle around home
      h.faceH = null;
      const dx = this.home.x - h.x, dz = this.home.z - h.z, d = Math.hypot(dx, dz);
      if (d > 3) { h.moveX = dx / d; h.moveZ = dz / d; h.moveSpeed = 1.4; }
      else h.moveSpeed = 0;
      return;
    }
    const tx = t.vehicle ? t.vehicle.x : t.x, tz = t.vehicle ? t.vehicle.z : t.z;
    let dx = tx - h.x, dz = tz - h.z;
    const d = Math.hypot(dx, dz) || 1;
    dx /= d; dz /= d;
    this.losT -= dt;
    if (this.losT <= 0) {
      this.losT = 0.3;
      this.los = G.physics.los(h.x, h.z, tx, tz, h.y + 1.5, (t.vehicle ? t.vehicle.y : t.y) + 1.2);
    }
    if (d > this.leash) {
      this.loseT += dt;
      if (this.loseT > 6) { this.target = null; this.hostile = false; this.loseT = 0; }
    } else this.loseT = 0;
    h.faceH = Math.atan2(dx, dz);
    const melee = h.weapon === 'fist';
    if (melee) {
      if (d > 1.3) { h.moveX = dx; h.moveZ = dz; h.moveSpeed = 5; }
      else { h.moveSpeed = 0; G.weapons.fire(h, { target: t }); }
      return;
    }
    this.strafeT -= dt;
    if (this.strafeT <= 0) { this.strafeT = rand(1, 2.5); this.strafe = chance(0.5) ? 1 : -1; }
    if (!this.los || d > this.keep + 5) {
      h.moveX = dx; h.moveZ = dz; h.moveSpeed = 5.2;
      if (h.blocked > 0.5) { h.moveX = -dz * this.strafe; h.moveZ = dx * this.strafe; }
    } else if (d < this.keep - 4) {
      h.moveX = -dx; h.moveZ = -dz; h.moveSpeed = 2.5;
    } else {
      h.moveX = -dz * this.strafe; h.moveZ = dx * this.strafe; h.moveSpeed = 1.6;
    }
    h.aimT = 1;
    if (this.los && d < 45) {
      const tsp = t.vehicle ? t.vehicle.speed : t.speed;
      let p = this.accuracy * clamp(1.15 - d / 45, 0.2, 1) * (tsp > 6 ? 0.55 : 1) * (t.vehicle ? 0.7 : 1);
      if (t.isPlayer && G.player.diffEase) p *= G.player.diffEase;
      G.weapons.fire(h, { target: t, hitChance: p });
    }
  }
}

export class Peds {
  constructor() {
    this.PedBrain = PedBrain;
    this.spawnT = 0;
    this.gangT = 0;
    this.gangSpots = [];
    for (const lot of G.city.lots) {
      if (lot.d === 'D') this.gangSpots.push({ x: (lot.x0 + lot.x1) / 2 + rand(-10, 10), z: lot.z1 - 2, members: [] });
    }
  }

  desired() {
    const q = G.settings.quality;
    return q === 'low' ? 14 : q === 'high' ? 34 : 24;
  }

  update(dt) {
    for (const h of G.humans) {
      if (h.ai && !h.removed && !h.vehicle) h.ai.update(dt);
      else if (h.vehicle && h.ai && h.ai.inCar) h.ai.update(dt);
    }
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawnT = 0.3;
      const p = G.player.pos();
      this.cull(p);
      const n = G.humans.filter((h) => h.kind === 'ped' && !h.vehicle && !h.removed && h.alive).length;
      if (n < this.desired()) this.trySpawn(p);
    }
    this.gangT -= dt;
    if (this.gangT <= 0) {
      this.gangT = 1;
      this.updateGangs();
    }
  }

  cull(p) {
    for (const h of G.humans) {
      if (h.removed || h.isPlayer || h.vehicle || h.persistent) continue;
      if (h.kind === 'cop' && h.ai && h.ai.unit && !h.ai.unit.released) continue;
      const d = Math.hypot(h.x - p.x, h.z - p.z);
      if (d > 210 || (h.state === 'dead' && (h.deadT > 40 || d > 120))) h.removed = true;
    }
  }

  trySpawn(p) {
    const city = G.city;
    // beachgoers near Coral Beach
    if (p.x > CITY.maxX - 120 && chance(0.45)) {
      const x = rand(CITY.maxX + 25, LAND.maxX - 25), z = p.z + rand(-140, 140);
      const d = Math.hypot(x - p.x, z - p.z);
      if (d > 30 && d < 150 && z > LAND.minZ + 20 && z < LAND.maxZ - 20) {
        const h = spawnHuman('ped', x, z, { shirt: pick([0xff5a5f, 0x22d3ee, 0xffd23f, 0xf472b6, 0xffffff, 0xa3e635]), pants: pick([0x22d3ee, 0xff5a5f, 0x1f2a44, 0xffd23f, 0xf4f4f4]) });
        h.ai = new PedBrain(h);
        h.ai.mode = 'wander';
        h.ai.home = { x, z };
        return;
      }
    }
    for (let a = 0; a < 6; a++) {
      const i = clamp(Math.round((p.x - X0) / BLOCK) + randInt(-2, 2), 0, NX - 1);
      const j = clamp(Math.round((p.z - Z0) / BLOCK) + randInt(-2, 2), 0, NZ - 1);
      const n = city.nodeAtGrid(i, j);
      if (!n || !n.nb.length) continue;
      const sx = chance(0.5) ? 1 : -1, sz = chance(0.5) ? 1 : -1;
      const nbs = cornerNeighbours(city, n, sx, sz).filter((o) => o.kind === 'walk');
      if (!nbs.length) continue;
      const o = pick(nbs);
      const a0 = cornerPos(n, sx, sz), a1 = cornerPos(o.n, o.sx, o.sz);
      const t = rand(0.1, 0.9);
      const x = a0.x + (a1.x - a0.x) * t, z = a0.z + (a1.z - a0.z) * t;
      const d = Math.hypot(x - p.x, z - p.z);
      if (d < 35 || d > 160) continue;
      if (d < 70 && G.traffic.visible(x, z, G.camera)) continue;
      const h = spawnHuman('ped', x, z);
      h.ai = new PedBrain(h);
      h.ai.prev = { n, sx, sz };
      h.ai.cur = o;
      h.ai.tgt = a1;
      // sometimes a pair walking together
      if (chance(0.2)) {
        const h2 = spawnHuman('ped', x + 0.9, z + 0.6);
        h2.ai = new PedBrain(h2);
        h2.ai.prev = { n, sx, sz };
        h2.ai.cur = o;
        h2.ai.tgt = { x: a1.x + 0.8, z: a1.z + 0.6 };
        h2.ai.speed = h.ai.speed;
      }
      return;
    }
  }

  updateGangs() {
    const p = G.player.pos();
    for (const s of this.gangSpots) {
      s.members = s.members.filter((m) => !m.removed);
      const d = Math.hypot(s.x - p.x, s.z - p.z);
      if (d < 140 && d > 45 && s.members.length === 0 && !s.cleared) {
        const group = [];
        const n = randInt(2, 4);
        for (let k = 0; k < n; k++) {
          const h = spawnHuman('gang', s.x + rand(-4, 4), s.z + rand(-3, 1), {
            shirt: pick([0x7b2cbf, 0x5a189a, 0x9d4edd]), pants: 0x1b1b1b, hair: 0x0c0c0c, health: 90,
            weapon: chance(0.6) ? 'pistol' : chance(0.5) ? 'smg' : 'fist', money: randInt(30, 120),
          });
          h.ai = new CombatBrain(h, { accuracy: 0.28, aggro: 18, group });
          h.h = rand(0, 6.28);
          group.push(h);
          s.members.push(h);
        }
      } else if (d > 220 && s.members.length) {
        for (const m of s.members) if (!m.persistent) m.removed = true;
        s.members = [];
      }
    }
  }

  /** Everyone near a scary event runs. */
  panic(x, z, radius, source) {
    for (const h of G.humans) {
      if (h.removed || !h.alive || h.vehicle || !(h.ai instanceof PedBrain)) continue;
      if (h.ai.mode === 'fight' || h.ai.mode === 'flee' || h.ai.mode === 'cower') continue;
      const d = Math.hypot(h.x - x, h.z - z);
      if (d > radius) continue;
      if (chance(0.18) && d < radius * 0.5) {
        h.ai.mode = 'cower';
        h.ai.t = rand(3, 7);
        h.ai.fleeFrom = { x, z };
      } else {
        const fx = source ? source.x : x, fz = source ? source.z : z;
        h.ai.flee(fx, fz, rand(7, 14));
      }
    }
    // drivers nearby speed off
    for (const v of G.vehicles) {
      if (v.ai && v.ai.onShot && Math.hypot(v.x - x, v.z - z) < radius * 0.7) v.ai.panicT = Math.max(v.ai.panicT || 0, rand(6, 12));
    }
  }
}

export { wrapAngle };
