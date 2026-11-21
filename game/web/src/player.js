// The player: on-foot and driving controls, auto-targeting, entering/carjacking, death and arrest.

import { G, vibrate } from './state.js';
import { spawnHuman } from './human.js';
import { WEAPONS, WEAPON_ORDER } from './weapons.js';
import { PedBrain } from './ai/peds.js';
import { clamp, wrapAngle, rand } from './util.js';

export class Player {
  constructor() {
    this.human = null;
    this.money = 0;
    this.inv = { fist: Infinity, pistol: 0, smg: 0, shotgun: 0, rifle: 0 };
    this.owned = { fist: true };
    this.lastVehicle = null;
    this.aiming = false;
    this.target = null;
    this.dead = false;
    this.busted = false;
    this.endT = 0;
    this.entering = null;
    this.arrestProgress = 0;
    this.diffEase = 0.85;
    this.raceLock = false;
    this.nearCar = null;
    this.fireHeld = false;
  }

  spawn(x, z, h) {
    this.human = spawnHuman('player', x, z, {
      skin: 0xc68642, hair: 0x1b1410, shirt: 0x22d3ee, pants: 0xf4f4f4, h, scale: 1.02, bald: false, money: 0,
    });
    this.human.persistent = true;
    this.human.health = 100;
    return this.human;
  }

  pos() {
    const h = this.human;
    const v = h.vehicle;
    return v ? { x: v.x, y: v.y, z: v.z } : { x: h.x, y: h.y, z: h.z };
  }

  alive() { return this.human && this.human.alive && !this.dead && !this.busted; }
  armed() { return this.human.weapon !== 'fist'; }
  owns(w) { return !!this.owned[w]; }

  giveWeapon(w, ammo) {
    const first = !this.owned[w];
    this.owned[w] = true;
    this.inv[w] = (this.inv[w] || 0) + ammo;
    if (first || this.human.weapon === 'fist') this.selectWeapon(w);
    else if (this.human.weapon === w && this.human.clip <= 0) this.human.clip = Math.min(this.inv[w], WEAPONS[w].clip);
  }

  selectWeapon(w) {
    const h = this.human;
    h.weapon = w;
    h.reloadT = 0;
    h.fireT = 0.15;
    h.clip = w === 'fist' ? 0 : Math.min(this.inv[w], WEAPONS[w].clip);
    G.hud.weaponChanged();
  }

  cycleWeapon() {
    const cur = WEAPON_ORDER.indexOf(this.human.weapon);
    for (let k = 1; k <= WEAPON_ORDER.length; k++) {
      const w = WEAPON_ORDER[(cur + k) % WEAPON_ORDER.length];
      if (w === 'fist' || (this.owned[w] && this.inv[w] > 0)) {
        this.selectWeapon(w);
        G.audio.click();
        return;
      }
    }
  }

  addMoney(n) {
    this.money = Math.max(0, Math.floor(this.money + n));
    G.hud.moneyChanged(n);
    if (n > 0) G.audio.cash();
  }

  // ---------------------------------------------------------------- update
  update(dt, input) {
    const h = this.human;
    if (this.dead || this.busted) {
      this.endT += dt;
      h.moveSpeed = 0;
      if (this.busted) h.handsUp = Math.min(1, h.handsUp + dt * 3);
      if (this.endT > 4.2) this.respawn();
      return;
    }
    h.handsUp = Math.max(0, h.handsUp - dt * 4);
    h.fireT = Math.max(0, h.fireT - dt);
    if (h.reloadT > 0) {
      h.reloadT -= dt;
      if (h.reloadT <= 0) {
        const W = WEAPONS[h.weapon];
        if (W && W.clip) h.clip = Math.min(this.inv[h.weapon], W.clip);
      }
    }
    h.aimT = Math.max(0, h.aimT - dt);
    this.arrestProgress = Math.max(0, (this.arrestProgress || 0) - dt * 0.5);

    if (input.pressed('weapon')) this.cycleWeapon();
    if (h.vehicle) this.drive(dt, input);
    else this.foot(dt, input);
  }

