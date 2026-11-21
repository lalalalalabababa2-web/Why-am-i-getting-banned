// Neon Tide — boot, main loop, game states.

import * as THREE from 'three';
import { G } from './state.js';
import { generateCity, nodeX, nodeZ, CITY } from './world/citygen.js';
import { buildCity, updateCityDynamic } from './world/citymesh.js';
import { Sky } from './world/sky.js';
import { Water } from './world/water.js';
import { Props, LightPools } from './world/props.js';
import { Physics } from './physics.js';
import { VehicleRenderer, collideDynamics, spawnVehicle } from './vehicle.js';
import { HumanRenderer, separateHumans } from './human.js';
import { Input } from './input.js';
import { CameraRig } from './camera.js';
import { FX } from './fx.js';
import { Weapons } from './weapons.js';
import { HUD } from './hud.js';
import { Audio } from './audio.js';
import { Traffic } from './ai/traffic.js';
import { Peds } from './ai/peds.js';
import { Police } from './ai/police.js';
import { Pickups } from './pickups.js';
import { Missions } from './missions.js';
import { Player } from './player.js';
import { readSave, writeSave, readSettings, writeSettings } from './save.js';

const STEP = 1 / 60;
const $ = (id) => document.getElementById(id);

function setLoad(p, text) {
  $('loadfill').style.width = Math.round(p * 100) + '%';
  if (text) $('loadtext').textContent = text;
  return new Promise((r) => setTimeout(r, 16));
}

function pixelRatio() {
  const dpr = window.devicePixelRatio || 1;
  const q = G.settings.quality;
  if (q === 'low') return Math.min(dpr, 0.85);
  if (q === 'high') return Math.min(dpr, 2);
  return Math.min(dpr, 1.25);
}

async function boot() {
  const saved = readSettings();
  if (saved) Object.assign(G.settings, saved);
  if (!saved) {
    // pick a sensible default for this device
    const mem = navigator.deviceMemory || 4;
    G.settings.quality = mem <= 3 ? 'low' : 'medium';
  }
  await setLoad(0.05, 'Starting engine…');
  const canvas = $('game');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: G.settings.quality === 'high', powerPreference: 'high-performance', stencil: false });
  } catch (e) {
    $('loadtext').textContent = 'WebGL is not available on this device.';
    return;
  }
  renderer.setPixelRatio(pixelRatio());
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = G.settings.quality !== 'low';
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = true;
  G.renderer = renderer;
  const scene = new THREE.Scene();
  G.scene = scene;
  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.5, 2200);
  G.camera = camera;

  await setLoad(0.12, 'Drawing the streets…');
  G.city = generateCity(1337);
  G.physics = new Physics(G.city);
  await setLoad(0.25, 'Raising the skyline…');
  G.cityMesh = buildCity(G.city, scene, G.settings.quality);
  await setLoad(0.55, 'Painting the sunset…');
  G.sky = new Sky(scene, G.settings.quality);
  G.water = new Water(scene);
  await setLoad(0.65, 'Planting palm trees…');
  G.props = new Props(scene, G.city);
  G.pools = new LightPools(scene);
  await setLoad(0.75, 'Waking up the city…');
  G.vehicleRenderer = new VehicleRenderer(scene);
  G.humanRenderer = new HumanRenderer(scene);
  G.fx = new FX(scene);
  G.weapons = new Weapons();
  G.input = new Input();
  G.input.bind();
  G.cam = new CameraRig(camera);
  G.audio = new Audio();
  G.save = readSave() || { story: 0, shells: [], jumps: [] };
  G.hud = new HUD();
  G.police = new Police(scene);
  G.player = new Player();
  spawnPlayerFromSave();
  G.traffic = new Traffic();
  G.peds = new Peds();
  G.pickups = new Pickups(scene);
  G.pickups.setupServices();
  G.missions = new Missions();
  G.missions.init();
  G.titleFocus = { x: nodeX(11), z: nodeZ(5) };
  G.saveGame = saveGame;
  G.pauseGame = pauseGame;
  G.resume = resume;
  G.toTitle = toTitle;
  G.applySettings = applySettings;

  await setLoad(0.9, 'Warming up shaders…');
  // a first frame compiles the shaders while the loading screen is still up
  G.sky.update(G.hour, { x: 0, y: 0, z: 0 }, camera.position);
  G.cam.update(0.016, G.input);
  renderer.compile(scene, camera);
  renderer.render(scene, camera);
  await setLoad(1, 'Ready');

  window.addEventListener('resize', onResize);
  window.__onAndroidBack = onBack;
  window.__onAppPause = () => {
    if (G.state === 'play') pauseGame(false);
    G.audio.suspend();
  };
  window.__onAppResume = () => { G.audio.resume(); };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) window.__onAppPause();
    else window.__onAppResume();
  });

  setupTitle();
  $('loading').classList.add('hidden');
  last = performance.now();
  requestAnimationFrame(frame);
}

