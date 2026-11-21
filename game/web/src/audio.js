// All sound is synthesized with WebAudio: engine, tyres, guns, explosions, sirens, ambience,
// UI stings, and three procedural radio stations.

import { G } from './state.js';
import { clamp, rand, pick } from './util.js';
import { CITY } from './world/citygen.js';

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

export class Audio {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.station = 0;
    this.stations = ['NEON FM 88.3 · synthwave', 'TIDE 102 · beach house', 'SOLACE LO-FI 94.7', 'RADIO OFF'];
  }

  init() {
    if (this.ctx) { if (this.ctx.state !== 'running') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC({ latencyHint: 'interactive' });
    this.ctx = ctx;
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -14;
    this.comp.ratio.value = 4;
    this.comp.connect(ctx.destination);
    this.master = ctx.createGain();
    this.master.connect(this.comp);
    this.sfx = ctx.createGain();
    this.sfx.connect(this.master);
    this.music = ctx.createGain();
    this.music.connect(this.master);
    this.noise = this.makeNoise(2);
    // reverb-ish delay for music leads
    this.delay = ctx.createDelay(1);
    this.delay.delayTime.value = 0.36;
    this.delayFb = ctx.createGain();
    this.delayFb.gain.value = 0.32;
    this.delay.connect(this.delayFb);
    this.delayFb.connect(this.delay);
    this.delayOut = ctx.createGain();
    this.delayOut.gain.value = 0.35;
    this.delay.connect(this.delayOut);
    this.delayOut.connect(this.music);
    this.setupEngine();
    this.setupLoops();
    this.radio = new Radio(this);
    this.ready = true;
    this.applyVolume();
  }

  applyVolume() {
    if (!this.ready) return;
    this.sfx.gain.value = G.settings.volume;
    this.music.gain.value = G.settings.music * 0.55;
  }

  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); }
  resume() { if (this.ctx && this.ctx.state !== 'running') this.ctx.resume(); }

  makeNoise(sec) {
    const ctx = this.ctx;
    const b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  /** Volume falloff for a world position relative to the camera. */
  att(x, z, range = 120) {
    if (x === undefined) return 1;
    const d = G.cam.distTo(x, z);
    const k = clamp(1 - d / range, 0, 1);
    return k * k;
  }

  noiseHit({ t = 0, dur = 0.2, type = 'lowpass', f = 1000, f1 = null, q = 0.7, gain = 0.5, attack = 0.002, dest = null }) {
    if (!this.ready || gain < 0.002) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + t;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const flt = ctx.createBiquadFilter();
    flt.type = type;
    flt.frequency.setValueAtTime(f, t0);
    if (f1) flt.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    flt.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(flt); flt.connect(g); g.connect(dest || this.sfx);
    src.start(t0, Math.random() * 1.5);
    src.stop(t0 + dur + 0.05);
  }

  tone({ t = 0, type = 'sine', f = 440, f1 = null, dur = 0.2, gain = 0.3, attack = 0.005, dest = null, curve = 'exp' }) {
    if (!this.ready || gain < 0.002) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + t;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t0);
    if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(10, f1), t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    if (curve === 'exp') g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    else g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest || this.sfx);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  // ---------------------------------------------------------------- one-shots
  gun(type, x, z) {
    const a = this.att(x, z, 220);
    const k = { pistol: [0.55, 2200, 0.12], smg: [0.4, 2600, 0.08], shotgun: [0.8, 1400, 0.25], rifle: [0.6, 2400, 0.14] }[type] || [0.5, 2000, 0.12];
    this.noiseHit({ dur: k[2], f: k[1], f1: 300, gain: k[0] * a, type: 'lowpass' });
    this.tone({ type: 'triangle', f: 160, f1: 40, dur: k[2] * 1.2, gain: k[0] * 0.8 * a });
  }
  explosion(x, z) {
    const a = this.att(x, z, 400);
    this.noiseHit({ dur: 1.6, f: 1200, f1: 60, gain: 0.9 * a, attack: 0.01 });
    this.tone({ type: 'sine', f: 90, f1: 25, dur: 1.2, gain: 0.9 * a });
    this.noiseHit({ t: 0.05, dur: 0.5, f: 4000, f1: 500, gain: 0.25 * a, type: 'bandpass', q: 0.5 });
  }
  crash(i = 0.5, x, z) {
    const a = x === undefined ? 1 : this.att(x, z, 80);
    this.noiseHit({ dur: 0.25 + i * 0.3, f: 2500, f1: 200, gain: (0.25 + i * 0.5) * a, type: 'lowpass' });
    this.tone({ type: 'square', f: 120 + rand(-20, 20), f1: 50, dur: 0.15, gain: 0.15 * i * a });
    if (i > 0.4) this.noiseHit({ t: 0.04, dur: 0.4, f: 5000, gain: 0.08 * i * a, type: 'highpass' });
  }
  thud(i = 0.6) { this.tone({ type: 'sine', f: 110, f1: 45, dur: 0.18, gain: 0.6 * i }); this.noiseHit({ dur: 0.08, f: 800, gain: 0.25 * i }); }
  punch() { this.tone({ type: 'sine', f: 140, f1: 60, dur: 0.12, gain: 0.5 }); this.noiseHit({ dur: 0.06, f: 1500, gain: 0.3 }); }
  swing() { this.noiseHit({ dur: 0.12, f: 900, f1: 2500, gain: 0.08, type: 'bandpass', q: 2 }); }
  pickup() { this.tone({ type: 'triangle', f: 660, dur: 0.1, gain: 0.25 }); this.tone({ t: 0.08, type: 'triangle', f: 990, dur: 0.18, gain: 0.25 }); }
  cash() { this.tone({ type: 'square', f: 1320, dur: 0.06, gain: 0.08 }); this.tone({ t: 0.06, type: 'square', f: 1760, dur: 0.12, gain: 0.08 }); }
  click() { this.tone({ type: 'square', f: 900, dur: 0.03, gain: 0.08 }); }
  reload() { this.noiseHit({ dur: 0.05, f: 3000, gain: 0.15, type: 'bandpass', q: 3 }); this.noiseHit({ t: 0.25, dur: 0.06, f: 2000, gain: 0.18, type: 'bandpass', q: 3 }); }
  whiz() { this.noiseHit({ dur: 0.12, f: 3000, f1: 800, gain: 0.12, type: 'bandpass', q: 6 }); }
  splash() { this.noiseHit({ dur: 0.7, f: 1800, f1: 300, gain: 0.35 }); }
  door() { this.tone({ type: 'square', f: 180, f1: 90, dur: 0.07, gain: 0.12 }); this.noiseHit({ t: 0.05, dur: 0.08, f: 600, gain: 0.2 }); }
  spray() { this.noiseHit({ dur: 1.2, f: 6000, gain: 0.15, type: 'highpass' }); this.chime(); }
  horn(x, z, player = false) {
    const a = player ? 0.5 : 0.35 * this.att(x, z, 90);
    for (const f of [415, 523]) this.tone({ type: 'square', f, dur: 0.38, gain: a * 0.35, attack: 0.01, curve: 'lin' });
  }
  beep(go) { this.tone({ type: 'square', f: go ? 1320 : 660, dur: go ? 0.5 : 0.25, gain: 0.18 }); }
  chime() { [784, 988, 1175].forEach((f, i) => this.tone({ t: i * 0.08, type: 'triangle', f, dur: 0.4, gain: 0.2 })); }
  wantedUp() { [880, 660].forEach((f, i) => this.tone({ t: i * 0.12, type: 'square', f, dur: 0.14, gain: 0.12 })); }
  missionStart() { [523, 659, 784, 1047].forEach((f, i) => this.tone({ t: i * 0.09, type: 'triangle', f, dur: 0.35, gain: 0.18 })); }
  missionPassed() {
    const seq = [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.36], [988, 0.6], [1047, 0.75]];
    for (const [f, t] of seq) { this.tone({ t, type: 'square', f, dur: 0.3, gain: 0.09 }); this.tone({ t, type: 'triangle', f: f / 2, dur: 0.35, gain: 0.15 }); }
  }
  missionFailed() { [392, 370, 349, 330].forEach((f, i) => this.tone({ t: i * 0.18, type: 'sawtooth', f, dur: 0.3, gain: 0.08 })); }
  death() { this.tone({ type: 'sawtooth', f: 300, f1: 60, dur: 1.4, gain: 0.15 }); this.noiseHit({ dur: 1.2, f: 600, f1: 80, gain: 0.2 }); }
  busted() { [600, 450, 600, 450].forEach((f, i) => this.tone({ t: i * 0.2, type: 'square', f, dur: 0.18, gain: 0.1 })); }

  // ---------------------------------------------------------------- continuous
  setupEngine() {
    const ctx = this.ctx;
    this.eng = ctx.createGain();
    this.eng.gain.value = 0;
    this.engF = ctx.createBiquadFilter();
    this.engF.type = 'lowpass';
    this.engF.frequency.value = 600;
    this.engF.Q.value = 3;
    this.o1 = ctx.createOscillator(); this.o1.type = 'sawtooth';
    this.o2 = ctx.createOscillator(); this.o2.type = 'square';
    this.o3 = ctx.createOscillator(); this.o3.type = 'sawtooth';
    const g2 = ctx.createGain(); g2.gain.value = 0.5;
    const g3 = ctx.createGain(); g3.gain.value = 0.35;
    this.o1.connect(this.engF); this.o2.connect(g2); g2.connect(this.engF); this.o3.connect(g3); g3.connect(this.engF);
    this.engF.connect(this.eng);
    this.eng.connect(this.sfx);
    this.o1.start(); this.o2.start(); this.o3.start();
    // tyre squeal
    this.tyreSrc = ctx.createBufferSource();
    this.tyreSrc.buffer = this.noise; this.tyreSrc.loop = true;
    this.tyreF = ctx.createBiquadFilter(); this.tyreF.type = 'bandpass'; this.tyreF.frequency.value = 1800; this.tyreF.Q.value = 4;
    this.tyreG = ctx.createGain(); this.tyreG.gain.value = 0;
    this.tyreSrc.connect(this.tyreF); this.tyreF.connect(this.tyreG); this.tyreG.connect(this.sfx);
    this.tyreSrc.start();
    // siren
    this.siren = ctx.createOscillator(); this.siren.type = 'square';
    this.sirenF = ctx.createBiquadFilter(); this.sirenF.type = 'lowpass'; this.sirenF.frequency.value = 2200;
    this.sirenG = ctx.createGain(); this.sirenG.gain.value = 0;
    this.siren.connect(this.sirenF); this.sirenF.connect(this.sirenG); this.sirenG.connect(this.sfx);
    this.siren.start();
    this.gear = 1;
  }

  setupLoops() {
    const ctx = this.ctx;
    // city rumble + ocean
    const mk = (f, type) => {
      const s = ctx.createBufferSource(); s.buffer = this.noise; s.loop = true;
      const flt = ctx.createBiquadFilter(); flt.type = type; flt.frequency.value = f;
      const g = ctx.createGain(); g.gain.value = 0;
      s.connect(flt); flt.connect(g); g.connect(this.sfx);
      s.start(0, Math.random());
      return g;
    };
    this.cityG = mk(380, 'lowpass');
    this.oceanG = mk(700, 'lowpass');
    this.windG = mk(900, 'bandpass');
  }

  update(dt) {
    if (!this.ready) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const paused = G.paused;
    const P = G.player;
    const v = P && P.human && P.human.vehicle;
    // engine
    if (v && !paused && !v.wrecked) {
      const sp = Math.abs(v.vF);
      const top = v.T.maxSpeed;
      const gears = [0, 0.16, 0.32, 0.5, 0.7, 0.9, 1.2].map((k) => k * top);
      let g = 1;
      while (g < gears.length - 1 && sp > gears[g]) g++;
      const lo = gears[g - 1], hi = gears[g];
      const rpm = clamp((sp - lo) / (hi - lo || 1), 0, 1) * 0.75 + 0.25;
      const thr = Math.abs(v.throttle);
      const base = v.T.truck ? 32 : v.type === 'super' || v.type === 'sports' ? 58 : v.type === 'muscle' ? 40 : 48;
      const f = base + rpm * base * 2.1 + thr * 8;
      this.o1.frequency.setTargetAtTime(f, now, 0.05);
      this.o2.frequency.setTargetAtTime(f * 0.5, now, 0.05);
      this.o3.frequency.setTargetAtTime(f * 1.01 + 1.5, now, 0.05);
      this.engF.frequency.setTargetAtTime(250 + rpm * 1100 + thr * 900, now, 0.08);
      this.eng.gain.setTargetAtTime(0.07 + thr * 0.07 + rpm * 0.03, now, 0.08);
      const slip = v.onGround ? clamp((v.slip - 3.5) / 8, 0, 1) + (v.handbrake && v.speed > 6 ? 0.5 : 0) : 0;
      this.tyreG.gain.setTargetAtTime(Math.min(0.22, slip * 0.2), now, 0.05);
      this.windG.gain.setTargetAtTime(clamp(v.speed / 60, 0, 1) * 0.06, now, 0.2);
    } else {
      this.eng.gain.setTargetAtTime(0, now, 0.1);
      this.tyreG.gain.setTargetAtTime(0, now, 0.05);
      this.windG.gain.setTargetAtTime(0, now, 0.2);
    }
    // nearest siren
    let sd = 1e9;
    if (!paused) for (const c of G.vehicles) if (c.siren && !c.removed) sd = Math.min(sd, G.cam.distTo(c.x, c.z));
    const sv = clamp(1 - sd / 160, 0, 1);
    this.sirenG.gain.setTargetAtTime(sv * sv * 0.07, now, 0.1);
    const wail = 720 + 330 * Math.sin(now * 2 * Math.PI * 0.32);
    this.siren.frequency.setTargetAtTime(wail, now, 0.03);
    // ambience
    const pos = P && P.human ? P.pos() : { x: 0, z: 0 };
    const beach = clamp(1 - (CITY.maxX - pos.x) / 160, 0, 1);
    const night = G.sky ? G.sky.night : 0;
    this.cityG.gain.setTargetAtTime(paused ? 0 : 0.05 * (1 - beach * 0.6) * (1 - night * 0.4), now, 0.3);
    this.oceanG.gain.setTargetAtTime(paused ? 0 : beach * (0.07 + 0.04 * Math.sin(now * 0.7)), now, 0.3);
    // radio
    this.radio.update(!!v && !paused && this.station < 3);
  }

  nextStation() {
    if (!this.ready) return;
    this.station = (this.station + 1) % this.stations.length;
    this.radio.switchTo(this.station);
    G.hud.radio(this.stations[this.station]);
    this.noiseHit({ dur: 0.25, f: 3000, gain: 0.08, type: 'bandpass', q: 1 });
  }
}

