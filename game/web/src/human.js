// People: movement physics, ragdoll knockdowns, health, and instanced procedural animation.

import * as THREE from 'three';
import { G } from './state.js';
import { buildHumanParts, makePaintMaterial, SKIN_TONES, HAIR_COLORS, SHIRT_COLORS, PANTS_COLORS } from './models.js';
import { clamp, lerp, damp, approachAngle, wrapAngle, pick, rand, chance } from './util.js';
import { WATER_LEVEL } from './world/citygen.js';

let nextId = 1;

export class Human {
  constructor(kind, x, z, opts = {}) {
    this.id = nextId++;
    this.kind = kind; // player | ped | cop | gang | boss | racer
    this.isPlayer = kind === 'player';
    this.x = x; this.z = z;
    this.y = G.physics ? G.physics.groundHeight(x, z) : 0;
    this.vx = 0; this.vy = 0; this.vz = 0;
    this.h = opts.h ?? rand(0, Math.PI * 2);
    this.radius = 0.32;
    this.maxHealth = opts.health ?? 100;
    this.health = this.maxHealth;
    this.armor = opts.armor ?? 0;
    this.alive = true;
    this.state = 'normal'; // normal | ragdoll | dead | getup | drive | swim
    this.t = 0;
    this.onGround = true;
    this.inWater = false;
    // intent
    this.moveX = 0; this.moveZ = 0; this.moveSpeed = 0;
    this.wantJump = false;
    this.faceH = null;
    // animation
    this.phase = rand(0, 6);
    this.walkAmt = 0;
    this.punchT = 0;
    this.aimT = 0;
    this.hitT = 0;
    this.handsUp = 0;
    this.spinX = 0; this.spinZ = 0; this.spinVX = 0; this.spinVZ = 0;
    this.scale = opts.scale ?? rand(0.92, 1.08);
    this.colors = {
      skin: new THREE.Color(opts.skin ?? pick(SKIN_TONES)),
      hair: new THREE.Color(opts.hair ?? pick(HAIR_COLORS)),
      shirt: new THREE.Color(opts.shirt ?? pick(SHIRT_COLORS)),
      pants: new THREE.Color(opts.pants ?? pick(PANTS_COLORS)),
    };
    this.bald = opts.bald ?? chance(0.08);
    // combat
    this.weapon = opts.weapon ?? 'fist';
    this.fireT = 0;
    this.reloadT = 0;
    this.clip = 0;
    // vehicle
    this.vehicle = null;
    this.seatSide = 1;
    // misc
    this.ai = null;
    this.removed = false;
    this.deadT = 0;
    this.lastHitBy = null;
    this.money = opts.money ?? Math.floor(rand(5, 60));
    this.persistent = false;
    this.blip = null;
    this.hidden = false;
  }

  get speed() { return Math.hypot(this.vx, this.vz); }

  damage(amount, by, cause = 'gun') {
    if (!this.alive) return;
    if (this.godT > 0) return;
    this.lastHitBy = by || this.lastHitBy;
    if (this.armor > 0 && cause !== 'fall') {
      const a = Math.min(this.armor, amount * 0.7);
      this.armor -= a;
      amount -= a;
    }
    this.health -= amount;
    this.hitT = 0.25;
    if (this.ai && this.ai.onDamage) this.ai.onDamage(by, amount, cause);
    if (this.isPlayer) G.player.onDamaged(amount, by, cause);
    if (this.health <= 0) this.die(by, cause);
  }

