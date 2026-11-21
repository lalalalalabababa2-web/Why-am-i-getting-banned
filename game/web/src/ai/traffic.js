// Civilian traffic: spawning around the player, lane following, traffic lights, reactions.
// Also manages parked cars on parking spots.

import { G } from '../state.js';
import { spawnVehicle } from '../vehicle.js';
import { spawnHuman } from '../human.js';
import { PathFollower, steerToward, lanePath, chooseNext, lightState, LANES } from './drive.js';
import { clamp, rand, pick, chance, wrapAngle } from '../util.js';
import { ROAD_HALF, DISTRICT_NAMES } from '../world/citygen.js';

const TYPE_BY_DISTRICT = {
  'Downtown': ['sedan', 'sedan', 'taxi', 'taxi', 'compact', 'suv', 'sports', 'van'],
  'Ocean Drive': ['sports', 'sports', 'muscle', 'taxi', 'compact', 'sedan', 'super', 'suv'],
  'Midtown': ['sedan', 'compact', 'compact', 'taxi', 'van', 'suv', 'muscle', 'truck'],
  'Palm Heights': ['suv', 'suv', 'sedan', 'compact', 'muscle', 'van'],
  'The Docks': ['truck', 'truck', 'van', 'van', 'suv', 'sedan'],
  'Solace Stadium': ['sedan', 'suv', 'compact', 'muscle'],
  'Starlight Park': ['compact', 'sedan', 'suv'],
};

export class LaneDriver {
  constructor(v, from, to, lane) {
    this.v = v;
    this.from = from;
    this.to = to;
    this.lane = lane;
    this.next = chooseNext(G.city, from, to);
    this.f = new PathFollower();
    this.cruise = rand(10.5, 14.5);
    this.mem = {};
    this.panicT = 0;
    this.scanT = Math.random() * 0.2;
    this.obstacleD = 99;
    this.honkT = 0;
    this.waitT = 0;
    this.build();
  }

  build() {
    const off = LANES[this.lane];
    this.f.set(lanePath(this.from, this.to, this.next, off));
  }

  onHit(impact, other) {
    if (impact > 4) {
      this.panicT = rand(8, 16);
      if (other && other.driver && other.driver.isPlayer && chance(0.2)) G.audio.horn(this.v.x, this.v.z);
    }
  }

  onShot() {
    this.panicT = rand(10, 18);
  }

  update(dt) {
    const v = this.v;
    if (v.wrecked || !v.driver) { v.throttle = 0; v.handbrake = true; return; }
    // bail out of a burning or wrecked car
    if (v.health < v.maxHealth * 0.25 || v.sinkT > 0) {
      const d = v.driver;
      d.exitVehicle();
      d.ai = new (G.peds.PedBrain)(d);
      d.ai.flee(v.x, v.z, rand(8, 14));
      v.ai = null;
      return;
    }
    const sp = v.speed;
    const look = 5 + sp * 0.55;
    let tg = this.f.target(v.x, v.z, look);
    if (this.f.done || (tg && tg.left < 2 && this.joined !== false)) {
      // arrived at the start of the next road: shift forward
      this.from = this.to;
      this.to = this.next;
      this.next = chooseNext(G.city, this.from, this.to);
      if (chance(0.15)) this.lane = 1 - this.lane;
      this.build();
      tg = this.f.target(v.x, v.z, look);
    }
    if (!tg) return;

    // re-route if we got pushed far off the lane
    const offLane = Math.hypot(tg.proj.x - v.x, tg.proj.z - v.z);
    if (offLane < 6) this.joined = true;
    if (offLane > 14 && this.joined && this.panicT <= 0) this.lost = true;
    if (!this.joined) tg = { x: tg.proj.x + (tg.x - tg.proj.x) * 0.5, z: tg.proj.z + (tg.z - tg.proj.z) * 0.5, proj: tg.proj, left: tg.left };
    if (this.lost) {
      v.throttle = 0;
      v.handbrake = true;
      return;
    }

    const panic = this.panicT > 0;
    if (panic) this.panicT -= dt;
    let target = panic ? 24 : this.cruise;

    // corner ahead?
    if (this.f.i >= 1 && !panic) target = Math.min(target, 8);

    // traffic light: we're on the first segment (before the stop line)
    if (!panic && this.to.light && this.f.i === 0) {
      const axis = this.from.j === this.to.j ? 'x' : 'z';
      const st = lightState(this.to, axis, G.time);
      const end = this.f.pts[1];
      const dStop = Math.hypot(end.x - v.x, end.z - v.z);
      if (st === 'r' || (st === 'y' && dStop > 14)) {
        target = Math.min(target, Math.max(0, Math.sqrt(Math.max(0, dStop - 1.5) * 2 * 6)));
        if (dStop < 2.5) target = 0;
      }
    }

    // obstacles ahead
    this.scanT -= dt;
    if (this.scanT <= 0) {
      this.scanT = 0.15;
      this.obstacleD = this.scan();
    }
    if (this.obstacleD < 99) {
      if (panic) {
        // fleeing drivers only ease off right before a crash
        if (this.obstacleD < 3) target = Math.min(target, 6);
      } else {
        target = Math.min(target, Math.max(0, (this.obstacleD - 6.5) * 0.9));
        if (this.obstacleD < 6) target = 0;
      }
    }
    steerToward(v, tg.x, tg.z, target, dt, this.mem);
    if (target === 0 && v.speed < 2) {
      v.throttle = 0;
      v.handbrake = true;
      this.mem.stuckT = 0;
      this.waitT += dt;
      // honk at whoever is blocking us for too long
      if (this.obstacleD < 99 && this.waitT > 4 && this.blocker && this.blocker.isPlayer && G.time > this.honkT) {
        this.honkT = G.time + rand(2, 5);
        G.audio.horn(v.x, v.z);
      }
    } else this.waitT = 0;
  }