// ------------------------------------------------------------------------------------------------
// Procedural radio
// ------------------------------------------------------------------------------------------------
class Radio {
  constructor(a) {
    this.a = a;
    this.ctx = a.ctx;
    this.out = this.ctx.createGain();
    this.out.gain.value = 0;
    this.out.connect(a.music);
    this.next = 0;
    this.step = 0;
    this.playing = false;
    this.station = 0;
    this.bar = 0;
    this.seed = Math.random();
    this.pattern = null;
  }

  switchTo(s) {
    this.station = s;
    this.step = 0;
    this.bar = 0;
    this.next = this.ctx.currentTime + 0.1;
  }

  update(on) {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    this.out.gain.setTargetAtTime(on ? 1 : 0, now, 0.25);
    if (!on) { this.playing = false; return; }
    if (!this.playing) { this.playing = true; this.next = now + 0.05; }
    const bpm = [100, 122, 78][this.station] || 100;
    const s16 = 60 / bpm / 4;
    while (this.next < now + 0.25) {
      this.schedule(this.next, this.step, s16);
      this.next += s16 * (this.station === 2 && this.step % 2 === 0 ? 1.18 : this.station === 2 ? 0.82 : 1);
      this.step++;
      if (this.step % 16 === 0) this.bar++;
    }
  }

