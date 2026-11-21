// The one shared game object. Systems register themselves here so they can reach each other
// at runtime without import cycles.

export const G = {
  // rendering
  renderer: null,
  scene: null,
  camera: null,

  // time
  time: 0, // seconds of play since load
  dt: 1 / 60,
  hour: 17.0, // time of day, 0..24
  timeScale: 1 / 60, // game hours per real second (one game hour per minute)
  paused: true,
  state: 'title', // title | play | paused | dead | busted | map

  // world
  city: null, // citygen output
  physics: null,

  // entities
  vehicles: [],
  humans: [],
  player: null, // Human

  // systems (assigned in main.js)
  input: null,
  cam: null,
  fx: null,
  hud: null,
  audio: null,
  traffic: null,
  peds: null,
  police: null,
  missions: null,
  pickups: null,
  sky: null,
  weapons: null,
  vehicleRenderer: null,
  humanRenderer: null,

  // progress (saved)
  save: null,

  settings: {
    quality: 'medium', // low | medium | high
    sensitivity: 1.0,
    volume: 0.8,
    music: 0.6,
    vibrate: true,
    showFps: false,
  },

  stats: {
    kills: 0,
    copsKilled: 0,
    carsStolen: 0,
    carsDestroyed: 0,
    distance: 0,
    jumps: 0,
    maxWanted: 0,
  },
};

export function vibrate(ms) {
  if (!G.settings.vibrate) return;
  try {
    if (window.NT && window.NT.vibrate) window.NT.vibrate(ms);
    else if (navigator.vibrate) navigator.vibrate(ms);
  } catch (e) { /* ignore */ }
}
