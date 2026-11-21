// Day/night cycle: sky dome with clouds and stars, sun/moon light, hemisphere light, fog.

import * as THREE from 'three';
import { G } from '../state.js';
import { clamp, lerp, smoothstep } from '../util.js';
import { nightUniform } from './textures.js';

// Key frames by hour: zenith, horizon, sun colour, sun intensity, hemi sky, hemi ground, hemi intensity
const KEYS = [
  { h: 0, zen: 0x05071a, hor: 0x161c36, sun: 0x8aa0e0, si: 0.55, hs: 0x5a6ab0, hg: 0x2a2038, hi: 0.95 },
  { h: 4.8, zen: 0x070a1f, hor: 0x1e2440, sun: 0x8aa0e0, si: 0.5, hs: 0x5a6ab0, hg: 0x2a2038, hi: 0.95 },
  { h: 6.0, zen: 0x2f3c6a, hor: 0xe89a6a, sun: 0xffa868, si: 1.0, hs: 0x8a8aa0, hg: 0x3a3030, hi: 0.8 },
  { h: 7.5, zen: 0x3f7ad6, hor: 0xffc9a0, sun: 0xffd9a8, si: 1.8, hs: 0x8eb4df, hg: 0x4a3a2a, hi: 0.8 },
  { h: 10, zen: 0x2a6ed8, hor: 0xb4dcff, sun: 0xfff1da, si: 2.25, hs: 0x9cc6f0, hg: 0x5a4a38, hi: 0.82 },
  { h: 15, zen: 0x2a6cd6, hor: 0xbcdcff, sun: 0xffecd0, si: 2.2, hs: 0x9cc6f0, hg: 0x5a4a38, hi: 0.8 },
  { h: 17.2, zen: 0x3a5c9c, hor: 0xf2c08a, sun: 0xffb070, si: 2.0, hs: 0xa8a8c0, hg: 0x4a3a30, hi: 0.85 },
  { h: 18.3, zen: 0x2e3f6e, hor: 0xef9058, sun: 0xff7a3c, si: 1.3, hs: 0x9a88a8, hg: 0x3a2a28, hi: 0.85 },
  { h: 19.3, zen: 0x141c3c, hor: 0x6a4a5a, sun: 0x8a8ac8, si: 0.6, hs: 0x5a6094, hg: 0x2a2230, hi: 0.9 },
  { h: 20.5, zen: 0x070a1c, hor: 0x1e2440, sun: 0x8aa0e0, si: 0.55, hs: 0x5a6ab0, hg: 0x2a2038, hi: 0.95 },
  { h: 24, zen: 0x05071a, hor: 0x161c36, sun: 0x8aa0e0, si: 0.55, hs: 0x5a6ab0, hg: 0x2a2038, hi: 0.95 },
];
const KC = KEYS.map((k) => ({
  ...k,
  zenC: new THREE.Color(k.zen), horC: new THREE.Color(k.hor), sunC: new THREE.Color(k.sun),
  hsC: new THREE.Color(k.hs), hgC: new THREE.Color(k.hg),
}));

export class Sky {
  constructor(scene, quality) {
    this.scene = scene;
    this.hemi = new THREE.HemisphereLight(0xb8dcff, 0x6a5a48, 1.1);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, 2.5);
    this.sun.target = new THREE.Object3D();
    scene.add(this.sun, this.sun.target);
    this.setQuality(quality);