function spawnPlayerFromSave() {
  const s = G.save;
  const pl = G.city.places;
  const P = G.player;
  let x = pl.safehouse.x, z = pl.safehouse.z + 2;
  if (s.pos && Number.isFinite(s.pos.x)) { x = s.pos.x; z = s.pos.z; }
  P.spawn(x, z, Math.PI);
  P.money = s.money ?? 300;
  if (s.inv) Object.assign(P.inv, s.inv);
  if (s.owned) Object.assign(P.owned, s.owned);
  P.inv.fist = Infinity;
  if (s.health) P.human.health = s.health;
  if (s.armor) P.human.armor = s.armor;
  if (s.hour !== undefined) G.hour = s.hour;
  if (s.stats) Object.assign(G.stats, s.stats);
  if (s.weapon && P.owned[s.weapon]) P.selectWeapon(s.weapon);
  // a ride waiting outside the hotel
  const car = spawnVehicle('muscle', nodeX(13) - 10.3, pl.safehouse.z + 6.5, 0, 0xff2bd6);
  car.handbrake = true;
  G.cam.yaw = Math.PI;
}

function saveGame() {
  const P = G.player;
  const h = P.human;
  const pos = P.pos();
  const s = G.save;
  s.money = P.money;
  s.inv = { ...P.inv, fist: 0 };
  s.owned = { ...P.owned };
  s.weapon = h.weapon;
  s.health = Math.max(30, h.health);
  s.armor = h.armor;
  s.hour = G.hour;
  s.stats = { ...G.stats };
  // only save a position on land and away from mission chaos
  if (P.alive() && G.physics.waterDepth(pos.x, pos.z) < 0) s.pos = { x: pos.x, z: pos.z };
  s.time = Date.now();
  writeSave(s);
}

function applySettings() {
  const r = G.renderer;
  r.setPixelRatio(pixelRatio());
  r.setSize(window.innerWidth, window.innerHeight, false);
  const shadows = G.settings.quality !== 'low';
  if (r.shadowMap.enabled !== shadows) {
    r.shadowMap.enabled = shadows;
    G.scene.traverse((o) => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m.needsUpdate = true; }); });
  }
  G.sky.setQuality(G.settings.quality);
  G.props.forceRefresh = true;
  G.audio.applyVolume();
  const scale = window.innerHeight * r.getPixelRatio() * 0.9;
  G.fx.setScale(scale);
  writeSettings(G.settings);
}

function onResize() {
  G.renderer.setPixelRatio(pixelRatio());
  G.renderer.setSize(window.innerWidth, window.innerHeight, false);
  G.camera.aspect = window.innerWidth / window.innerHeight;
  G.camera.updateProjectionMatrix();
  const scale = window.innerHeight * G.renderer.getPixelRatio() * 0.9;
  G.fx.setScale(scale);
  if (G.vehicleRenderer) G.vehicleRenderer.glow.material.uniforms.uScale.value = scale;
  if (G.props) G.props.glowMat.uniforms.uScale.value = scale;
  if (G.state === 'map' || !$('mapview').classList.contains('hidden')) G.hud.drawBigMap();
}

// ------------------------------------------------------------------------------------------
// states
// ------------------------------------------------------------------------------------------
function setupTitle() {
  G.state = 'title';
  G.paused = true;
  G.cam.mode = 'title';
  $('title').classList.remove('hidden');
  const hasSave = !!readSave();
  $('btnContinue').classList.toggle('disabled', !hasSave);
  $('btnContinue').textContent = hasSave ? 'CONTINUE' : 'CONTINUE';
  if (!setupTitle.bound) {
    setupTitle.bound = true;
    $('btnContinue').addEventListener('click', () => startGame(false));
    $('btnNew').addEventListener('click', () => {
      if (readSave() && !confirm('Start a new game? Your saved progress will be replaced when you next save.')) return;
      startGame(true);
    });
    $('btnSettings1').addEventListener('click', () => { G.audio.init(); G.hud.openSettings('title'); });
    $('btnHelp1').addEventListener('click', () => { G.audio.init(); G.hud.openHelp('title'); });
  }
  onResize();
}