  // ---- voices
  kick(t, g = 0.9) {
    const c = this.ctx, o = c.createOscillator(), v = c.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.13);
    v.gain.setValueAtTime(g, t); v.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(v); v.connect(this.out); o.start(t); o.stop(t + 0.32);
  }
  snare(t, g = 0.35) {
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), v = c.createGain();
    s.buffer = this.a.noise; f.type = 'highpass'; f.frequency.value = 1400;
    v.gain.setValueAtTime(g, t); v.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    s.connect(f); f.connect(v); v.connect(this.out); s.start(t, Math.random()); s.stop(t + 0.2);
    const o = c.createOscillator(), ov = c.createGain();
    o.type = 'triangle'; o.frequency.value = 190;
    ov.gain.setValueAtTime(g * 0.6, t); ov.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    o.connect(ov); ov.connect(this.out); o.start(t); o.stop(t + 0.1);
  }
  hat(t, open = false, g = 0.12) {
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), v = c.createGain();
    s.buffer = this.a.noise; f.type = 'highpass'; f.frequency.value = 7500;
    const d = open ? 0.2 : 0.035;
    v.gain.setValueAtTime(g, t); v.gain.exponentialRampToValueAtTime(0.001, t + d);
    s.connect(f); f.connect(v); v.connect(this.out); s.start(t, Math.random()); s.stop(t + d + 0.02);
  }
  bass(t, m, dur, g = 0.22, type = 'sawtooth') {
    const c = this.ctx, o = c.createOscillator(), f = c.createBiquadFilter(), v = c.createGain();
    o.type = type; o.frequency.value = mtof(m);
    f.type = 'lowpass'; f.Q.value = 6;
    f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(1400, t + 0.02); f.frequency.exponentialRampToValueAtTime(260, t + dur);
    v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(g, t + 0.01); v.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(f); f.connect(v); v.connect(this.out); o.start(t); o.stop(t + dur + 0.02);
  }
  lead(t, m, dur, g = 0.06, type = 'square') {
    const c = this.ctx, o = c.createOscillator(), f = c.createBiquadFilter(), v = c.createGain();
    o.type = type; o.frequency.value = mtof(m);
    f.type = 'lowpass'; f.frequency.value = 2600;
    v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(g, t + 0.01); v.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(f); f.connect(v); v.connect(this.out); v.connect(this.a.delay);
    o.start(t); o.stop(t + dur + 0.02);
  }
  pad(t, notes, dur, g = 0.035) {
    const c = this.ctx, f = c.createBiquadFilter(), v = c.createGain();
    f.type = 'lowpass'; f.frequency.value = 1300;
    v.gain.setValueAtTime(0.0001, t); v.gain.linearRampToValueAtTime(g, t + dur * 0.3); v.gain.linearRampToValueAtTime(0.0001, t + dur);
    f.connect(v); v.connect(this.out);
    for (const m of notes) {
      for (const det of [-7, 7]) {
        const o = c.createOscillator();
        o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = det;
        o.connect(f); o.start(t); o.stop(t + dur + 0.05);
      }
    }
  }
  keys(t, notes, dur, g = 0.05) {
    const c = this.ctx, v = c.createGain();
    v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(g, t + 0.01); v.gain.exponentialRampToValueAtTime(0.001, t + dur);
    v.connect(this.out);
    for (const m of notes) {
      const o = c.createOscillator();
      o.type = 'sine'; o.frequency.value = mtof(m);
      const o2 = c.createOscillator();
      o2.type = 'triangle'; o2.frequency.value = mtof(m + 12); o2.detune.value = 4;
      const g2 = c.createGain(); g2.gain.value = 0.3;
      o.connect(v); o2.connect(g2); g2.connect(v);
      o.start(t); o.stop(t + dur + 0.05); o2.start(t); o2.stop(t + dur + 0.05);
    }
  }

  schedule(t, step, s16) {
    const st = step % 16;
    const bar = this.bar;
    if (this.station === 0) {
      // synthwave: Am F C G
      const prog = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
      const ch = prog[bar % 4];
      if (st % 8 === 0) this.kick(t);
      if (st === 4 || st === 12) this.snare(t, 0.3);
      if (st % 2 === 0) this.hat(t, false, 0.06);
      if (st % 2 === 0) this.bass(t, ch[0] - 24 + (st % 4 === 2 ? 12 : 0), s16 * 1.8, 0.2);
      if (st === 0) this.pad(t, ch.map((m) => m + 12), s16 * 16, 0.022);
      const arp = [0, 1, 2, 1];
      if (bar % 8 >= 4) this.lead(t, ch[arp[st % 4]] + 24, s16 * 0.9, 0.035);
      if (bar % 8 < 4 && (st === 0 || st === 6 || st === 10)) {
        const mel = [76, 74, 72, 71, 72, 74, 76, 79];
        this.lead(t, mel[(bar * 3 + st) % mel.length], s16 * 3.5, 0.045, 'sawtooth');
      }
    } else if (this.station === 1) {
      // beach house: Dm7 G7 Cmaj7 Am7
      const prog = [[50, 53, 57, 60], [55, 59, 62, 65], [48, 52, 55, 59], [45, 48, 52, 55]];
      const ch = prog[bar % 4];
      if (st % 4 === 0) this.kick(t, 0.85);
      if (st % 4 === 2) this.hat(t, true, 0.07);
      if (st === 4 || st === 12) this.snare(t, 0.18);
      if (st % 4 === 2) this.bass(t, ch[0] - 12, s16 * 1.6, 0.2, 'square');
      if (st === 3 || st === 10) this.keys(t, ch.map((m) => m + 12), s16 * 2, 0.04);
      if (bar % 4 === 3 && st >= 12) this.hat(t, false, 0.08);
    } else if (this.station === 2) {
      // lo-fi: Fmaj7 Em7 Dm7 Cmaj7, swung
      const prog = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]];
      const ch = prog[bar % 4];
      if (st === 0 || st === 7 || st === 10) this.kick(t, 0.6);
      if (st === 4 || st === 12) this.snare(t, 0.16);
      if (st % 2 === 0) this.hat(t, false, 0.045);
      if (st === 0) this.keys(t, ch, s16 * 14, 0.045);
      if (st === 0 || st === 8) this.bass(t, ch[0] - 12, s16 * 6, 0.16, 'triangle');
      if (st % 4 === 0 && Math.random() < 0.5) {
        const sc = [72, 74, 76, 79, 81];
        this.lead(t, pick(sc), s16 * 2.5, 0.025, 'triangle');
      }
      if (Math.random() < 0.3) this.a.noiseHit({ t: t - this.ctx.currentTime, dur: 0.02, f: 5000, gain: 0.02, type: 'highpass', dest: this.out });
    }
  }
}