  die(by, cause) {
    if (!this.alive) return;
    this.alive = false;
    this.health = 0;
    if (this.vehicle) this.exitVehicle(true);
    if (this.state === 'normal' || this.state === 'swim' || this.state === 'getup') {
      // crumple: small push away from the attacker
      let px = 0, pz = 0;
      if (by) {
        const dx = this.x - by.x, dz = this.z - by.z, d = Math.hypot(dx, dz) || 1;
        px = (dx / d) * 2; pz = (dz / d) * 2;
      }
      this.knock(this.vx + px, 1.5, this.vz + pz);
    }
    if (this.isPlayer) G.player.onDeath(by, cause);
    else {
      if (by && by.isPlayer) {
        G.stats.kills++;
        if (this.kind === 'cop') {
          G.stats.copsKilled++;
          G.police.crime('killcop', this.x, this.z);
        } else G.police.crime('kill', this.x, this.z);
      }
      if (this.kind !== 'cop' && this.money > 0 && chance(0.7)) G.pickups.dropCash(this.x, this.z, this.money);
      G.missions.onHumanKilled(this, by);
    }
  }

  /** Throw the body (car hit, explosion, punch). */
  knock(vx, vy, vz) {
    if (this.vehicle) return;
    this.state = 'ragdoll';
    this.t = 0;
    this.vx = vx; this.vy = vy; this.vz = vz;
    this.onGround = false;
    // tumble around an axis perpendicular to the throw direction
    const sp = Math.hypot(vx, vz);
    const lz = (vx * Math.sin(this.h) + vz * Math.cos(this.h)) / (sp || 1);
    this.spinVX = (lz >= 0 ? -1 : 1) * clamp(sp * 0.9, 2, 12);
    this.spinVZ = rand(-2, 2);
  }

  enterVehicle(v, side = 1) {
    this.vehicle = v;
    this.seatSide = side;
    this.state = 'drive';
    if (side === 1) v.driver = this;
    else v.passenger = this;
    this.vx = this.vz = this.vy = 0;
  }

  exitVehicle(force = false) {
    const v = this.vehicle;
    if (!v) return;
    if (v.driver === this) v.driver = null;
    if (v.passenger === this) v.passenger = null;
    const d = v.doorPos(this.seatSide);
    let x = d.x, z = d.z;
    const res = G.physics.resolveCircle(x, z, this.radius, v.y);
    x = res.x; z = res.z;
    this.x = x; this.z = z;
    this.y = Math.max(v.y, G.physics.groundHeight(x, z));
    this.h = v.h;
    this.vehicle = null;
    this.state = this.alive ? 'normal' : 'dead';
    if (!this.alive) this.state = 'ragdoll';
    if (force && v.speed > 6 && this.alive) this.knock(v.vx * 0.7, 2, v.vz * 0.7);
    v.throttle = 0;
    v.handbrake = !force;
  }

