// Arcade vehicle physics, damage, fire and explosions, plus instanced rendering for all cars.

import * as THREE from 'three';
import { G, vibrate } from './state.js';
import { VTYPES, VTYPE_KEYS, buildVehicleGeometry, buildWheelGeometry, vehicleLights, makePaintMaterial } from './models.js';
import { clamp, lerp, damp, approach, wrapAngle, rand, pick } from './util.js';
import { WATER_LEVEL } from './world/citygen.js';

let nextId = 1;
const GRAVITY = 24;

export class Vehicle {
  constructor(type, x, z, h, color) {
    this.id = nextId++;
    this.type = type;
    this.T = VTYPES[type];
    this.x = x; this.z = z; this.h = h;
    this.y = G.physics ? G.physics.groundHeight(x, z) : 0;
    this.vx = 0; this.vz = 0; this.vy = 0; this.w = 0;
    this.vF = 0;
    this.color = new THREE.Color(color ?? pick(this.T.colors));
    this.health = this.T.health;
    this.maxHealth = this.T.health;
    this.driver = null;
    this.passenger = null;
    this.ai = null;
    this.throttle = 0; this.steer = 0; this.handbrake = false;
    this.steerAngle = 0; this.spin = 0;
    this.pitch = 0; this.roll = 0;
    this.onGround = true;
    this.airTime = 0;
    this.burnT = 0;
    this.wrecked = false;
    this.wreckT = 0;
    this.removed = false;
    this.sinkT = 0;
    this.siren = false;
    this.isPolice = type === 'police';
    this.persistent = false;
    this.lastHitBy = null;
    this.hornT = 0;
    this.braking = false;
    this.smokeT = 0;
    this.n = Math.max(3, Math.ceil(this.T.len / this.T.wid) + 1);
    this.r = this.T.wid / 2;
    this.mass = this.T.mass;
    this.skidT = 0;
    this.slip = 0;
    this.locked = false; // mission cars that can't be entered yet
    this.label = null;
    this.lastCrash = 0;
  }

  get speed() { return Math.hypot(this.vx, this.vz); }
  get fx() { return Math.sin(this.h); }
  get fz() { return Math.cos(this.h); }

  /** Circle centre offsets along the car's length for collisions. */
  circleOffsets() {
    const L = this.T.len / 2 - this.r;
    const out = [];
    for (let k = 0; k < this.n; k++) out.push(-L + (2 * L * k) / (this.n - 1));
    return out;
  }

  /** Seat world position for the driver (left side). */
  seatPos(side = 1) {
    const T = this.T;
    const lx = side * (T.truck ? 0.55 : 0.36);
    const lz = T.truck ? T.len / 2 - 1.4 : (T.cab[0] + T.cab[1]) / 2 - 0.15;
    const fx = this.fx, fz = this.fz;
    // local +x = left = (fz, -fx)
    return { x: this.x + fx * lz + fz * lx, z: this.z + fz * lz - fx * lx, y: this.y };
  }

  /** The door (either side) nearest to a point. */
  nearestDoor(x, z) {
    const a = this.doorPos(1), b = this.doorPos(-1);
    return Math.hypot(a.x - x, a.z - z) <= Math.hypot(b.x - x, b.z - z) ? a : b;
  }

  /** Door position (where a person stands to get in). */
  doorPos(side = 1) {
    const T = this.T;
    const lx = side * (T.wid / 2 + 0.75);
    const lz = T.truck ? T.len / 2 - 1.6 : (T.cab[0] + T.cab[1]) / 2;
    const fx = this.fx, fz = this.fz;
    return { x: this.x + fx * lz + fz * lx, z: this.z + fz * lz - fx * lx };
  }

  damage(amount, source) {
    if (this.wrecked) return;
    if (source) this.lastHitBy = source;
    this.health -= amount;
    if (this.health <= 0 && this.burnT === 0) {
      this.health = 0;
      this.burnT = 0.0001;
    }
  }

