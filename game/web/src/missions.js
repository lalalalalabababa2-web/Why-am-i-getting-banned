// Story missions, street races, stunt jumps. Each mission is a small staged script using a
// context that tracks everything it spawns so it can clean up on pass or fail.

import { G, vibrate } from './state.js';
import { spawnVehicle } from './vehicle.js';
import { spawnHuman } from './human.js';
import { CombatBrain, PedBrain } from './ai/peds.js';
import { LaneDriver } from './ai/traffic.js';
import { steerToward } from './ai/drive.js';
import { nearestNode, nodeX, nodeZ, LANES, ROAD_HALF } from './world/citygen.js';
import { rand, pick, clamp, formatMoney, formatTime, wrapAngle } from './util.js';

const ROSA = '<b>Rosa:</b> ';
const DEX = '<b>Dex:</b> ';

class Ctx {
  constructor(mgr, def) {
    this.mgr = mgr;
    this.def = def;
    this.stage = 0;
    this.t = 0;
    this.stageT = 0;
    this.tracked = { markers: [], arrows: [], vehicles: [], humans: [] };
    this.timerLeft = 0;
    this.onTimer = null;
    this.data = {};
    this.blips = [];
  }
  objective(text) { G.hud.objective(text); }
  say(lines) { G.hud.subtitles(lines); }
  next(stage) { this.stage = stage ?? this.stage + 1; this.stageT = 0; }
  marker(x, z, opts = {}) {
    const m = G.pickups.addMarker(x, z, { color: 0xffd23f, ...opts });
    m.blip = opts.blip ?? { color: '#ffd23f', icon: 'dot' };
    m.route = opts.route ?? true;
    this.tracked.markers.push(m);
    G.missions.setGps(x, z);
    return m;
  }
  dropMarker(m) {
    G.pickups.removeMarker(m);
    this.tracked.markers = this.tracked.markers.filter((x) => x !== m);
    G.missions.setGps(null);
  }
  arrow(ent, color) {
    const a = G.pickups.addArrow(ent, color);
    this.tracked.arrows.push(a);
    return a;
  }
  dropArrow(a) {
    G.pickups.removeArrow(a);
    this.tracked.arrows = this.tracked.arrows.filter((x) => x !== a);
  }
  blip(ent, color = '#ff3b3b') {
    ent.blip = { color };
    this.blips.push(ent);
  }
  car(type, x, z, h, color) {
    const v = spawnVehicle(type, x, z, h, color);
    v.persistent = true;
    this.tracked.vehicles.push(v);
    return v;
  }
  enemy(x, z, opts = {}) {
    const h = spawnHuman(opts.kind || 'gang', x, z, {
      shirt: opts.shirt ?? pick([0x7b2cbf, 0x5a189a, 0x9d4edd]), pants: opts.pants ?? 0x1b1b1b, hair: opts.hair ?? 0x0c0c0c,
      weapon: opts.weapon ?? 'pistol', health: opts.health ?? 90, armor: opts.armor ?? 0, money: opts.money ?? 60, scale: opts.scale,
    });
    h.persistent = true;
    h.ai = new CombatBrain(h, { hostile: opts.hostile ?? false, accuracy: opts.accuracy ?? 0.26, aggro: opts.aggro ?? 30, group: opts.group });
    if (opts.group) opts.group.push(h);
    this.tracked.humans.push(h);
    this.blip(h, '#ff3b3b');
    return h;
  }
  timer(sec, onExpire) { this.timerLeft = sec; this.onTimer = onExpire; }
  clearTimer() { this.timerLeft = 0; this.onTimer = null; G.hud.timer(''); }
  pass() { this.mgr.pass(); }
  fail(reason) { this.mgr.fail(reason); }
  cleanup(passed) {
    for (const m of this.tracked.markers) G.pickups.removeMarker(m);
    for (const a of this.tracked.arrows) G.pickups.removeArrow(a);
    for (const e of this.blips) e.blip = null;
    for (const v of this.tracked.vehicles) {
      v.persistent = false;
      v.locked = false;
      if (v.ai && v.ai.race) v.ai = null;
      if (!passed && v !== G.player.human.vehicle && v.driver && !v.driver.isPlayer) v.removedSoon = true;
    }
    for (const h of this.tracked.humans) {
      h.persistent = false;
      if (h.alive && h.ai instanceof CombatBrain && !passed) { h.ai.hostile = false; h.ai.target = null; }
    }
    G.hud.objective('');
    G.hud.timer('');
    G.missions.setGps(null);
  }
  playerIn(v) { return G.player.human.vehicle === v; }
  near(x, z, r) {
    const p = G.player.pos();
    return Math.hypot(p.x - x, p.z - z) < r;
  }
}

