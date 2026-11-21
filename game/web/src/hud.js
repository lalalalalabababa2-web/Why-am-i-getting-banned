// HTML HUD: minimap + GPS, full map with waypoints, status, messages, menus, shops.

import { G } from './state.js';
import { WEAPONS } from './weapons.js';
import { CITY, LAND, PIER, ROAD_HALF, nodeX, nodeZ, nearestNode } from './world/citygen.js';
import { route } from './ai/drive.js';
import { clamp, formatMoney, formatTime } from './util.js';
import { VTYPES } from './models.js';

const $ = (id) => document.getElementById(id);
const MAP_PAD = 120;
const MAP_X0 = LAND.minX - MAP_PAD, MAP_Z0 = LAND.minZ - MAP_PAD;
const MAP_W = LAND.maxX - LAND.minX + MAP_PAD * 2 + 140, MAP_H = LAND.maxZ - LAND.minZ + MAP_PAD * 2;
const MPX = 1.0; // pixels per metre in the pre-rendered map

export class HUD {
  constructor() {
    this.el = {};
    for (const id of ['hud', 'controls', 'minimap', 'hpbar', 'arbar', 'district', 'clock', 'money', 'wanted', 'weaponicon', 'ammo', 'objective', 'timer', 'subtitle', 'hint', 'toast', 'bigmsg', 'reticle', 'speedo', 'spd', 'carname', 'carhp', 'radio', 'fps', 'flash', 'vignette', 'footbtns', 'carbtns', 'mmN', 'mapview', 'bigmap', 'pause', 'settings', 'help', 'shop', 'title', 'pauseStats', 'shopList', 'shopTitle', 'shopMoney']) {
      this.el[id] = $(id);
    }
    this.stars = [...this.el.wanted.querySelectorAll('i')];
    this.mm = this.el.minimap.getContext('2d');
    this.subQ = [];
    this.subT = 0;
    this.hintT = 0;
    this.toastT = 0;
    this.bigT = 0;
    this.radioT = 0;
    this.textT = 0;
    this.gpsT = 0;
    this.gpsPath = null;
    this.gpsKey = '';
    this.waypoint = null;
    this.fpsAcc = 0; this.fpsN = 0;
    this.lastMoney = -1;
    this.flashV = 0;
    this.hitT = 0;
    this.menuStack = [];
    this.buildMapImage();
    this.bindMenus();
    window.__setSafeInsets = (l, t, r, b) => {
      const s = document.documentElement.style;
      s.setProperty('--safe-l', l + 'px');
      s.setProperty('--safe-t', t + 'px');
      s.setProperty('--safe-r', r + 'px');
      s.setProperty('--safe-b', b + 'px');
    };
  }