  foot(dt, input) {
    const h = this.human;
    if (h.state !== 'normal') { h.moveSpeed = 0; this.target = null; return; }
    // entering a car: walk to the door first
    if (this.entering) {
      const e = this.entering;
      e.t += dt;
      const v = e.v;
      if (v.removed || v.wrecked || (v.driver && v.driver.isPlayer)) { this.entering = null; return; }
      if (!e.door) {
        const a = v.doorPos(1), b = v.doorPos(-1);
        e.door = Math.hypot(a.x - h.x, a.z - h.z) <= Math.hypot(b.x - h.x, b.z - h.z) ? 1 : -1;
      }
      const door = v.doorPos(e.door);
      const dx = door.x - h.x, dz = door.z - h.z, d = Math.hypot(dx, dz);
      if (d < 0.9 || e.t > 1.4) {
        this.entering = null;
        this.enterVehicle(v);
      } else {
        h.moveX = dx / d; h.moveZ = dz / d; h.moveSpeed = 5.5; h.faceH = null;
      }
      if (input.move().mag > 0.6 && e.t > 0.2) this.entering = null;
      return;
    }

    const mv = input.move();
    const yaw = G.cam.yaw;
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    const rx = -fz, rz = fx;
    let mx = fx * -mv.y + rx * mv.x;
    let mz = fz * -mv.y + rz * mv.x;
    const ml = Math.hypot(mx, mz);
    if (ml > 0.001) { mx /= ml; mz /= ml; }
    h.moveX = mx; h.moveZ = mz;
    const sprint = input.isDown('sprint');
    let speed = mv.mag < 0.08 ? 0 : mv.mag < 0.6 ? 2.0 : 5.0;
    if (sprint && mv.mag > 0.1) speed = 7.6;
    if (this.aiming) speed = Math.min(speed, 3.2);
    h.moveSpeed = speed;
    if (input.pressed('jump')) h.wantJump = true;

    // shooting / punching with auto-lock
    const W = WEAPONS[h.weapon];
    const held = input.isDown('fire');
    const press = input.pressed('fire');
    const firing = W.auto ? held : press;
    if (held || press) {
      if (!this.target || !this.validTarget(this.target, W)) this.target = this.findTarget(W);
    } else if (h.aimT <= 0) this.target = null;
    this.aiming = (held || h.aimT > 0) && h.weapon !== 'fist';
    if (this.target && (held || h.aimT > 0)) {
      const t = this.target;
      h.faceH = Math.atan2(t.x - h.x, t.z - h.z);
    } else if (this.aiming) {
      h.faceH = yaw;
    } else h.faceH = null;
    if (firing) {
      h.h = h.faceH ?? h.h;
      const t = this.target;
      const dir = { x: Math.sin(h.h), y: -Math.sin(G.cam.pitch) * 0.35 + 0.02, z: Math.cos(h.h) };
      if (h.weapon === 'fist') G.weapons.fire(h, { target: t && !t.T ? t : null });
      else G.weapons.fire(h, { target: t, dir, moving: h.speed > 2.5 });
      if (h.weapon !== 'fist' && h.clip <= 0 && this.inv[h.weapon] <= 0) {
        G.hud.hint('Out of ammo — buy more at Solace Arms.', 2);
        this.selectWeapon('fist');
      }
    }

    // nearest enterable vehicle
    this.nearCar = this.findCar();
    if (input.pressed('enter') && this.nearCar) {
      this.entering = { v: this.nearCar, t: 0 };
      const v = this.nearCar;
      // carjack: the driver comes out
      if (v.driver && !v.driver.isPlayer) {
        const d = v.driver;
        d.exitVehicle();
        v.ai = null;
        if (d.kind === 'cop') { /* cops fight back */ }
        else {
          d.ai = new PedBrain(d);
          if (Math.random() < 0.25) { d.ai.mode = 'fight'; d.ai.fight = h; d.ai.t = 10; }
          else d.ai.flee(h.x, h.z, rand(8, 14));
        }
        d.knock(Math.sin(v.h + Math.PI / 2) * 3, 1.5, Math.cos(v.h + Math.PI / 2) * 3);
        G.stats.carsStolen++;
        G.police.crime(v.isPolice ? 'stealcop' : 'carjack', v.x, v.z);
        G.audio.punch();
      } else if (v.isPolice) {
        G.police.crime('stealcop', v.x, v.z);
      }
      if (v.passenger && !v.passenger.isPlayer && v.passenger.kind !== 'cop') {
        const p = v.passenger;
        p.exitVehicle();
        p.ai = new PedBrain(p);
        p.ai.flee(h.x, h.z, 10);
      }
    }
  }