  explode() {
    if (this.wrecked) return;
    this.wrecked = true;
    this.burnT = 0;
    this.health = 0;
    this.siren = false;
    this.vy = 7;
    this.onGround = false;
    this.w += rand(-2, 2);
    G.fx.explosion(this.x, this.y + 1, this.z, 1.2);
    G.weapons.blast(this.x, this.y + 0.8, this.z, 9, 160, this.lastHitBy, this);
    if (this.driver) {
      const d = this.driver;
      if (d.isPlayer) {
        // the player gets thrown clear instead of dying outright
        G.player.exitVehicle(true);
        d.knock(this.vx * 0.3 + Math.sin(this.h + 1.6) * 6, 6, this.vz * 0.3 + Math.cos(this.h + 1.6) * 6);
        d.damage(55, null, 'explosion');
      } else {
        d.exitVehicle(true);
        d.damage(1000, this.lastHitBy, 'explosion');
      }
    }
    if (this.passenger) {
      const p = this.passenger;
      p.exitVehicle(true);
      p.damage(1000, this.lastHitBy, 'explosion');
    }
    if (this.lastHitBy && this.lastHitBy.isPlayer) {
      G.stats.carsDestroyed++;
      G.police.crime(this.isPolice ? 'copcar' : 'carboom', this.x, this.z);
    }
    G.missions && G.missions.onVehicleDestroyed(this);
  }

