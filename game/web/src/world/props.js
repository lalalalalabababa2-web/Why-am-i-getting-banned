// Instanced street furniture and vegetation. Every prop type is one InstancedMesh that is
// refilled with only the instances near the camera (cheap distance streaming).

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { G } from '../state.js';
import { makePaintMaterial, } from '../models.js';
import { makeGlowMaterial } from '../vehicle.js';
import { lightState } from '../ai/drive.js';
import { makeRng } from '../util.js';
import { CURB } from './citygen.js';

function colorize(geo, hex, paint = 0) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const c = new THREE.Color(hex);
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  const p = new Float32Array(n).fill(paint);
  for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('paint', new THREE.BufferAttribute(p, 1));
  if (g.attributes.uv) g.deleteAttribute('uv');
  return g;
}

function palmGeometry() {
  const parts = [];
  const rng = makeRng(7);
  const H = 8.5;
  const segs = 7;
  let x = 0;
  for (let k = 0; k < segs; k++) {
    const r0 = 0.3 - k * 0.022, r1 = 0.3 - (k + 1) * 0.022;
    const sh = H / segs;
    const g = new THREE.CylinderGeometry(r1, r0, sh, 7, 1);
    const nx = 0.035 * (k + 1) * (k + 1) * 0.35;
    g.rotateZ(-0.05 * k * 0.6);
    g.translate(x, sh * k + sh / 2, 0);
    x = nx;
    parts.push(colorize(g, k % 2 ? 0x8a6a48 : 0x76583a));
  }
  const top = { x, y: H };
  // fronds
  const leaves = 9;
  for (let l = 0; l < leaves; l++) {
    const ang = (l / leaves) * Math.PI * 2 + rng() * 0.3;
    const L = 3.6 + rng() * 0.8;
    const droop = 1.3 + rng() * 0.5;
    const pos = [];
    const nseg = 6;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    for (let s = 0; s < nseg; s++) {
      const t0 = s / nseg, t1 = (s + 1) / nseg;
      const P = (t, side) => {
        const along = t * L;
        const y = top.y + 0.5 * t - droop * t * t;
        const w = (0.6 * Math.sin(Math.PI * Math.min(1, t * 1.1)) + 0.04) * side;
        // along direction (ca, sa), width direction (-sa, ca)
        return [top.x + ca * along - sa * w, y + Math.abs(w) * -0.25, sa * along + ca * w];
      };
      const a = P(t0, -1), b = P(t0, 1), c = P(t1, 1), d = P(t1, -1);
      const m0 = P(t0, 0), m1 = P(t1, 0);
      m0[1] += 0.12; m1[1] += 0.12;
      pos.push(...a, ...m0, ...m1, ...a, ...m1, ...d, ...m0, ...b, ...c, ...m0, ...c, ...m1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    const shade = [0x2f8a3a, 0x3a9a40, 0x2a7a35, 0x46a84a][l % 4];
    parts.push(colorize(g, shade));
  }
  for (let k = 0; k < 4; k++) {
    const g = new THREE.SphereGeometry(0.17, 5, 4);
    g.translate(top.x + Math.cos(k * 1.6) * 0.3, top.y - 0.3, Math.sin(k * 1.6) * 0.3);
    parts.push(colorize(g, 0x5a3a1a));
  }
  return mergeGeometries(parts);
}

function treeGeometry() {
  const parts = [];
  const t = new THREE.CylinderGeometry(0.18, 0.26, 3.2, 6);
  t.translate(0, 1.6, 0);
  parts.push(colorize(t, 0x6a4a30));
  const blobs = [[0, 3.8, 0, 1.9], [0.9, 3.3, 0.4, 1.3], [-0.8, 3.4, -0.3, 1.4], [0.1, 4.8, 0.2, 1.3]];
  for (const [x, y, z, r] of blobs) {
    const g = new THREE.IcosahedronGeometry(r, 0);
    g.translate(x, y, z);
    parts.push(colorize(g, 0xffffff, 1));
  }
  return mergeGeometries(parts);
}

function lampGeometry() {
  const parts = [];
  const pole = new THREE.CylinderGeometry(0.08, 0.12, 7, 6);
  pole.translate(0, 3.5, 0);
  parts.push(colorize(pole, 0x4a4f57));
  const base = new THREE.CylinderGeometry(0.2, 0.25, 0.5, 6);
  base.translate(0, 0.25, 0);
  parts.push(colorize(base, 0x3a3e45));
  const arm = new THREE.BoxGeometry(0.1, 0.1, 2.0);
  arm.translate(0, 6.95, 1.0);
  parts.push(colorize(arm, 0x4a4f57));
  const head = new THREE.BoxGeometry(0.45, 0.16, 0.8);
  head.translate(0, 6.92, 1.9);
  parts.push(colorize(head, 0x3a3e45));
  const lens = new THREE.BoxGeometry(0.36, 0.04, 0.65);
  lens.translate(0, 6.83, 1.9);
  parts.push(colorize(lens, 0xfff0c0));
  return mergeGeometries(parts);
}

function signalPoleGeometry() {
  const parts = [];
  const pole = new THREE.CylinderGeometry(0.09, 0.11, 4.4, 6);
  pole.translate(0, 2.2, 0);
  parts.push(colorize(pole, 0x2b2e33));
  const box = new THREE.BoxGeometry(0.44, 1.2, 0.34);
  box.translate(0, 4.6, 0.02);
  parts.push(colorize(box, 0x1a1c1f));
  const plate = new THREE.BoxGeometry(0.62, 1.4, 0.04);
  plate.translate(0, 4.6, -0.16);
  parts.push(colorize(plate, 0x111214));
  return mergeGeometries(parts);
}

function umbrellaGeometry() {
  const parts = [];
  const pole = new THREE.CylinderGeometry(0.04, 0.04, 2.4, 5);
  pole.translate(0, 1.2, 0);
  parts.push(colorize(pole, 0xdddddd));
  const can = new THREE.ConeGeometry(1.5, 0.6, 8, 1, true);
  can.translate(0, 2.4, 0);
  parts.push(colorize(can, 0xffffff, 1));
  const towel = new THREE.BoxGeometry(0.9, 0.02, 1.8);
  towel.translate(0.9, 0.02, 0.4);
  parts.push(colorize(towel, 0xffffff, 1));
  return mergeGeometries(parts);
}

function benchGeometry() {
  const parts = [];
  const seat = new THREE.BoxGeometry(1.8, 0.08, 0.45);
  seat.translate(0, 0.48, 0);
  parts.push(colorize(seat, 0x8a5a34));
  const back = new THREE.BoxGeometry(1.8, 0.4, 0.06);
  back.translate(0, 0.8, -0.2);
  parts.push(colorize(back, 0x8a5a34));
  for (const x of [-0.75, 0.75]) {
    const leg = new THREE.BoxGeometry(0.08, 0.48, 0.4);
    leg.translate(x, 0.24, 0);
    parts.push(colorize(leg, 0x2b2e33));
  }
  return mergeGeometries(parts);
}

function hydrantGeometry() {
  const parts = [];
  const b = new THREE.CylinderGeometry(0.15, 0.18, 0.7, 7);
  b.translate(0, 0.35, 0);
  parts.push(colorize(b, 0xd62828));
  const c = new THREE.SphereGeometry(0.16, 6, 4);
  c.translate(0, 0.72, 0);
  parts.push(colorize(c, 0xd62828));
  const s = new THREE.CylinderGeometry(0.06, 0.06, 0.45, 5);
  s.rotateZ(Math.PI / 2);
  s.translate(0, 0.45, 0);
  parts.push(colorize(s, 0xb81f1f));
  return mergeGeometries(parts);
}

class PropSet {
  constructor(scene, geo, mat, items, opts = {}) {
    this.items = items;
    this.max = Math.min(items.length, opts.max ?? 1200);
    this.mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, this.max));
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = opts.shadow ?? true;
    this.mesh.receiveShadow = false;
    this.mesh.setColorAt(0, new THREE.Color(1, 1, 1));
    scene.add(this.mesh);
    // precompute matrices
    this.mats = new Float32Array(items.length * 16);
    this.cols = new Float32Array(items.length * 3);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const c = new THREE.Color();
    items.forEach((it, i) => {
      const y = it.y ?? (G.physics.groundHeight(it.x, it.z));
      p.set(it.x, y, it.z);
      q.setFromAxisAngle(up, it.rot || 0);
      const sc = it.s || 1;
      s.set(sc, sc, sc);
      m.compose(p, q, s);
      m.toArray(this.mats, i * 16);
      c.set(it.color ?? opts.color ?? 0xffffff);
      if (opts.tint) opts.tint(c, i);
      this.cols[i * 3] = c.r; this.cols[i * 3 + 1] = c.g; this.cols[i * 3 + 2] = c.b;
    });
    this.visible = [];
  }

  refresh(cx, cz, radius) {
    const r2 = radius * radius;
    const A = this.mesh.instanceMatrix.array, C = this.mesh.instanceColor.array;
    let n = 0;
    this.visible.length = 0;
    for (let i = 0; i < this.items.length && n < this.max; i++) {
      const it = this.items[i];
      const dx = it.x - cx, dz = it.z - cz;
      if (dx * dx + dz * dz > r2) continue;
      A.set(this.mats.subarray(i * 16, i * 16 + 16), n * 16);
      C[n * 3] = this.cols[i * 3]; C[n * 3 + 1] = this.cols[i * 3 + 1]; C[n * 3 + 2] = this.cols[i * 3 + 2];
      this.visible.push(i);
      n++;
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor.needsUpdate = true;
  }
}

export class Props {
  constructor(scene, city) {
    const mat = makePaintMaterial();
    const matDS = makePaintMaterial({ side: THREE.DoubleSide });
    const rng = makeRng(31);
    const curbY = (it) => ({ ...it, y: it.y ?? G.physics.groundHeight(it.x, it.z) });
    this.palms = new PropSet(scene, palmGeometry(), matDS, city.props.palms.map(curbY), { max: 900 });
    this.trees = new PropSet(scene, treeGeometry(), mat, city.props.trees.map(curbY), {
      max: 900, tint: (c) => c.setHSL(0.25 + rng() * 0.1, 0.45 + rng() * 0.2, 0.28 + rng() * 0.1),
    });
    this.lamps = new PropSet(scene, lampGeometry(), mat, city.props.lamps.map((l) => ({ ...l, y: l.y ?? CURB })), { max: 1400, shadow: false });
    this.signals = new PropSet(scene, signalPoleGeometry(), mat, city.props.lights.map((l) => ({ ...l, y: CURB })), { max: 700, shadow: false });
    this.umbrellas = new PropSet(scene, umbrellaGeometry(), matDS, city.props.umbrellas.map((u) => ({ ...u, y: G.physics.groundHeight(u.x, u.z) })), { max: 120 });
    this.benches = new PropSet(scene, benchGeometry(), mat, city.props.benches.map((b) => ({ ...b, y: CURB })), { max: 100, shadow: false });
    this.hydrants = new PropSet(scene, hydrantGeometry(), mat, city.props.hydrants.map((b) => ({ ...b, y: CURB })), { max: 200, shadow: false });
    this.sets = [this.palms, this.trees, this.lamps, this.signals, this.umbrellas, this.benches, this.hydrants];

    // signal lamps: 3 per pole
    this.lightItems = city.props.lights;
    const lg = new THREE.BoxGeometry(0.24, 0.24, 0.08);
    this.signalLamps = new THREE.InstancedMesh(lg, new THREE.MeshBasicMaterial({ color: 0xffffff }), 700 * 3);
    this.signalLamps.count = 0;
    this.signalLamps.frustumCulled = false;
    this.signalLamps.setColorAt(0, new THREE.Color(1, 1, 1));
    scene.add(this.signalLamps);

    // lamp glow sprites
    const maxGlow = 1400;
    const gg = new THREE.BufferGeometry();
    this.glowPos = new Float32Array(maxGlow * 3);
    this.glowCol = new Float32Array(maxGlow * 3);
    this.glowSize = new Float32Array(maxGlow);
    gg.setAttribute('position', new THREE.BufferAttribute(this.glowPos, 3));
    gg.setAttribute('color', new THREE.BufferAttribute(this.glowCol, 3));
    gg.setAttribute('size', new THREE.BufferAttribute(this.glowSize, 1));
    this.glowMat = makeGlowMaterial(0.0);
    this.glow = new THREE.Points(gg, this.glowMat);
    this.glow.frustumCulled = false;
    scene.add(this.glow);

    this.lastX = 1e9; this.lastZ = 1e9;
    this._m = new THREE.Matrix4();
    this._v = new THREE.Vector3();
    this._c = new THREE.Color();
  }

  update(cam, night) {
    const cx = cam.position.x, cz = cam.position.z;
    const q = G.settings.quality;
    const R = q === 'low' ? 200 : q === 'high' ? 380 : 290;
    if (Math.hypot(cx - this.lastX, cz - this.lastZ) > 25 || this.forceRefresh) {
      this.forceRefresh = false;
      this.lastX = cx; this.lastZ = cz;
      for (const s of this.sets) s.refresh(cx, cz, s === this.umbrellas || s === this.benches || s === this.hydrants ? R * 0.6 : R);
      // lamp glow positions
      const lv = this.lamps.visible;
      let n = 0;
      const v = this._v, m = this._m;
      for (const i of lv) {
        m.fromArray(this.lamps.mats, i * 16);
        v.set(0, 6.75, 1.9).applyMatrix4(m);
        this.glowPos[n * 3] = v.x; this.glowPos[n * 3 + 1] = v.y; this.glowPos[n * 3 + 2] = v.z;
        const warm = (i * 7) % 5 !== 0;
        this.glowCol[n * 3] = 1; this.glowCol[n * 3 + 1] = warm ? 0.72 : 0.92; this.glowCol[n * 3 + 2] = warm ? 0.42 : 1;
        this.glowSize[n] = 6.5;
        n++;
      }
      this.glow.geometry.setDrawRange(0, n);
      this.glow.geometry.attributes.position.needsUpdate = true;
      this.glow.geometry.attributes.color.needsUpdate = true;
      this.glow.geometry.attributes.size.needsUpdate = true;
    }
    this.glowMat.uniforms.uOpacity.value = night * 0.85;
    this.glow.visible = night > 0.05;

    // signal lamps for the visible poles
    const sv = this.signals.visible;
    let k = 0;
    const m = this._m, c = this._c;
    const A = this.signalLamps;
    const t = G.time;
    for (const i of sv) {
      const L = this.lightItems[i];
      const node = G.city.nodes[L.node];
      const st = lightState(node, L.axis, t);
      m.fromArray(this.signals.mats, i * 16);
      for (let s = 0; s < 3; s++) {
        const on = (s === 0 && st === 'r') || (s === 1 && st === 'y') || (s === 2 && st === 'g');
        const base = s === 0 ? [1, 0.08, 0.05] : s === 1 ? [1, 0.75, 0.05] : [0.1, 1, 0.45];
        const k2 = on ? 1 : 0.12;
        c.setRGB(base[0] * k2, base[1] * k2, base[2] * k2);
        this._v.set(0, 4.98 - s * 0.38, 0.2);
        const mm = this._m2 || (this._m2 = new THREE.Matrix4());
        mm.makeTranslation(this._v.x, this._v.y, this._v.z).premultiply(m);
        A.setMatrixAt(k, mm);
        A.setColorAt(k, c);
        k++;
      }
    }
    A.count = k;
    A.instanceMatrix.needsUpdate = true;
    A.instanceColor.needsUpdate = true;
  }
}

/** Additive ground decals: pools of light under lamps and in front of headlights at night. */
export class LightPools {
  constructor(scene, max = 900) {
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uOpacity: { value: 0 } },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vCol;
        void main() {
          vUv = uv;
          #ifdef USE_INSTANCING_COLOR
            vCol = instanceColor;
          #else
            vCol = vec3(1.0);
          #endif
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        varying vec2 vUv;
        varying vec3 vCol;
        uniform float uOpacity;
        void main() {
          vec2 d = vUv - 0.5;
          float r = length(d) * 2.0;
          float a = smoothstep(1.0, 0.0, r);
          gl_FragColor = vec4(vCol * a * a * uOpacity, 1.0);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    this.mesh = new THREE.InstancedMesh(geo, mat, max);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
    this.mesh.setColorAt(0, new THREE.Color(1, 1, 1));
    scene.add(this.mesh);
    this.mat = mat;
    this.max = max;
    this.n = 0;
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._p = new THREE.Vector3();
    this._s = new THREE.Vector3();
    this._c = new THREE.Color();
    this._up = new THREE.Vector3(0, 1, 0);
  }
  begin() { this.n = 0; }
  add(x, y, z, sx, sz, rot, r, g, b) {
    if (this.n >= this.max) return;
    this._p.set(x, y, z);
    this._q.setFromAxisAngle(this._up, rot);
    this._s.set(sx, 1, sz);
    this._m.compose(this._p, this._q, this._s);
    this.mesh.setMatrixAt(this.n, this._m);
    this._c.setRGB(r, g, b);
    this.mesh.setColorAt(this.n, this._c);
    this.n++;
  }
  end(opacity) {
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor.needsUpdate = true;
    this.mat.uniforms.uOpacity.value = opacity;
    this.mesh.visible = opacity > 0.02 && this.n > 0;
  }
}