  findCar() {
    const h = this.human;
    let best = null, bd = 6.0;
    for (const v of G.vehicles) {
      if (v.removed || v.wrecked || v.sinkT > 0 || v.locked) continue;
      if (v.burnT > 0) continue;
      const dx = v.x - h.x, dz = v.z - h.z;
      if (Math.abs(dx) > 8 || Math.abs(dz) > 8) continue;
      if (Math.abs(v.y - h.y) > 2) continue;
      const door = v.doorPos(1);
      const d = Math.min(Math.hypot(door.x - h.x, door.z - h.z), Math.hypot(dx, dz) - v.T.len * 0.3);
      if (d < bd) { bd = d; best = v; }
    }
    return best;
  }

  enterVehicle(v) {
    const h = this.human;
    if (v.driver && !v.driver.isPlayer) {
      const d = v.driver;
      d.exitVehicle();
      d.ai = new PedBrain(d);
      d.ai.flee(h.x, h.z, 10);
    }
    if (v.driver) return;
    h.enterVehicle(v, 1);
    v.ai = null;
    v.handbrake = false;
    v.siren = v.isPolice && G.police.level > 0 ? false : false;
    this.lastVehicle = v;
    this.target = null;
    this.aiming = false;
    G.cam.snapBehind(v.h);
    G.hud.carName(v.T.name);
    G.audio.door();
    if (v.parkSpot) { v.parkSpot.car = null; v.parkSpot = null; }
  }

  /** Put the player in a car immediately (missions). */
  enterNow(v) {
    const h = this.human;
    if (h.vehicle) h.exitVehicle();
    h.x = v.x; h.z = v.z;
    this.enterVehicle(v);
  }

  exitVehicle(force = false) {
    const h = this.human;
    const v = h.vehicle;
    if (!v) return;
    h.exitVehicle(force);
    v.throttle = 0;
    v.steer = 0;
    G.audio.door();
    G.cam.first = true;
  }

  drive(dt, input) {
    const h = this.human;
    const v = h.vehicle;
    if (this.raceLock) { v.throttle = 0; v.handbrake = true; return; }
    const mv = input.move();
    let steer = mv.x;
    // a little steering curve: precise near the centre
    steer = Math.sign(steer) * Math.pow(Math.abs(steer), 1.35);
    let thr = 0;
    if (input.isDown('gas')) thr = 1;
    else if (input.isDown('brake')) thr = -1;
    else if (mv.y < -0.35) thr = clamp(-mv.y * 1.25, 0, 1);
    else if (mv.y > 0.55) thr = -clamp(mv.y, 0, 1);
    v.throttle = thr;
    v.steer = steer;
    v.handbrake = input.isDown('handbrake') || input.isDown('jump');
    if (input.pressed('horn')) {
      G.audio.horn(v.x, v.z, true);
      G.peds.panic(v.x + Math.sin(v.h) * 8, v.z + Math.cos(v.h) * 8, 10, null);
    }
    if (input.pressed('radio')) G.audio.nextStation();
    G.stats.distance += v.speed * dt;
    // tire smoke when drifting
    if (v.onGround && (v.slip > 5 || (v.handbrake && v.speed > 8))) {
      if (Math.random() < 0.6) {
        const fx = Math.sin(v.h), fz = Math.cos(v.h);
        const back = -v.T.len * 0.35;
        G.fx.tireSmoke(v.x + fx * back + fz * 0.8, v.y + 0.2, v.z + fz * back - fx * 0.8);
        G.fx.tireSmoke(v.x + fx * back - fz * 0.8, v.y + 0.2, v.z + fz * back + fx * 0.8);
      }
    }
    // drive-by shooting
    const W = WEAPONS[h.weapon];
    const dbWeapon = h.weapon !== 'fist' ? h.weapon : (this.owned.pistol && this.inv.pistol > 0 ? 'pistol' : null);
    if (dbWeapon && (input.isDown('fire') || input.pressed('fire'))) {
      if (h.weapon !== dbWeapon) this.selectWeapon(dbWeapon);
      const t = this.findTarget(WEAPONS[dbWeapon], true);
      if (t) {
        const save = h.h;
        h.h = Math.atan2(t.x - h.x, t.z - h.z);
        G.weapons.fire(h, { target: t });
        h.h = save;
      }
    } else if (!dbWeapon && input.pressed('fire')) {
      G.hud.hint('You need a gun for drive-bys.', 2);
    }
    void W;
    if (input.pressed('enter')) {
      this.exitVehicle(v.speed > 9);
      if (v.speed > 9) vibrate(60);
    }
    if (v.burnT > 0 && !this.burnHint) {
      this.burnHint = true;
      G.hud.hint('Your car is on fire — get out!', 2.5);
    }
    if (v.burnT === 0) this.burnHint = false;
  }

