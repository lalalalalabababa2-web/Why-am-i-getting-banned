// Wanted level, police cars, cops on foot (arrest or shoot), helicopter, evasion.

import * as THREE from 'three';
import { G, vibrate } from '../state.js';
import { spawnVehicle } from '../vehicle.js';
import { spawnHuman } from '../human.js';
import { CombatBrain } from './peds.js';
import { PathFollower, steerToward, route } from './drive.js';
import { LaneDriver } from './traffic.js';
import { nearestNode, LANES } from '../world/citygen.js';
import { clamp, lerp, rand, chance, pick, wrapAngle, damp } from '../util.js';
import { makePaintMaterial } from '../models.js';

const LEVEL_HEAT = [0, 20, 200, 650, 1500, 3000];
const CRIME = {
  shoot: 4, punch: 8, punchcop: 160, hitped: 35, kill: 70, killcop: 420, hitcop: 160, shootcop: 120,
  copcar: 420, carboom: 60, rampolice: 90, carjack: 30, stealcop: 220, robbery: 1500,
};
const COP_LOOK = { shirt: 0x2a4f9a, pants: 0x111827, hair: 0x0f1a33, bald: false };

export class Police {
  constructor(scene) {
    this.scene = scene;
    this.level = 0;
    this.heat = 0;
    this.lastSeen = { x: 0, z: 0 };
    this.unseenT = 0;
    this.seen = false;
    this.checkT = 0;
    this.units = [];
    this.heli = null;
    this.spawnT = 0;
    this.radius = 0;
  }

  get searchRadius() { return 80 + this.level * 30; }

  copNear(x, z, r) {
    for (const h of G.humans) if (h.kind === 'cop' && h.alive && !h.removed && Math.hypot(h.x - x, h.z - z) < r) return true;
    for (const v of G.vehicles) if (v.isPolice && v.driver && !v.removed && Math.hypot(v.x - x, v.z - z) < r) return true;
    return false;
  }

  crime(type, x, z) {
    if (!G.player || G.player.dead || G.player.busted) return;
    if (G.missions && G.missions.noCops) return;
    let v = CRIME[type] || 0;
    if (this.level === 0 && !this.copNear(x, z, 60) && (type === 'shoot' || type === 'punch' || type === 'carjack' || type === 'hitped')) v *= 0.5;
    this.heat += v;
    let lvl = 0;
    for (let i = 5; i >= 1; i--) if (this.heat >= LEVEL_HEAT[i]) { lvl = i; break; }
    if (lvl > this.level) this.setLevel(lvl);
    if (this.level > 0) {
      const p = G.player.pos();
      this.lastSeen = { x: p.x, z: p.z };
      this.unseenT = 0;
    }
  }

  setLevel(l) {
    l = clamp(l, 0, 5);
    if (l > this.level) {
      G.audio.wantedUp();
      vibrate(60);
      if (this.level === 0) {
        const p = G.player.pos();
        this.lastSeen = { x: p.x, z: p.z };
      }
    }
    this.level = l;
    this.heat = Math.max(this.heat, LEVEL_HEAT[l]);
    this.unseenT = 0;
    G.stats.maxWanted = Math.max(G.stats.maxWanted, l);
  }

  clear(silent = false) {
    if (this.level > 0 && !silent) {
      G.hud.toast('LOST THE COPS');
      G.audio.chime();
    }
    this.level = 0;
    this.heat = 0;
    this.unseenT = 0;
    for (const u of this.units) this.release(u);
    this.units = [];
  }

  release(u) {
    u.released = true;
    const v = u.car;
    if (v && !v.removed && !v.wrecked && v.driver && !v.driver.isPlayer) {
      v.siren = false;
      const n = nearestNode(G.city, v.x, v.z);
      const nb = G.city.nodes[n.nb[0]];
      v.ai = new LaneDriver(v, nb, n, 0);
    }
  }

