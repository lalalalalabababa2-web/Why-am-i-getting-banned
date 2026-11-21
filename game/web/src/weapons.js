// Weapons: definitions, hitscan shooting (player) and probabilistic shooting (NPCs), melee, blasts.

import { G, vibrate } from './state.js';
import { rand, chance, clamp } from './util.js';

export const WEAPONS = {
  fist: { name: 'FISTS', melee: true, dmg: 14, range: 1.8, rate: 0.42, price: 0 },
  pistol: { name: 'PISTOL', dmg: 26, range: 55, rate: 0.24, clip: 12, spread: 0.025, auto: false, reload: 1.1, price: 300, ammoPack: 48, ammoPrice: 60 },
  smg: { name: 'SMG', dmg: 15, range: 45, rate: 0.085, clip: 32, spread: 0.06, auto: true, reload: 1.5, price: 1000, ammoPack: 128, ammoPrice: 120 },
  shotgun: { name: 'SHOTGUN', dmg: 15, pellets: 8, range: 24, rate: 0.85, clip: 6, spread: 0.12, auto: false, reload: 1.9, price: 1400, ammoPack: 24, ammoPrice: 100 },
  rifle: { name: 'RIFLE', dmg: 34, range: 85, rate: 0.12, clip: 30, spread: 0.022, auto: true, reload: 1.8, price: 3000, ammoPack: 120, ammoPrice: 200 },
};
export const WEAPON_ORDER = ['fist', 'pistol', 'smg', 'shotgun', 'rifle'];

export class Weapons {
  constructor() {}

  muzzleOf(shooter) {
    const fx = Math.sin(shooter.h), fz = Math.cos(shooter.h);
    // right hand is on the -x local side: right = (-fz, fx)
    const rx = -fz, rz = fx;
    const y = shooter.vehicle ? shooter.y + 1.3 : shooter.y + 1.38 * shooter.scale;
    return { x: shooter.x + fx * 0.55 + rx * 0.22, y, z: shooter.z + fz * 0.55 + rz * 0.22, fx, fz };
  }

  /**
   * Fire the shooter's current weapon.
   * opts.target: Human/Vehicle to aim at; opts.dir: {x,y,z} free aim; opts.hitChance for NPC shots.
   * Returns true if a shot was fired.
   */
  fire(shooter, opts = {}) {
    const W = WEAPONS[shooter.weapon] || WEAPONS.fist;
    if (shooter.fireT > 0 || shooter.reloadT > 0) return false;
    if (W.melee) return this.punch(shooter, opts.target);
    const isPlayer = shooter.isPlayer;
    if (isPlayer) {
      const inv = G.player.inv;
      if (inv[shooter.weapon] <= 0) {
        G.audio.click();
        shooter.fireT = 0.3;
        return false;
      }
      if (shooter.clip <= 0) {
        shooter.reloadT = W.reload;
        G.audio.reload();
        return false;
      }
      inv[shooter.weapon]--;
      shooter.clip--;
      if (shooter.clip <= 0 && inv[shooter.weapon] > 0) {
        shooter.reloadT = W.reload;
        setTimeout(() => G.audio.reload(), 150);
      }
    }
    shooter.fireT = W.rate * (isPlayer ? 1 : rand(1.6, 2.6));
    shooter.aimT = 1.2;
    const m = this.muzzleOf(shooter);
    G.fx.muzzle(m.x, m.y, m.z, m.fx, m.fz);
    G.audio.gun(shooter.weapon, m.x, m.z);
    if (isPlayer) {
      vibrate(W.auto ? 12 : 22);
      G.police.crime('shoot', shooter.x, shooter.z);
    }
    G.peds.panic(shooter.x, shooter.z, 45, shooter);

    const pellets = W.pellets || 1;
    for (let p = 0; p < pellets; p++) {
      if (opts.hitChance !== undefined && opts.target) {
        this.npcShot(shooter, opts.target, W, m, opts.hitChance);
      } else {
        this.rayShot(shooter, W, m, opts);
      }
    }
    return true;
  }