function startGame(fresh) {
  G.audio.init();
  G.audio.click();
  if (fresh) resetForNewGame();
  $('title').classList.add('hidden');
  $('hud').classList.remove('hidden');
  $('controls').classList.remove('hidden');
  G.cam.mode = 'play';
  G.cam.first = true;
  G.state = 'play';
  G.paused = false;
  G.input.resetAll();
  if (fresh || !G.started) {
    G.started = true;
    if ((G.save.story || 0) === 0) {
      G.hud.subtitles([
        ['Port Solace. Neon, palm trees and easy money.', 3],
        ['Rosa at <b>Club Mirage</b> has work for you — follow the pink <b>R</b> on the map.', 4.2],
        ['Drag the left side to move, the right side to look. Car button gets you in a ride.', 4.5],
      ]);
      const cl = G.city.places.club;
      G.missions.setGps(cl.x, cl.z);
      G.started = true;
      G.firstGps = true;
    }
  }
}

function resetForNewGame() {
  G.save = { story: 0, shells: [], jumps: [] };
  const P = G.player;
  if (P.human.vehicle) P.exitVehicle();
  const pl = G.city.places;
  P.human.x = pl.safehouse.x; P.human.z = pl.safehouse.z + 2;
  P.human.y = G.physics.groundHeight(P.human.x, P.human.z);
  P.money = 300;
  P.inv = { fist: Infinity, pistol: 0, smg: 0, shotgun: 0, rifle: 0 };
  P.owned = { fist: true };
  P.selectWeapon('fist');
  P.human.health = 100;
  P.human.armor = 0;
  G.hour = 17;
  for (const k of Object.keys(G.stats)) G.stats[k] = 0;
  G.police.clear(true);
  if (G.missions.active) G.missions.fail('');
  G.missions.placeGiver();
  // restore shells
  for (const it of G.pickups.items) if (it.type === 'shell') { it.dead = true; G.scene.remove(it.mesh); }
  G.pickups.items = G.pickups.items.filter((i) => !i.dead);
  G.city.collect.forEach((c, i) => {
    const y = Math.max(G.physics.groundHeight(c.x, c.z), 0.12) + 1.1;
    G.pickups.add('shell', c.x, c.z, { y, id: i });
  });
  G.cam.yaw = Math.PI;
}

function pauseGame(silent = false) {
  if (G.state !== 'play') return;
  G.state = 'paused';
  G.paused = true;
  G.input.resetAll();
  if (!silent) G.hud.openPause();
}

function resume() {
  for (const id of ['pause', 'settings', 'help', 'mapview', 'shop']) $(id).classList.add('hidden');
  if (G.state === 'title') return;
  G.state = 'play';
  G.paused = false;
  G.input.resetAll();
  G.audio.resume();
}

function toTitle() {
  saveGame();
  for (const id of ['pause', 'settings', 'help', 'mapview', 'shop', 'hud', 'controls']) $(id).classList.add('hidden');
  setupTitle();
}

/** Android back button: returns true if handled. */
function onBack() {
  const vis = (id) => !$(id).classList.contains('hidden');
  if (vis('settings')) { G.hud.closeSub('settings'); return true; }
  if (vis('help')) { G.hud.closeSub('help'); return true; }
  if (vis('mapview')) { G.hud.closeMap(); return true; }
  if (vis('shop')) { G.hud.closeShop(); return true; }
  if (G.state === 'play') { pauseGame(); return true; }
  if (G.state === 'paused') { resume(); return true; }
  return false;
}

// ------------------------------------------------------------------------------------------
// loop
// ------------------------------------------------------------------------------------------
let last = 0;
let acc = 0;
let cleanT = 0;