  update(dt) {
    const pl = G.player.human;
    this.units = this.units.filter((u) => {
      if (u.released) return false;
      const alive = u.cops.some((c) => !c.removed && c.alive);
      const carOk = u.car && !u.car.removed && !u.car.wrecked;
      if (!alive && !carOk) return false;
      if (!alive && carOk && !u.car.driver) { u.released = true; return false; }
      return true;
    });

    if (this.level > 0 && G.player.alive()) {
      this.checkT -= dt;
      if (this.checkT <= 0) {
        this.checkT = 0.25;
        this.seen = this.canSee(pl);
        if (this.seen) {
          const p = G.player.pos();
          this.lastSeen = { x: p.x, z: p.z };
        }
      }
      if (this.seen) this.unseenT = 0;
      else this.unseenT += dt;
      const p = G.player.pos();
      const out = Math.hypot(p.x - this.lastSeen.x, p.z - this.lastSeen.z) > this.searchRadius;
      if ((this.unseenT > 6 + this.level * 2 && out) || this.unseenT > 24 + this.level * 6) this.clear();

      // keep enough units around
      this.spawnT -= dt;
      if (this.spawnT <= 0) {
        this.spawnT = 2.2;
        const want = [0, 1, 2, 3, 4, 5][this.level];
        const active = this.units.filter((u) => u.car && !u.car.wrecked && !u.car.removed).length;
        if (active < want) this.spawnUnit();
        for (const u of this.units) {
          if (!u.car || u.car.removed) continue;
          const d = Math.hypot(u.car.x - p.x, u.car.z - p.z);
          const copsAway = u.cops.every((c) => c.removed || !c.alive || Math.hypot(c.x - p.x, c.z - p.z) > 220);
          if (d > 320 && copsAway) {
            u.car.removed = true;
            for (const c of u.cops) c.removed = true;
            u.released = true;
          }
        }
      }
      if (this.level >= 3 && (!this.heli || this.heli.dead)) {
        if (!this.heli) this.heli = new Heli(this.scene);
        if (this.heli.dead && this.heli.deadT > 25) this.heli.reset();
        if (!this.heli.active) this.heli.spawn();
      }
    } else {
      this.seen = false;
    }
    if (this.heli) this.heli.update(dt, this.level);
  }

  canSee(pl) {
    const p = G.player.pos();
    const y = (pl.vehicle ? pl.vehicle.y : pl.y) + 1.2;
    for (const h of G.humans) {
      if (h.kind !== 'cop' || !h.alive || h.removed) continue;
      const d = Math.hypot(h.x - p.x, h.z - p.z);
      if (d < 18) return true;
      if (d < 75 && G.physics.los(h.x, h.z, p.x, p.z, h.y + 1.5, y)) return true;
    }
    if (this.heli && this.heli.active && !this.heli.dead) {
      if (Math.hypot(this.heli.x - p.x, this.heli.z - p.z) < 65) return true;
    }
    return false;
  }

  spawnUnit() {
    const city = G.city;
    const p = G.player.pos();
    let best = null;
    for (let k = 0; k < 20; k++) {
      const n = pick(city.nodes);
      if (!n.nb.length) continue;
      const d = Math.hypot(n.x - p.x, n.z - p.z);
      if (d < 110 || d > 230) continue;
      if (G.traffic.visible(n.x, n.z, G.camera) && d < 160) continue;
      best = n;
      break;
    }
    if (!best) return;
    const h = Math.atan2(p.x - best.x, p.z - best.z);
    const x = best.x + Math.cos(h) * LANES[0], z = best.z - Math.sin(h) * LANES[0];
    if (G.vehicles.some((v) => !v.removed && Math.hypot(v.x - x, v.z - z) < 8)) return;
    const car = spawnVehicle('police', x, z, h);
    car.siren = true;
    const unit = { car, cops: [], released: false };
    car.policeUnit = unit;
    const d1 = spawnHuman('cop', x, z, { ...COP_LOOK, weapon: this.level >= 4 ? 'smg' : 'pistol', health: 100, armor: this.level >= 4 ? 50 : 0, money: 0 });
    d1.enterVehicle(car, 1);
    const d2 = spawnHuman('cop', x, z, { ...COP_LOOK, weapon: this.level >= 3 ? 'shotgun' : 'pistol', health: 100, armor: this.level >= 4 ? 50 : 0, money: 0 });
    d2.enterVehicle(car, -1);
    unit.cops.push(d1, d2);
    car.ai = new PoliceDriver(car, unit);
    d1.ai = new CopBrain(d1, unit);
    d2.ai = new CopBrain(d2, unit);
    this.units.push(unit);
  }

