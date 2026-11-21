// Pickups (health, armor, weapons, cash, neon shells), glowing world markers, shops & services.

import * as THREE from 'three';
import { G, vibrate } from './state.js';
import { WEAPONS } from './weapons.js';
import { rand, pick, formatMoney } from './util.js';
import { spawnVehicle } from './vehicle.js';
import { CURB } from './world/citygen.js';

const PICKUP_LOOK = {
  health: { color: 0xff3b6b, glow: [1, 0.25, 0.4] },
  armor: { color: 0x2aa8ff, glow: [0.2, 0.6, 1] },
  cash: { color: 0x7cff7c, glow: [0.4, 1, 0.4] },
  weapon: { color: 0xffd23f, glow: [1, 0.85, 0.3] },
  shell: { color: 0xff2bd6, glow: [1, 0.2, 0.9] },
};

function pickupGeometry(type) {
  switch (type) {
    case 'health': {
      const g1 = new THREE.BoxGeometry(0.75, 0.25, 0.25);
      const g2 = new THREE.BoxGeometry(0.25, 0.75, 0.25);
      return [g1, g2];
    }
    case 'armor': return [new THREE.CylinderGeometry(0.4, 0.3, 0.7, 6)];
    case 'cash': return [new THREE.BoxGeometry(0.6, 0.3, 0.35)];
    case 'weapon': return [new THREE.BoxGeometry(0.15, 0.25, 0.8), new THREE.BoxGeometry(0.12, 0.35, 0.15).translate(0, -0.2, -0.2)];
    case 'shell': return [new THREE.ConeGeometry(0.45, 0.7, 7)];
    default: return [new THREE.BoxGeometry(0.5, 0.5, 0.5)];
  }
}