  // ---------------------------------------------------------------- targeting
  validTarget(t, W) {
    if (!t || t.removed || t.heli) return false;
    const h = this.human;
    if (t.T) {
      if (t.wrecked) return false;
    } else if (!t.alive || t.vehicle) return false;
    const d = Math.hypot(t.x - h.x, t.z - h.z);
    return d < (W.melee ? 3 : W.range * 0.9);
  }

  findTarget(W, inCar = false) {
    const h = this.human;
    const range = W.melee ? 2.6 : Math.min(W.range * 0.85, inCar ? 32 : 60);
    const yaw = G.cam.yaw;
    const cx = Math.sin(yaw), cz = Math.cos(yaw);
    const cone = W.melee ? 1.2 : inCar ? 1.4 : 0.62;
    let best = null, bs = 1e9;
    const consider = (t, bonus) => {
      const dx = t.x - h.x, dz = t.z - h.z;
      const d = Math.hypot(dx, dz);
      if (d > range || d < 0.3) return;
      const ang = Math.acos(clamp((dx * cx + dz * cz) / d, -1, 1));
      if (ang > cone) return;
      const score = ang * 1.6 + d / range + bonus;
      if (score >= bs) return;
      if (!W.melee && !G.physics.los(h.x, h.z, t.x, t.z, h.y + 1.4, (t.y || 0) + 1.2)) return;
      bs = score; best = t;
    };
    for (const t of G.humans) {
      if (t === h || t.removed || !t.alive || t.vehicle) continue;
      if (Math.abs(t.y - h.y) > 6) continue;
      const hostile = t.kind === 'cop' ? (G.police.level > 0 ? -0.8 : 0.2) : t.kind === 'gang' ? (t.ai && t.ai.hostile ? -1 : 0) : 0;
      consider(t, hostile);
    }
    if (!W.melee) {
      for (const v of G.vehicles) {
        if (v.removed || v.wrecked || v === h.vehicle) continue;
        consider(v, v.isPolice && G.police.level > 0 ? -0.3 : 0.7);
      }
      const heli = G.police.heli;
      if (heli && heli.active && !heli.dead) {
        const dx = heli.x - h.x, dz = heli.z - h.z;
        const d = Math.hypot(dx, dz);
        if (d < 80 && best === null) best = { x: heli.x, y: heli.y - 1, z: heli.z, heli, T: { hgt: 2 } };
      }
    }
    return best;
  }

  // ---------------------------------------------------------------- damage / death / arrest
  onDamaged(amount, by, cause) {
    void by; void cause;
    G.hud.damageFlash(Math.min(1, amount / 30));
    vibrate(Math.min(70, 15 + amount));
  }

  onDeath() {
    if (this.dead) return;
    this.dead = true;
    this.endT = 0;
    G.cam.mode = 'dead';
    G.hud.bigMessage('WIPED OUT', 'Hospital bills: $200', 'dead', 4);
    G.audio.death();
    vibrate(200);
    if (G.missions.active) G.missions.fail('You died.');
  }

  onBusted() {
    if (this.busted || this.dead) return;
    this.busted = true;
    this.endT = 0;
    const h = this.human;
    if (h.vehicle) this.exitVehicle();
    h.moveSpeed = 0;
    G.cam.mode = 'dead';
    G.hud.bigMessage('CUFFED', 'Bail: 10% of your cash', 'fail', 4);
    G.audio.busted();
    if (G.missions.active) G.missions.fail('You were arrested.');
  }

  respawn() {
    const h = this.human;
    const wasBusted = this.busted;
    const pl = G.city.places;
    const p = wasBusted ? pl.police : pl.hospital;
    if (wasBusted) this.addMoney(-Math.floor(this.money * 0.1));
    else this.addMoney(-Math.min(200, this.money));
    if (h.vehicle) h.exitVehicle();
    h.x = p.x; h.z = p.z;
    h.y = G.physics.groundHeight(p.x, p.z);
    h.vx = h.vz = h.vy = 0;
    h.alive = true;
    h.state = 'normal';
    h.health = h.maxHealth;
    h.armor = 0;
    h.handsUp = 0;
    h.deadT = 0;
    h.godT = 3;
    this.dead = false;
    this.busted = false;
    this.target = null;
    this.entering = null;
    G.police.clear(true);
    G.cam.mode = 'play';
    G.cam.first = true;
    G.hour = (G.hour + 6) % 24;
    G.hud.fade();
  }
}

export { wrapAngle };