  // ------------------------------------------------------------------ map image
  buildMapImage() {
    const c = document.createElement('canvas');
    c.width = Math.ceil(MAP_W * MPX);
    c.height = Math.ceil(MAP_H * MPX);
    const g = c.getContext('2d');
    const X = (x) => (x - MAP_X0) * MPX, Z = (z) => (z - MAP_Z0) * MPX;
    g.fillStyle = '#123a58';
    g.fillRect(0, 0, c.width, c.height);
    // sand
    g.fillStyle = '#8d7a52';
    roundRect(g, X(LAND.minX), Z(LAND.minZ), (LAND.maxX - LAND.minX) * MPX, (LAND.maxZ - LAND.minZ) * MPX, LAND.r * MPX);
    g.fill();
    // city slab
    g.fillStyle = '#353a46';
    g.fillRect(X(CITY.minX), Z(CITY.minZ), (CITY.maxX - CITY.minX) * MPX, (CITY.maxZ - CITY.minZ) * MPX);
    // lots by district
    const lotCol = { R: '#3b4a3a', P: '#2f6a34', D: '#3d3d42', S: '#3a3f4a', T: '#33363f', B: '#3a3a40', M: '#373b45', O: '#45384a' };
    for (const lot of G.city.lots) {
      g.fillStyle = lotCol[lot.d] || '#373b45';
      g.fillRect(X(lot.ox0), Z(lot.oz0), (lot.ox1 - lot.ox0) * MPX, (lot.oz1 - lot.oz0) * MPX);
    }
    // buildings
    g.fillStyle = '#23262e';
    for (const b of G.city.buildings) {
      if (b.collide === false) continue;
      g.fillRect(X(b.x - b.w / 2), Z(b.z - b.d / 2), b.w * MPX, b.d * MPX);
    }
    for (const e of G.city.extras) {
      if (e.type === 'pond') {
        g.fillStyle = '#1d5a78';
        g.beginPath(); g.ellipse(X(e.x), Z(e.z), e.rx * MPX, e.rz * MPX, 0, 0, Math.PI * 2); g.fill();
      } else if (e.type === 'stadium') {
        g.fillStyle = '#5a6070';
        g.beginPath(); g.ellipse(X(e.x), Z(e.z), e.ax * MPX, e.az * MPX, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#2f6a34';
        g.beginPath(); g.ellipse(X(e.x), Z(e.z), e.ax * 0.6 * MPX, e.az * 0.6 * MPX, 0, 0, Math.PI * 2); g.fill();
      }
    }
    // roads
    g.fillStyle = '#9aa1ad';
    for (const n of G.city.nodes) {
      if (!n.nb.length) continue;
      g.fillRect(X(n.x - ROAD_HALF), Z(n.z - ROAD_HALF), ROAD_HALF * 2 * MPX, ROAD_HALF * 2 * MPX);
    }
    for (const e of G.city.edges) {
      const a = G.city.nodes[e.a], b = G.city.nodes[e.b];
      if (e.horiz) g.fillRect(X(a.x), Z(a.z - ROAD_HALF), (b.x - a.x) * MPX, ROAD_HALF * 2 * MPX);
      else g.fillRect(X(a.x - ROAD_HALF), Z(a.z), ROAD_HALF * 2 * MPX, (b.z - a.z) * MPX);
    }
    // pier
    g.fillStyle = '#7a5a3a';
    g.fillRect(X(PIER.x0), Z(PIER.z0), (PIER.x1 - PIER.x0) * MPX, (PIER.z1 - PIER.z0) * MPX);
    this.mapImg = c;
    this.mapX = X; this.mapZ = Z;
  }

  // ------------------------------------------------------------------ menus
  bindMenus() {
    const act = (root, fn) => {
      for (const b of root.querySelectorAll('[data-act]')) b.addEventListener('click', () => { G.audio.click(); fn(b.dataset.act); });
    };
    act(this.el.pause, (a) => {
      if (a === 'resume') G.resume();
      else if (a === 'map') this.openMap();
      else if (a === 'settings') this.openSettings('pause');
      else if (a === 'help') this.openHelp('pause');
      else if (a === 'save') { G.saveGame(); this.toast('GAME SAVED'); }
      else if (a === 'title') G.toTitle();
    });
    act(this.el.settings, (a) => { if (a === 'back') this.closeSub('settings'); });
    act(this.el.help, (a) => { if (a === 'back') this.closeSub('help'); });
    act(this.el.mapview, (a) => { if (a === 'closemap') this.closeMap(); });
    act(this.el.shop, (a) => { if (a === 'closeshop') this.closeShop(); });
    // settings controls
    for (const seg of this.el.settings.querySelectorAll('.seg')) {
      const key = seg.dataset.set;
      for (const s of seg.querySelectorAll('span')) {
        s.addEventListener('click', () => {
          let v = s.dataset.v;
          if (v === 'true') v = true; else if (v === 'false') v = false;
          G.settings[key] = v;
          G.applySettings();
          this.syncSettings();
          G.audio.click();
        });
      }
    }
    for (const r of this.el.settings.querySelectorAll('input[type=range]')) {
      r.addEventListener('input', () => {
        G.settings[r.dataset.set] = parseFloat(r.value);
        G.applySettings();
      });
    }
    this.el.bigmap.addEventListener('pointerdown', (e) => this.mapTap(e));
  }

  syncSettings() {
    for (const seg of this.el.settings.querySelectorAll('.seg')) {
      const v = String(G.settings[seg.dataset.set]);
      for (const s of seg.querySelectorAll('span')) s.classList.toggle('on', s.dataset.v === v);
    }
    for (const r of this.el.settings.querySelectorAll('input[type=range]')) r.value = G.settings[r.dataset.set];
  }

  show(id, on) { this.el[id].classList.toggle('hidden', !on); }

  openPause() {
    const s = G.stats;
    const story = Math.min(G.save.story || 0, 6);
    this.el.pauseStats.innerHTML = `${formatMoney(G.player.money)} · Story ${story}/6 · Shells ${(G.save.shells || []).length}/20 · Jumps ${(G.save.jumps || []).length}/6<br>Kills ${s.kills} · Cars stolen ${s.carsStolen} · Driven ${(s.distance / 1000).toFixed(1)} km`;
    this.show('pause', true);
  }

  openSettings(from) {
    this.syncSettings();
    this.settingsFrom = from;
    this.show('settings', true);
    if (from === 'pause') this.show('pause', false);
    if (from === 'title') this.show('title', false);
  }

  openHelp(from) {
    this.helpFrom = from;
    this.show('help', true);
    if (from === 'pause') this.show('pause', false);
    if (from === 'title') this.show('title', false);
  }

  closeSub(id) {
    this.show(id, false);
    const from = id === 'settings' ? this.settingsFrom : this.helpFrom;
    if (from === 'pause') this.show('pause', true);
    else if (from === 'title') this.show('title', true);
  }

  openMap() {
    G.pauseGame(true);
    this.show('pause', false);
    this.show('mapview', true);
    this.mapOpenFromPause = G.state === 'paused';
    this.drawBigMap();
  }

  closeMap() {
    this.show('mapview', false);
    G.resume();
  }

  mapTap(e) {
    const r = this.el.bigmap.getBoundingClientRect();
    const x = (e.clientX - r.left - this.bm.ox) / this.bm.s + MAP_X0;
    const z = (e.clientY - r.top - this.bm.oy) / this.bm.s + MAP_Z0;
    if (this.waypoint && Math.hypot(this.waypoint.x - x, this.waypoint.z - z) < 40) this.waypoint = null;
    else this.waypoint = { x, z };
    this.gpsKey = '';
    G.audio.click();
    this.drawBigMap();
  }

  drawBigMap() {
    const cv = this.el.bigmap;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.floor(cv.clientWidth * dpr);
    cv.height = Math.floor(cv.clientHeight * dpr);
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const W = cv.clientWidth, H = cv.clientHeight;
    const s = Math.min(W / MAP_W, H / MAP_H) * 0.98;
    const ox = (W - MAP_W * s) / 2, oy = (H - MAP_H * s) / 2;
    this.bm = { s, ox, oy };
    g.fillStyle = '#123a58';
    g.fillRect(0, 0, W, H);
    g.drawImage(this.mapImg, ox, oy, MAP_W * s, MAP_H * s);
    const P = (x, z) => [ox + (x - MAP_X0) * s, oy + (z - MAP_Z0) * s];
    // gps
    const path = this.gpsPath;
    if (path && path.length > 1) {
      g.strokeStyle = 'rgba(255,43,214,0.9)';
      g.lineWidth = 4;
      g.lineJoin = 'round';
      g.beginPath();
      path.forEach((p, i) => { const [x, y] = P(p.x, p.z); if (i) g.lineTo(x, y); else g.moveTo(x, y); });
      g.stroke();
    }
    for (const b of this.blips()) {
      const [x, y] = P(b.x, b.z);
      drawBlip(g, x, y, b, 1.4);
    }
    if (this.waypoint) {
      const [x, y] = P(this.waypoint.x, this.waypoint.z);
      drawBlip(g, x, y, { color: '#ff2bd6', icon: 'way' }, 1.6);
    }
    const pp = G.player.pos();
    const [px, py] = P(pp.x, pp.z);
    drawArrow(g, px, py, G.player.human.vehicle ? G.player.human.vehicle.h : G.player.human.h, 1.6);
    // district labels
    g.font = 'bold 12px Arial';
    g.textAlign = 'center';
    g.fillStyle = 'rgba(255,255,255,0.75)';
    const labels = [['DOWNTOWN', nodeX(8), nodeZ(2)], ['OCEAN DRIVE', nodeX(13), nodeZ(5)], ['MIDTOWN', nodeX(5), nodeZ(5)], ['PALM HEIGHTS', nodeX(3), nodeZ(8)], ['THE DOCKS', nodeX(2), nodeZ(2)], ['CORAL BEACH', CITY.maxX + 70, nodeZ(8)], ['STARLIGHT PARK', nodeX(8), nodeZ(7)]];
    for (const [t, x, z] of labels) { const [lx, ly] = P(x, z); g.fillText(t, lx, ly); }
  }

  /** All points of interest for the maps. */
  blips() {
    const out = [];
    for (const m of G.pickups.markers) {
      if (m.hidden || !m.blip) continue;
      out.push({ x: m.x, z: m.z, color: m.blip.color, icon: m.blip.icon, edge: true });
    }
    for (const h of G.humans) {
      if (h.removed || !h.alive) continue;
      if (h.blip) out.push({ x: h.x, z: h.z, color: h.blip.color, icon: 'dot', edge: true });
      else if (h.kind === 'cop' && G.police.level > 0 && !h.vehicle) out.push({ x: h.x, z: h.z, color: '#4aa3ff', icon: 'small' });
      else if (h.ai && h.ai.hostile && h.ai.target) out.push({ x: h.x, z: h.z, color: '#ff3b3b', icon: 'small' });
    }
    const flash = Math.floor(G.time * 4) % 2;
    for (const v of G.vehicles) {
      if (v.removed) continue;
      if (v.blip) out.push({ x: v.x, z: v.z, color: v.blip.color, icon: 'car', edge: true });
      else if (v.isPolice && v.siren) out.push({ x: v.x, z: v.z, color: flash ? '#ff3b3b' : '#3b6bff', icon: 'dot' });
    }
    const heli = G.police.heli;
    if (heli && heli.active && !heli.dead) out.push({ x: heli.x, z: heli.z, color: flash ? '#ff3b3b' : '#3b6bff', icon: 'heli' });
    return out;
  }

  // ------------------------------------------------------------------ shop
  openShop(kind) {
    G.pauseGame(true);
    this.shopKind = kind;
    this.show('shop', true);
    this.renderShop();
  }

  renderShop() {
    const P = G.player;
    const list = this.el.shopList;
    list.innerHTML = '';
    this.el.shopMoney.textContent = 'Cash: ' + formatMoney(P.money);
    const items = [];
    if (this.shopKind === 'guns') {
      this.el.shopTitle.textContent = 'SOLACE ARMS';
      for (const w of ['pistol', 'smg', 'shotgun', 'rifle']) {
        const W = WEAPONS[w];
        if (!P.owns(w)) items.push({ label: `${W.name} + ${W.ammoPack} rounds`, price: W.price, buy: () => P.giveWeapon(w, W.ammoPack) });
        else items.push({ label: `${W.name} ammo +${W.ammoPack} (have ${P.inv[w]})`, price: W.ammoPrice, buy: () => P.giveWeapon(w, W.ammoPack) });
      }
      items.push({ label: 'Body armor (full)', price: 250, owned: P.human.armor >= 100, buy: () => { P.human.armor = 100; } });
      items.push({ label: 'First aid (full health)', price: 100, owned: P.human.health >= P.human.maxHealth, buy: () => { P.human.health = P.human.maxHealth; } });
    } else {
      this.el.shopTitle.textContent = 'SUNSET MOTORS';
      const cars = [['suv', 3000], ['muscle', 4500], ['sports', 7500], ['super', 18000]];
      for (const [t, price] of cars) {
        items.push({ label: `${VTYPES[t].name} — delivered out front`, price, buy: () => { G.pickups.buyCar(t, 0); this.closeShop(); this.toast(`${VTYPES[t].name.toUpperCase()} IS YOURS`); } });
      }
    }
    for (const it of items) {
      const d = document.createElement('div');
      const can = P.money >= it.price && !it.owned;
      d.className = 'shopitem' + (can ? '' : it.owned ? ' owned' : ' cant');
      d.innerHTML = `<span>${it.label}</span><span class="p">${it.owned ? 'FULL' : formatMoney(it.price)}</span>`;
      d.addEventListener('click', () => {
        if (!can) { G.audio.click(); return; }
        P.addMoney(-it.price);
        it.buy();
        G.audio.cash();
        if (this.shopKind === 'guns') this.renderShop();
      });
      list.appendChild(d);
    }
  }

  closeShop() {
    this.show('shop', false);
    G.resume();
  }

  // ------------------------------------------------------------------ messages
  objective(html) { this.el.objective.innerHTML = html || ''; }
  timer(t) { this.el.timer.textContent = t || ''; }
  subtitles(lines) {
    this.subQ.push(...lines);
    if (this.subT <= 0) this.nextSub();
  }
  nextSub() {
    const l = this.subQ.shift();
    if (!l) { this.el.subtitle.innerHTML = ''; this.subT = 0; return; }
    this.el.subtitle.innerHTML = l[0];
    this.subT = l[1];
  }
  hint(text, dur = 2.5) { this.el.hint.innerHTML = text; this.hintT = dur; }
  toast(text, dur = 2) { this.el.toast.textContent = text; this.toastT = dur; }
  bigMessage(title, sub, cls = 'info', dur = 2.5) {
    const b = this.el.bigmsg;
    b.className = '';
    void b.offsetWidth;
    b.className = 'show ' + cls;
    b.querySelector('.t').textContent = title;
    b.querySelector('.s').textContent = sub || '';
    this.bigT = dur;
  }
  radio(name) { this.el.radio.textContent = name ? '♪ ' + name : ''; this.radioT = 2.5; }
  carName(name) { this.el.carname.textContent = name.toUpperCase(); }
  weaponChanged() { this.textT = 0; }
  moneyChanged(n) {
    if (n > 0) {
      this.el.money.classList.remove('flashup');
      void this.el.money.offsetWidth;
      this.el.money.classList.add('flashup');
    }
    this.textT = 0;
  }
  damageFlash(a) { this.flashV = Math.max(this.flashV, 0.25 + a * 0.35); }
  hitMarker(kill) {
    this.hitT = 0.15;
    this.el.reticle.style.borderColor = kill ? '#ffffff' : '';
  }
  fade() {
    const f = this.el.flash;
    f.style.background = '#000';
    f.style.transition = 'none';
    f.style.opacity = '1';
    requestAnimationFrame(() => {
      f.style.transition = 'opacity 0.8s';
      f.style.opacity = '0';
      setTimeout(() => { f.style.background = ''; f.style.transition = ''; }, 900);
    });
  }

  // ------------------------------------------------------------------ per frame
  update(dt) {
    const P = G.player;
    const h = P.human;
    const v = h.vehicle;
    // timers
    if (this.subT > 0) { this.subT -= dt; if (this.subT <= 0) this.nextSub(); }
    if (this.hintT > 0) { this.hintT -= dt; if (this.hintT <= 0) this.el.hint.innerHTML = ''; }
    if (this.toastT > 0) { this.toastT -= dt; if (this.toastT <= 0) this.el.toast.textContent = ''; }
    if (this.bigT > 0) { this.bigT -= dt; if (this.bigT <= 0) this.el.bigmsg.className = ''; }
    if (this.radioT > 0) { this.radioT -= dt; if (this.radioT <= 0) this.el.radio.textContent = ''; }
    this.flashV = Math.max(0, this.flashV - dt * 1.5);
    this.el.flash.style.opacity = this.flashV.toFixed(2);
    this.el.vignette.style.opacity = h.alive && h.health < 35 ? (0.5 + 0.3 * Math.sin(G.time * 6)).toFixed(2) : '0';

    // throttled text
    this.textT -= dt;
    if (this.textT <= 0) {
      this.textT = 0.15;
      this.el.hpbar.style.width = clamp(h.health / h.maxHealth * 100, 0, 100) + '%';
      this.el.arbar.style.width = clamp(h.armor, 0, 100) + '%';
      this.el.arbar.parentElement.style.opacity = h.armor > 0 ? '1' : '0.35';
      const hr = Math.floor(G.hour), mn = Math.floor((G.hour % 1) * 60);
      this.el.clock.textContent = `${hr < 10 ? '0' : ''}${hr}:${mn < 10 ? '0' : ''}${mn}`;
      if (this.lastMoney !== P.money) { this.lastMoney = P.money; this.el.money.textContent = formatMoney(P.money); }
      const W = WEAPONS[h.weapon];
      this.el.weaponicon.textContent = W.name;
      this.el.ammo.textContent = h.weapon === 'fist' ? '' : h.reloadT > 0 ? 'RELOAD' : `${h.clip}/${Math.max(0, P.inv[h.weapon] - h.clip)}`;
      const pos = P.pos();
      this.el.district.textContent = G.city.districtAt(pos.x, pos.z);
      const L = G.police.level;
      this.stars.forEach((s, i) => s.classList.toggle('on', i < L));
      this.el.wanted.classList.toggle('flash', L > 0 && !G.police.seen);
      this.el.wanted.style.visibility = L > 0 ? 'visible' : 'hidden';
      // buttons
      this.show('footbtns', !v);
      this.show('carbtns', !!v);
      const enterBtn = this.el.footbtns.querySelector('.enter');
      enterBtn.classList.toggle('glow', !!P.nearCar && !v);
      // speedo
      this.el.speedo.classList.toggle('show', !!v);
      if (v) {
        this.el.spd.textContent = Math.round(v.speed * 3.6);
        this.el.carhp.style.width = clamp(v.health / v.maxHealth * 100, 0, 100) + '%';
      }
      // context hints
      const near = G.pickups.near;
      if (near && near.d < 6 && this.hintT <= 0 && !G.missions.active) this.el.hint.innerHTML = near.m.label;
      else if (this.hintT <= 0) this.el.hint.innerHTML = '';
      if (G.settings.showFps) this.el.fps.textContent = `${Math.round(this.fps || 0)} fps · ${G.renderer.info.render.calls} dc`;
      else this.el.fps.textContent = '';
    }
    // fps
    this.fpsAcc += dt; this.fpsN++;
    if (this.fpsAcc > 0.5) { this.fps = this.fpsN / this.fpsAcc; this.fpsAcc = 0; this.fpsN = 0; }

    this.updateReticle();
    this.updateGps(dt);
    this.drawMinimap();
  }

  updateReticle() {
    const P = G.player;
    const r = this.el.reticle;
    const t = P.target;
    this.hitT = Math.max(0, this.hitT - 1 / 60);
    if (t && !t.removed && (P.aiming || P.human.aimT > 0 || P.human.vehicle)) {
      const y = t.T ? t.y + (t.T.hgt || 1) * 0.6 : t.y + 1.25;
      const s = G.cam.project(t.x, y, t.z);
      if (s) {
        r.style.display = 'block';
        r.style.left = s.x + 'px';
        r.style.top = s.y + 'px';
        r.classList.toggle('friendly', !(t.kind === 'cop' || t.kind === 'gang' || (t.ai && t.ai.hostile)));
        r.style.transform = this.hitT > 0 ? 'scale(1.35)' : '';
        return;
      }
    }
    r.style.display = 'none';
  }

  updateGps(dt) {
    this.gpsT -= dt;
    const dest = G.missions.gps || this.waypoint;
    if (!dest) { this.gpsPath = null; return; }
    if (this.waypoint && !G.missions.gps) {
      const p = G.player.pos();
      if (Math.hypot(p.x - this.waypoint.x, p.z - this.waypoint.z) < 25) { this.waypoint = null; this.toast('ARRIVED'); return; }
    }
    const key = dest.x.toFixed(0) + ',' + dest.z.toFixed(0);
    if (this.gpsT > 0 && key === this.gpsKey) return;
    this.gpsT = 1;
    this.gpsKey = key;
    const p = G.player.pos();
    const a = nearestNode(G.city, p.x, p.z), b = nearestNode(G.city, dest.x, dest.z);
    const nodes = route(G.city, a, b);
    this.gpsPath = [{ x: p.x, z: p.z }, ...nodes.map((n) => ({ x: n.x, z: n.z })), { x: dest.x, z: dest.z }];
  }

  drawMinimap() {
    const cv = this.el.minimap;
    const g = this.mm;
    const W = cv.width, H = cv.height;
    const p = G.player.pos();
    const v = G.player.human.vehicle;
    const zoom = v ? clamp(1.25 - v.speed * 0.012, 0.75, 1.25) : 1.5;
    const s = zoom; // canvas px per metre
    const rot = G.cam.yaw - Math.PI;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#123a58';
    g.fillRect(0, 0, W, H);
    g.save();
    g.translate(W / 2, H / 2);
    g.rotate(rot);
    g.scale(s, s);
    g.translate(-(p.x - MAP_X0), -(p.z - MAP_Z0));
    g.imageSmoothingEnabled = true;
    // draw only the visible window of the map image
    const R = (W / s) * 0.75;
    const sx = clamp((p.x - MAP_X0) - R, 0, this.mapImg.width), sy = clamp((p.z - MAP_Z0) - R, 0, this.mapImg.height);
    const sw = Math.min(R * 2, this.mapImg.width - sx), sh = Math.min(R * 2, this.mapImg.height - sy);
    if (sw > 0 && sh > 0) g.drawImage(this.mapImg, sx, sy, sw, sh, sx, sy, sw, sh);
    // wanted search area
    if (G.police.level > 0 && !G.police.seen) {
      g.fillStyle = 'rgba(255,40,60,0.18)';
      g.beginPath();
      g.arc(G.police.lastSeen.x - MAP_X0, G.police.lastSeen.z - MAP_Z0, G.police.searchRadius, 0, Math.PI * 2);
      g.fill();
    }
    // GPS route
    if (this.gpsPath && this.gpsPath.length > 1) {
      g.strokeStyle = G.missions.gps ? 'rgba(255,210,63,0.95)' : 'rgba(255,43,214,0.95)';
      g.lineWidth = 7 / s * 1.0;
      g.lineJoin = 'round';
      g.lineCap = 'round';
      g.beginPath();
      this.gpsPath.forEach((q, i) => { if (i) g.lineTo(q.x - MAP_X0, q.z - MAP_Z0); else g.moveTo(q.x - MAP_X0, q.z - MAP_Z0); });
      g.stroke();
    }
    g.restore();
    // blips in screen space (so they stay upright)
    const cosr = Math.cos(rot), sinr = Math.sin(rot);
    const toScreen = (x, z) => {
      const dx = (x - p.x) * s, dz = (z - p.z) * s;
      return [W / 2 + dx * cosr - dz * sinr, H / 2 + dx * sinr + dz * cosr];
    };
    const rr = W / 2 - 12;
    const list = this.blips();
    if (this.waypoint) list.push({ x: this.waypoint.x, z: this.waypoint.z, color: '#ff2bd6', icon: 'way', edge: true });
    for (const b of list) {
      let [x, y] = toScreen(b.x, b.z);
      const dx = x - W / 2, dy = y - H / 2;
      const d = Math.hypot(dx, dy);
      if (d > rr) {
        if (!b.edge) continue;
        x = W / 2 + (dx / d) * rr; y = H / 2 + (dy / d) * rr;
        drawBlip(g, x, y, b, 1.5, true);
      } else drawBlip(g, x, y, b, 1.8);
    }
    // player arrow
    const ph = v ? v.h : G.player.human.h;
    const ah = Math.atan2(Math.sin(ph) * cosr - Math.cos(ph) * sinr, -(Math.sin(ph) * sinr + Math.cos(ph) * cosr));
    drawArrowScreen(g, W / 2, H / 2, ah, 2);
    // north marker on the ring
    const [nx, ny] = toScreen(p.x, p.z - 1000);
    const nd = Math.hypot(nx - W / 2, ny - H / 2) || 1;
    const nE = this.el.mmN;
    nE.style.left = ((W / 2 + (nx - W / 2) / nd * (rr + 4)) / W * 100) + '%';
    nE.style.top = ((H / 2 + (ny - H / 2) / nd * (rr + 4)) / H * 100) + '%';
    nE.style.transform = 'translate(-50%,-50%)';
  }
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function drawBlip(g, x, y, b, k = 1, edge = false) {
  g.save();
  g.translate(x, y);
  g.scale(k, k);
  const c = b.color || '#fff';
  g.lineWidth = 1.5;
  g.strokeStyle = '#000';
  g.fillStyle = c;
  switch (b.icon) {
    case 'small':
      g.beginPath(); g.arc(0, 0, 2.6, 0, Math.PI * 2); g.fill(); g.stroke();
      break;
    case 'car':
      g.fillRect(-4, -3, 8, 6); g.strokeRect(-4, -3, 8, 6);
      break;
    case 'heli':
      g.beginPath(); g.arc(0, 0, 4, 0, Math.PI * 2); g.fill(); g.stroke();
      g.strokeStyle = c; g.beginPath(); g.moveTo(-7, -5); g.lineTo(7, 5); g.moveTo(7, -5); g.lineTo(-7, 5); g.stroke();
      break;
    case 'R': case 'D':
      g.beginPath(); g.arc(0, 0, 6.5, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = '#fff'; g.font = 'bold 9px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(b.icon, 0, 0.5);
      break;
    case 'flag':
      g.beginPath(); g.arc(0, 0, 5.5, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = '#000'; g.fillRect(-1.5, -3.5, 1.2, 7); g.fillRect(-0.5, -3.5, 4, 3);
      break;
    case 'way':
      g.beginPath(); g.moveTo(0, 6); g.lineTo(-5, -3); g.arc(0, -3, 5, Math.PI, 0); g.closePath(); g.fill(); g.stroke();
      break;
    case 'gun': case 'spray': case 'home':
      g.beginPath(); g.rect(-5, -5, 10, 10); g.fill(); g.stroke();
      g.fillStyle = '#000'; g.font = 'bold 8px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(b.icon === 'gun' ? '$' : b.icon === 'spray' ? 'S' : 'H', 0, 0.5);
      break;
    default:
      g.beginPath(); g.arc(0, 0, edge ? 4 : 4.5, 0, Math.PI * 2); g.fill(); g.stroke();
  }
  g.restore();
}

function drawArrow(g, x, y, h, k) {
  // world heading -> big-map screen (x right, z down)
  drawArrowScreen(g, x, y, Math.atan2(Math.sin(h), -Math.cos(h)), k);
}

function drawArrowScreen(g, x, y, ang, k) {
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  g.scale(k, k);
  g.fillStyle = '#ffffff';
  g.strokeStyle = '#000';
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(0, -7); g.lineTo(5, 5); g.lineTo(0, 2.5); g.lineTo(-5, 5); g.closePath();
  g.fill(); g.stroke();
  g.restore();
}

export { formatTime };