/** Waypoints for a race from a list of grid nodes. */
function racePoints(list) {
  return list.map(([i, j]) => ({ x: nodeX(i), z: nodeZ(j) }));
}

class RaceDriver {
  constructor(v, cps, skill) {
    this.v = v;
    this.cps = cps;
    this.i = 0;
    this.mem = {};
    this.skill = skill;
    this.frozen = true;
    this.race = true;
    this.done = false;
  }
  progress() {
    const cp = this.cps[Math.min(this.i, this.cps.length - 1)];
    return this.i * 10000 - Math.hypot(cp.x - this.v.x, cp.z - this.v.z);
  }
  update(dt) {
    const v = this.v;
    if (this.frozen || this.done || v.wrecked || !v.driver) {
      v.throttle = 0; v.handbrake = true; v.steer = 0;
      return;
    }
    const cps = this.cps;
    let cp = cps[this.i];
    let d = Math.hypot(cp.x - v.x, cp.z - v.z);
    if (d < 11) {
      this.i++;
      if (this.i >= cps.length) { this.done = true; this.finishT = G.time; return; }
      cp = cps[this.i];
      d = Math.hypot(cp.x - v.x, cp.z - v.z);
    }
    const nx = cps[Math.min(this.i + 1, cps.length - 1)];
    const prev = this.i > 0 ? cps[this.i - 1] : { x: v.x, z: v.z };
    const a1 = Math.atan2(cp.x - prev.x, cp.z - prev.z), a2 = Math.atan2(nx.x - cp.x, nx.z - cp.z);
    const turn = Math.abs(wrapAngle(a2 - a1)) > 0.5 && this.i < cps.length - 1;
    // stay on the right lane-ish line through the corner
    let tx = cp.x, tz = cp.z;
    if (turn && d < 22) {
      const k = (22 - d) / 22 * 0.6;
      tx += (nx.x - cp.x) / (Math.hypot(nx.x - cp.x, nx.z - cp.z) || 1) * 12 * k;
      tz += (nx.z - cp.z) / (Math.hypot(nx.x - cp.x, nx.z - cp.z) || 1) * 12 * k;
    }
    const sp = v.speed;
    let target = v.T.maxSpeed * 0.86 * this.skill;
    const brakeD = (sp * sp) / (2 * 14) + 10;
    if (turn && d < brakeD) target = 14;
    // rubber band against the player
    const pr = G.missions.race;
    if (pr) {
      const diff = this.progress() - pr.playerProgress();
      if (diff > 3000) target *= 0.85;
      else if (diff < -6000) target *= 1.12;
    }
    steerToward(v, tx, tz, target, dt, this.mem);
  }
}

const RACES = {
  kings: {
    title: 'STREET KINGS',
    nodes: [[13, 3], [13, 5], [13, 8], [11, 8], [9, 8], [9, 6], [9, 4], [9, 1], [11, 1], [13, 1]],
    start: { i: 13, j: 1, dirZ: 1 },
    reward: 3000,
  },
  coastal: {
    title: 'COASTAL SPRINT',
    nodes: [[14, 7], [14, 5], [14, 3], [14, 1], [14, 0], [12, 0], [10, 0], [8, 0], [6, 0]],
    start: { i: 14, j: 9, dirZ: -1 },
    reward: 1200,
  },
};