  update(dt) {
    if (this.removed) return;
    if (this.godT > 0) this.godT -= dt;
    this.hitT = Math.max(0, this.hitT - dt);
    this.punchT = Math.max(0, this.punchT - dt);
    if (this.state === 'drive') {
      const v = this.vehicle;
      if (!v) { this.state = 'normal'; return; }
      const s = v.seatPos(this.seatSide);
      this.x = s.x; this.z = s.z; this.y = v.y; this.h = v.h;
      return;
    }
    const P = G.physics;
    if (this.state === 'ragdoll') {
      this.t += dt;
      this.vy -= 20 * dt;
      this.x += this.vx * dt; this.z += this.vz * dt; this.y += this.vy * dt;
      this.spinX += this.spinVX * dt;
      this.spinZ += this.spinVZ * dt;
      const g = P.groundHeight(this.x, this.z);
      if (this.y <= g) {
        this.y = g;
        if (this.vy < -6) this.vy = -this.vy * 0.25;
        else this.vy = 0;
        this.vx *= 1 - 4 * dt; this.vz *= 1 - 4 * dt;
        this.spinVX *= 1 - 6 * dt; this.spinVZ *= 1 - 6 * dt;
        if (this.t > 1.0 && Math.hypot(this.vx, this.vz) < 0.6) {
          // settle onto the back or the front, whichever is nearer
          this.fallFrom = this.spinX;
          this.fallTarget = Math.round((this.spinX + Math.PI / 2) / Math.PI) * Math.PI - Math.PI / 2;
          if (this.alive) { this.state = 'getup'; this.t = 0; }
          else { this.state = 'dead'; this.t = 0; this.deadT = 0; }
        }
      }
      const res = P.resolveCircle(this.x, this.z, this.radius, this.y);
      if (res.hit) {
        this.x = res.x; this.z = res.z;
        const vn = this.vx * res.nx + this.vz * res.nz;
        if (vn < 0) { this.vx -= 1.4 * vn * res.nx; this.vz -= 1.4 * vn * res.nz; }
      }
      const depth = WATER_LEVEL - g;
      if (depth > 1.1 && this.y < WATER_LEVEL) {
        this.y = WATER_LEVEL - 1.2;
        this.vx *= 0.9; this.vz *= 0.9;
        if (this.alive) { this.state = 'normal'; }
        else this.state = 'dead';
      }
      return;
    }
    if (this.state === 'dead') {
      this.deadT += dt;
      const g = P.groundHeight(this.x, this.z);
      if (WATER_LEVEL - g > 1.1) this.y = WATER_LEVEL - 0.9 - Math.min(2, this.deadT * 0.2);
      return;
    }
    if (this.state === 'getup') {
      this.t += dt;
      this.vx *= 0.8; this.vz *= 0.8;
      if (this.t > 0.75) { this.state = 'normal'; this.t = 0; }
      return;
    }

    // normal locomotion
    const g = P.groundHeight(this.x, this.z);
    const depth = WATER_LEVEL - g;
    this.inWater = depth > 1.1 && this.y < WATER_LEVEL - 0.6;
    let maxSp = this.moveSpeed;
    if (this.inWater) maxSp = Math.min(maxSp, 2.2);
    const dvx = this.moveX * maxSp, dvz = this.moveZ * maxSp;
    const acc = this.onGround || this.inWater ? 11 : 2.5;
    const k = Math.min(1, acc * dt);
    this.vx += (dvx - this.vx) * k;
    this.vz += (dvz - this.vz) * k;

    const sp = Math.hypot(this.vx, this.vz);
    if (this.faceH !== null && this.faceH !== undefined) {
      this.h = approachAngle(this.h, this.faceH, 14 * dt);
    } else if (sp > 0.3) {
      this.h = approachAngle(this.h, Math.atan2(this.vx, this.vz), 10 * dt);
    }

    if (this.wantJump && this.onGround && !this.inWater) {
      this.vy = 5.4;
      this.onGround = false;
    }
    this.wantJump = false;

    this.x += this.vx * dt;
    this.z += this.vz * dt;

    if (this.inWater) {
      this.vy = 0;
      this.y = lerp(this.y, WATER_LEVEL - 1.25, damp(5, dt));
      this.onGround = false;
      const gg = P.groundHeight(this.x, this.z);
      if (WATER_LEVEL - gg < 1.0) { this.y = Math.max(this.y, gg); this.inWater = false; this.onGround = true; }
    } else {
      this.vy -= 18 * dt;
      this.y += this.vy * dt;
      const g2 = P.groundHeight(this.x, this.z);
      if (this.onGround && g2 < this.y && g2 > this.y - 0.5 && this.vy <= 0) {
        this.y = g2; this.vy = 0;
      } else if (this.y <= g2) {
        if (this.vy < -14) this.damage((-this.vy - 14) * 8, null, 'fall');
        this.y = g2; this.vy = 0; this.onGround = true;
      } else if (this.y > g2 + 0.05) {
        this.onGround = false;
      }
      if (WATER_LEVEL - g2 > 1.1 && this.y < WATER_LEVEL - 0.5) {
        this.inWater = true;
        G.fx.splash(this.x, WATER_LEVEL, this.z, 1);
      }
    }

    const res = P.resolveCircle(this.x, this.z, this.radius, this.y);
    if (res.hit) {
      this.x = res.x; this.z = res.z;
      const vn = this.vx * res.nx + this.vz * res.nz;
      if (vn < 0) { this.vx -= vn * res.nx; this.vz -= vn * res.nz; }
      this.blocked = (this.blocked || 0) + dt;
    } else this.blocked = 0;

    // animation
    const spd = Math.hypot(this.vx, this.vz);
    this.walkAmt = lerp(this.walkAmt, Math.min(1, spd / 2.0), damp(8, dt));
    this.phase += dt * (spd < 0.2 ? 0 : 2.2 + spd * 1.05);
    this.running = spd > 4;
  }
}