  update(dt) {
    const T = this.T, P = G.physics;
    if (this.removed) return;

    // fire and smoke
    if (this.burnT > 0) {
      this.burnT += dt;
      this.smokeT -= dt;
      if (this.smokeT <= 0) {
        this.smokeT = 0.05;
        G.fx.fire(this.x + this.fx * T.len * 0.3, this.y + T.belt + 0.2, this.z + this.fz * T.len * 0.3);
      }
      if (this.burnT > 4.5) this.explode();
    } else if (!this.wrecked && this.health < this.maxHealth * 0.35) {
      this.smokeT -= dt;
      if (this.smokeT <= 0) {
        this.smokeT = this.health < this.maxHealth * 0.18 ? 0.06 : 0.14;
        G.fx.smoke(this.x + this.fx * T.len * 0.35, this.y + T.belt + 0.1, this.z + this.fz * T.len * 0.35, this.health < this.maxHealth * 0.18 ? 0.25 : 0.55);
      }
    }
    if (this.wrecked) {
      this.wreckT += dt;
      this.smokeT -= dt;
      if (this.smokeT <= 0 && this.wreckT < 20) {
        this.smokeT = 0.18;
        G.fx.smoke(this.x, this.y + 1.2, this.z, 0.15);
      }
    }

    const dead = this.wrecked || this.sinkT > 0;
    const thr = dead ? 0 : this.throttle;
    const fx = Math.sin(this.h), fz = Math.cos(this.h);
    const rx = -fz, rz = fx;

    if (this.onGround) {
      let vF = this.vx * fx + this.vz * fz;
      let vR = this.vx * rx + this.vz * rz;
      const sa = Math.abs(vF);
      this.braking = false;
      if (thr > 0.02) {
        if (vF < -0.5) { vF = Math.min(0, vF + T.brake * thr * dt); this.braking = true; }
        else {
          const f = 1 - Math.min(1, (vF / T.maxSpeed) ** 2);
          vF += T.accel * thr * Math.max(0.03, f) * dt;
        }
      } else if (thr < -0.02) {
        if (vF > 0.5) { vF = Math.max(0, vF + T.brake * thr * dt); this.braking = true; }
        else {
          vF -= T.accel * 0.55 * -thr * dt;
          if (vF < -T.maxSpeed * 0.3) vF = -T.maxSpeed * 0.3;
        }
      } else {
        vF = approach(vF, 0, (dead ? 6 : 1.4 + sa * 0.04) * dt);
      }
      if (this.handbrake) { vF = approach(vF, 0, 6.5 * dt); this.braking = true; }
      if (dead && this.wrecked) vF = approach(vF, 0, 8 * dt);

      let grip = T.grip;
      if (this.handbrake) grip *= 0.2;
      if (Math.abs(vR) > 5) grip *= 0.7;
      this.slip = Math.abs(vR);
      vR *= Math.exp(-grip * dt);

      const maxSteer = T.steer * (1 - Math.min(0.62, sa / 75));
      this.steerAngle = approach(this.steerAngle, (dead ? 0 : this.steer) * maxSteer, 3.2 * dt);
      let yaw = -(vF / T.wheelbase) * Math.tan(this.steerAngle);
      if (this.handbrake && sa > 6) yaw *= 1.45;
      this.w = lerp(this.w, yaw, damp(9, dt));

      this.h += this.w * dt;
      const nfx = Math.sin(this.h), nfz = Math.cos(this.h);
      this.vx = nfx * vF + -nfz * vR;
      this.vz = nfz * vF + nfx * vR;
      this.vF = vF;

      // visual pitch from braking/accel, roll from cornering
      const pitchT = this.braking ? -0.035 * Math.min(1, sa / 15) : thr > 0 ? 0.025 * thr : 0;
      this.pitch = lerp(this.pitch, pitchT, damp(6, dt));
      this.roll = lerp(this.roll, clamp(vF * this.w * 0.01, -0.09, 0.09), damp(6, dt));
      this.spin += (vF / T.wheelR) * dt;
    } else {
      this.w *= 1 - 0.4 * dt;
      this.h += this.w * dt;
      this.spin += (this.vF / T.wheelR) * dt;
      this.pitch = lerp(this.pitch, clamp(this.vy * 0.02, -0.35, 0.25), damp(2, dt));
      this.roll = lerp(this.roll, 0, damp(2, dt));
    }

    // integrate
    this.x += this.vx * dt;
    this.z += this.vz * dt;

    // vertical
    const g = P.groundHeight(this.x, this.z);
    if (this.onGround) {
      if (g >= this.y - 0.35) {
        const vy = (g - this.y) / dt;
        this.vy = Math.min(vy, Math.abs(this.vF) * 0.6 + 2);
        this.y = g;
      } else {
        this.onGround = false;
        this.airTime = 0;
        this.airStart = { x: this.x, z: this.z };
      }
    }
    if (!this.onGround) {
      this.airTime += dt;
      this.vy -= GRAVITY * dt;
      this.y += this.vy * dt;
      if (this.y <= g) {
        const impact = -this.vy;
        this.y = g;
        this.vy = 0;
        this.onGround = true;
        if (impact > 9) {
          this.damage((impact - 9) * 18);
          if (this.driver && this.driver.isPlayer) {
            G.cam.shake(Math.min(0.6, impact * 0.03));
            G.audio.crash(Math.min(1, impact / 20));
            vibrate(40);
          }
        }
        if (this.driver && this.driver.isPlayer && this.airTime > 0.6) G.missions.onLanded(this, this.airTime);
      }
    }

    // water
    const depth = WATER_LEVEL - g;
    if (depth > 0.9 && this.y < WATER_LEVEL + 0.3) {
      if (this.sinkT === 0) {
        this.sinkT = 0.0001;
        G.fx.splash(this.x, WATER_LEVEL, this.z, 2);
        G.audio.splash();
      }
    }
    if (this.sinkT > 0) {
      this.sinkT += dt;
      this.vx *= 1 - 2.5 * dt; this.vz *= 1 - 2.5 * dt;
      this.y = Math.max(g, WATER_LEVEL - 0.4 - this.sinkT * 0.5);
      this.vy = 0;
      this.onGround = true;
      if (this.sinkT > 1.2 && this.driver) {
        const d = this.driver;
        if (d.isPlayer) G.player.exitVehicle(true);
        else d.exitVehicle(true);
      }
      if (this.sinkT > 1.2 && this.passenger) this.passenger.exitVehicle(true);
      if (this.sinkT > 8) this.removed = true;
      return;
    }

    // static collisions
    this.collideStatic(dt);

    // world bounds
    if (!P.inBounds(this.x, this.z)) {
      this.vx *= -0.5; this.vz *= -0.5;
      this.x -= Math.sign(this.x) * 0.5;
    }
  }