export class Pickups {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    this.markers = [];
    this.arrows = [];
    this.geos = {};
    this.mats = {};
    for (const k of Object.keys(PICKUP_LOOK)) {
      this.geos[k] = pickupGeometry(k);
      this.mats[k] = new THREE.MeshBasicMaterial({ color: PICKUP_LOOK[k].color });
    }
    this.markerGeo = new THREE.CylinderGeometry(1, 1, 1, 28, 1, true);
    this.markerGeo.translate(0, 0.5, 0);
    this.arrowGeo = new THREE.ConeGeometry(0.6, 1.2, 4);
    this.arrowGeo.rotateX(Math.PI);
    this.t = 0;
    this.near = null;
    this.serviceCool = 0;
    this.placeWorldPickups();
  }

  // -------------------------------------------------- pickups
  add(type, x, z, opts = {}) {
    const y = opts.y ?? G.physics.groundHeight(x, z) + 0.9;
    const group = new THREE.Group();
    for (const g of this.geos[type]) group.add(new THREE.Mesh(g, this.mats[type]));
    group.position.set(x, y, z);
    this.scene.add(group);
    const it = { type, x, y, z, mesh: group, active: true, respawn: opts.respawn ?? 0, timer: 0, amount: opts.amount ?? 50, weapon: opts.weapon, ttl: opts.ttl ?? 0, id: opts.id };
    this.items.push(it);
    return it;
  }

  dropCash(x, z, amount) {
    this.add('cash', x + rand(-0.5, 0.5), z + rand(-0.5, 0.5), { amount, ttl: 30 });
  }

  placeWorldPickups() {
    const pl = G.city.places;
    const spots = [
      ['health', pl.hospital.x + 4, pl.hospital.z - 2],
      ['health', pl.safehouse.x - 2, pl.safehouse.z + 6],
      ['armor', pl.police.x + 6, pl.police.z - 1],
      ['weapon', pl.safehouse.x - 3, pl.safehouse.z - 8, 'pistol'],
      ['weapon', pl.docksYard.x + 10, pl.docksYard.z - 8, 'smg'],
      ['weapon', pl.stadium.x - 30, pl.stadium.z, 'shotgun'],
      ['weapon', pl.pierEnd.x - 20, 4, 'smg'],
      ['armor', pl.docksYard.x - 12, pl.docksYard.z - 10],
      ['health', pl.park.x - 20, pl.park.z],
      ['health', pl.plaza.x + 8, pl.plaza.z],
      ['weapon', pl.park.x + 30, pl.park.z - 60, 'rifle'],
      ['armor', pl.beach.x + 40, pl.beach.z - 200],
      ['health', pl.beach.x + 20, pl.beach.z + 180],
      ['weapon', pl.garage.x + 5, pl.garage.z + 2, 'pistol'],
    ];
    for (const [type, x, z, w] of spots) this.add(type, x, z, { respawn: 60, weapon: w, amount: type === 'weapon' ? (w === 'pistol' ? 36 : w === 'rifle' ? 60 : w === 'shotgun' ? 16 : 90) : 50 });
    const have = G.save.shells || [];
    G.city.collect.forEach((c, i) => {
      if (have.includes(i)) return;
      const y = Math.max(G.physics.groundHeight(c.x, c.z), CURB) + 1.1;
      this.add('shell', c.x, c.z, { y, id: i });
    });
  }

  collect(it) {
    const P = G.player;
    const h = P.human;
    switch (it.type) {
      case 'health':
        if (h.health >= h.maxHealth) return false;
        h.health = Math.min(h.maxHealth, h.health + it.amount);
        G.hud.toast('+HEALTH');
        break;
      case 'armor':
        if (h.armor >= 100) return false;
        h.armor = Math.min(100, h.armor + it.amount);
        G.hud.toast('+ARMOR');
        break;
      case 'cash':
        P.addMoney(it.amount);
        break;
      case 'weapon': {
        const w = it.weapon;
        const first = !P.owns(w);
        P.giveWeapon(w, it.amount);
        G.hud.toast(`${WEAPONS[w].name}${first ? '' : ' AMMO'} +${it.amount}`);
        break;
      }
      case 'shell': {
        const s = G.save;
        s.shells = s.shells || [];
        if (!s.shells.includes(it.id)) s.shells.push(it.id);
        const n = s.shells.length;
        P.addMoney(100);
        G.hud.bigMessage(`NEON SHELL ${n}/20`, n >= 20 ? 'All shells found! +$10,000' : 'Hidden collectible found', 'info', 2.2);
        if (n >= 20) P.addMoney(10000);
        G.saveGame();
        break;
      }
    }
    G.audio.pickup();
    vibrate(20);
    const lk = PICKUP_LOOK[it.type].glow;
    G.fx.pickupSparkle(it.x, it.y, it.z, lk[0], lk[1], lk[2]);
    return true;
  }

  // -------------------------------------------------- markers
  /** A glowing cylinder in the world. onEnter(veh) is called when the player stands/drives in it. */
  addMarker(x, z, opts = {}) {
    const color = new THREE.Color(opts.color ?? 0xff2bd6);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: color }, uTime: { value: 0 } },
      vertexShader: `varying float vY; void main(){ vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 uColor; uniform float uTime; varying float vY;
        void main(){ float a = (1.0 - vY) * (0.55 + 0.15 * sin(uTime * 4.0 + vY * 6.0)); gl_FragColor = vec4(uColor * a, 1.0); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    const r = opts.r ?? 1.6;
    const h = opts.h ?? 2.2;
    const mesh = new THREE.Mesh(this.markerGeo, mat);
    const y = opts.y ?? G.physics.groundHeight(x, z);
    mesh.position.set(x, y, z);
    mesh.scale.set(r, h, r);
    this.scene.add(mesh);
    const m = {
      x, z, y, r, mesh, color, active: true, onEnter: opts.onEnter, blip: opts.blip ?? null, label: opts.label,
      vehicleOnly: !!opts.vehicleOnly, footOnly: !!opts.footOnly, inside: false, kind: opts.kind || 'generic', hidden: false,
      route: !!opts.route,
    };
    this.markers.push(m);
    return m;
  }

  removeMarker(m) {
    if (!m) return;
    m.active = false;
    this.scene.remove(m.mesh);
    m.mesh.material.dispose();
    this.markers = this.markers.filter((x) => x !== m);
  }

  /** Bobbing arrow above an entity (mission targets). */
  addArrow(target, color = 0xff2bd6) {
    const mesh = new THREE.Mesh(this.arrowGeo, new THREE.MeshBasicMaterial({ color }));
    this.scene.add(mesh);
    const a = { target, mesh, color };
    this.arrows.push(a);
    return a;
  }

  removeArrow(a) {
    if (!a) return;
    this.scene.remove(a.mesh);
    this.arrows = this.arrows.filter((x) => x !== a);
  }

  // -------------------------------------------------- services (shops, respray, safehouse)
  setupServices() {
    const pl = G.city.places;
    this.addMarker(pl.gunshop.x, pl.gunshop.z, { color: 0xffd23f, footOnly: true, blip: { color: '#ffd23f', icon: 'gun' }, label: 'Solace Arms — guns & armor', kind: 'shop', onEnter: () => G.hud.openShop('guns') });
    this.addMarker(pl.carlot.x, pl.carlot.z, { color: 0x9dff2e, footOnly: true, blip: { color: '#9dff2e', icon: 'car' }, label: 'Sunset Motors — buy a ride', kind: 'shop', onEnter: () => G.hud.openShop('cars') });
    for (const k of ['respray1', 'respray2']) {
      this.addMarker(pl[k].x, pl[k].z, { color: 0x22f3ff, r: 3, blip: { color: '#22f3ff', icon: 'spray' }, label: 'Quick Coat respray ($100)', kind: 'respray', onEnter: (veh) => this.respray(veh) });
    }
    this.addMarker(pl.safehouse.x, pl.safehouse.z, { color: 0x7cff7c, footOnly: true, blip: { color: '#7CFF7C', icon: 'home' }, label: 'Safehouse — save & heal', kind: 'save', onEnter: () => this.safehouse() });
  }

  respray(veh) {
    const P = G.player;
    if (!veh) { G.hud.hint('Bring a car to get a fresh coat (and lose the cops).', 3); return; }
    if (this.serviceCool > 0) return;
    if (veh.isPolice) { G.hud.hint('They won\'t touch a police car.', 3); return; }
    if (P.money < 100) { G.hud.hint('Respray costs $100.', 3); return; }
    this.serviceCool = 6;
    P.addMoney(-100);
    veh.health = veh.maxHealth;
    veh.burnT = 0;
    veh.color.setHex(pick(veh.T.colors.length > 1 ? veh.T.colors : [0xff2bd6, 0x22f3ff, 0xffffff, 0x101012]));
    if (G.police.level > 0) G.police.clear(true);
    G.hud.fade();
    G.hud.bigMessage('FRESH COAT', 'Car repaired · Heat gone', 'info', 2);
    G.audio.spray();
  }

  safehouse() {
    if (this.serviceCool > 0) return;
    this.serviceCool = 8;
    const h = G.player.human;
    h.health = h.maxHealth;
    G.saveGame();
    G.hud.bigMessage('GAME SAVED', 'Health restored at the Hotel Flamingo', 'info', 2);
    G.audio.chime();
  }

  buyCar(type, price) {
    const P = G.player;
    if (P.money < price) return false;
    P.addMoney(-price);
    const pl = G.city.places.carlot;
    const v = spawnVehicle(type, pl.x, pl.z + 6, Math.PI / 2);
    v.persistent = true;
    P.lastVehicle = v;
    G.audio.chime();
    return v;
  }

  update(dt) {
    this.t += dt;
    this.serviceCool = Math.max(0, this.serviceCool - dt);
    const P = G.player;
    const h = P.human;
    const pv = h.vehicle;
    const px = pv ? pv.x : h.x, pz = pv ? pv.z : h.z, py = pv ? pv.y : h.y;
    // pickups
    for (const it of this.items) {
      if (!it.active) {
        if (it.respawn > 0) {
          it.timer -= dt;
          if (it.timer <= 0) { it.active = true; it.mesh.visible = true; }
        }
        continue;
      }
      if (it.ttl > 0) {
        it.ttl -= dt;
        if (it.ttl <= 0) { it.active = false; it.dead = true; this.scene.remove(it.mesh); continue; }
      }
      it.mesh.rotation.y = this.t * 2.2;
      it.mesh.position.y = it.y + Math.sin(this.t * 3 + it.x) * 0.15;
      const d = Math.hypot(it.x - px, it.z - pz);
      const reach = pv ? 2.6 : 1.3;
      if (d < reach && Math.abs(it.y - py - 1) < 2.2 && h.alive) {
        if (this.collect(it)) {
          it.active = false;
          it.mesh.visible = false;
          if (it.respawn > 0) it.timer = it.respawn;
          else { it.dead = true; this.scene.remove(it.mesh); }
        }
      }
    }
    this.items = this.items.filter((it) => !it.dead);
    // markers
    let near = null;
    for (const m of this.markers) {
      m.mesh.material.uniforms.uTime.value = this.t;
      m.mesh.visible = !m.hidden && Math.hypot(m.x - px, m.z - pz) < 400;
      if (m.hidden || !m.onEnter) continue;
      const d = Math.hypot(m.x - px, m.z - pz);
      const inside = d < m.r + (pv ? 1.0 : 0.2) && Math.abs(py - m.y) < 3;
      if (inside && !m.inside && h.alive) {
        m.inside = true;
        if (m.vehicleOnly && !pv) G.hud.hint('You need a vehicle for this.', 2);
        else if (m.footOnly && pv) G.hud.hint('Get out of the car to go in.', 2);
        else m.onEnter(pv);
      } else if (!inside) m.inside = false;
      if (d < 30 && m.label && (!near || d < near.d)) near = { m, d };
    }
    this.near = near;
    // arrows
    for (const a of this.arrows) {
      const t = a.target;
      if (!t || t.removed) { a.mesh.visible = false; continue; }
      a.mesh.visible = true;
      const top = t.T ? t.y + t.T.hgt + 1.6 : t.y + 2.6;
      a.mesh.position.set(t.x, top + Math.sin(this.t * 4) * 0.25, t.z);
      a.mesh.rotation.y = this.t * 2;
    }
  }
}

export { formatMoney };