// ---------------------------------------------------------------------------------------------
// Story
// ---------------------------------------------------------------------------------------------
const STORY = [
  {
    id: 'welcome', title: 'WELCOME TO PORT SOLACE', giver: 'club', reward: 500,
    start(c) {
      c.say([[ROSA + 'So you\'re Kai. Dex says you can drive.', 3.2], [ROSA + 'Prove it. Grab any ride and get to Dex Auto in Midtown.', 3.8]]);
      c.objective('Get a vehicle (tap the car button near one).');
    },
    update(c) {
      if (c.stage === 0 && G.player.human.vehicle) {
        c.next(1);
        const g = G.city.places.garage;
        c.m = c.marker(g.x, g.z, { vehicleOnly: true, r: 3, onEnter: () => c.next(2) });
        c.objective('Drive to <b>Dex Auto</b> (yellow marker, follow the GPS).');
      }
      if (c.stage === 1 && !G.player.human.vehicle && c.stageT > 1) c.objective('Get back in a vehicle and drive to <b>Dex Auto</b>.');
      else if (c.stage === 1 && G.player.human.vehicle) c.objective('Drive to <b>Dex Auto</b> (yellow marker, follow the GPS).');
      if (c.stage === 2) {
        c.say([[DEX + 'Not bad. Rosa sent you? Come by when you want real work.', 3.5]]);
        c.pass();
      }
    },
  },
  {
    id: 'hotwheels', title: 'HOT WHEELS', giver: 'garage', reward: 1500,
    start(c) {
      c.say([[DEX + 'There\'s a Stingray parked at Solace Plaza, downtown.', 3], [DEX + 'Owner owes me. Bring it here — try not to wreck it.', 3.5]]);
      const pl = G.city.places.plaza;
      c.data.car = c.car('super', pl.x + 6, pl.z - 2, Math.PI / 2, 0xff2020);
      c.data.arrow = c.arrow(c.data.car, 0xffd23f);
      c.blip(c.data.car, '#ffd23f');
      G.missions.setGps(pl.x, pl.z);
      c.objective('Steal the <b>Stingray</b> at Solace Plaza.');
    },
    update(c) {
      const car = c.data.car;
      if (car.wrecked || car.removed || car.sinkT > 0) return c.fail('The Stingray was destroyed.');
      if (c.stage === 0 && c.playerIn(car)) {
        c.next(1);
        c.dropArrow(c.data.arrow);
        car.blip = null;
        G.police.setLevel(Math.max(1, G.police.level));
        G.hud.toast('CAR ALARM!');
        const g = G.city.places.garage;
        c.data.m = c.marker(g.x, g.z, { r: 3, onEnter: (veh) => { if (veh === car) c.data.arrived = true; } });
      }
      if (c.stage === 1) {
        if (!c.playerIn(car)) {
          c.objective('Get back in the <b>Stingray</b>.');
          if (!c.data.arrow2) c.data.arrow2 = c.arrow(car, 0xffd23f);
        } else {
          if (c.data.arrow2) { c.dropArrow(c.data.arrow2); c.data.arrow2 = null; }
          c.objective(G.police.level > 0 ? 'Lose the cops, then bring the Stingray to <b>Dex Auto</b>.' : 'Bring the Stingray to <b>Dex Auto</b>.');
        }
        if (c.data.arrived) {
          c.data.arrived = false;
          if (G.police.level > 0) G.hud.hint('Lose the cops first! Dex doesn\'t want heat at the shop.', 3);
          else {
            G.player.exitVehicle();
            car.locked = true;
            c.say([[DEX + 'Beautiful. She\'s worth a lot more than you\'d think.', 3]]);
            c.pass();
          }
        }
      }
    },
  },
  {
    id: 'delivery', title: 'SPECIAL DELIVERY', giver: 'club', reward: 2000,
    start(c) {
      c.say([[ROSA + 'A package is waiting at the docks.', 2.6], [ROSA + 'The Purple Kings think it\'s theirs. It isn\'t.', 3], [ROSA + 'Take this, you\'ll need it.', 2.5]]);
      G.player.giveWeapon('pistol', 48);
      const d = G.city.places.docksYard;
      const px = d.x, pz = d.z - 14;
      c.data.pkg = { x: px, z: pz };
      c.data.m = c.marker(px, pz, { footOnly: true, color: 0xff2bd6, onEnter: () => { c.data.got = true; } });
      const group = [];
      for (let k = 0; k < 5; k++) {
        c.enemy(px + rand(-12, 12), pz + rand(-10, 8), { weapon: k < 2 ? 'smg' : 'pistol', group, accuracy: 0.22, aggro: 28 });
      }
      c.objective('Get the <b>package</b> at the docks. Watch out for the Purple Kings.');
    },
    update(c) {
      if (c.stage === 0 && c.data.got) {
        c.next(1);
        c.dropMarker(c.data.m);
        G.hud.toast('GOT THE PACKAGE');
        const cl = G.city.places.club;
        c.data.m2 = c.marker(cl.x, cl.z, { color: 0xff2bd6, r: 2.5, onEnter: () => { c.data.done = true; } });
        c.timer(180, () => c.fail('Too slow. Rosa\'s buyer walked.'));
        c.objective('Deliver the package to <b>Club Mirage</b>.');
        for (const h of c.tracked.humans) if (h.ai) { h.ai.hostile = true; h.ai.target = G.player.human; }
      }
      if (c.stage === 1 && c.data.done) {
        c.clearTimer();
        c.say([[ROSA + 'Smooth. I think we\'re going to get along, Kai.', 3]]);
        c.pass();
      }
    },
  },
  {
    id: 'kings', title: 'STREET KINGS', giver: 'garage', reward: 3000,
    start(c) {
      c.say([[DEX + 'Ocean Drive. The Kings race there every night.', 3], [DEX + 'Win, and people start saying your name.', 3]]);
      G.missions.setupRace(c, RACES.kings, true);
    },
    update(c, dt) { G.missions.updateRace(c, dt); },
  },
  {
    id: 'viper', title: 'VIPER\'S NEST', giver: 'club', reward: 5000,
    start(c) {
      c.say([[ROSA + 'Viper runs the Purple Kings out of the stadium lot.', 3], [ROSA + 'Make it so he doesn\'t.', 2.5]]);
      const st = G.city.places.stadium;
      // keep Viper's way to his car clear of parked cars
      for (const s of G.city.parking) if (Math.hypot(s.x - st.x, s.z - st.z) < 45) s.noSpawn = true;
      for (const v of G.vehicles) if (v.parkSpot && v.parkSpot.noSpawn) G.traffic.remove(v);
      const group = [];
      c.data.boss = c.enemy(st.x, st.z - 3, { weapon: 'smg', health: 260, armor: 60, shirt: 0x2b0a3d, pants: 0x2b0a3d, hair: 0xff2bd6, group, accuracy: 0.3, money: 800, scale: 1.1 });
      c.data.boss.blip = { color: '#ff2bd6' };
      c.data.arrow = c.arrow(c.data.boss, 0xff3b3b);
      for (let k = 0; k < 5; k++) c.enemy(st.x + rand(-14, 14), st.z + rand(-6, 2), { weapon: k % 2 ? 'smg' : 'pistol', group });
      c.data.car = c.car('muscle', st.x + 10, nodeZ(1) - LANES[1], -Math.PI / 2, 0x111111);
      G.missions.setGps(st.x, st.z);
      c.objective('Take out <b>Viper</b> at the stadium.');
    },
    update(c) {
      const b = c.data.boss;
      if (!b.alive) {
        c.say([[ROSA + 'Viper\'s gone? Then the stadium lot is ours. Lay low — the cops will be all over this.', 4]]);
        G.police.setLevel(Math.max(2, G.police.level));
        return c.pass();
      }
      const p = G.player.pos();
      const d = Math.hypot(b.x - p.x, b.z - p.z);
      // Viper runs for his car once you show up
      if (c.stage === 0 && (d < 40 || b.health < b.maxHealth * 0.8)) {
        c.next(1);
        G.hud.toast('VIPER IS RUNNING!');
        b.ai = { update: () => {
          const car = c.data.car;
          if (!b.alive || b.state !== 'normal' || b.vehicle) return;
          if (car.wrecked || car.removed) { b.ai = new CombatBrain(b, { hostile: true, accuracy: 0.35 }); return; }
          const door = car.nearestDoor(b.x, b.z);
          const dx = door.x - b.x, dz = door.z - b.z, dd = Math.hypot(dx, dz);
          if (dd < 1.6) {
            if (car.driver && !car.driver.isPlayer) car.driver.exitVehicle();
            if (car.driver) { b.ai = new CombatBrain(b, { hostile: true, accuracy: 0.35 }); return; }
            b.enterVehicle(car, 1);
            const fx = Math.sin(car.h), fz = Math.cos(car.h);
            let from = nearestNode(G.city, car.x - fx * 50, car.z - fz * 50), to = nearestNode(G.city, car.x + fx * 50, car.z + fz * 50);
            if (from === to || !G.city.getEdge(from.id, to.id)) { to = nearestNode(G.city, car.x, car.z); from = G.city.nodes[to.nb[0]]; }
            const ld = new LaneDriver(car, from, to, 1);
            ld.panicT = 1e9;
            car.ai = ld;
          } else { b.moveX = dx / dd; b.moveZ = dz / dd; b.moveSpeed = 6; b.faceH = null; }
        }, onDamage: () => {} };
      }
    },
  },
  {
    id: 'bigscore', title: 'THE BIG SCORE', giver: 'club', reward: 25000,
    start(c) {
      c.say([[ROSA + 'Solace National Bank. My crew is already inside.', 3], [ROSA + 'They need someone to hold the door while the vault opens.', 3.2], [ROSA + 'Then you drive like your life depends on it. Because it does.', 3.5]]);
      G.player.giveWeapon('smg', 128);
      const b = G.city.places.bank;
      c.data.m = c.marker(b.x, b.z, { footOnly: true, color: 0xff2bd6, r: 4, onEnter: () => {} });
      c.objective('Go to the <b>Solace National Bank</b> downtown.');
      c.data.hold = 0;
    },
    update(c, dt) {
      const b = G.city.places.bank;
      if (c.stage === 0 && c.near(b.x, b.z, 4.5) && !G.player.human.vehicle) {
        c.next(1);
        G.police.setLevel(3);
        G.hud.toast('ALARM! HOLD THE DOOR');
        c.objective('Stay at the bank door while the vault opens.');
      }
      if (c.stage === 1) {
        if (c.near(b.x, b.z, 7) && !G.player.human.vehicle) c.data.hold += dt;
        else c.objective('Get back to the bank door!');
        if (c.near(b.x, b.z, 7)) c.objective(`Vault cracking… <b>${Math.min(100, Math.floor(c.data.hold / 20 * 100))}%</b> — keep the cops off.`);
        if (c.data.hold >= 20) {
          c.next(2);
          c.dropMarker(c.data.m);
          G.police.setLevel(4);
          G.hud.bigMessage('VAULT OPEN', '$25,000 in the bag — now lose the cops', 'info', 2.4);
          c.objective('Escape! <b>Lose the cops.</b>');
        }
      }
      if (c.stage === 2 && G.police.level === 0) {
        c.next(3);
        const cl = G.city.places.club;
        c.data.m2 = c.marker(cl.x, cl.z, { color: 0xff2bd6, r: 2.5, onEnter: () => { c.data.done = true; } });
        c.objective('Bring the money to <b>Club Mirage</b>.');
      }
      if (c.stage === 3 && c.data.done) {
        c.say([[ROSA + 'Twenty-five grand and not a scratch on you.', 3], [ROSA + 'Port Solace belongs to us now, Kai.', 3.5]]);
        c.pass();
      }
    },
  },
];

