// Particles (fire, smoke, sparks, splashes, dust), bullet tracers and explosions.

import * as THREE from 'three';
import { G } from './state.js';
import { rand } from './util.js';

class ParticlePool {
  constructor(scene, max, additive) {
    this.max = max;
    this.n = 0;
    this.pos = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.alpha = new Float32Array(max);
    this.size = new Float32Array(max);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.s0 = new Float32Array(max);
    this.s1 = new Float32Array(max);
    this.a0 = new Float32Array(max);
    this.grav = new Float32Array(max);
    this.drag = new Float32Array(max);
    const g = new THREE.BufferGeometry();
    this.gPos = new THREE.BufferAttribute(new Float32Array(max * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.gCol = new THREE.BufferAttribute(new Float32Array(max * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.gA = new THREE.BufferAttribute(new Float32Array(max), 1).setUsage(THREE.DynamicDrawUsage);
    this.gS = new THREE.BufferAttribute(new Float32Array(max), 1).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.gPos);
    g.setAttribute('color', this.gCol);
    g.setAttribute('alpha', this.gA);
    g.setAttribute('size', this.gS);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 600 } },
      vertexShader: `
        attribute vec3 color;
        attribute float alpha;
        attribute float size;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uScale;
        void main() {
          vColor = color; vAlpha = alpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = clamp(size * uScale / -mv.z, 1.0, 300.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: additive ? `
        varying vec3 vColor; varying float vAlpha;
        void main() {
          float r = length(gl_PointCoord - 0.5) * 2.0;
          float a = smoothstep(1.0, 0.0, r);
          gl_FragColor = vec4(vColor * a * a * vAlpha, 1.0);
        }` : `
        varying vec3 vColor; varying float vAlpha;
        void main() {
          float r = length(gl_PointCoord - 0.5) * 2.0;
          float a = smoothstep(1.0, 0.2, r);
          gl_FragColor = vec4(vColor, a * vAlpha);
        }`,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(g, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = additive ? 3 : 2;
    scene.add(this.points);
  }

  emit(x, y, z, vx, vy, vz, life, s0, s1, r, g, b, a0, grav = 0, drag = 0) {
    let i = this.n;
    if (i >= this.max) {
      i = Math.floor(Math.random() * this.max);
    } else this.n++;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.col[i * 3] = r; this.col[i * 3 + 1] = g; this.col[i * 3 + 2] = b;
    this.life[i] = life; this.maxLife[i] = life;
    this.s0[i] = s0; this.s1[i] = s1; this.a0[i] = a0;
    this.grav[i] = grav; this.drag[i] = drag;
  }

  update(dt) {
    let i = 0;
    while (i < this.n) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        // swap-remove
        const j = --this.n;
        if (i !== j) this.copy(j, i);
        continue;
      }
      const d = 1 - this.drag[i] * dt;
      this.vel[i * 3] *= d; this.vel[i * 3 + 2] *= d;
      this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * d - this.grav[i] * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      i++;
    }
    const P = this.gPos.array, C = this.gCol.array, A = this.gA.array, S = this.gS.array;
    for (let k = 0; k < this.n; k++) {
      const t = 1 - this.life[k] / this.maxLife[k];
      P[k * 3] = this.pos[k * 3]; P[k * 3 + 1] = this.pos[k * 3 + 1]; P[k * 3 + 2] = this.pos[k * 3 + 2];
      C[k * 3] = this.col[k * 3]; C[k * 3 + 1] = this.col[k * 3 + 1]; C[k * 3 + 2] = this.col[k * 3 + 2];
      A[k] = this.a0[k] * (1 - t) * Math.min(1, t * 8 + 0.3);
      S[k] = this.s0[k] + (this.s1[k] - this.s0[k]) * t;
    }
    const g = this.points.geometry;
    g.setDrawRange(0, this.n);
    this.gPos.needsUpdate = true; this.gCol.needsUpdate = true; this.gA.needsUpdate = true; this.gS.needsUpdate = true;
  }

  copy(from, to) {
    for (let c = 0; c < 3; c++) {
      this.pos[to * 3 + c] = this.pos[from * 3 + c];
      this.vel[to * 3 + c] = this.vel[from * 3 + c];
      this.col[to * 3 + c] = this.col[from * 3 + c];
    }
    this.life[to] = this.life[from]; this.maxLife[to] = this.maxLife[from];
    this.s0[to] = this.s0[from]; this.s1[to] = this.s1[from]; this.a0[to] = this.a0[from];
    this.grav[to] = this.grav[from]; this.drag[to] = this.drag[from];
  }
}

export class FX {
  constructor(scene) {
    this.add = new ParticlePool(scene, 1400, true);
    this.alpha = new ParticlePool(scene, 1400, false);
    // tracers
    this.maxT = 96;
    const g = new THREE.BufferGeometry();
    this.tPos = new Float32Array(this.maxT * 6);
    this.tCol = new Float32Array(this.maxT * 6);
    this.tLife = new Float32Array(this.maxT);
    this.tData = new Float32Array(this.maxT * 6);
    g.setAttribute('position', new THREE.BufferAttribute(this.tPos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.tCol, 3).setUsage(THREE.DynamicDrawUsage));
    this.tracers = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.tracers.frustumCulled = false;
    scene.add(this.tracers);
    this.tIdx = 0;
  }

  setScale(px) {
    this.add.points.material.uniforms.uScale.value = px;
    this.alpha.points.material.uniforms.uScale.value = px;
  }

  update(dt) {
    this.add.update(dt);
    this.alpha.update(dt);
    for (let i = 0; i < this.maxT; i++) {
      if (this.tLife[i] > 0) {
        this.tLife[i] -= dt;
        const k = Math.max(0, this.tLife[i] / 0.09);
        for (let v = 0; v < 2; v++) {
          this.tCol[i * 6 + v * 3] = 1.0 * k;
          this.tCol[i * 6 + v * 3 + 1] = 0.85 * k * (v ? 1 : 0.6);
          this.tCol[i * 6 + v * 3 + 2] = 0.5 * k * (v ? 1 : 0.3);
        }
      }
    }
    this.tracers.geometry.attributes.position.needsUpdate = true;
    this.tracers.geometry.attributes.color.needsUpdate = true;
  }

  tracer(x0, y0, z0, x1, y1, z1) {
    const i = this.tIdx;
    this.tIdx = (this.tIdx + 1) % this.maxT;
    this.tPos.set([x0, y0, z0, x1, y1, z1], i * 6);
    this.tLife[i] = 0.09;
  }

  muzzle(x, y, z, dx, dz) {
    this.add.emit(x, y, z, dx * 2, 0, dz * 2, 0.06, 0.9, 0.3, 1, 0.8, 0.35, 1);
    for (let k = 0; k < 3; k++) this.add.emit(x, y, z, dx * rand(4, 10) + rand(-1, 1), rand(-1, 1), dz * rand(4, 10) + rand(-1, 1), 0.07, 0.35, 0.1, 1, 0.7, 0.3, 1);
  }

  sparks(x, y, z, n = 8) {
    for (let k = 0; k < n; k++) {
      this.add.emit(x, y, z, rand(-5, 5), rand(1, 6), rand(-5, 5), rand(0.2, 0.45), 0.18, 0.05, 1, 0.75, 0.3, 1, 14, 1);
    }
  }

  dust(x, y, z, n = 4) {
    for (let k = 0; k < n; k++) this.alpha.emit(x, y, z, rand(-1, 1), rand(0.5, 2), rand(-1, 1), rand(0.4, 0.7), 0.3, 1.2, 0.65, 0.6, 0.55, 0.6, 0, 2);
  }

  blood(x, y, z, n = 6) {
    for (let k = 0; k < n; k++) this.alpha.emit(x, y, z, rand(-1.5, 1.5), rand(0.5, 3), rand(-1.5, 1.5), rand(0.3, 0.5), 0.18, 0.3, 0.5, 0.02, 0.04, 0.9, 9, 1);
  }

  smoke(x, y, z, dark = 0.4) {
    const c = dark;
    this.alpha.emit(x + rand(-0.3, 0.3), y, z + rand(-0.3, 0.3), rand(-0.4, 0.4), rand(1.5, 2.8), rand(-0.4, 0.4), rand(1.4, 2.2), 0.7, 3.2, c, c, c * 1.05, 0.5, -0.3, 0.6);
  }

  tireSmoke(x, y, z) {
    this.alpha.emit(x, y, z, rand(-0.5, 0.5), rand(0.4, 1.0), rand(-0.5, 0.5), rand(0.8, 1.3), 0.6, 2.6, 0.85, 0.85, 0.85, 0.35, 0, 1);
  }

  fire(x, y, z) {
    this.add.emit(x + rand(-0.4, 0.4), y, z + rand(-0.4, 0.4), rand(-0.3, 0.3), rand(1.5, 3.5), rand(-0.3, 0.3), rand(0.35, 0.6), 1.1, 0.3, 1, rand(0.35, 0.6), 0.1, 1);
    if (Math.random() < 0.4) this.smoke(x, y + 1, z, 0.12);
  }

  splash(x, y, z, size = 1) {
    for (let k = 0; k < 10 * size; k++) {
      this.alpha.emit(x + rand(-size, size), y + 0.1, z + rand(-size, size), rand(-2, 2), rand(2, 5) * size, rand(-2, 2), rand(0.5, 0.9), 0.4, 0.9, 0.9, 0.95, 1, 0.8, 12, 0.5);
    }
  }

  pickupSparkle(x, y, z, r, g, b) {
    for (let k = 0; k < 14; k++) this.add.emit(x, y, z, rand(-3, 3), rand(1, 5), rand(-3, 3), rand(0.4, 0.7), 0.4, 0.1, r, g, b, 1, 6, 2);
  }

  explosion(x, y, z, scale = 1) {
    for (let k = 0; k < 40 * scale; k++) {
      const a = Math.random() * Math.PI * 2, s = rand(3, 13) * scale;
      this.add.emit(x, y + rand(0, 1), z, Math.cos(a) * s, rand(1, 9) * scale, Math.sin(a) * s, rand(0.4, 0.9), rand(2.5, 4) * scale, 0.6, 1, rand(0.35, 0.7), 0.08, 1, 2, 3);
    }
    this.add.emit(x, y + 1, z, 0, 0, 0, 0.25, 14 * scale, 22 * scale, 1, 0.8, 0.4, 1);
    for (let k = 0; k < 30 * scale; k++) {
      const a = Math.random() * Math.PI * 2, s = rand(1, 6) * scale;
      this.alpha.emit(x, y + rand(0, 2), z, Math.cos(a) * s, rand(1, 5), Math.sin(a) * s, rand(1.8, 3.2), 2, 7 * scale, 0.13, 0.12, 0.12, 0.75, -0.5, 1.2);
    }
    this.sparks(x, y + 1, z, 30);
    const d = G.cam.distTo(x, z);
    G.cam.shake(Math.max(0, 0.9 - d * 0.015));
    G.audio.explosion(x, z);
  }
}