  /** Distance to the nearest thing in our lane ahead (cars, people). */
  scan() {
    const v = this.v;
    const fx = Math.sin(v.h), fz = Math.cos(v.h);
    const rx = -fz, rz = fx;
    const range = 8 + v.speed * 1.3;
    let best = 99;
    this.blocker = null;
    for (const o of G.vehicles) {
      if (o === v || o.removed) continue;
      const dx = o.x - v.x, dz = o.z - v.z;
      if (Math.abs(dx) > range + 5 || Math.abs(dz) > range + 5) continue;
      const s = dx * fx + dz * fz;
      if (s <= 0 || s > range + o.T.len / 2) continue;
      const l = Math.abs(dx * rx + dz * rz);
      if (l > 2.0 + o.T.wid * 0.3) continue;
      const d = s - o.T.len / 2 - v.T.len / 2 + 4;
      if (d < best) { best = d; this.blocker = o.driver; }
    }
    for (const h of G.humans) {
      if (this.panicT > 0) break;
      if (h.removed || h.vehicle || h.state === 'dead') continue;
      const dx = h.x - v.x, dz = h.z - v.z;
      if (Math.abs(dx) > range || Math.abs(dz) > range) continue;
      const s = dx * fx + dz * fz;
      if (s <= 0 || s > Math.min(range, 16)) continue;
      const l = Math.abs(dx * rx + dz * rz);
      if (l > 1.8) continue;
      const d = s - v.T.len / 2 + 3;
      if (d < best) { best = d; this.blocker = h; }
    }
    return best;
  }
}

export class Traffic {
  constructor() {
    this.spawnT = 0;
    this.parkT = 0;
    this.city = G.city;
    for (const s of this.city.parking) { s.active = false; s.car = null; }
  }

  desired() {
    const q = G.settings.quality;
    return q === 'low' ? 12 : q === 'high' ? 24 : 18;
  }