export class Missions {
  constructor() {
    this.active = null;
    this.giver = null;
    this.raceMarker = null;
    this.gps = null;
    this.race = null;
    this.noCops = false;
    this.cool = 0;
  }

  get storyIndex() { return G.save.story || 0; }

  init() {
    this.placeGiver();
    const st = RACES.coastal.start;
    this.raceMarker = G.pickups.addMarker(nodeX(st.i) - LANES[1], nodeZ(st.j) - 18, {
      color: 0xff8a1a, r: 3, vehicleOnly: true, blip: { color: '#ff8a1a', icon: 'flag' }, label: 'Coastal Sprint — street race',
      onEnter: () => this.startSide('coastal'),
    });
  }

  placeGiver() {
    if (this.giver) { G.pickups.removeMarker(this.giver); this.giver = null; }
    const def = STORY[this.storyIndex];
    if (!def) return;
    const p = G.city.places[def.giver];
    this.giver = G.pickups.addMarker(p.x, p.z, {
      color: 0xff2bd6, footOnly: true, r: 1.7, blip: { color: '#ff2bd6', icon: def.giver === 'club' ? 'R' : 'D' },
      label: `${def.title} — ${def.giver === 'club' ? 'Rosa at Club Mirage' : 'Dex at Dex Auto'}`,
      onEnter: () => this.start(def),
    });
  }