  collideStatic() {
    const P = G.physics;
    const offs = this.circleOffsets();
    const fx = Math.sin(this.h), fz = Math.cos(this.h);
    for (let k = 0; k < offs.length; k++) {
      const off = offs[k];
      const cx = this.x + fx * off, cz = this.z + fz * off;
      const res = P.resolveCircle(cx, cz, this.r, this.y + 0.3);
      if (!res.hit) continue;
      this.x += res.x - cx;
      this.z += res.z - cz;
      const nx = res.nx, nz = res.nz;
      const vn = this.vx * nx + this.vz * nz;
      if (vn < 0) {
        const impact = -vn;
        this.vx -= 1.3 * vn * nx;
        this.vz -= 1.3 * vn * nz;
        this.vx *= 0.96; this.vz *= 0.96;
        const lat = fx * nz - fz * nx;
        this.w -= off * lat * impact * 0.09;
        this.onImpact(impact, null);
      }
    }
  }

  onImpact(impact, other) {
    if (impact > 4.5) {
      const dmg = (impact - 4.5) * 16 / this.mass * (this.driver && this.driver.isPlayer ? 0.6 : 1);
      this.damage(dmg, other && other.driver ? other.driver : this.lastHitBy);
    }
    const isPlayer = this.driver && this.driver.isPlayer;
    if (impact > 3 && G.time - this.lastCrash > 0.25) {
      this.lastCrash = G.time;
      if (isPlayer || G.cam.distTo(this.x, this.z) < 40) G.audio.crash(Math.min(1, impact / 22), this.x, this.z);
      if (impact > 7) G.fx.sparks(this.x + this.fx * this.T.len * 0.45, this.y + 0.6, this.z + this.fz * this.T.len * 0.45, 8);
      if (isPlayer) {
        G.cam.shake(Math.min(0.5, impact * 0.025));
        vibrate(Math.min(80, impact * 4));
      }
    }
    if (this.ai && this.ai.onHit) this.ai.onHit(impact, other);
  }
}

/** Resolve vehicle-vehicle and human-vehicle overlaps after everything has moved. */
export function collideDynamics() {
  const vs = G.vehicles;
  for (let i = 0; i < vs.length; i++) {
    const a = vs[i];
    if (a.removed) continue;
    for (let j = i + 1; j < vs.length; j++) {
      const b = vs[j];
      if (b.removed) continue;
      const lim = (a.T.len + b.T.len) / 2 + 0.3;
      const dx = a.x - b.x, dz = a.z - b.z;
      if (dx * dx + dz * dz > lim * lim) continue;
      if (Math.abs(a.y - b.y) > 2.2) continue;
      collidePair(a, b);
    }
  }
  // humans vs vehicles
  const hs = G.humans;
  for (const hm of hs) {
    if (hm.removed || hm.vehicle) continue;
    for (const v of vs) {
      if (v.removed) continue;
      const dx = hm.x - v.x, dz = hm.z - v.z;
      const lim = v.T.len / 2 + 0.6;
      if (dx * dx + dz * dz > lim * lim) continue;
      if (hm.y > v.y + v.T.hgt + 0.2 || hm.y + 1.6 < v.y) continue;
      collideHumanVehicle(hm, v);
    }
  }
}

function collidePair(a, b) {
  const ao = a.circleOffsets(), bo = b.circleOffsets();
  const afx = Math.sin(a.h), afz = Math.cos(a.h), bfx = Math.sin(b.h), bfz = Math.cos(b.h);
  for (const oa of ao) {
    for (const ob of bo) {
      const ax = a.x + afx * oa, az = a.z + afz * oa;
      const bx = b.x + bfx * ob, bz = b.z + bfz * ob;
      const dx = ax - bx, dz = az - bz;
      const rr = a.r + b.r;
      const d2 = dx * dx + dz * dz;
      if (d2 >= rr * rr) continue;
      const d = Math.sqrt(d2) || 0.001;
      const nx = dx / d, nz = dz / d;
      const pen = rr - d;
      const ma = a.wrecked ? a.mass * 1.5 : a.mass, mb = b.wrecked ? b.mass * 1.5 : b.mass;
      const sa = mb / (ma + mb), sb = ma / (ma + mb);
      a.x += nx * pen * sa; a.z += nz * pen * sa;
      b.x -= nx * pen * sb; b.z -= nz * pen * sb;
      const rvx = a.vx - b.vx, rvz = a.vz - b.vz;
      const vn = rvx * nx + rvz * nz;
      if (vn < 0) {
        const jImp = (-(1 + 0.3) * vn) / (1 / ma + 1 / mb);
        a.vx += (jImp / ma) * nx; a.vz += (jImp / ma) * nz;
        b.vx -= (jImp / mb) * nx; b.vz -= (jImp / mb) * nz;
        const la = afx * nz - afz * nx, lb = bfx * nz - bfz * nx;
        a.w -= oa * la * (jImp / ma) * 0.06;
        b.w += ob * lb * (jImp / mb) * 0.06;
        const impact = -vn;
        if (a.driver && a.driver.isPlayer) b.lastHitBy = a.driver;
        if (b.driver && b.driver.isPlayer) a.lastHitBy = b.driver;
        a.onImpact(impact, b);
        b.onImpact(impact, a);
        if (impact > 6) {
          const pl = G.player;
          if ((a.driver === pl && b.isPolice) || (b.driver === pl && a.isPolice)) G.police.crime('rampolice', a.x, a.z);
        }
      }
      return;
    }
  }
}