  bust() {
    if (G.player.dead || G.player.busted) return;
    G.player.onBusted();
  }
}

class PoliceDriver {
  constructor(v, unit) {
    this.v = v;
    this.unit = unit;
    this.f = new PathFollower();
    this.routeT = 0;
    this.mem = {};
    this.los = false;
    this.losT = 0;
    this.deployed = false;
  }

  onHit() {}

  update(dt) {
    const v = this.v;
    if (v.wrecked || !v.driver || v.driver.isPlayer) { if (!v.driver) { v.throttle = 0; v.handbrake = true; } return; }
    const pl = G.player.human;
    const P = G.police;
    if (P.level === 0) return;
    const tgt = pl.vehicle || pl;
    const tx = tgt.x, tz = tgt.z;
    const d = Math.hypot(tx - v.x, tz - v.z);
    this.losT -= dt;
    if (this.losT <= 0) {
      this.losT = 0.4;
      this.los = d < 90 && G.physics.los(v.x, v.z, tx, tz, v.y + 1.2, tgt.y + 1);
    }
    // target on foot (or parked at 1 star) and close: stop and get out
    const parked = pl.vehicle && pl.vehicle.speed < 2 && P.level === 1;
    if ((!pl.vehicle || parked) && d < 22 && this.los) {
      v.throttle = v.vF > 1 ? -1 : 0;
      v.steer = 0;
      v.handbrake = v.speed < 4;
      if (v.speed < 2.5) {
        for (const c of this.unit.cops) if (c.vehicle === v && c.alive) c.exitVehicle();
      }
      return;
    }
    if (d < 70 && this.los) {
      const lead = clamp(d / 18, 0, 1.4);
      const lx = tx + (tgt.vx || 0) * lead, lz = tz + (tgt.vz || 0) * lead;
      const sp = clamp(d * 1.1, 10, v.T.maxSpeed * 0.95);
      steerToward(v, lx, lz, sp, dt, this.mem);
      return;
    }
    this.routeT -= dt;
    if (this.routeT <= 0 || this.f.done) {
      this.routeT = 1.6;
      const fx = Math.sin(v.h), fz = Math.cos(v.h);
      // start from the intersection ahead of us so we never route backwards
      const a = nearestNode(G.city, v.x + fx * 55, v.z + fz * 55);
      const b = nearestNode(G.city, tx, tz);
      const nodes = route(G.city, a, b);
      const pts = nodes.map((n) => ({ x: n.x, z: n.z }));
      pts.push({ x: tx, z: tz });
      this.f.set(pts);
    }
    const look = 8 + v.speed * 0.5;
    const p0 = this.f.pts[0];
    let tg;
    if (this.f.i === 0 && p0 && Math.hypot(p0.x - v.x, p0.z - v.z) > look + 4) tg = { x: p0.x, z: p0.z };
    else tg = this.f.target(v.x, v.z, look);
    if (!tg) return;
    // slow down for turns: check the angle to the lookahead
    const err = Math.abs(wrapAngle(Math.atan2(tg.x - v.x, tg.z - v.z) - v.h));
    const sp = err > 0.5 ? 13 : 34;
    steerToward(v, tg.x, tg.z, sp, dt, this.mem);
  }
}

class CopBrain {
  constructor(h, unit) {
    this.h = h;
    this.unit = unit;
    this.combat = new CombatBrain(h, { hostile: true, accuracy: 0.3, keep: rand(7, 13), leash: 400 });
    this.arrestT = 0;
    this.inCar = true;
    this.shootT = 0;
  }