  start(def) {
    if (this.active || this.cool > 0) return;
    if (G.police.level > 0) { G.hud.hint('Lose the cops before starting a mission.', 3); return; }
    G.pickups.removeMarker(this.giver);
    this.giver = null;
    if (this.raceMarker) this.raceMarker.hidden = true;
    this.active = new Ctx(this, def);
    G.hud.bigMessage(def.title, def.id === 'welcome' ? 'Story mission' : 'Mission', 'info', 2.2);
    G.audio.missionStart();
    def.start(this.active);
  }

  startSide(key) {
    if (this.active || this.cool > 0) return;
    if (G.police.level > 0) { G.hud.hint('Lose the cops first.', 3); return; }
    const r = RACES[key];
    const def = {
      id: 'race-' + key, title: r.title, reward: r.reward, side: true,
      start: (c) => this.setupRace(c, r, false),
      update: (c, dt) => this.updateRace(c, dt),
    };
    if (this.giver) this.giver.hidden = true;
    this.raceMarker.hidden = true;
    this.active = new Ctx(this, def);
    G.hud.bigMessage(r.title, 'Street race', 'info', 2);
    def.start(this.active);
  }

  update(dt) {
    this.cool = Math.max(0, this.cool - dt);
    const c = this.active;
    if (!c) return;
    c.t += dt;
    c.stageT += dt;
    if (c.timerLeft > 0) {
      c.timerLeft -= dt;
      G.hud.timer(formatTime(c.timerLeft));
      if (c.timerLeft <= 0) {
        c.timerLeft = 0;
        const f = c.onTimer;
        c.onTimer = null;
        if (f) f();
      }
    }
    if (this.active === c) c.def.update(c, dt);
  }