function collideHumanVehicle(hm, v) {
  const fx = Math.sin(v.h), fz = Math.cos(v.h);
  const dx = hm.x - v.x, dz = hm.z - v.z;
  const lz = dx * fx + dz * fz;
  const lx = dx * fz - dz * fx; // local +x = left
  const hl = v.T.len / 2 + hm.radius, hw = v.T.wid / 2 + hm.radius;
  if (Math.abs(lz) >= hl || Math.abs(lx) >= hw) return;
  const pz = hl - Math.abs(lz), px = hw - Math.abs(lx);
  let nx, nz, pen;
  if (px < pz) {
    const s = Math.sign(lx) || 1;
    nx = fz * s; nz = -fx * s; pen = px;
  } else {
    const s = Math.sign(lz) || 1;
    nx = fx * s; nz = fz * s; pen = pz;
  }
  const rel = (v.vx - hm.vx) * nx + (v.vz - hm.vz) * nz;
  const sp = v.speed;
  if (rel > 5 && sp > 5 && hm.state !== 'dead') {
    // run over / knocked flying
    const dmg = sp * 5.5 + rel * 2;
    const by = v.driver || null;
    hm.knock(v.vx * 0.9 + nx * 3, Math.min(9, 2.5 + sp * 0.22), v.vz * 0.9 + nz * 3);
    hm.damage(dmg, by, 'vehicle');
    v.vx *= 0.93; v.vz *= 0.93;
    if (v.driver && v.driver.isPlayer) {
      G.audio.thud(0.8);
      vibrate(30);
      if (hm.kind === 'cop') G.police.crime('hitcop', hm.x, hm.z);
      else G.police.crime('hitped', hm.x, hm.z);
    }
    if (hm.isPlayer && v.driver && !v.driver.isPlayer) G.cam.shake(0.3);
  } else {
    hm.x += nx * pen;
    hm.z += nz * pen;
    if (hm.state === 'dead' || hm.state === 'ragdoll') return;
    const vn = hm.vx * nx + hm.vz * nz;
    if (vn < 0) { hm.vx -= vn * nx; hm.vz -= vn * nz; }
    // slow cars nudge people; standing peds slightly slow cars
    if (sp > 1) { v.vx *= 0.995; v.vz *= 0.995; }
  }
}

// ---------------------------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------------------------
const MAX_PER_TYPE = 40;
const _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
const _p = new THREE.Vector3(), _s = new THREE.Vector3();
const BURNT = new THREE.Color(0x1a1714);

