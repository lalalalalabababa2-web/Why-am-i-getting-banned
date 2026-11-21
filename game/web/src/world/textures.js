// Procedural texture atlas for the whole static city: 4x4 tiles of 256px. RGB = albedo,
// A = window mask (lit at night by the city shader). Built into a DataTexture so the
// alpha channel never premultiplies away the colour underneath.

import * as THREE from 'three';
import { makeRng } from '../util.js';

export const ATLAS_SIZE = 1024;
export const TILE_PX = 256;
export const TILES = {
  white: [0, 0], asphalt: [1, 0], sidewalk: [2, 0], grass: [3, 0],
  sand: [0, 1], roof: [1, 1], glass: [2, 1], office: [3, 1],
  deco: [0, 2], house: [1, 2], warehouse: [2, 2], shop: [3, 2],
  darkglass: [0, 3], hotel: [1, 3], brick: [2, 3], container: [3, 3],
};
// UV origin (bottom-left) of a tile, after the row flip done in buildAtlas.
export function tileOrigin(name) {
  const [c, r] = TILES[name] || TILES.white;
  return [c / 4, 1 - (r + 1) / 4];
}

function noise(ctx, x, y, w, h, rng, amount, alpha = 0.08, size = 2) {
  for (let k = 0; k < amount; k++) {
    const v = rng() < 0.5 ? 0 : 255;
    ctx.fillStyle = `rgba(${v},${v},${v},${alpha * rng()})`;
    ctx.fillRect(x + rng() * w, y + rng() * h, size, size);
  }
}