  pass() {
    const c = this.active;
    if (!c) return;
    const def = c.def;
    c.cleanup(true);
    this.active = null;
    this.race = null;
    G.player.addMoney(def.reward);
    G.hud.bigMessage('MISSION PASSED', formatMoney(def.reward), 'pass', 3.2);
    G.audio.missionPassed();
    vibrate(80);
    if (!def.side) {
      G.save.story = this.storyIndex + 1;
      if (G.save.story >= STORY.length) {
        setTimeout(() => G.hud.bigMessage('PORT SOLACE IS YOURS', 'Story complete — the city is your playground', 'pass', 5), 3600);
      }
    } else {
      G.save.races = (G.save.races || 0) + 1;
    }
    this.cool = 3;
    this.placeGiver();
    if (this.raceMarker) this.raceMarker.hidden = false;
    G.saveGame();
  }

  fail(reason) {
    const c = this.active;
    if (!c) return;
    c.cleanup(false);
    this.active = null;
    this.race = null;
    G.hud.bigMessage('MISSION FAILED', reason || '', 'fail', 3);
    G.audio.missionFailed();
    this.cool = 4;
    this.placeGiver();
    if (this.raceMarker) this.raceMarker.hidden = false;
  }

  setGps(x, z) {
    this.gps = x === null || x === undefined ? null : { x, z };
  }