export class VehicleRenderer {
  constructor(scene) {
    this.material = makePaintMaterial();
    this.bodies = {};
    for (const k of VTYPE_KEYS) {
      const mesh = new THREE.InstancedMesh(buildVehicleGeometry(k), this.material, MAX_PER_TYPE);
      mesh.count = 0;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.setColorAt(0, new THREE.Color(1, 1, 1));
      scene.add(mesh);
      this.bodies[k] = mesh;
    }
    const maxV = MAX_PER_TYPE * 3;
    this.wheels = new THREE.InstancedMesh(buildWheelGeometry(), this.material, maxV * 4);
    this.wheels.count = 0;
    this.wheels.castShadow = true;
    this.wheels.frustumCulled = false;
    this.wheels.setColorAt(0, new THREE.Color(1, 1, 1));
    scene.add(this.wheels);
    this.lights = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff }), maxV * 6);
    this.lights.count = 0;
    this.lights.frustumCulled = false;
    this.lights.setColorAt(0, new THREE.Color(1, 1, 1));
    scene.add(this.lights);
    this.lightDefs = {};
    for (const k of VTYPE_KEYS) this.lightDefs[k] = vehicleLights(k);

    // headlight glow sprites
    this.maxGlow = maxV * 6;
    const gg = new THREE.BufferGeometry();
    this.glowPos = new Float32Array(this.maxGlow * 3);
    this.glowCol = new Float32Array(this.maxGlow * 3);
    this.glowSize = new Float32Array(this.maxGlow);
    gg.setAttribute('position', new THREE.BufferAttribute(this.glowPos, 3).setUsage(THREE.DynamicDrawUsage));
    gg.setAttribute('color', new THREE.BufferAttribute(this.glowCol, 3).setUsage(THREE.DynamicDrawUsage));
    gg.setAttribute('size', new THREE.BufferAttribute(this.glowSize, 1).setUsage(THREE.DynamicDrawUsage));
    this.glow = new THREE.Points(gg, makeGlowMaterial());
    this.glow.frustumCulled = false;
    scene.add(this.glow);
    this.carMatrix = new Map();
    this._c = new THREE.Color();
  }

  update(vehicles, night, camPos) {
    const counts = {};
    for (const k of VTYPE_KEYS) counts[k] = 0;
    let wc = 0, lc = 0, gc = 0;
    const c = this._c;
    const flash = Math.floor(G.time * 6) % 2;
    for (const v of vehicles) {
      if (v.removed) continue;
      const dxc = v.x - camPos.x, dzc = v.z - camPos.z;
      if (dxc * dxc + dzc * dzc > 420 * 420) continue;
      const T = v.T;
      const mesh = this.bodies[v.type];
      const idx = counts[v.type]++;
      if (idx >= MAX_PER_TYPE) continue;
      _e.set(-v.pitch, v.h, v.roll, 'YXZ');
      _q.setFromEuler(_e);
      _p.set(v.x, v.y, v.z);
      _s.set(1, 1, 1);
      _m.compose(_p, _q, _s);
      v.matrix = v.matrix || new THREE.Matrix4();
      v.matrix.copy(_m);
      mesh.setMatrixAt(idx, _m);
      mesh.setColorAt(idx, v.wrecked ? BURNT : v.color);

      // wheels
      const W = T.wid / 2 - 0.16, R = T.wheelR;
      const wb = T.wheelbase / 2;
      const wz = T.truck ? [wb - 0.3, -wb + 0.3] : [wb, -wb];
      for (let k = 0; k < 4; k++) {
        const side = k % 2 ? -1 : 1;
        const front = k < 2;
        _e.set(v.spin, front ? v.steerAngle * -1 : 0, 0, 'YXZ');
        _q.setFromEuler(_e);
        _p.set(side * W, R, front ? wz[0] : wz[1]);
        _s.set(0.28, R, R);
        _m2.compose(_p, _q, _s);
        _m2.premultiply(_m);
        this.wheels.setMatrixAt(wc, _m2);
        this.wheels.setColorAt(wc, v.wrecked ? BURNT : WHEEL_WHITE);
        wc++;
      }

      // lights
      if (v.wrecked) continue;
      const defs = this.lightDefs[v.type];
      const headOn = night > 0.25 || v.isPolice;
      for (const [lx, ly, lz, kind] of defs) {
        if (kind === 0) {
          c.setRGB(headOn ? 1 : 0.8, headOn ? 1 : 0.8, headOn ? 0.85 : 0.75);
          _s.set(0.42, 0.13, 0.05);
        } else if (kind === 1) {
          const b = v.braking ? 1 : headOn ? 0.55 : 0.3;
          c.setRGB(b, 0.02, 0.02);
          _s.set(0.36, 0.12, 0.05);
        } else if (kind === 2) {
          const on = v.siren && flash === 0;
          c.setRGB(on ? 1 : 0.35, 0.05, 0.05);
          _s.set(0.5, 0.14, 0.24);
        } else {
          const on = v.siren && flash === 1;
          c.setRGB(0.05, 0.12, on ? 1 : 0.35);
          _s.set(0.5, 0.14, 0.24);
        }
        _q.identity();
        _p.set(lx, ly, lz);
        _m2.compose(_p, _q, _s);
        _m2.premultiply(_m);
        this.lights.setMatrixAt(lc, _m2);
        this.lights.setColorAt(lc, c);
        lc++;
        // glow sprites
        let size = 0, gr = 0, gg2 = 0, gb = 0;
        if (kind === 0 && headOn && night > 0.25) { size = 3.2; gr = 1; gg2 = 0.95; gb = 0.8; }
        else if (kind === 1 && (v.braking || night > 0.25)) { size = v.braking ? 2.4 : 1.4; gr = 1; gg2 = 0.08; gb = 0.05; }
        else if (kind === 2 && v.siren && flash === 0) { size = 5; gr = 1; gg2 = 0.1; gb = 0.1; }
        else if (kind === 3 && v.siren && flash === 1) { size = 5; gr = 0.15; gg2 = 0.3; gb = 1; }
        if (size > 0 && gc < this.maxGlow) {
          _p.set(lx, ly, lz + (kind === 0 ? 0.1 : kind === 1 ? -0.1 : 0)).applyMatrix4(_m);
          this.glowPos[gc * 3] = _p.x; this.glowPos[gc * 3 + 1] = _p.y; this.glowPos[gc * 3 + 2] = _p.z;
          const it = kind >= 2 ? 1 : Math.max(0.4, night);
          this.glowCol[gc * 3] = gr * it; this.glowCol[gc * 3 + 1] = gg2 * it; this.glowCol[gc * 3 + 2] = gb * it;
          this.glowSize[gc] = size;
          gc++;
        }
      }
      if (v.type === 'taxi' && night > 0.2 && gc < this.maxGlow) {
        _p.set(0, T.hgt + 0.15, 0).applyMatrix4(_m);
        this.glowPos.set([_p.x, _p.y, _p.z], gc * 3);
        this.glowCol.set([1, 0.8, 0.3], gc * 3);
        this.glowSize[gc] = 1.6;
        gc++;
      }
    }
    for (const k of VTYPE_KEYS) {
      const mesh = this.bodies[k];
      mesh.count = Math.min(counts[k], MAX_PER_TYPE);
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    this.wheels.count = wc;
    this.wheels.instanceMatrix.needsUpdate = true;
    if (this.wheels.instanceColor) this.wheels.instanceColor.needsUpdate = true;
    this.lights.count = lc;
    this.lights.instanceMatrix.needsUpdate = true;
    if (this.lights.instanceColor) this.lights.instanceColor.needsUpdate = true;
    const geo = this.glow.geometry;
    geo.setDrawRange(0, gc);
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    geo.attributes.size.needsUpdate = true;
  }
}
const WHEEL_WHITE = new THREE.Color(1, 1, 1);

/** Additive soft-dot material for Points with per-point size (world units) and colour. */
export function makeGlowMaterial(opacity = 1) {
  return new THREE.ShaderMaterial({
    uniforms: { uScale: { value: 600 }, uOpacity: { value: opacity } },
    vertexShader: `
      attribute float size;
      attribute vec3 color;
      varying vec3 vColor;
      uniform float uScale;
      void main() {
        vColor = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = clamp(size * uScale / -mv.z, 1.0, 256.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying vec3 vColor;
      uniform float uOpacity;
      void main() {
        vec2 d = gl_PointCoord - 0.5;
        float r = length(d) * 2.0;
        float a = smoothstep(1.0, 0.0, r);
        a = a * a;
        gl_FragColor = vec4(vColor * a * uOpacity, 1.0);
      }`,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
  });
}

export function spawnVehicle(type, x, z, h, color) {
  const v = new Vehicle(type, x, z, h, color);
  G.vehicles.push(v);
  return v;
}

export { wrapAngle };