export function buildAtlas() {
  const rng = makeRng(99);
  const S = ATLAS_SIZE, T = TILE_PX;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  const m = document.createElement('canvas');
  m.width = m.height = S;
  const mctx = m.getContext('2d');
  mctx.fillStyle = '#000';
  mctx.fillRect(0, 0, S, S);

  const tile = (name, fn) => {
    const [col, row] = TILES[name];
    const x0 = col * T, y0 = row * T;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, y0, T, T);
    ctx.clip();
    ctx.translate(x0, y0);
    mctx.save();
    mctx.translate(x0, y0);
    // win(x,y,w,h) marks a window area in the mask
    const win = (x, y, w, h, v = 1) => {
      mctx.fillStyle = `rgba(255,255,255,${v})`;
      mctx.fillRect(x, y, w, h);
    };
    fn(ctx, win);
    ctx.restore();
    mctx.restore();
  };

  // glass pane with a sky reflection gradient
  const pane = (g, x, y, w, h, top, bottom, streak = true) => {
    const gr = g.createLinearGradient(x, y, x + w * 0.4, y + h);
    gr.addColorStop(0, top);
    gr.addColorStop(1, bottom);
    g.fillStyle = gr;
    g.fillRect(x, y, w, h);
    if (streak) {
      g.fillStyle = 'rgba(255,255,255,0.10)';
      g.beginPath();
      g.moveTo(x + w * 0.15, y);
      g.lineTo(x + w * 0.45, y);
      g.lineTo(x + w * 0.1, y + h);
      g.lineTo(x - w * 0.2, y + h);
      g.closePath();
      g.fill();
    }
  };

  tile('white', (g) => {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, T, T);
  });

  tile('asphalt', (g) => {
    g.fillStyle = '#3b3e44';
    g.fillRect(0, 0, T, T);
    noise(g, 0, 0, T, T, rng, 5000, 0.18, 2);
    g.strokeStyle = 'rgba(20,20,22,0.35)';
    g.lineWidth = 1.5;
    for (let k = 0; k < 4; k++) {
      g.beginPath();
      let x = rng() * T, y = rng() * T;
      g.moveTo(x, y);
      for (let s = 0; s < 6; s++) {
        x += (rng() - 0.5) * 40; y += (rng() - 0.5) * 40;
        g.lineTo(x, y);
      }
      g.stroke();
    }
  });

  tile('sidewalk', (g) => {
    g.fillStyle = '#bdb9b1';
    g.fillRect(0, 0, T, T);
    noise(g, 0, 0, T, T, rng, 2500, 0.12, 2);
    g.strokeStyle = 'rgba(80,76,70,0.45)';
    g.lineWidth = 3;
    for (let k = 0; k <= 4; k++) {
      g.beginPath(); g.moveTo(k * 64, 0); g.lineTo(k * 64, T); g.stroke();
      g.beginPath(); g.moveTo(0, k * 64); g.lineTo(T, k * 64); g.stroke();
    }
  });

  tile('grass', (g) => {
    g.fillStyle = '#5a9a45';
    g.fillRect(0, 0, T, T);
    for (let k = 0; k < 6000; k++) {
      const v = rng();
      g.fillStyle = v < 0.5 ? 'rgba(40,90,30,0.35)' : 'rgba(140,190,90,0.3)';
      g.fillRect(rng() * T, rng() * T, 2, 3);
    }
  });

  tile('sand', (g) => {
    g.fillStyle = '#ecd9a8';
    g.fillRect(0, 0, T, T);
    noise(g, 0, 0, T, T, rng, 7000, 0.15, 1.5);
  });

  tile('roof', (g) => {
    g.fillStyle = '#9a9ea4';
    g.fillRect(0, 0, T, T);
    noise(g, 0, 0, T, T, rng, 8000, 0.2, 2);
  });

  // 2x2 window cells per tile for every facade
  tile('glass', (g, win) => {
    g.fillStyle = '#c7d3de';
    g.fillRect(0, 0, T, T);
    for (let a = 0; a < 2; a++) {
      for (let b = 0; b < 2; b++) {
        const x = a * 128 + 5, y = b * 128 + 5;
        pane(g, x, y, 118, 112, '#9cc8ec', '#2f5f8e');
        win(x, y, 118, 112);
      }
    }
    g.fillStyle = '#e8eef3';
    g.fillRect(0, 120, T, 9); g.fillRect(0, 248, T, 8);
  });

  tile('office', (g, win) => {
    g.fillStyle = '#ece8e0';
    g.fillRect(0, 0, T, T);
    noise(g, 0, 0, T, T, rng, 1500, 0.08, 2);
    for (let a = 0; a < 2; a++) {
      for (let b = 0; b < 2; b++) {
        const x = a * 128 + 22, y = b * 128 + 26;
        g.fillStyle = '#8a8680';
        g.fillRect(x - 3, y - 3, 90, 78);
        pane(g, x, y, 84, 72, '#7ea3c2', '#2b3f55');
        g.fillStyle = 'rgba(230,230,230,0.6)';
        g.fillRect(x + 41, y, 3, 72);
        win(x, y, 84, 72);
        g.fillStyle = '#d6d0c4';
        g.fillRect(x - 6, y + 74, 96, 6);
      }
    }
  });

  tile('deco', (g, win) => {
    g.fillStyle = '#fbf7f0';
    g.fillRect(0, 0, T, T);
    for (let b = 0; b < 2; b++) {
      const y = b * 128 + 34;
      // ribbon window band
      g.fillStyle = '#6a7d8c';
      g.fillRect(0, y - 3, T, 58);
      for (let a = 0; a < 4; a++) {
        const x = a * 64 + 6;
        pane(g, x, y, 52, 52, '#a8e0f0', '#2c6f8a', false);
        win(x, y, 52, 52);
      }
      // eyebrow ledge + pastel accent lines
      g.fillStyle = 'rgba(0,0,0,0.12)';
      g.fillRect(0, y - 10, T, 6);
      g.fillStyle = 'rgba(255,255,255,0.9)';
      g.fillRect(0, y - 14, T, 4);
      g.fillStyle = 'rgba(0,0,0,0.08)';
      g.fillRect(0, y + 66, T, 3);
      g.fillRect(0, y + 74, T, 3);
    }
  });

  tile('house', (g, win) => {
    g.fillStyle = '#fbf8f2';
    g.fillRect(0, 0, T, T);
    g.strokeStyle = 'rgba(0,0,0,0.06)';
    g.lineWidth = 2;
    for (let y = 4; y < T; y += 12) { g.beginPath(); g.moveTo(0, y); g.lineTo(T, y); g.stroke(); }
    for (let a = 0; a < 2; a++) {
      for (let b = 0; b < 2; b++) {
        const x = a * 128 + 34, y = b * 128 + 30;
        g.fillStyle = '#ffffff';
        g.fillRect(x - 6, y - 6, 72, 82);
        pane(g, x, y, 60, 70, '#bfe3f5', '#46708c');
        g.fillStyle = '#ffffff';
        g.fillRect(x + 28, y, 4, 70);
        g.fillRect(x, y + 33, 60, 4);
        win(x, y, 60, 70);
        // shutters
        g.fillStyle = 'rgba(70,110,140,0.55)';
        g.fillRect(x - 20, y - 4, 12, 78);
        g.fillRect(x + 68, y - 4, 12, 78);
      }
    }
  });

  tile('warehouse', (g, win) => {
    g.fillStyle = '#d9d9d9';
    g.fillRect(0, 0, T, T);
    for (let x = 0; x < T; x += 16) {
      g.fillStyle = 'rgba(0,0,0,0.16)';
      g.fillRect(x, 0, 5, T);
      g.fillStyle = 'rgba(255,255,255,0.22)';
      g.fillRect(x + 7, 0, 3, T);
    }
    noise(g, 0, 0, T, T, rng, 1500, 0.15, 3);
    // small high windows on the upper cell only
    for (let a = 0; a < 2; a++) {
      const x = a * 128 + 30;
      pane(g, x, 12, 68, 20, '#c0d4e0', '#56707f', false);
      win(x, 12, 68, 20, 0.6);
    }
    g.fillStyle = 'rgba(120,60,20,0.18)';
    for (let k = 0; k < 10; k++) g.fillRect(rng() * T, rng() * T, 3, 30 + rng() * 60);
  });

  tile('shop', (g, win) => {
    // one storey shopfront (the tile maps to one floor)
    g.fillStyle = '#f4efe6';
    g.fillRect(0, 0, T, T);
    // awning stripes
    const cols = ['#e8455b', '#ffffff'];
    for (let k = 0; k < 16; k++) {
      g.fillStyle = cols[k % 2];
      g.fillRect(k * 16, 6, 16, 40);
    }
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(0, 46, T, 6);
    // windows with warm interior
    for (let a = 0; a < 2; a++) {
      const x = a * 128 + 10;
      g.fillStyle = '#3d3a36';
      g.fillRect(x - 4, 62, 116, 176);
      const gr = g.createLinearGradient(0, 66, 0, 236);
      gr.addColorStop(0, '#ffe3a8');
      gr.addColorStop(1, '#c7864a');
      g.fillStyle = gr;
      g.fillRect(x, 66, 108, 168);
      // shelves / silhouettes
      g.fillStyle = 'rgba(80,40,20,0.35)';
      for (let k = 0; k < 4; k++) g.fillRect(x + 6 + rng() * 80, 120 + rng() * 80, 14 + rng() * 20, 20 + rng() * 40);
      g.fillStyle = 'rgba(255,255,255,0.15)';
      g.fillRect(x + 10, 66, 16, 168);
      win(x, 66, 108, 168);
      g.fillStyle = '#3d3a36';
      g.fillRect(x + 52, 66, 4, 168);
    }
  });

  tile('darkglass', (g, win) => {
    g.fillStyle = '#1b2230';
    g.fillRect(0, 0, T, T);
    for (let a = 0; a < 2; a++) {
      for (let b = 0; b < 2; b++) {
        const x = a * 128 + 3, y = b * 128 + 3;
        pane(g, x, y, 122, 122, '#3b4f6a', '#0c1220');
        win(x, y, 122, 122, 0.9);
      }
    }
    g.fillStyle = '#5a6577';
    g.fillRect(0, 0, 3, T); g.fillRect(125, 0, 6, T); g.fillRect(253, 0, 3, T);
  });

  tile('hotel', (g, win) => {
    g.fillStyle = '#faf6ee';
    g.fillRect(0, 0, T, T);
    for (let b = 0; b < 2; b++) {
      for (let a = 0; a < 2; a++) {
        const x = a * 128 + 14, y = b * 128 + 14;
        pane(g, x, y, 100, 86, '#9fd6ea', '#2d6a85');
        g.fillStyle = 'rgba(255,255,255,0.7)';
        g.fillRect(x + 49, y, 3, 86);
        win(x, y, 100, 86);
      }
      // balcony slab and railing
      const y = b * 128 + 100;
      g.fillStyle = '#e0d8ca';
      g.fillRect(0, y, T, 14);
      g.fillStyle = 'rgba(40,50,60,0.55)';
      g.fillRect(0, y - 28, T, 3);
      for (let x = 4; x < T; x += 10) g.fillRect(x, y - 28, 2, 28);
      g.fillStyle = 'rgba(0,0,0,0.12)';
      g.fillRect(0, y + 14, T, 6);
    }
  });

  tile('brick', (g, win) => {
    g.fillStyle = '#9c4f3a';
    g.fillRect(0, 0, T, T);
    for (let y = 0; y < T; y += 10) {
      const off = (y / 10) % 2 ? 0 : 12;
      for (let x = -24; x < T; x += 24) {
        g.fillStyle = `rgba(${150 + rng() * 40},${70 + rng() * 25},${50 + rng() * 20},1)`;
        g.fillRect(x + off + 1, y + 1, 22, 8);
      }
    }
    for (let a = 0; a < 2; a++) {
      for (let b = 0; b < 2; b++) {
        const x = a * 128 + 30, y = b * 128 + 24;
        g.fillStyle = '#e8e0d0';
        g.fillRect(x - 5, y - 8, 78, 92);
        pane(g, x, y, 68, 76, '#8fb4c8', '#2e4656');
        g.fillStyle = '#e8e0d0';
        g.fillRect(x, y + 36, 68, 4);
        win(x, y, 68, 76);
      }
    }
  });

  tile('container', (g) => {
    g.fillStyle = '#e6e6e6';
    g.fillRect(0, 0, T, T);
    for (let x = 0; x < T; x += 12) {
      g.fillStyle = 'rgba(0,0,0,0.18)';
      g.fillRect(x, 0, 4, T);
      g.fillStyle = 'rgba(255,255,255,0.25)';
      g.fillRect(x + 6, 0, 2, T);
    }
    g.fillStyle = 'rgba(0,0,0,0.3)';
    g.fillRect(0, 0, T, 8); g.fillRect(0, T - 8, T, 8);
    noise(g, 0, 0, T, T, rng, 800, 0.2, 3);
  });

  // combine RGB + mask into a flipped RGBA buffer
  const rgb = ctx.getImageData(0, 0, S, S).data;
  const mask = mctx.getImageData(0, 0, S, S).data;
  const data = new Uint8Array(S * S * 4);
  for (let y = 0; y < S; y++) {
    const src = (S - 1 - y) * S * 4, dst = y * S * 4;
    for (let x = 0; x < S * 4; x += 4) {
      data[dst + x] = rgb[src + x];
      data[dst + x + 1] = rgb[src + x + 1];
      data[dst + x + 2] = rgb[src + x + 2];
      data[dst + x + 3] = mask[src + x];
    }
  }
  const tex = new THREE.DataTexture(data, S, S, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/** Shared uniform: 0 by day, 1 at night (window glow, neon strength). */
export const nightUniform = { value: 0 };

const PAD = 4 / ATLAS_SIZE;
const TS = 0.25;

/** The single material used by all static city geometry. */
export function makeCityMaterial(atlas) {
  const mat = new THREE.MeshLambertMaterial({ map: atlas, vertexColors: true });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uNight = nightUniform;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 tinfo;\nvarying vec3 vTinfo;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\n\tvTinfo = tinfo;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vTinfo;
uniform float uNight;
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * .1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}`,
      )
      .replace(
        '#include <map_fragment>',
        `
  float winMask = 0.0;
  vec3 winGlow = vec3(0.0);
  #ifdef USE_MAP
    vec2 g = vMapUv * ${(TS - 2 * PAD).toFixed(6)};
    vec2 tuv = vTinfo.xy + ${PAD.toFixed(6)} + fract(vMapUv) * ${(TS - 2 * PAD).toFixed(6)};
    vec4 texel = textureGrad(map, tuv, dFdx(g), dFdy(g));
    winMask = texel.a;
    diffuseColor.rgb *= texel.rgb;
    float mode = floor(vTinfo.z);
    float sd = fract(vTinfo.z);
    vec2 cellId = floor(vMapUv * 2.0);
    float h = hash12(cellId + sd * 731.0);
    float lit = mode > 1.5 ? 0.0 : (mode > 0.5 ? 1.0 : step(0.62, h));
    vec3 wc = mix(vec3(1.0, 0.70, 0.36), vec3(0.62, 0.84, 1.0), step(0.7, hash12(cellId.yx + sd * 91.0)));
    winGlow = wc * lit * winMask * uNight * (mode > 0.5 ? 0.55 : 1.05);
  #endif
`,
      )
      .replace(
        '#include <color_fragment>',
        `
  #if defined( USE_COLOR )
    diffuseColor.rgb *= mix(vColor, vec3(1.0), winMask * 0.8);
  #endif
`,
      )
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n\ttotalEmissiveRadiance += winGlow;');
  };
  mat.customProgramCacheKey = () => 'city-atlas-v1';
  return mat;
}

/** Text sign texture (unlit neon-ish). */
export function makeSignTexture(text, color, bg) {
  const c = document.createElement('canvas');
  const h = 128;
  const ctx0 = c.getContext('2d');
  ctx0.font = 'bold 84px Arial Black, Arial, sans-serif';
  const w = Math.min(2048, Math.max(256, Math.ceil(ctx0.measureText(text).width + 80)));
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, w - 12, h - 12);
  ctx.font = 'bold 84px Arial Black, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.fillStyle = color;
  ctx.fillText(text, w / 2, h / 2 + 4);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = 'bold 80px Arial Black, Arial, sans-serif';
  ctx.fillText(text, w / 2, h / 2 + 4);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { tex, aspect: w / h };
}

/** Soft round sprite used by glow points and particles. */
export function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.25, 'rgba(255,255,255,0.6)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  return tex;
}