  onDamage(by) {
    if (by && by.isPlayer) G.police.crime('hitcop', this.h.x, this.h.z);
  }

  update(dt) {
    const h = this.h;
    const P = G.police;
    const pl = G.player.human;
    const car = this.unit.car;
    if (h.vehicle) {
      this.inCar = true;
      // passenger drive-by at 2+ stars
      if (h.vehicle.passenger === h && P.level >= 2 && pl.alive) {
        const tx = pl.vehicle ? pl.vehicle.x : pl.x, tz = pl.vehicle ? pl.vehicle.z : pl.z;
        const d = Math.hypot(tx - h.x, tz - h.z);
        this.shootT -= dt;
        if (d < 32 && this.shootT <= 0) {
          this.shootT = rand(0.7, 1.4);
          h.h = Math.atan2(tx - h.x, tz - h.z);
          G.weapons.fire(h, { target: pl, hitChance: 0.14 });
        }
      }
      return;
    }
    this.inCar = false;
    if (!h.alive || h.state !== 'normal') return;
    const carOk = car && !car.removed && !car.wrecked;
    if (P.level === 0 || this.unit.released) {
      if (carOk && Math.hypot(car.x - h.x, car.z - h.z) < 45) this.goToCar(car, dt);
      else { h.moveSpeed = 0; }
      return;
    }
    const tx = pl.vehicle ? pl.vehicle.x : pl.x, tz = pl.vehicle ? pl.vehicle.z : pl.z;
    const d = Math.hypot(tx - h.x, tz - h.z);
    // suspect drove off: get back in the car
    if (pl.vehicle && pl.vehicle.speed > 7 && d > 22 && carOk && Math.hypot(car.x - h.x, car.z - h.z) < 35) {
      this.goToCar(car, dt);
      return;
    }
    if (P.level === 1) {
      // try to arrest
      h.faceH = Math.atan2(tx - h.x, tz - h.z);
      const reach = pl.vehicle ? 3.0 : 1.7;
      if (d > reach) {
        h.moveX = (tx - h.x) / d; h.moveZ = (tz - h.z) / d; h.moveSpeed = 5.2;
        this.arrestT = Math.max(0, this.arrestT - dt);
      } else {
        h.moveSpeed = 0;
        const still = pl.vehicle ? pl.vehicle.speed < 1.2 : pl.speed < 3.5;
        if (still) this.arrestT += dt;
        G.player.arrestProgress = Math.max(G.player.arrestProgress || 0, this.arrestT / 1.2);
        if (this.arrestT > 1.2) P.bust();
      }
      return;
    }
    this.combat.target = pl;
    this.combat.hostile = true;
    this.combat.accuracy = 0.15 + P.level * 0.04;
    this.combat.update(dt);
  }

  goToCar(car, dt) {
    const h = this.h;
    const side = car.driver ? -1 : 1;
    if (side === -1 && car.passenger) { h.moveSpeed = 0; return; }
    const door = car.doorPos(side);
    const dx = door.x - h.x, dz = door.z - h.z, d = Math.hypot(dx, dz);
    h.faceH = null;
    if (d < 1.6) {
      h.enterVehicle(car, side);
      if (side === 1 && !(car.ai instanceof PoliceDriver)) car.ai = new PoliceDriver(car, this.unit);
    } else {
      h.moveX = dx / d; h.moveZ = dz / d; h.moveSpeed = 5;
    }
    void dt;
  }
}