  // ------------------------------------------------------------------ races
  setupRace(c, R, story) {
    const pts = racePoints(R.nodes);
    const st = R.start;
    const sx = nodeX(st.i), sz = nodeZ(st.j);
    const dirZ = st.dirZ;
    const h = dirZ > 0 ? 0 : Math.PI;
    // grid: 2 lanes x 2 rows on the right side of the road
    const right = dirZ > 0 ? -1 : 1; // right side x offset sign when heading +z is -x
    const slots = [
      { x: sx + right * LANES[0], z: sz + dirZ * 24 }, { x: sx + right * LANES[1], z: sz + dirZ * 24 },
      { x: sx + right * LANES[0], z: sz + dirZ * 33 }, { x: sx + right * LANES[1], z: sz + dirZ * 33 },
    ];
    // clear traffic from the grid
    for (const v of G.vehicles) {
      if (v.removed || v === G.player.human.vehicle) continue;
      if (Math.hypot(v.x - sx, v.z - (sz + dirZ * 28)) < 30) G.traffic.remove(v);
    }
    const racers = [];
    const types = ['sports', 'muscle', 'super'];
    const cols = [0x22f3ff, 0xff7a1a, 0xfff23d];
    for (let k = 0; k < 3; k++) {
      const v = c.car(types[k], slots[k].x, slots[k].z, h, cols[k]);
      const d = spawnHuman('ped', v.x, v.z, { shirt: 0x111111 });
      d.persistent = true;
      c.tracked.humans.push(d);
      d.enterVehicle(v, 1);
      v.ai = new RaceDriver(v, pts, [0.9, 0.95, 0.88][k]);
      v.blip = { color: '#ff8a1a' };
      c.blips.push(v);
      racers.push(v);
    }
    // player's car: their own if they're driving, otherwise a fresh one
    let pv = G.player.human.vehicle;
    const slot = slots[3];
    if (!pv || pv.wrecked) {
      pv = c.car(story ? 'sports' : 'muscle', slot.x, slot.z, h, 0xff2bd6);
      if (G.player.human.vehicle) G.player.exitVehicle();
      G.player.enterNow(pv);
    } else {
      pv.x = slot.x; pv.z = slot.z; pv.h = h; pv.vx = pv.vz = 0; pv.w = 0;
      pv.y = G.physics.groundHeight(pv.x, pv.z);
    }
    G.cam.snapBehind(h);
    const race = {
      R, pts, racers, player: pv, i: 0, countdown: 3.5, started: false, finished: [], outT: 0, cpMarker: null,
      playerProgress: () => {
        const cp = pts[Math.min(race.i, pts.length - 1)];
        const p = G.player.pos();
        return race.i * 10000 - Math.hypot(cp.x - p.x, cp.z - p.z);
      },
    };
    this.race = race;
    c.data.race = race;
    this.placeCheckpoint(c);
    c.objective(`${R.title}: win the race. Checkpoint 1/${pts.length}`);
    G.police.noCops = false;
  }