  /** Player shot: real ray against people, vehicles and buildings. */
  rayShot(shooter, W, m, opts) {
    let dx, dy, dz;
    let t = opts.target;
    if (t && t.heli) t = { x: t.heli.x, y: t.heli.y - 2, z: t.heli.z, T: { hgt: 2 } };
    if (t) {
      const ty = t.T ? t.y + t.T.hgt * 0.5 : t.state === 'dead' || t.state === 'ragdoll' ? t.y + 0.3 : t.y + 1.25 * t.scale;
      dx = t.x - m.x; dy = ty - m.y; dz = t.z - m.z;
    } else {
      const d = opts.dir;
      dx = d.x; dy = d.y; dz = d.z;
    }
    const l = Math.hypot(dx, dy, dz) || 1;
    dx /= l; dy /= l; dz /= l;
    const sp = W.spread * (opts.moving ? 1.6 : 1);
    dx += rand(-sp, sp); dy += rand(-sp, sp) * 0.6; dz += rand(-sp, sp);
    const l2 = Math.hypot(dx, dy, dz);
    dx /= l2; dy /= l2; dz /= l2;
    const R = W.range;
    let best = R, hitH = null, hitV = null;
    // people
    for (const h of G.humans) {
      if (h === shooter || h.removed || h.state === 'dead') continue;
      if (h.vehicle) continue;
      const ox = h.x - m.x, oz = h.z - m.z;
      const along = ox * dx + oz * dz;
      const hl = Math.hypot(dx, dz) || 1;
      const s = along / (hl * hl);
      if (s < 0) continue;
      const tt = s * 1; // param in units of the (unit) 3D dir projected
      const px = m.x + dx * tt, pz = m.z + dz * tt;
      const dist2 = (px - h.x) ** 2 + (pz - h.z) ** 2;
      const rad = h.state === 'ragdoll' ? 0.6 : 0.42;
      if (dist2 > rad * rad) continue;
      const py = m.y + dy * tt;
      const top = h.state === 'ragdoll' ? h.y + 0.9 : h.y + 1.85 * h.scale;
      if (py < h.y - 0.1 || py > top) continue;
      if (tt < best) { best = tt; hitH = h; hitV = null; }
    }
    // vehicles
    for (const v of G.vehicles) {
      if (v.removed) continue;
      if (shooter.vehicle === v) continue;
      const tt = rayVehicle(m.x, m.y, m.z, dx, dy, dz, v, best);
      if (tt < best) { best = tt; hitV = v; hitH = null; }
    }
    // police helicopter
    let hitHeli = null;
    const heli = G.police && G.police.heli;
    if (heli) {
      const th = heli.rayHit(m.x, m.y, m.z, dx, dy, dz);
      if (th < best) { best = th; hitHeli = heli; hitH = null; hitV = null; }
    }
    // buildings
    const ex = m.x + dx * best, ey = m.y + dy * best, ez = m.z + dz * best;
    const ts = G.physics.raycast(m.x, m.z, ex, ez, m.y, ey);
    let hx = ex, hy = ey, hz = ez;
    if (ts < 1) {
      hitH = null; hitV = null; hitHeli = null;
      hx = m.x + (ex - m.x) * ts; hy = m.y + (ey - m.y) * ts; hz = m.z + (ez - m.z) * ts;
      G.fx.dust(hx, hy, hz, 3);
      G.fx.sparks(hx, hy, hz, 3);
    } else {
      // ground hit
      const g = G.physics.groundHeight(hx, hz);
      if (!hitH && !hitV && hy < g + 0.05) {
        G.fx.dust(hx, g + 0.1, hz, 2);
      }
    }
    G.fx.tracer(m.x, m.y, m.z, hx, hy, hz);
    if (hitHeli) {
      G.fx.sparks(hx, hy, hz, 6);
      hitHeli.damage(W.dmg, shooter);
      if (shooter.isPlayer) G.hud.hitMarker(false);
    }
    if (hitH) {
      const head = hy > hitH.y + 1.55 * hitH.scale && hitH.state === 'normal';
      const dmg = W.dmg * (head ? 2.2 : 1) * (W.pellets ? clamp(1.3 - best / W.range, 0.35, 1.2) : 1);
      G.fx.blood(hx, hy, hz, head ? 10 : 5);
      hitH.damage(dmg, shooter, 'gun');
      if (W.pellets && best < 8 && hitH.state === 'normal') hitH.knock(dx * 5, 2, dz * 5);
      if (shooter.isPlayer) G.hud.hitMarker(!hitH.alive);
    } else if (hitV) {
      G.fx.sparks(hx, hy, hz, 5);
      hitV.damage(W.dmg * 0.9, shooter);
      if (hitV.driver && !hitV.driver.isPlayer && chance(0.25)) hitV.driver.damage(W.dmg * 0.6, shooter, 'gun');
      if (hitV.ai && hitV.ai.onShot) hitV.ai.onShot(shooter);
      if (shooter.isPlayer) {
        G.hud.hitMarker(false);
        if (hitV.isPolice) G.police.crime('shootcop', hitV.x, hitV.z);
      }
    }
  }

  /** NPC shot: hit or miss by chance; walls still block. */
  npcShot(shooter, target, W, m, hitChance) {
    const tv = target.vehicle;
    const ty = tv ? tv.y + 1.0 : target.y + 1.2;
    const tx = tv ? tv.x : target.x, tz = tv ? tv.z : target.z;
    const clear = G.physics.raycast(m.x, m.z, tx, tz, m.y, ty, true) >= 0.999;
    const hit = clear && chance(hitChance);
    let ex = tx, ey = ty, ez = tz;
    if (!hit) {
      ex += rand(-2.2, 2.2); ey += rand(-0.6, 1.4); ez += rand(-2.2, 2.2);
      if (!clear) {
        const t = G.physics.raycast(m.x, m.z, ex, ez, m.y, ey, true);
        ex = m.x + (ex - m.x) * t; ey = m.y + (ey - m.y) * t; ez = m.z + (ez - m.z) * t;
      }
      G.fx.dust(ex, Math.max(ey, 0.1), ez, 1);
      if (target.isPlayer && Math.hypot(ex - target.x, ez - target.z) < 3) G.audio.whiz();
    }
    G.fx.tracer(m.x, m.y, m.z, ex, ey, ez);
    if (hit) {
      if (tv) {
        tv.damage(W.dmg * (tv.driver && tv.driver.isPlayer ? 0.45 : 0.8), shooter);
        G.fx.sparks(ex, ey, ez, 4);
        if (chance(0.35)) target.damage(W.dmg * 0.35, shooter, 'gun');
      } else {
        target.damage(W.dmg * (target.isPlayer ? 0.55 : 1), shooter, 'gun');
        G.fx.blood(ex, ey, ez, 4);
      }
    }
  }