/** Push overlapping people apart (cheap O(n^2) over the few nearby). */
export function separateHumans() {
  const hs = G.humans;
  for (let i = 0; i < hs.length; i++) {
    const a = hs[i];
    if (a.removed || a.vehicle || a.state === 'dead') continue;
    for (let j = i + 1; j < hs.length; j++) {
      const b = hs[j];
      if (b.removed || b.vehicle || b.state === 'dead') continue;
      const dx = a.x - b.x, dz = a.z - b.z;
      const rr = a.radius + b.radius;
      const d2 = dx * dx + dz * dz;
      if (d2 >= rr * rr || Math.abs(a.y - b.y) > 1.5) continue;
      const d = Math.sqrt(d2) || 0.01;
      const pen = (rr - d) * 0.5;
      const nx = dx / d, nz = dz / d;
      a.x += nx * pen; a.z += nz * pen;
      b.x -= nx * pen; b.z -= nz * pen;
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Rendering: one InstancedMesh per body part, matrices composed per person each frame.
// ---------------------------------------------------------------------------------------------
const MAXH = 140;
const m0 = new THREE.Matrix4(), mT = new THREE.Matrix4(), mA = new THREE.Matrix4(), mB = new THREE.Matrix4();
const tmp = new THREE.Matrix4();
const q = new THREE.Quaternion(), e = new THREE.Euler(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3();
const GUN_COL = new THREE.Color(1, 1, 1);
const TWO_HANDED = { smg: true, shotgun: true, rifle: true };

function rotXYZ(x, y, z, order = 'XYZ') {
  e.set(x, y, z, order);
  return tmp.makeRotationFromEuler(e);
}

export class HumanRenderer {
  constructor(scene) {
    const parts = buildHumanParts();
    this.mat = makePaintMaterial();
    const mk = (geo, n) => {
      const m = new THREE.InstancedMesh(geo, this.mat, n);
      m.count = 0;
      m.castShadow = true;
      m.frustumCulled = false;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.setColorAt(0, new THREE.Color(1, 1, 1));
      scene.add(m);
      return m;
    };
    this.pelvis = mk(parts.pelvis, MAXH);
    this.torso = mk(parts.torso, MAXH);
    this.head = mk(parts.head, MAXH);
    this.hair = mk(parts.hair, MAXH);
    this.arm = mk(parts.arm, MAXH * 2);
    this.leg = mk(parts.leg, MAXH * 2);
    this.gun = mk(parts.gun, MAXH);
  }

  update(humans, camPos) {
    let n = 0, na = 0, nl = 0, ng = 0;
    for (const h of humans) {
      if (h.removed || h.hidden) continue;
      const dx = h.x - camPos.x, dz = h.z - camPos.z;
      const d2 = dx * dx + dz * dz;
      if (d2 > 170 * 170) continue;
      if (h.vehicle && d2 > 50 * 50) continue;
      if (n >= MAXH) break;
      this.pose(h);
      // root
      const sc = h.scale;
      m0.copy(this.root);
      // pelvis
      mT.copy(m0).multiply(this.pelvisLocal);
      this.pelvis.setMatrixAt(n, mT);
      this.pelvis.setColorAt(n, h.colors.pants);
      // torso
      const torsoM = mA.copy(m0).multiply(this.torsoLocal);
      this.torso.setMatrixAt(n, torsoM);
      this.torso.setColorAt(n, h.colors.shirt);
      // head
      mT.copy(torsoM).multiply(this.headLocal);
      this.head.setMatrixAt(n, mT);
      this.head.setColorAt(n, h.colors.skin);
      if (!h.bald || h.kind === 'cop') {
        this.hair.setMatrixAt(n, mT);
        this.hair.setColorAt(n, h.colors.hair);
      } else {
        tmp.makeScale(0, 0, 0);
        this.hair.setMatrixAt(n, tmp);
      }
      // arms
      mT.copy(torsoM).multiply(this.armL);
      this.arm.setMatrixAt(na, mT);
      this.arm.setColorAt(na++, h.colors.skin);
      const rightArm = mB.copy(torsoM).multiply(this.armR);
      this.arm.setMatrixAt(na, rightArm);
      this.arm.setColorAt(na++, h.colors.skin);
      // legs
      mT.copy(m0).multiply(this.legL);
      this.leg.setMatrixAt(nl, mT);
      this.leg.setColorAt(nl++, h.colors.pants);
      mT.copy(m0).multiply(this.legR);
      this.leg.setMatrixAt(nl, mT);
      this.leg.setColorAt(nl++, h.colors.pants);
      // gun in the right hand
      if (h.weapon && h.weapon !== 'fist' && h.state !== 'drive' && h.alive && h.state === 'normal') {
        const big = TWO_HANDED[h.weapon];
        mT.copy(rightArm).multiply(tmp.makeTranslation(0, -0.66, 0.02));
        mT.multiply(rotXYZ(Math.PI / 2, 0, 0));
        if (big) mT.multiply(s3m(1.3, 1.1, 1.9));
        this.gun.setMatrixAt(ng, mT);
        this.gun.setColorAt(ng++, GUN_COL);
      }
      void sc;
      n++;
    }
    for (const m of [this.pelvis, this.torso, this.head, this.hair]) {
      m.count = n;
      m.instanceMatrix.needsUpdate = true;
      m.instanceColor.needsUpdate = true;
    }
    this.arm.count = na; this.arm.instanceMatrix.needsUpdate = true; this.arm.instanceColor.needsUpdate = true;
    this.leg.count = nl; this.leg.instanceMatrix.needsUpdate = true; this.leg.instanceColor.needsUpdate = true;
    this.gun.count = ng; this.gun.instanceMatrix.needsUpdate = true; this.gun.instanceColor.needsUpdate = true;
  }

  /** Compute root + local joint matrices for a person's current state. */
  pose(h) {
    this.root = this.root || new THREE.Matrix4();
    this.pelvisLocal = this.pelvisLocal || new THREE.Matrix4();
    this.torsoLocal = this.torsoLocal || new THREE.Matrix4();
    this.headLocal = this.headLocal || new THREE.Matrix4();
    this.armL = this.armL || new THREE.Matrix4();
    this.armR = this.armR || new THREE.Matrix4();
    this.legL = this.legL || new THREE.Matrix4();
    this.legR = this.legR || new THREE.Matrix4();

    const sc = h.scale;
    let hipY = 0.95, lean = 0, legA = 0, legB = 0;
    let armLX = 0, armRX = 0, armLZ = 0.08, armRZ = -0.08;
    let rootExtra = null, yOff = 0, headTurn = 0;
    const s = Math.sin(h.phase);
    const st = h.state;
    if (st === 'drive') {
      hipY = 0.5;
      legA = legB = -1.45;
      armLX = armRX = -1.15;
      armLZ = 0.2; armRZ = -0.2;
      yOff = h.vehicle ? h.vehicle.T.clear - 0.05 : 0;
    } else if (st === 'ragdoll' || st === 'dead' || st === 'getup') {
      let fall;
      const ft = h.fallTarget ?? -Math.PI / 2, ff = h.fallFrom ?? ft;
      if (st === 'dead') fall = lerp(ff, ft, Math.min(1, h.deadT * 5));
      else if (st === 'getup') {
        const k = clamp(h.t / 0.75, 0, 1);
        const base = lerp(ff, ft, Math.min(1, h.t * 6));
        fall = base * (1 - k * k);
      } else fall = h.spinX;
      rootExtra = rotXYZ(fall, 0, st === 'ragdoll' ? h.spinZ * 0.3 : 0).clone();
      yOff = st === 'ragdoll' ? 0.5 : 0.12 * (st === 'dead' ? 1 : 1 - h.t / 0.75);
      hipY = 0.95;
      armLX = -0.4; armRX = 0.3; armLZ = 1.1; armRZ = -1.0;
      legA = 0.25; legB = -0.2;
      if (st === 'ragdoll') { armLX = Math.sin(h.t * 13) * 1.2; armRX = Math.cos(h.t * 11) * 1.2; legA = Math.sin(h.t * 9) * 0.6; legB = -legA; }
    } else if (h.inWater) {
      rootExtra = rotXYZ(1.25, 0, 0).clone();
      yOff = 0.95;
      armLX = Math.sin(h.phase * 0.8) * 2.5; armRX = Math.sin(h.phase * 0.8 + Math.PI) * 2.5;
      legA = s * 0.4; legB = -s * 0.4;
    } else {
      const w = h.walkAmt;
      const run = h.running ? 1 : 0;
      const amp = 0.55 + run * 0.35;
      legA = s * amp * w; legB = -s * amp * w;
      armLX = -s * (0.45 + run * 0.45) * w; armRX = s * (0.45 + run * 0.45) * w;
      lean = w * (0.06 + run * 0.16);
      hipY = 0.95 + Math.abs(Math.cos(h.phase)) * 0.04 * w;
      if (!h.onGround && !h.inWater) { legA = -0.6; legB = 0.3; armLX = -2.4; armRX = -2.4; armLZ = 0.5; armRZ = -0.5; }
      // weapons / actions override arms
      if (h.handsUp > 0) {
        armLX = armRX = -Math.PI * 0.95 * h.handsUp;
        armLZ = 0.15; armRZ = -0.15;
      } else if (h.punchT > 0) {
        const p = Math.sin((1 - h.punchT / 0.35) * Math.PI);
        armRX = -Math.PI / 2 * p - 0.2;
        armRZ = -0.15;
        lean += 0.1 * p;
      } else if (h.aimT > 0 && h.weapon !== 'fist') {
        armRX = -Math.PI / 2 + 0.05;
        armRZ = 0.12;
        if (TWO_HANDED[h.weapon]) { armLX = -1.35; armLZ = -0.55; }
      }
      if (h.hitT > 0) lean -= h.hitT * 0.8;
      if (h.cower) { armLX = armRX = -2.6; armLZ = 0.6; armRZ = -0.6; lean = 0.4; hipY = 0.7; legA = -0.8; legB = -0.8; }
    }
    // root matrix
    v3.set(h.x, h.y + yOff, h.z);
    q.setFromAxisAngle(Y_AXIS, h.h);
    s3.set(sc, sc, sc);
    this.root.compose(v3, q, s3);
    if (rootExtra) this.root.multiply(rootExtra);
    this.pelvisLocal.makeTranslation(0, hipY, 0);
    this.torsoLocal.makeTranslation(0, hipY + 0.1, 0).multiply(rotXYZ(lean, 0, 0));
    this.headLocal.makeTranslation(0, 0.56, 0).multiply(rotXYZ(0, headTurn, 0));
    this.armL.makeTranslation(0.29, 0.5, 0).multiply(rotXYZ(armLX, 0, armLZ));
    this.armR.makeTranslation(-0.29, 0.5, 0).multiply(rotXYZ(armRX, 0, armRZ));
    this.legL.makeTranslation(0.1, hipY, 0).multiply(rotXYZ(legA, 0, 0));
    this.legR.makeTranslation(-0.1, hipY, 0).multiply(rotXYZ(legB, 0, 0));
  }
}
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const _s3m = new THREE.Matrix4();
function s3m(x, y, z) { return _s3m.makeScale(x, y, z); }

export function spawnHuman(kind, x, z, opts) {
  const h = new Human(kind, x, z, opts);
  G.humans.push(h);
  return h;
}

export { wrapAngle };