  placeCheckpoint(c) {
    const race = this.race;
    if (race.cpMarker) c.dropMarker(race.cpMarker);
    const cp = race.pts[race.i];
    if (!cp) return;
    race.cpMarker = c.marker(cp.x, cp.z, { color: race.i === race.pts.length - 1 ? 0xffffff : 0xff8a1a, r: 7, h: 6, blip: { color: '#ff8a1a', icon: 'flag' } });
  }

  updateRace(c, dt) {
    const race = this.race;
    if (!race) return;
    const pv = race.player;
    if (!race.started) {
      race.countdown -= dt;
      pv.throttle = 0; pv.handbrake = true;
      const n = Math.ceil(race.countdown);
      if (n !== race.lastN && n >= 1 && n <= 3) {
        race.lastN = n;
        G.hud.bigMessage(String(n), '', 'info', 0.8);
        G.audio.beep(false);
      }
      if (race.countdown <= 0) {
        race.started = true;
        G.player.raceLock = false;
        for (const v of race.racers) if (v.ai) v.ai.frozen = false;
        G.hud.bigMessage('GO!', '', 'pass', 0.8);
        G.audio.beep(true);
      } else {
        G.player.raceLock = true;
        return;
      }
    }
    if (pv.wrecked || pv.removed) return c.fail('Your car is wrecked.');
    if (G.player.human.vehicle !== pv) {
      race.outT += dt;
      c.objective(`Get back in your car! ${Math.ceil(10 - race.outT)}`);
      if (race.outT > 10) return c.fail('You left the race.');
      return;
    }
    race.outT = 0;
    const cp = race.pts[race.i];
    if (Math.hypot(cp.x - pv.x, cp.z - pv.z) < 11) {
      race.i++;
      G.audio.beep(false);
      if (race.i >= race.pts.length) {
        const place = 1 + race.racers.filter((v) => v.ai && v.ai.done).length;
        if (place === 1) {
          c.say([[(c.def.side ? '' : DEX) + 'First place! The whole strip saw that.', 3]]);
          return c.pass();
        }
        return c.fail(`You finished ${place === 2 ? '2nd' : place === 3 ? '3rd' : '4th'}. Only first counts.`);
      }
      this.placeCheckpoint(c);
    }
    // position
    const pp = race.playerProgress();
    const place = 1 + race.racers.filter((v) => v.ai && v.ai.race && (v.ai.done || v.ai.progress() > pp)).length;
    c.objective(`${race.R.title} · Position <b>${place}/4</b> · Checkpoint ${race.i + 1}/${race.pts.length}`);
  }

  // ------------------------------------------------------------------ hooks
  onHumanKilled(h, by) {
    void h; void by;
  }

  onVehicleDestroyed(v) { void v; }

  /** Stunt jumps: reward a jump that started on one of the ramps. */
  onLanded(v, airTime) {
    const s = v.airStart;
    if (!s) return;
    let ramp = null;
    for (const r of G.city.ramps) {
      if (Math.hypot(r.x - s.x, r.z - s.z) < r.len) { ramp = r; break; }
    }
    if (!ramp) return;
    const dist = Math.hypot(v.x - s.x, v.z - s.z);
    if (airTime < 0.8 || dist < 12) return;
    G.save.jumps = G.save.jumps || [];
    const idx = G.city.ramps.indexOf(ramp);
    const first = !G.save.jumps.includes(idx);
    const cash = Math.floor(dist * 6 + airTime * 60) + (first ? 500 : 0);
    if (first) G.save.jumps.push(idx);
    G.stats.jumps++;
    G.player.addMoney(cash);
    G.hud.bigMessage(first ? 'UNIQUE STUNT JUMP' : 'STUNT JUMP', `${ramp.name} · ${dist.toFixed(0)}m · ${airTime.toFixed(1)}s · ${formatMoney(cash)}`, 'info', 2.4);
    G.audio.chime();
  }
}

export { STORY, PedBrain, clamp, ROAD_HALF };