  punch(shooter, target) {
    shooter.fireT = WEAPONS.fist.rate;
    shooter.punchT = 0.35;
    G.audio.swing();
    // find someone in front within reach
    let best = null, bd = 1e9;
    const fx = Math.sin(shooter.h), fz = Math.cos(shooter.h);
    const cands = target ? [target] : G.humans;
    for (const h of cands) {
      if (h === shooter || h.removed || h.vehicle || h.state === 'dead') continue;
      const dx = h.x - shooter.x, dz = h.z - shooter.z;
      const d = Math.hypot(dx, dz);
      if (d > WEAPONS.fist.range + 0.3) continue;
      if (Math.abs(h.y - shooter.y) > 1.2) continue;
      const dot = (dx * fx + dz * fz) / (d || 1);
      if (dot < 0.35) continue;
      if (d < bd) { bd = d; best = h; }
    }
    if (best) {
      const h = best;
      setTimeout(() => {
        if (h.removed || !h.alive) return;
        G.audio.punch();
        const dmg = WEAPONS.fist.dmg * (shooter.isPlayer ? 1 : 0.6) * rand(0.85, 1.2);
        h.damage(dmg, shooter, 'melee');
        if (h.alive && (h.health < 35 || chance(0.25)) && h.state === 'normal') h.knock(fx * 4, 2.5, fz * 4);
        else if (!h.alive) h.knock(fx * 4, 2, fz * 4);
        else { h.vx += fx * 2.5; h.vz += fz * 2.5; }
        if (shooter.isPlayer) {
          vibrate(25);
          G.police.crime(h.kind === 'cop' ? 'punchcop' : 'punch', h.x, h.z);
          G.hud.hitMarker(!h.alive);
        }
        if (h.isPlayer) G.cam.shake(0.15);
      }, 120);
    }
    return true;
  }

  /** Explosion damage and knockback. */
  blast(x, y, z, radius, dmg, source, exclude) {
    for (const h of G.humans) {
      if (h.removed) continue;
      if (exclude && h.isPlayer && h.state === 'ragdoll' && h.t < 0.05) continue;
      const d = Math.hypot(h.x - x, h.z - z, (h.y + 1) - y);
      if (d > radius) continue;
      const k = 1 - d / radius;
      if (h.vehicle) {
        continue;
      }
      const dx = (h.x - x) / (d || 1), dz = (h.z - z) / (d || 1);
      h.knock(dx * 12 * k, 4 + 6 * k, dz * 12 * k);
      h.damage(dmg * k, source, 'explosion');
    }
    for (const v of G.vehicles) {
      if (v.removed || v === exclude) continue;
      const d = Math.hypot(v.x - x, v.z - z);
      if (d > radius + 1) continue;
      const k = 1 - Math.min(1, d / (radius + 1));
      const dx = (v.x - x) / (d || 1), dz = (v.z - z) / (d || 1);
      v.vx += dx * 10 * k / v.mass; v.vz += dz * 10 * k / v.mass;
      v.vy = Math.max(v.vy, 4 * k); v.onGround = false;
      v.w += rand(-1.5, 1.5) * k;
      v.damage(dmg * 4 * k, source);
    }
    G.peds.panic(x, z, 80, null);
  }
}

/** Ray vs oriented vehicle box. Returns distance along the ray or Infinity. */
function rayVehicle(ox, oy, oz, dx, dy, dz, v, maxT) {
  const fx = Math.sin(v.h), fz = Math.cos(v.h);
  // local frame: lz along forward, lx along left (fz,-fx)
  const rx = ox - v.x, rz = oz - v.z;
  const lox = rx * fz - rz * fx, loz = rx * fx + rz * fz;
  const ldx = dx * fz - dz * fx, ldz = dx * fx + dz * fz;
  const hx = v.T.wid / 2, hz = v.T.len / 2;
  let tmin = 0, tmax = maxT;
  const slab = (o, d, h) => {
    if (Math.abs(d) < 1e-8) return o >= -h && o <= h;
    let t1 = (-h - o) / d, t2 = (h - o) / d;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    return tmin <= tmax;
  };
  if (!slab(lox, ldx, hx)) return Infinity;
  if (!slab(loz, ldz, hz)) return Infinity;
  const y = oy + dy * tmin;
  if (y < v.y || y > v.y + v.T.hgt + 0.2) return Infinity;
  return tmin;
}