  update(dt) {
    const p = G.player.pos();
    // drive AI
    for (const v of G.vehicles) {
      if (v.ai && !v.removed) v.ai.update(dt);
    }
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawnT = 0.35;
      this.cull(p);
      const n = G.vehicles.filter((v) => v.ai instanceof LaneDriver).length;
      if (n < this.desired()) this.trySpawn(p, n < this.desired() * 0.5);
    }
    this.parkT -= dt;
    if (this.parkT <= 0) {
      this.parkT = 0.5;
      this.updateParking(p);
    }
  }

  cull(p) {
    const cam = G.camera;
    for (const v of G.vehicles) {
      if (v.removed || v.persistent) continue;
      if (G.player.human.vehicle === v || v === G.player.lastVehicle) {
        if (v === G.player.lastVehicle && Math.hypot(v.x - p.x, v.z - p.z) > 300) G.player.lastVehicle = null;
        else continue;
      }
      if (v.isPolice && v.policeUnit && !v.policeUnit.released) continue;
      const d = Math.hypot(v.x - p.x, v.z - p.z);
      const vis = this.visible(v.x, v.z, cam);
      const tooFar = d > 420 || (d > 230 && !vis) || (v.wrecked && v.wreckT > 40 && !vis) || (v.removedSoon && !vis);
      if (tooFar) this.remove(v);
      else if (v.ai && v.ai.lost && !vis && d > 60) this.remove(v);
    }
  }

  remove(v) {
    v.removed = true;
    if (v.driver && !v.driver.isPlayer) v.driver.removed = true;
    if (v.passenger && !v.passenger.isPlayer) v.passenger.removed = true;
    if (v.parkSpot) { v.parkSpot.car = null; }
  }

  visible(x, z, cam) {
    const dx = x - cam.position.x, dz = z - cam.position.z;
    const d = Math.hypot(dx, dz);
    if (d < 30) return true;
    const dot = (dx * Math.sin(G.cam.yaw) + dz * Math.cos(G.cam.yaw)) / d;
    return dot > 0.5;
  }

  trySpawn(p, anywhere) {
    const city = this.city;
    for (let attempt = 0; attempt < 8; attempt++) {
      const e = pick(city.edges);
      const a = city.nodes[e.a], b = city.nodes[e.b];
      const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
      const d = Math.hypot(mx - p.x, mz - p.z);
      if (d < 70 || d > 230) continue;
      if (!anywhere && this.visible(mx, mz, G.camera) && d < 160) continue;
      const fwd = chance(0.5);
      const from = fwd ? a : b, to = fwd ? b : a;
      const lane = chance(0.5) ? 0 : 1;
      const t = rand(0.25, 0.7);
      const dx = to.x - from.x, dz = to.z - from.z;
      const l = Math.hypot(dx, dz);
      const ux = dx / l, uz = dz / l;
      const off = LANES[lane];
      const x = from.x + dx * t + -uz * off, z = from.z + dz * t + ux * off;
      if (G.vehicles.some((v) => !v.removed && Math.abs(v.x - x) < 12 && Math.abs(v.z - z) < 12)) continue;
      const district = city.districtAt(x, z);
      const types = TYPE_BY_DISTRICT[district] || TYPE_BY_DISTRICT.Midtown;
      const type = pick(types);
      const v = spawnVehicle(type, x, z, Math.atan2(ux, uz));
      const sp = rand(7, 11);
      v.vx = ux * sp; v.vz = uz * sp;
      const dr = spawnHuman('ped', x, z);
      dr.enterVehicle(v, 1);
      v.ai = new LaneDriver(v, from, to, lane);
      v.ai.joined = true;
      return v;
    }
    return null;
  }

  updateParking(p) {
    for (const s of this.city.parking) {
      const d = Math.hypot(s.x - p.x, s.z - p.z);
      if (s.noSpawn) continue;
      if (d < 150 && !s.active) {
        s.active = true;
        // stable per-spot decision so cars don't pop in and out
        const hsh = Math.abs(Math.sin(s.x * 12.9898 + s.z * 78.233) * 43758.5453) % 1;
        if (hsh < 0.55 && !s.car) {
          const district = this.city.districtAt(s.x, s.z);
          const types = TYPE_BY_DISTRICT[district] || TYPE_BY_DISTRICT.Midtown;
          const type = pick(types.filter((t) => t !== 'truck'));
          if (G.vehicles.some((v) => !v.removed && Math.abs(v.x - s.x) < 3 && Math.abs(v.z - s.z) < 3)) continue;
          const v = spawnVehicle(type, s.x, s.z, s.h + rand(-0.05, 0.05));
          v.parkSpot = s;
          v.handbrake = true;
          s.car = v;
        }
      } else if (d > 230 && s.active) {
        s.active = false;
        if (s.car && !s.car.removed && s.car !== G.player.human.vehicle && s.car !== G.player.lastVehicle && !s.car.persistent) {
          const v = s.car;
          if (Math.hypot(v.x - s.x, v.z - s.z) < 2 && !v.driver) this.remove(v);
        }
        s.car = null;
      }
    }
  }
}

export { DISTRICT_NAMES, wrapAngle, ROAD_HALF, clamp };