function simStep(dt) {
  G.time += dt;
  const input = G.input;
  if (input.pressed('pause')) { pauseGame(); return; }
  if (input.pressed('map')) { G.hud.openMap(); return; }
  G.player.update(dt, input);
  G.missions.update(dt);
  G.traffic.update(dt);
  G.police.update(dt);
  G.peds.update(dt);
  for (const v of G.vehicles) if (!v.removed) v.update(dt);
  for (const h of G.humans) if (!h.removed) h.update(dt);
  collideDynamics();
  separateHumans();
  G.pickups.update(dt);
  G.fx.update(dt);
  G.hour = (G.hour + dt / 75) % 24;
  if (G.firstGps && G.missions.active) G.firstGps = false;
}

function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.1) dt = 0.1;
  if (dt <= 0) dt = 0.001;

  if (G.state === 'play') {
    acc += dt;
    let n = 0;
    while (acc >= STEP && n < 4) {
      simStep(STEP);
      acc -= STEP;
      n++;
      if (G.state !== 'play') break;
    }
    if (n === 4) acc = 0;
    cleanT -= dt;
    if (cleanT <= 0) {
      cleanT = 0.5;
      G.vehicles = G.vehicles.filter((v) => !v.removed);
      G.humans = G.humans.filter((h) => !h.removed || h.isPlayer);
    }
  } else if (G.state === 'title') {
    G.time += dt;
    G.hour = 18.1 + Math.sin(G.time * 0.02) * 0.4;
  }
  G.input.clearPresses && G.state !== 'play' && G.input.clearPresses();

  // camera + world visuals
  G.cam.update(dt, G.input);
  const cam = G.camera;
  const focus = G.state === 'title' ? { x: G.titleFocus.x, y: 0, z: G.titleFocus.z } : G.player.pos();
  G.sky.update(G.hour, focus, cam.position);
  G.water.update(G.time, G.sky);
  G.props.update(cam, G.sky.night);
  updatePools(cam);
  G.vehicleRenderer.update(G.vehicles, G.sky.night, cam.position);
  G.humanRenderer.update(G.humans, cam.position);
  updateCityDynamic(G.cityMesh.dynamic, dt, G.sky.night);
  G.cityMesh.neonMat.color.setScalar(0.75 + G.sky.night * 0.25);
  if (G.state !== 'title') G.hud.update(dt);
  if (G.audio.ready) G.audio.update(dt);
  G.renderer.render(G.scene, cam);
}

window.__G = G;
window.__spawnVehicle = spawnVehicle;
window.__step = (n) => { for (let i = 0; i < n; i++) { simStep(STEP); if (G.state !== 'play') break; } G.vehicles = G.vehicles.filter((v) => !v.removed); G.humans = G.humans.filter((h) => !h.removed || h.isPlayer); };
const _pv = new THREE.Vector3();
const _pm = new THREE.Matrix4();
function updatePools(cam) {
  const P = G.pools;
  const night = G.sky.night;
  P.begin();
  if (night > 0.05) {
    const cx = cam.position.x, cz = cam.position.z;
    const lamps = G.props.lamps;
    for (const i of lamps.visible) {
      const it = lamps.items[i];
      if (Math.abs(it.x - cx) > 170 || Math.abs(it.z - cz) > 170) continue;
      _pm.fromArray(lamps.mats, i * 16);
      _pv.set(0, 0, 2.4).applyMatrix4(_pm);
      const warm = (i * 7) % 5 !== 0;
      P.add(_pv.x, (it.y || 0) + 0.03, _pv.z, 13, 13, 0, 1, warm ? 0.62 : 0.85, warm ? 0.3 : 0.9);
    }
    const flash = Math.floor(G.time * 6) % 2;
    for (const v of G.vehicles) {
      if (v.removed || v.wrecked) continue;
      if (Math.abs(v.x - cx) > 140 || Math.abs(v.z - cz) > 140) continue;
      const fx = Math.sin(v.h), fz = Math.cos(v.h);
      const L = v.T.len / 2 + 6.5;
      P.add(v.x + fx * L, v.y + 0.04, v.z + fz * L, 5.5, 13, v.h, 0.85, 0.8, 0.62);
      if (v.siren) P.add(v.x, v.y + 0.04, v.z, 9, 9, 0, flash ? 1 : 0.1, 0.08, flash ? 0.1 : 1);
    }
  }
  P.end(night * 0.55);
}

boot().catch((e) => {
  console.error(e);
  const t = document.getElementById('loadtext');
  if (t) t.textContent = 'Error: ' + (e && e.message ? e.message : e);
});

export { CITY };