    this.uniforms = {
      uZenith: { value: new THREE.Color() },
      uHorizon: { value: new THREE.Color() },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uSunColor: { value: new THREE.Color() },
      uNight: { value: 0 },
      uTime: { value: 0 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = position;
          vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_Position = p.xyww;
        }`,
      fragmentShader: `
        uniform vec3 uZenith, uHorizon, uSunColor, uSunDir;
        uniform float uNight, uTime;
        varying vec3 vDir;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p) {
          vec2 i = floor(p), f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
        }
        float fbm(vec2 p) {
          float v = 0.0, a = 0.5;
          for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.07; a *= 0.5; }
          return v;
        }
        void main() {
          vec3 d = normalize(vDir);
          float h = d.y;
          vec3 col = mix(uHorizon, uZenith, pow(clamp(h, 0.0, 1.0), 0.55));
          // below the horizon: fade toward a darker sea haze
          col = mix(col, uHorizon * 0.55, clamp(-h * 4.0, 0.0, 1.0));
          float s = max(dot(d, normalize(uSunDir)), 0.0);
          float sunUp = smoothstep(-0.08, 0.05, uSunDir.y);
          col += uSunColor * (pow(s, 900.0) * 14.0 + pow(s, 24.0) * 0.45 + pow(s, 4.0) * 0.12) * sunUp;
          // moon opposite the sun
          float m = max(dot(d, normalize(-uSunDir + vec3(0.0, 0.25, 0.0))), 0.0);
          col += vec3(0.85, 0.9, 1.0) * smoothstep(0.9993, 0.9996, m) * uNight;
          col += vec3(0.3, 0.35, 0.6) * pow(m, 60.0) * 0.25 * uNight;
          // stars
          if (h > 0.0) {
            vec3 sd = d * 260.0;
            float st = hash(floor(sd.xz + sd.y * 13.0));
            float star = smoothstep(0.9965, 1.0, st) * smoothstep(0.0, 0.25, h);
            col += vec3(star) * uNight * (0.6 + 0.4 * sin(uTime * 3.0 + st * 100.0));
          }
          // clouds
          if (h > 0.0) {
            vec2 cuv = d.xz / (h + 0.12) * 1.6 + vec2(uTime * 0.004, uTime * 0.0015);
            float c = fbm(cuv);
            float cov = smoothstep(0.52, 0.8, c) * smoothstep(0.0, 0.18, h);
            vec3 cc = mix(uHorizon * 1.05 + uSunColor * 0.25, vec3(1.0), 0.35 * (1.0 - uNight));
            cc = mix(cc, uZenith * 1.6 + vec3(0.04), uNight * 0.85);
            col = mix(col, cc, cov * 0.85);
          }
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }`,
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), mat);
    this.dome.frustumCulled = false;
    this.dome.renderOrder = -1;
    scene.add(this.dome);
    scene.fog = new THREE.Fog(0xbfe3ff, 120, 900);
    this.night = 0;
    this.sunDir = new THREE.Vector3();
    this._a = {};
  }

  setQuality(q) {
    const s = this.sun;
    s.castShadow = q !== 'low';
    const size = q === 'high' ? 2048 : 1024;
    if (s.shadow.mapSize.x !== size) {
      s.shadow.mapSize.set(size, size);
      if (s.shadow.map) { s.shadow.map.dispose(); s.shadow.map = null; }
    }
    const ext = q === 'high' ? 70 : 50;
    const c = s.shadow.camera;
    c.left = -ext; c.right = ext; c.top = ext; c.bottom = -ext;
    c.near = 1; c.far = 400;
    c.updateProjectionMatrix();
    s.shadow.bias = -0.0006;
    s.shadow.normalBias = 0.6;
    this.shadowExt = ext;
    this.fogFar = q === 'low' ? 520 : q === 'high' ? 1000 : 780;
  }

  sample(hour) {
    let a = KC[0], b = KC[1];
    for (let i = 0; i < KC.length - 1; i++) {
      if (hour >= KC[i].h && hour <= KC[i + 1].h) { a = KC[i]; b = KC[i + 1]; break; }
    }
    const t = (hour - a.h) / (b.h - a.h || 1);
    const o = this._a;
    o.zen = (o.zen || new THREE.Color()).copy(a.zenC).lerp(b.zenC, t);
    o.hor = (o.hor || new THREE.Color()).copy(a.horC).lerp(b.horC, t);
    o.sun = (o.sun || new THREE.Color()).copy(a.sunC).lerp(b.sunC, t);
    o.hs = (o.hs || new THREE.Color()).copy(a.hsC).lerp(b.hsC, t);
    o.hg = (o.hg || new THREE.Color()).copy(a.hgC).lerp(b.hgC, t);
    o.si = lerp(a.si, b.si, t);
    o.hi = lerp(a.hi, b.hi, t);
    return o;
  }

  update(hour, focus, camPos) {
    const k = this.sample(hour);
    // sun path: rises in the east (+x), sets in the west, tilted south
    const ang = ((hour - 6) / 12) * Math.PI;
    const sx = Math.cos(ang), sy = Math.sin(ang);
    this.sunDir.set(sx, sy, 0.38).normalize();
    const day = smoothstep(-0.12, 0.12, sy);
    this.night = 1 - smoothstep(-0.28, 0.06, sy);
    nightUniform.value = this.night;

    // light direction: the sun by day, the moon (opposite) by night
    const L = this.sunDir.clone();
    if (sy < 0.05) L.set(-sx, Math.max(0.35, -sy), -0.2).normalize();
    this.sun.color.copy(k.sun);
    this.sun.intensity = k.si * (sy < 0.05 ? 0.5 : 1);
    this.hemi.color.copy(k.hs);
    this.hemi.groundColor.copy(k.hg);
    this.hemi.intensity = k.hi;

    const S = this.shadowExt;
    const snap = (S * 2) / this.sun.shadow.mapSize.x;
    const fx = Math.round(focus.x / snap) * snap, fz = Math.round(focus.z / snap) * snap;
    this.sun.position.set(fx + L.x * 150, focus.y + L.y * 150, fz + L.z * 150);
    this.sun.target.position.set(fx, focus.y, fz);
    this.sun.target.updateMatrixWorld();

    const u = this.uniforms;
    u.uZenith.value.copy(k.zen);
    u.uHorizon.value.copy(k.hor);
    u.uSunDir.value.copy(this.sunDir);
    u.uSunColor.value.copy(k.sun);
    u.uNight.value = this.night;
    u.uTime.value = G.time;
    this.dome.position.copy(camPos);

    this.scene.fog.color.copy(k.hor).lerp(k.zen, 0.25);
    this.scene.fog.near = 90;
    this.scene.fog.far = this.fogFar;
    this.horizon = k.hor;
    this.zenith = k.zen;
    this.sunColor = k.sun;
    void day;
  }
}