// ---------------------------------------------------------------------------------------------
// Police helicopter
// ---------------------------------------------------------------------------------------------
class Heli {
  constructor(scene) {
    const g = new THREE.Group();
    const mat = makePaintMaterial();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 5.0), new THREE.MeshLambertMaterial({ color: 0x1b2a4a }));
    body.position.y = 0;
    const nose = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 1.4), new THREE.MeshLambertMaterial({ color: 0x8fb8d8 }));
    nose.position.set(0, 0.1, 3.0);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.4, 5.02), new THREE.MeshLambertMaterial({ color: 0xffffff }));
    stripe.position.y = -0.3;
    const boom = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 5.5), new THREE.MeshLambertMaterial({ color: 0x1b2a4a }));
    boom.position.set(0, 0.5, -5);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.6, 1.0), new THREE.MeshLambertMaterial({ color: 0x1b2a4a }));
    fin.position.set(0, 1.1, -7.5);
    const skidGeo = new THREE.BoxGeometry(0.15, 0.15, 4.5);
    const skidMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
    const s1 = new THREE.Mesh(skidGeo, skidMat); s1.position.set(1.1, -1.5, 0);
    const s2 = new THREE.Mesh(skidGeo, skidMat); s2.position.set(-1.1, -1.5, 0);
    this.rotor = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 11), new THREE.MeshLambertMaterial({ color: 0x111111 }));
    this.rotor.position.y = 1.35;
    this.rotor2 = this.rotor.clone();
    this.rotor2.rotation.y = Math.PI / 2;
    this.rotor.add(this.rotor2);
    this.rotor2.position.set(0, 0, 0);
    this.tail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.6, 0.2), skidMat);
    this.tail.position.set(0.3, 1.1, -7.5);
    g.add(body, nose, stripe, boom, fin, s1, s2, this.rotor, this.tail);
    for (const m of g.children) { m.castShadow = true; }
    // searchlight
    const coneGeo = new THREE.ConeGeometry(6, 40, 20, 1, true);
    coneGeo.translate(0, -20, 0);
    this.beam = new THREE.Mesh(coneGeo, new THREE.MeshBasicMaterial({ color: 0xe8f4ff, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    scene.add(this.beam);
    this.group = g;
    this.group.visible = false;
    this.beam.visible = false;
    scene.add(g);
    void mat;
    this.active = false;
    this.dead = false;
    this.deadT = 0;
    this.health = 600;
    this.x = 0; this.y = 60; this.z = 0; this.h = 0; this.vx = 0; this.vz = 0; this.vy = 0;
    this.orbit = 0;
    this.fireT = 0;
    this.lightOn = 0;
  }

  reset() {
    this.dead = false;
    this.active = false;
    this.health = 600;
    this.group.visible = false;
    this.beam.visible = false;
  }

  spawn() {
    const p = G.player.pos();
    const a = rand(0, Math.PI * 2);
    this.x = p.x + Math.cos(a) * 200; this.z = p.z + Math.sin(a) * 200; this.y = 80;
    this.vx = this.vz = this.vy = 0;
    this.active = true;
    this.dead = false;
    this.health = 600;
    this.group.visible = true;
  }

  damage(amount, by) {
    if (this.dead) return;
    this.health -= amount;
    if (by && by.isPlayer) G.police.crime('shootcop', this.x, this.z);
    if (this.health <= 0) {
      this.dead = true;
      this.deadT = 0;
      this.spinV = 3;
      G.fx.explosion(this.x, this.y, this.z, 1);
      if (by && by.isPlayer) G.hud.toast('HELICOPTER DOWN');
    }
  }

  ceiling(x, z) {
    let m = 0;
    G.physics.query(x - 40, z - 40, x + 40, z + 40, (c) => { if (c.h > m) m = c.h; });
    return m;
  }

  update(dt, level) {
    if (!this.active) return;
    this.rotor.rotation.y += dt * 30;
    if (this.dead) {
      this.deadT += dt;
      if (this.y > -5) {
        this.vy -= 14 * dt;
        this.y += this.vy * dt;
        this.x += this.vx * dt; this.z += this.vz * dt;
        this.h += this.spinV * dt;
        if (Math.random() < 0.5) G.fx.fire(this.x, this.y, this.z);
        const g = G.physics.groundHeight(this.x, this.z);
        if (this.y < g + 1) {
          this.y = -50;
          G.fx.explosion(this.x, g + 1, this.z, 1.5);
          G.weapons.blast(this.x, g + 1, this.z, 10, 150, null);
          this.group.visible = false;
          this.beam.visible = false;
        }
      }
      this.sync();
      return;
    }
    const pl = G.player.human;
    const p = G.player.pos();
    if (level < 3) {
      // fly away
      this.vx = lerp(this.vx, (this.x - p.x) * 0.2, damp(1, dt));
      this.vz = lerp(this.vz, (this.z - p.z) * 0.2, damp(1, dt));
      this.y += dt * 8;
      this.x += this.vx * dt; this.z += this.vz * dt;
      if (Math.hypot(this.x - p.x, this.z - p.z) > 350) this.reset();
      this.sync();
      return;
    }
    this.orbit += dt * 0.35;
    const tx = p.x + Math.cos(this.orbit) * 30, tz = p.z + Math.sin(this.orbit) * 30;
    this.ceilT = (this.ceilT || 0) - dt;
    if (this.ceilT <= 0) { this.ceilT = 1; this.ceil = this.ceiling(this.x, this.z); }
    const ty = Math.max(38, (this.ceil || 0) + 18);
    const dx = tx - this.x, dz = tz - this.z;
    const d = Math.hypot(dx, dz) || 1;
    const sp = Math.min(38, d * 0.8);
    this.vx = lerp(this.vx, (dx / d) * sp, damp(1.2, dt));
    this.vz = lerp(this.vz, (dz / d) * sp, damp(1.2, dt));
    this.x += this.vx * dt; this.z += this.vz * dt;
    this.y = lerp(this.y, ty, damp(0.8, dt));
    this.h = Math.atan2(p.x - this.x, p.z - this.z);
    // gunner
    this.fireT -= dt;
    if (level >= 4 && this.fireT <= 0 && pl.alive) {
      this.fireT = rand(0.5, 1.0);
      const clear = G.physics.raycast(this.x, this.z, p.x, p.z, this.y, 1.5, true) >= 0.999;
      if (clear) {
        const hit = chance(0.12);
        const ex = p.x + (hit ? 0 : rand(-3, 3)), ez = p.z + (hit ? 0 : rand(-3, 3));
        G.fx.tracer(this.x, this.y - 1, this.z, ex, (pl.vehicle ? pl.vehicle.y : pl.y) + 1, ez);
        G.audio.gun('rifle', this.x, this.z);
        if (hit) {
          if (pl.vehicle) pl.vehicle.damage(25, null);
          else pl.damage(9, null, 'gun');
        }
      }
    }
    this.sync();
  }

  sync() {
    const g = this.group;
    g.position.set(this.x, this.y, this.z);
    const vF = this.vx * Math.sin(this.h) + this.vz * Math.cos(this.h);
    g.rotation.set(clamp(vF * 0.008, -0.25, 0.25), this.h, 0, 'YXZ');
    const night = G.sky ? G.sky.night : 0;
    const on = !this.dead && night > 0.3 && this.active;
    this.beam.visible = on;
    if (on) {
      const p = G.player.pos();
      this.beam.position.set(this.x, this.y - 1.2, this.z);
      const dir = new THREE.Vector3(p.x - this.x, (p.y || 0) - this.y, p.z - this.z);
      const len = dir.length();
      dir.normalize();
      this.beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
      this.beam.scale.set(1, len / 40, 1);
    }
  }

  /** Ray test for player bullets (sphere). */
  rayHit(ox, oy, oz, dx, dy, dz) {
    if (!this.active || this.dead) return Infinity;
    const cx = this.x - ox, cy = this.y - oy, cz = this.z - oz;
    const t = cx * dx + cy * dy + cz * dz;
    if (t < 0) return Infinity;
    const px = ox + dx * t - this.x, py = oy + dy * t - this.y, pz = oz + dz * t - this.z;
    return px * px + py * py + pz * pz < 9 ? t : Infinity;
  }
}

export { wrapAngle };
