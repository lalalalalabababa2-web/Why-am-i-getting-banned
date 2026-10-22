
;
/* Afterlight v12 — Realism.
 * Photoscanned CC0 surfaces (Poly Haven), HDRI skies and image-based light,
 * local reflection probes, camera exposure/motion/focus, external and terminal
 * ballistics, recoil and sway, a tiring body, anatomical damage and acoustic
 * propagation. Everything is one layer over the v11 engine; each aspect has
 * its own switch so the original behaviour is one tap away.
 */
(() => {
  "use strict";
  const a = window.__AF_OVERHAUL__?.state;
  if (!a?.engine || a.realismV12) return;
  const e = a.engine, K = a.constants;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const lerp = (x, y, t) => x + (y - x) * t;
  const asset = (p) => new URL("./realism/" + p, import.meta.url).href;

  /* ------------------------------------------------------------------ */
  /* Settings                                                            */
  /* ------------------------------------------------------------------ */
  const KEY = "afterlight.realism.v12";
  const ASPECTS = ["surfaces", "sky", "camera", "filmic", "ballistics", "handling", "body", "injuries", "anatomy", "acoustics"];
  const PRESETS = {
    off: { surfaces: false, sky: false, camera: false, filmic: false, ballistics: false, handling: false, body: false, injuries: false, anatomy: false, acoustics: false, hud: "standard", lethality: 1 },
    authentic: { surfaces: true, sky: true, camera: true, filmic: true, ballistics: true, handling: true, body: true, injuries: true, anatomy: true, acoustics: true, hud: "immersive", lethality: 1 },
    hardcore: { surfaces: true, sky: true, camera: true, filmic: true, ballistics: true, handling: true, body: true, injuries: true, anatomy: true, acoustics: true, hud: "minimal", lethality: 1.45 },
  };
  function load() {
    const s = { preset: "authentic", ...PRESETS.authentic, motionBlur: true };
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || "null");
      if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) if (k in s && typeof x === typeof s[k]) s[k] = x;
    } catch {}
    return s;
  }
  const R = (a.realismV12 = {
    version: "12.0",
    settings: load(),
    stats: { photoMaterials: 0, photoTextures: 0, probes: 0, hdri: null, shots: 0, segments: 0, mantles: 0, falls: 0 },
    listeners: [],
    on(fn) { this.listeners.push(fn); },
    save(patch) {
      Object.assign(this.settings, patch);
      try { localStorage.setItem(KEY, JSON.stringify(this.settings)); } catch {}
      for (const fn of this.listeners) try { fn(this.settings); } catch (err) { console.error("[realism] settings hook", err); }
    },
    applyPreset(name) {
      const p = PRESETS[name];
      if (!p) return;
      this.save({ preset: name, ...p });
    },
  });
  const S = R.settings;
  const on = (k) => !!S[k];
  const quality = () => a.settings?.qualityV10 || "balanced";

  /* ------------------------------------------------------------------ */
  /* Photoscanned surfaces                                               */
  /* ------------------------------------------------------------------ */
  // Albedo (sRGB, cavity AO baked at 28 %) + packed normal.xy / roughness.
  // avg = linear mean albedo, used to keep each designer tint while the photo
  // supplies the detail; scale = metres covered by one texture repeat.
  const SURF = {
    tile:      { avg: [0.2379, 0.1753, 0.1243], scale: 1.5, normal: 1.0, rough: 1.0, metal: 0 },
    plaster:   { avg: [0.2115, 0.1966, 0.1569], scale: 1.9, normal: 1.0, rough: 1.0, metal: 0 },
    concrete:  { avg: [0.2616, 0.2329, 0.1590], scale: 2.71, normal: 1.0, rough: 1.0, metal: 0, top: "concrete_top" },
    concrete_top: { avg: [0.0909, 0.0919, 0.0868], scale: 3.0, normal: 1.0, rough: 1.0, metal: 0 },
    brick:     { avg: [0.1329, 0.0731, 0.0487], scale: 3.0, normal: 1.0, rough: 1.0, metal: 0 },
    adobe:     { avg: [0.6181, 0.4866, 0.3496], scale: 3.0, normal: 1.0, rough: 1.05, metal: 0 },
    wood:      { avg: [0.0858, 0.0288, 0.0077], scale: 1.0, normal: 0.9, rough: 1.0, metal: 0 },
    crate:     { avg: [0.3646, 0.2132, 0.0926], scale: 1.4, normal: 1.0, rough: 1.0, metal: 0 },
    pier:      { avg: [0.1177, 0.0726, 0.0437], scale: 1.8, normal: 1.0, rough: 1.0, metal: 0 },
    bark:      { avg: [0.1281, 0.0822, 0.0502], scale: 1.4, normal: 1.1, rough: 1.0, metal: 0 },
    // painted steel with rust runs; the paint is a dielectric
    metal:     { avg: [0.0466, 0.0689, 0.0320], scale: 1.2, normal: 0.9, rough: 1.0, metal: 0.22 },
    container: { avg: [0.0979, 0.2226, 0.0737], scale: 1.94, normal: 1.0, rough: 1.0, metal: 0.18 },
    fabric:    { avg: [0.3940, 0.0255, 0.0600], scale: 0.45, normal: 0.75, rough: 1.05, metal: 0 },
    carpet:    { avg: [0.0301, 0.0243, 0.0162], scale: 0.9, normal: 0.85, rough: 1.0, metal: 0 },
    sandbag:   { avg: [0.2647, 0.1879, 0.1015], scale: 0.6, normal: 1.0, rough: 1.1, metal: 0 },
    asphalt:   { avg: [0.0941, 0.0927, 0.0826], scale: 3.0, normal: 1.0, rough: 1.0, metal: 0 },
    dirt:      { avg: [0.1185, 0.0808, 0.0465], scale: 2.4, normal: 1.0, rough: 1.0, metal: 0 },
    grass:     { avg: [0.0753, 0.0453, 0.0082], scale: 2.0, normal: 1.0, rough: 1.0, metal: 0 },
    sand:      { avg: [0.2196, 0.1682, 0.1063], scale: 4.0, normal: 0.9, rough: 1.0, metal: 0 },
    rock:      { avg: [0.2215, 0.1388, 0.0800], scale: 3.6, normal: 1.15, rough: 1.0, metal: 0 },
    // Viewmodel finishes (object space, so they stay put on the moving gun).
    // Phosphate (parkerized) finish: a porous conversion coat, so mostly dielectric.
    gunmetal:  { avg: [0.0461, 0.0470, 0.0488], scale: 0.14, normal: 0.9, rough: 1.05, metal: 0.32 },
    polymer:   { avg: [0.0321, 0.0321, 0.0328], scale: 0.07, normal: 1.0, rough: 1.0, metal: null },
    stock:     { avg: [0.3542, 0.2077, 0.0966], scale: 0.45, normal: 0.8, rough: 1.0, metal: null },
    linen:     { avg: [0.2469, 0.3528, 0.5295], scale: 0.14, normal: 1.0, rough: 1.0, metal: null },
    leather:   { avg: [0.0772, 0.0255, 0.0052], scale: 0.2, normal: 1.0, rough: 0.95, metal: null },
    jersey:    { avg: [0.5135, 0.3852, 0.3207], scale: 0.22, normal: 1.0, rough: 1.0, metal: null },
    // Characters: detail layers over their authored colour/stain maps.
    pores:     { avg: [0.4948, 0.4948, 0.4948], scale: 0.075, normal: 0.8, rough: 1.0, metal: null },
  };
  const DETAIL = [
    [/^model-v10:cloth:/, "jersey", 0.18], [/^model-v10:seams:/, "linen", 0.12], [/^model-v10:leather$/, "leather", 0.14],
    [/^model-v10:skin:/, "pores", 0.075], [/^model-v10:v11-face-material:/, "pores", 0.06],
    [/^undead:cloth:/, "jersey", 0.18], [/^undead:leather$/, "leather", 0.14], [/^undead:(skin|face):/, "pores", 0.075],
    [/^soldier:cloth:/, "linen", 0.1], [/^soldier:armor:/, "linen", 0.07], [/^soldier:glove:/, "leather", 0.1], [/^soldier:skin:/, "pores", 0.06],
  ];
  const VIEW = {
    steel: ["gunmetal", 3423296], dark: ["gunmetal", 1514784], edge: ["gunmetal", 6910579],
    polymer: ["polymer", 3159602], tan: ["polymer", 8812378], olive: ["polymer", 5594180], rubber: ["polymer", 1580059],
    wood: ["stock", 7360570], sleeve: ["linen", 4278331], glove: ["leather", 2632487], seam: ["linen", 5593676],
  };
  // World-v5 props reuse the nearest scanned family.
  const V5_ALIAS = { steel: "metal" };
  const DEFAULT_TINT = {
    concrete: 11184544, metal: 7897223, wood: 9926478, container: 6449242, brick: 10188391, adobe: 11574395,
    sand: 12692616, rock: 8026987, sandbag: 9736312, crate: 8942159, asphalt: 5593952, grass: 7438425, dirt: 7694157,
    pier: 6712940, bark: 5983031, plaster: 11444876, fabric: 7033159, carpet: 6633011, tile: 10063739,
  };
  const texCache = new Map();
  function loadImage(url) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => res(img);
      img.onerror = () => rej(new Error("realism: cannot load " + url));
      img.src = url;
    });
  }
  function surfaceTextures(gfx, fam) {
    const top = SURF[fam]?.top;
    if (top) {
      const a1 = surfaceSet(gfx, fam), a2 = surfaceSet(gfx, top);
      const key = fam + "+" + top;
      let rec = texCache.get(key);
      if (rec) return rec;
      rec = { ready: false, albedo: null, nr: null, albedoTop: null, nrTop: null, waiting: [] };
      texCache.set(key, rec);
      const done = () => {
        if (!a1.ready || !a2.ready || rec.ready) return;
        Object.assign(rec, { albedo: a1.albedo, nr: a1.nr, albedoTop: a2.albedo, nrTop: a2.nr, ready: true });
        for (const fn of rec.waiting.splice(0)) fn(rec);
      };
      for (const r of [a1, a2]) r.ready ? done() : r.waiting.push(done);
      return rec;
    }
    const r = surfaceSet(gfx, fam);
    if (r.ready && !r.albedoTop) { r.albedoTop = r.albedo; r.nrTop = r.nr; }
    return r;
  }
  function surfaceSet(gfx, fam) {
    const size = quality() === "performance" ? 512 : 1024;
    const key = fam + ":" + size;
    let rec = texCache.get(key);
    if (rec) return rec;
    rec = { ready: false, albedo: null, nr: null, waiting: [] };
    texCache.set(key, rec);
    const aniso = Math.min(gfx.gl.capabilities.getMaxAnisotropy(), quality() === "ultra" ? 16 : quality() === "performance" ? 4 : 8);
    const make = (img, srgb) => {
      let src = img;
      if (img.width > size) {
        src = document.createElement("canvas");
        src.width = src.height = size;
        src.getContext("2d").drawImage(img, 0, 0, size, size);
      }
      const t = new e.CanvasTexture(src);
      t.name = "realism:" + fam + (srgb ? ":albedo" : ":normal-roughness");
      t.wrapS = t.wrapT = K.RepeatWrapping;
      t.minFilter = K.LinearMipmapLinearFilter;
      t.magFilter = K.LinearFilter;
      t.anisotropy = aniso;
      if (srgb) t.colorSpace = K.SRGBColorSpace;
      t.needsUpdate = true;
      return t;
    };
    Promise.all([loadImage(asset(`tex/${fam}_c.jpg`)), loadImage(asset(`tex/${fam}_n.jpg`))])
      .then(([c, n]) => {
        rec.albedo = rec.albedoTop = make(c, true);
        rec.nr = rec.nrTop = make(n, false);
        rec.ready = true;
        R.stats.photoTextures += 2;
        for (const fn of rec.waiting.splice(0)) fn(rec);
        if (R.probes) R.probes.dirty = true;
      })
      .catch((err) => console.warn(err.message));
    return rec;
  }
  const linear = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  // Keep the art-directed tint and brightness; let the scan bring the detail.
  function compensatedColor(fam, hex, base = fam, hueOverride = null) {
    const info = SURF[fam];
    const t = [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255].map((v) => linear(v / 255) * 0.75);
    const p = info.avg, lt = Math.max(1e-4, lum(t)), lp = Math.max(1e-4, lum(p));
    const b = clamp(lt / lp, 0.25, 4.2);
    const hue = hueOverride ?? (DEFAULT_TINT[base] === hex ? 0.7 : 0.85);
    return [0, 1, 2].map((i) => b * clamp(Math.pow((t[i] / lt) / Math.max(1e-4, p[i] / lp), hue), 0.35, 2.8));
  }
  const SURF_VERT_DECL = `
varying vec3 vRlPos;
varying vec3 vRlNrm;
varying vec3 vRlAx;
varying vec3 vRlAy;
varying vec3 vRlAz;`;
  const SURF_VERT = `
vRlPos = position;
vRlNrm = objectNormal;
{
  mat3 rlM = mat3(1.0);
  #ifdef USE_INSTANCING
  rlM = mat3(instanceMatrix);
  #endif
  #ifdef USE_BATCHING
  rlM = mat3(batchingMatrix) * rlM;
  #endif
  vRlAx = normalize(normalMatrix * (rlM * vec3(1.0, 0.0, 0.0)));
  vRlAy = normalize(normalMatrix * (rlM * vec3(0.0, 1.0, 0.0)));
  vRlAz = normalize(normalMatrix * (rlM * vec3(0.0, 0.0, 1.0)));
}`;
  const SURF_FRAG_DECL = `
uniform sampler2D rlAlbedo;
uniform sampler2D rlNR;
uniform sampler2D rlAlbedoTop;
uniform sampler2D rlNRTop;
uniform vec3 rlTopTint;
uniform float rlTopScale;
uniform float rlScale;
uniform float rlNormal;
uniform float rlRough;
uniform float rlWet;
uniform float rlDetail;
uniform vec3 rlAvg;
varying vec3 vRlPos;
varying vec3 vRlNrm;
varying vec3 vRlAx;
varying vec3 vRlAy;
varying vec3 vRlAz;`;
  // Up to three planar projections, weighted by the smooth normal; flat faces
  // (almost everything in these maps) take the single-sample branch.
  const SURF_FRAG_MAP = `
vec3 rlN0 = normalize(vRlNrm);
vec3 rlW = pow(abs(rlN0), vec3(8.0));
rlW /= max(1e-5, rlW.x + rlW.y + rlW.z);
vec3 rlAlbAcc = vec3(0.0);
vec3 rlPert = vec3(0.0);
float rlRoughAcc = 0.0;
vec3 rlP = vRlPos * rlScale;
// Gradients are taken outside the branches (derivatives are undefined in
// divergent control flow on many mobile GPUs).
vec2 rlUy = vRlPos.xz * rlTopScale, rlUx = rlP.zy, rlUz = rlP.xy;
vec2 rlGyx = dFdx(rlUy), rlGyy = dFdy(rlUy), rlGxx = dFdx(rlUx), rlGxy = dFdy(rlUx), rlGzx = dFdx(rlUz), rlGzy = dFdy(rlUz);
if (rlW.y > 0.02) {
  vec3 c = textureGrad(rlAlbedoTop, rlUy, rlGyx, rlGyy).rgb * rlTopTint; vec3 n = textureGrad(rlNRTop, rlUy, rlGyx, rlGyy).rgb;
  vec2 t = n.rg * 2.0 - 1.0;
  rlAlbAcc += c * rlW.y; rlRoughAcc += n.b * rlW.y;
  rlPert += (vec3(1.0, 0.0, 0.0) * t.x + vec3(0.0, 0.0, 1.0) * t.y) * rlW.y;
}
if (rlW.x > 0.02) {
  vec3 c = textureGrad(rlAlbedo, rlUx, rlGxx, rlGxy).rgb; vec3 n = textureGrad(rlNR, rlUx, rlGxx, rlGxy).rgb;
  vec2 t = n.rg * 2.0 - 1.0;
  rlAlbAcc += c * rlW.x; rlRoughAcc += n.b * rlW.x;
  rlPert += (vec3(0.0, 0.0, 1.0) * t.x + vec3(0.0, 1.0, 0.0) * t.y) * rlW.x;
}
if (rlW.z > 0.02) {
  vec3 c = textureGrad(rlAlbedo, rlUz, rlGzx, rlGzy).rgb; vec3 n = textureGrad(rlNR, rlUz, rlGzx, rlGzy).rgb;
  vec2 t = n.rg * 2.0 - 1.0;
  rlAlbAcc += c * rlW.z; rlRoughAcc += n.b * rlW.z;
  rlPert += (vec3(1.0, 0.0, 0.0) * t.x + vec3(0.0, 1.0, 0.0) * t.y) * rlW.z;
}
if (rlDetail > 0.5) diffuseColor.rgb *= mix(vec3(1.0), rlAlbAcc / max(rlAvg, vec3(1e-3)), 0.55);
else diffuseColor.rgb *= rlAlbAcc;
// Rain darkens and seals porous horizontal surfaces.
float rlWetMask = rlWet * smoothstep(0.55, 0.9, rlN0.y) * smoothstep(0.35, 0.75, rlRoughAcc);
diffuseColor.rgb *= 1.0 - rlWetMask * 0.38;`;
  const SURF_FRAG_ROUGH = `
if (rlDetail > 0.5) roughnessFactor = clamp(mix(roughnessFactor, rlRoughAcc * rlRough, 0.6), 0.05, 1.0);
else roughnessFactor = clamp(rlRoughAcc * rlRough * (1.0 - rlWetMask * 0.72), 0.045, 1.0);`;
  const SURF_FRAG_NORMAL = `
{
  vec3 rlNs = rlN0;
  #ifdef DOUBLE_SIDED
  rlNs *= faceDirection;
  rlPert *= faceDirection;
  #endif
  vec3 rlObj = normalize(rlNs + rlPert * rlNormal * (1.0 - rlWetMask * 0.55));
  normal = normalize(rlObj.x * vRlAx + rlObj.y * vRlAy + rlObj.z * vRlAz);
}`;
  const photo = { materials: new Map(), wet: { value: 0 } };
  R.photo = photo;
  function photoFamily(key) {
    if (typeof key !== "string") return null;
    for (const [re, fam, scale] of DETAIL) if (re.test(key)) return { fam, detail: true, scale };
    const bits = key.split(":");
    if (bits[0] === "viewmodel") {
      const v = VIEW[bits[1]];
      return v && bits.length === 2 ? { fam: v[0], tint: v[1], view: true } : null;
    }
    if (bits[0] === "world-v5") {
      const f = V5_ALIAS[bits[1]];
      return f ? { fam: f, tint: Number(bits[2]) } : null;
    }
    if (bits.length !== 2 || !(bits[0] in SURF)) return null;
    return { fam: bits[0], tint: Number(bits[1]) };
  }
  function adoptMaterial(gfx, key, m) {
    if (!m?.isMeshStandardMaterial || photo.materials.has(m)) return;
    const f = photoFamily(key);
    if (!f) return;
    const info = SURF[f.fam];
    const rec = {
      gfx, fam: f.fam, tint: Number.isFinite(f.tint) ? f.tint : DEFAULT_TINT[f.fam], active: false,
      worldV5: key.startsWith("world-v5:") || !!f.view || !!f.detail,
      detail: !!f.detail,
      base: { color: m.color.clone(), metalness: m.metalness, roughness: m.roughness, map: m.map, normalMap: m.normalMap, roughnessMap: m.roughnessMap, bumpMap: m.bumpMap },
      uniforms: {
        rlAlbedo: { value: null }, rlNR: { value: null }, rlAlbedoTop: { value: null }, rlNRTop: { value: null },
        rlTopTint: { value: new e.Vector3(1, 1, 1) }, rlTopScale: { value: 1 / (SURF[info.top]?.scale || f.scale || info.scale) },
        rlScale: { value: 1 / (f.scale || info.scale) }, rlNormal: { value: info.normal },
        rlRough: { value: info.rough }, rlWet: f.detail ? { value: 0 } : photo.wet,
        rlDetail: { value: f.detail ? 1 : 0 }, rlAvg: { value: new e.Vector3(...info.avg) },
      },
    };
    photo.materials.set(m, rec);
    const previous = m.onBeforeCompile;
    const previousKey = m.customProgramCacheKey;
    m.onBeforeCompile = function (shader, renderer) {
      previous?.call(this, shader, renderer);
      if (!rec.active) return;
      Object.assign(shader.uniforms, rec.uniforms);
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\n" + SURF_VERT_DECL)
        .replace("#include <project_vertex>", "#include <project_vertex>\n" + SURF_VERT);
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\n" + SURF_FRAG_DECL)
        .replace("#include <map_fragment>", "#include <map_fragment>\n" + SURF_FRAG_MAP)
        .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\n" + SURF_FRAG_ROUGH)
        .replace("#include <normal_fragment_maps>", "#include <normal_fragment_maps>\n" + SURF_FRAG_NORMAL);
    };
    rec.keyFn = function () {
      return (rec.active ? "rl12-photo:" : "rl12-off:") + (previousKey ? previousKey.call(this) : "");
    };
    m.customProgramCacheKey = rec.keyFn;
    R.stats.photoMaterials = photo.materials.size;
    applyPhoto(m, rec);
  }
  function applyPhoto(m, rec) {
    // Another layer may have replaced the cache key without chaining it;
    // keep ours outermost so on/off variants never share a program.
    if (m.customProgramCacheKey !== rec.keyFn) {
      const inner = m.customProgramCacheKey;
      rec.keyFn = function () { return (rec.active ? "rl12-photo:" : "rl12-off:") + (inner ? inner.call(this) : ""); };
      m.customProgramCacheKey = rec.keyFn;
    }
    const want = on("surfaces") && !rec.gfx.settings.pixelLook;
    if (!want) {
      if (rec.active) {
        rec.active = false;
        m.color.copy(rec.base.color);
        m.metalness = rec.base.metalness;
        m.roughness = rec.base.roughness;
        // Restore the procedural maps the core renderer authored.
        if (rec.detail) {
          m.normalMap = rec.base.normalMap;
          m.bumpMap = rec.base.bumpMap;
        } else if (rec.worldV5) {
          m.map = rec.base.map;
          m.normalMap = rec.base.normalMap;
          m.roughnessMap = rec.base.roughnessMap;
          m.bumpMap = rec.base.bumpMap;
        } else {
          m.map = rec.gfx.tex(rec.fam);
          m.normalMap = rec.gfx.detailTex(rec.fam, true);
          m.roughnessMap = rec.gfx.detailTex(rec.fam, false);
        }
        m.needsUpdate = true;
      }
      return;
    }
    const tex = surfaceTextures(rec.gfx, rec.fam);
    if (!tex.ready) {
      if (!rec.waiting) {
        rec.waiting = true;
        tex.waiting.push(() => { rec.waiting = false; applyPhoto(m, rec); });
      }
      return;
    }
    const info = SURF[rec.fam];
    if (rec.detail) {
      rec.uniforms.rlAlbedo.value = rec.uniforms.rlAlbedoTop.value = tex.albedo;
      rec.uniforms.rlNR.value = rec.uniforms.rlNRTop.value = tex.nr;
      if (m.normalMap || m.bumpMap || !rec.active) {
        m.normalMap = m.bumpMap = null;
        rec.active = true;
        m.needsUpdate = true;
      }
      return;
    }
    rec.uniforms.rlAlbedo.value = tex.albedo;
    rec.uniforms.rlNR.value = tex.nr;
    rec.uniforms.rlAlbedoTop.value = tex.albedoTop || tex.albedo;
    rec.uniforms.rlNRTop.value = tex.nrTop || tex.nr;
    const c = compensatedColor(rec.fam, rec.tint, rec.fam, rec.fam === "gunmetal" ? 0.25 : null);
    m.color.setRGB(c[0], c[1], c[2]);
    if (info.top) {
      const ct = compensatedColor(info.top, rec.tint, rec.fam);
      rec.uniforms.rlTopTint.value.set(ct[0] / c[0], ct[1] / c[1], ct[2] / c[2]);
    }
    m.metalness = info.metal ?? rec.base.metalness;
    m.roughness = 1;
    if (m.map || m.normalMap || m.roughnessMap || m.bumpMap || !rec.active) {
      m.map = m.normalMap = m.roughnessMap = m.bumpMap = null;
      rec.active = true;
      m.needsUpdate = true;
    }
  }
  function refreshPhotos() {
    for (const [m, rec] of photo.materials) applyPhoto(m, rec);
  }

  /* ------------------------------------------------------------------ */
  /* Skies, image-based light and reflection probes                      */
  /* ------------------------------------------------------------------ */
  const SKIES = {
    yard: { sky: "yard", u: 0.59473, band: 0.5498, scale: 0.12852, day: true, skyI: 0.82, envI: 0.62, hemi: 0.35, fogMix: 0.55 },
    forest: { sky: "forest", u: 0.60059, band: 0.5498, scale: 0.17037, day: true, skyI: 0.74, envI: 0.56, hemi: 0.4, fogMix: 0.5 },
    urban: { sky: "urban", u: 0.58105, band: 0.5498, scale: 0.30731, day: true, skyI: 0.62, envI: 0.62, hemi: 0.35, fogMix: 0.6 },
    desert: { sky: "desert", u: 0.60059, band: 0.5498, scale: 0.19738, day: true, skyI: 0.92, envI: 0.62, hemi: 0.32, fogMix: 0.45 },
    harbor: { sky: "nightrain", u: 0.59863, band: 0.5498, scale: 0.29001, day: false, skyI: 0.012, envI: 0.1, hemi: 0.75, fogMix: 0.82 },
    rail: { sky: "nightrain", u: 0.59863, band: 0.5498, scale: 0.29001, day: false, skyI: 0.011, envI: 0.09, hemi: 0.8, fogMix: 0.82 },
    cemetery: { sky: "moon", u: 0.60059, band: 0.5498, scale: 0.28712, day: false, skyI: 0.01, envI: 0.08, hemi: 0.8, fogMix: 0.78 },
  };
  function rgbeToHalf(img) {
    const c = document.createElement("canvas");
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const src = ctx.getImageData(0, 0, c.width, c.height).data;
    const out = new Float32Array(c.width * c.height * 4);
    for (let i = 0; i < src.length; i += 4) {
      const ex = src[i + 3];
      const f = ex ? Math.pow(2, ex - 136) : 0;
      out[i] = src[i] * f; out[i + 1] = src[i + 1] * f; out[i + 2] = src[i + 2] * f; out[i + 3] = 1;
    }
    // Rows were written top-down; the equirect sampler expects flipY.
    const tex = new Uf(out, c.width, c.height, 1023, 1015);
    tex.mapping = 303;
    tex.flipY = true;
    tex.magFilter = tex.minFilter = 1006;
    tex.needsUpdate = true;
    return tex;
  }
  const skyCache = new Map();
  function skyAssets(gfx, name) {
    let rec = skyCache.get(name);
    if (rec) return rec;
    rec = { ready: false, sky: null, env: null, waiting: [] };
    skyCache.set(name, rec);
    Promise.all([loadImage(asset(`sky/${name}_sky.jpg`)), loadImage(asset(`sky/${name}_ibl.png`))])
      .then(([sky, ibl]) => {
        const t = new e.CanvasTexture(sky);
        t.colorSpace = K.SRGBColorSpace;
        t.wrapS = K.RepeatWrapping;
        t.minFilter = K.LinearMipmapLinearFilter;
        t.magFilter = K.LinearFilter;
        t.anisotropy = 4;
        t.needsUpdate = true;
        rec.sky = t;
        const eq = rgbeToHalf(ibl);
        const pm = new Jf(gfx.gl);
        rec.env = pm.fromEquirectangular(eq);
        pm.dispose();
        eq.dispose();
        rec.ready = true;
        for (const fn of rec.waiting.splice(0)) fn(rec);
      })
      .catch((err) => console.warn(err.message));
    return rec;
  }
  const SKY_VERT = "varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";
  const SKY_FRAG = `
varying vec3 vDir;
uniform sampler2D skyTex;
uniform float skyRot;
uniform float band;
uniform float skyScale;
uniform float intensity;
uniform vec3 fogColor;
uniform float fogMix;
uniform vec3 sunDir;
uniform vec3 sunColor;
uniform float sunDisc;
void main() {
  vec3 d = normalize(vDir);
  float u = atan(d.z, d.x) * 0.15915494 + 0.5 + skyRot;
  float v = asin(clamp(d.y, -1.0, 1.0)) * 0.31830989 + 0.5;
  float tv = (v - (1.0 - band)) / band;
  vec3 c = texture2D(skyTex, vec2(u, clamp(tv, 0.002, 0.998))).rgb / skyScale * intensity;
  // Aerial perspective: the low sky dissolves into the same air as the fog.
  float haze = (1.0 - smoothstep(-0.02, 0.32, d.y)) * fogMix;
  c = mix(c, fogColor, haze);
  float s = max(0.0, dot(d, sunDir));
  c += sunColor * (smoothstep(0.99985, 0.99996, s) * sunDisc + pow(s, 900.0) * sunDisc * 0.08);
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
  const sky = { active: false, def: null, rec: null, material: null, hemi: [], fogBase: null };
  R.sky = sky;
  function hdriFor(gfx) {
    const def = gfx.map?.def;
    if (!def || def.indoor) return null;
    if (gfx.map.theater?.kind === "arena-v5") return SKIES[def.id] || null;
    return SKIES[def.id] || null;
  }
  function applySky(gfx) {
    const def = gfx.map?.def;
    const cfg = hdriFor(gfx);
    const want = cfg && on("sky") && gfx.skyDome;
    if (!want) {
      if (sky.active) restoreSky(gfx);
      return;
    }
    const rec = skyAssets(gfx, cfg.sky);
    if (!rec.ready) {
      if (!rec.waiting.includes(sky.retry)) {
        sky.retry = () => applySky(gfx);
        rec.waiting.push(sky.retry);
      }
      return;
    }
    if (!sky.oldMaterial || sky.oldDome !== gfx.skyDome) {
      sky.oldDome = gfx.skyDome;
      sky.oldMaterial = gfx.skyDome.material;
    }
    const sd = new e.Vector3(def.sun.dir.x, def.sun.dir.y, def.sun.dir.z).normalize();
    const phi = Math.atan2(sd.z, sd.x);
    // Rotate the HDRI so its sun (or moon) sits where the map's key light is.
    const rot = (cfg.u - 0.5) - phi / (Math.PI * 2);
    if (!sky.material) {
      sky.material = new e.ShaderMaterial({
        side: 1, depthWrite: false, depthTest: false,
        uniforms: {
          skyTex: { value: null }, skyRot: { value: 0 }, band: { value: 0.55 }, skyScale: { value: 0.2 },
          intensity: { value: 1 }, fogColor: { value: new e.Color() }, fogMix: { value: 0.5 },
          sunDir: { value: new e.Vector3() }, sunColor: { value: new e.Color() }, sunDisc: { value: 0 },
        },
        vertexShader: SKY_VERT, fragmentShader: SKY_FRAG,
      });
    }
    const u = sky.material.uniforms;
    u.skyTex.value = rec.sky;
    u.skyRot.value = rot;
    u.band.value = cfg.band;
    u.skyScale.value = cfg.scale;
    u.intensity.value = cfg.skyI;
    u.fogColor.value.set(def.fog);
    u.fogMix.value = cfg.fogMix;
    u.sunDir.value.copy(sd);
    u.sunColor.value.set(def.sun.color).multiplyScalar(cfg.day ? 14 : 0.6);
    u.sunDisc.value = cfg.day ? 1 : 0.4;
    gfx.skyDome.material = sky.material;
    gfx.scene.environmentRotation.set(0, -rot * Math.PI * 2, 0);
    gfx.scene.environmentIntensity = cfg.envI;
    sky.rec = rec;
    sky.cfg = cfg;
    sky.active = true;
    R.stats.hdri = cfg.sky;
    environment(gfx);
  }
  function restoreSky(gfx) {
    if (sky.oldMaterial && gfx.skyDome === sky.oldDome) gfx.skyDome.material = sky.oldMaterial;
    for (const h of sky.hemi) h.light.intensity = h.base;
    gfx.scene.environmentRotation.set(0, 0, 0);
    if (gfx.map) gfx.scene.environmentIntensity = gfx.map.def.indoor ? 0.065 : 0.65;
    sky.active = false;
    sky.rec = null;
    R.stats.hdri = null;
    environment(gfx);
  }

  // Indoor maps: real reflection probes rendered from the built level replace
  // the generic studio room. A handful of probes cover the main spaces and the
  // nearest one follows the player.
  const probes = (R.probes = { list: [], dirty: false, timer: 0, current: null, game: null, captures: 0, power: null });
  function probeSpots(game) {
    const def = game.map.def, half = def.half || 30;
    const pts = [];
    const sp = def.playerSpawn;
    if (sp) pts.push({ x: sp.x, z: sp.z });
    for (const p of [[0, 0], [half * 0.45, 0], [-half * 0.45, 0], [0, -half * 0.5], [0, half * 0.5]]) pts.push({ x: p[0], z: p[1] });
    const world = game.map.world;
    const out = [];
    for (const p of pts) {
      const y = e.floorHeight ? e.floorHeight(world, { x: p.x, y: 1.2, z: p.z }) : 0;
      const pos = { x: p.x, y: (Number.isFinite(y) ? y : 0) + 1.6, z: p.z };
      // Skip probes inside solid geometry.
      if (world.boxes.some((b) => b.solid && !b.noRender && pos.x > b.min.x && pos.x < b.max.x && pos.y > b.min.y && pos.y < b.max.y && pos.z > b.min.z && pos.z < b.max.z)) continue;
      if (out.some((q) => Math.hypot(q.x - pos.x, q.z - pos.z) < 6)) continue;
      out.push(pos);
      if (out.length >= (quality() === "ultra" ? 5 : quality() === "performance" ? 1 : 3)) break;
    }
    return out;
  }
  function captureProbes(game) {
    const gfx = game.gfx;
    for (const p of probes.list) p.rt?.dispose();
    probes.list = [];
    if (!gfx.map?.def.indoor || !on("sky") || !game.settings.reflections) { environment(gfx); return; }
    const pm = new Jf(gfx.gl);
    const scene = gfx.scene;
    const hidden = [gfx.actorGroup, gfx.fxGroup, gfx.marker, gfx.flashlight, gfx.muzzleWorld];
    const vis = hidden.map((o) => o?.visible);
    const env = scene.environment, envI = scene.environmentIntensity, fog = scene.fog;
    hidden.forEach((o) => o && (o.visible = false));
    scene.environment = null;
    try {
      for (const pos of probeSpots(game)) {
        const rt = pm.fromScene(scene, 0.012, 0.1, Math.min(90, game.settings.drawDistance || 90), { size: quality() === "ultra" ? 256 : 128, position: new e.Vector3(pos.x, pos.y, pos.z) });
        probes.list.push({ pos, rt });
        probes.captures++;
      }
    } catch (err) {
      console.warn("[realism] probe capture failed", err);
    } finally {
      hidden.forEach((o, i) => o && (o.visible = vis[i]));
      scene.environment = env;
      scene.environmentIntensity = envI;
      scene.fog = fog;
      pm.dispose();
    }
    R.stats.probes = probes.list.length;
    probes.current = null;
    environment(gfx);
  }
  function nearestProbe(pos) {
    let best = null, bd = Infinity;
    for (const p of probes.list) {
      const d = (p.pos.x - pos.x) ** 2 + (p.pos.z - pos.z) ** 2 + (p.pos.y - pos.y) ** 2 * 4;
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }
  // Decide which environment the scene and the viewmodel reflect.
  function environment(gfx, playerPos) {
    const game = a.game;
    const reflections = gfx.settings.reflections;
    let tex = reflections ? gfx.environment.texture : null, intensity = null;
    if (reflections && sky.active && sky.rec?.env) {
      tex = sky.rec.env.texture;
      intensity = sky.cfg.envI;
    } else if (reflections && probes.list.length && gfx.map?.def.indoor) {
      const p = nearestProbe(playerPos || game?.player?.pos || probes.list[0].pos);
      tex = p.rt.texture;
      intensity = 0.85;
      probes.current = p;
    }
    if (gfx.scene.environment !== tex) gfx.scene.environment = tex;
    if (gfx.weaponScene.environment !== tex) gfx.weaponScene.environment = tex;
    if (intensity !== null) {
      gfx.scene.environmentIntensity = intensity;
      gfx.weaponScene.environmentIntensity = intensity * 0.9;
    } else if (gfx.map) {
      gfx.scene.environmentIntensity = gfx.map.def.indoor ? 0.065 : 0.65;
      gfx.weaponScene.environmentIntensity = 1;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Camera: rotational motion blur + focus (before the viewmodel) and   */
  /* eye adaptation (after it).                                          */
  /* ------------------------------------------------------------------ */
  const QUAD_VERT = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";
  class ScenePass extends e.Pass {
    constructor() {
      super();
      this.needsSwap = true;
      this.uniforms = {
        tDiffuse: { value: null }, reproj: { value: new e.Matrix4() }, tanHalf: { value: new e.Vector2(1, 1) },
        blur: { value: 0 }, focus: { value: 0 }, texel: { value: new e.Vector2() },
      };
      this.material = new e.ShaderMaterial({
        uniforms: this.uniforms, depthTest: false, depthWrite: false,
        vertexShader: QUAD_VERT,
        fragmentShader: `
uniform sampler2D tDiffuse;
uniform mat4 reproj;
uniform vec2 tanHalf;
uniform float blur;
uniform float focus;
uniform vec2 texel;
varying vec2 vUv;
void main() {
  vec2 ndc = vUv * 2.0 - 1.0;
  vec3 dir = normalize(vec3(ndc * tanHalf, -1.0));
  vec3 prev = (reproj * vec4(dir, 0.0)).xyz;
  vec2 prevNdc = prev.xy / max(1e-3, -prev.z) / tanHalf;
  vec2 vel = (vUv - (prevNdc * 0.5 + 0.5)) * blur;
  float len = length(vel);
  if (len > 0.06) vel *= 0.06 / len;
  vec2 d = vUv - 0.5;
  // Focus on the sights narrows attention; the periphery softens slightly.
  float defocus = focus * smoothstep(0.08, 0.42, dot(d, d) * 2.2);
  vec4 c = texture2D(tDiffuse, vUv);
  if (len * 1.0 / max(texel.x, texel.y) > 0.6 || defocus > 0.01) {
    vec3 acc = c.rgb; float wsum = 1.0;
    for (int i = 1; i <= 6; i++) {
      float f = float(i) / 6.0 - 0.5;
      vec2 o = vel * f + vec2(cos(float(i) * 2.4), sin(float(i) * 2.4)) * texel * defocus * 3.0;
      acc += texture2D(tDiffuse, clamp(vUv + o, texel, 1.0 - texel)).rgb;
      wsum += 1.0;
    }
    c.rgb = acc / wsum;
  }
  gl_FragColor = c;
}`,
      });
      this.quad = new e.FullScreenQuad(this.material);
      this.prev = new e.Quaternion();
      this.hasPrev = false;
    }
    render(renderer, writeBuffer, readBuffer) {
      this.uniforms.tDiffuse.value = readBuffer.texture;
      this.uniforms.texel.value.set(1 / readBuffer.width, 1 / readBuffer.height);
      renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
      this.quad.render(renderer);
    }
    update(gfx, game, dt) {
      const cam = gfx.camera;
      cam.updateMatrixWorld();
      const q = cam.quaternion;
      const u = this.uniforms;
      if (!this.hasPrev || dt <= 0) { this.prev.copy(q); this.hasPrev = true; }
      // Rotation from the current view space into the previous view space.
      const m = new e.Matrix4().makeRotationFromQuaternion(this.prev.clone().invert().multiply(q));
      u.reproj.value.copy(m);
      const th = Math.tan((cam.fov * Math.PI) / 360);
      u.tanHalf.value.set(th * cam.aspect, th);
      // 180-degree shutter: blur covers half of the motion of a 60 Hz frame,
      // independent of the real frame rate.
      const shutter = dt > 0 ? clamp((1 / 120) / dt, 0, 1.2) : 0;
      // Split-screen draws several cameras into one frame; per-view
      // reprojection would be wrong there.
      const coop = !!a.coop?.active;
      u.blur.value = S.motionBlur && game.phase === "playing" && !coop ? shutter : 0;
      const scoped = game.weapon?.def.scope;
      u.focus.value = game.phase === "playing" && !scoped ? clamp(game.ads || 0, 0, 1) * 0.55 : 0;
      // Overpressure and near misses blur vision for a moment.
      const shock = (R.cameraFx?.concussion || 0) + (R.acoustic?.flinch || 0) * 0.35;
      if (shock > 0) u.focus.value = Math.max(u.focus.value, Math.min(2.2, shock * 2.2));
      if (coop) u.focus.value = 0;
      this.prev.copy(q);
    }
    dispose() { this.material.dispose(); }
  }
  class ExposurePass extends e.Pass {
    constructor() {
      super();
      this.needsSwap = true;
      const rt = (w, h) => new e.WebGLRenderTarget(w, h, { type: K.HalfFloatType, depthBuffer: false, minFilter: K.LinearFilter, magFilter: K.LinearFilter });
      this.small = rt(64, 32);
      this.tiny = rt(8, 4);
      this.adapt = [rt(1, 1), rt(1, 1)];
      this.white = [rt(1, 1), rt(1, 1)];
      this.ping = 0;
      this.lumMat = new e.ShaderMaterial({
        uniforms: { tDiffuse: { value: null } }, depthTest: false, depthWrite: false, vertexShader: QUAD_VERT,
        fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb; float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  // centre-weighted metering
  vec2 d = vUv - 0.5; float w = 1.0 - smoothstep(0.1, 0.5, length(d * vec2(1.0, 1.6)));
  w = 0.35 + 0.65 * w;
  // chromaticity of the light in view, for white balance
  float il = 1.0 / max(l, 1e-4);
  float lit = smoothstep(0.002, 0.03, l);
  gl_FragColor = vec4(log(max(l, 1e-4)) * w, w, clamp(c.r * il, 0.0, 4.0) * w * lit, clamp(c.b * il, 0.0, 4.0) * w * lit); }`,
      });
      this.downMat = new e.ShaderMaterial({
        uniforms: { tDiffuse: { value: null }, texel: { value: new e.Vector2() } }, depthTest: false, depthWrite: false, vertexShader: QUAD_VERT,
        fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 texel; varying vec2 vUv;
void main(){ vec4 s = vec4(0.0); for (int y = -3; y <= 4; y++) for (int x = -3; x <= 4; x++) s += texture2D(tDiffuse, vUv + vec2(float(x) - 0.5, float(y) - 0.5) * texel);
  gl_FragColor = s / 64.0; }`,
      });
      this.adaptMat = new e.ShaderMaterial({
        uniforms: { tLum: { value: null }, tPrev: { value: null }, dt: { value: 0 }, reset: { value: 1 }, white: { value: 0 } }, depthTest: false, depthWrite: false, vertexShader: QUAD_VERT,
        fragmentShader: `uniform sampler2D tLum; uniform sampler2D tPrev; uniform float dt; uniform float reset; uniform float white; varying vec2 vUv;
void main(){
  vec4 s = vec4(0.0);
  for (int y = 0; y < 4; y++) for (int x = 0; x < 8; x++) s += texture2D(tLum, vec2((float(x) + 0.5) / 8.0, (float(y) + 0.5) / 4.0));
  vec4 p = texture2D(tPrev, vec2(0.5));
  if (white > 0.5) {
    // Chromatic adaptation: the illuminant estimate drifts over ~2 s.
    vec2 cur = s.y > 1e-3 ? vec2(s.z, s.w) / s.y : vec2(1.0);
    float n = (s.z + s.w) / max(1e-3, s.y);
    if (n < 0.2) cur = p.xy;
    vec2 w = reset > 0.5 ? cur : mix(p.xy, cur, 1.0 - exp(-dt * 0.5));
    gl_FragColor = vec4(w, 0.0, 1.0);
    return;
  }
  float cur = s.x / max(1e-4, s.y);
  float eye = p.x, ref = p.y;
  if (reset > 0.5) { eye = cur; ref = cur; }
  // Pupils open slowly in the dark and close fast in bright light;
  // the long reference lets the scene settle back to its authored look.
  float k = cur > eye ? 2.2 : 0.75;
  eye += (cur - eye) * (1.0 - exp(-dt * k));
  ref += (cur - ref) * (1.0 - exp(-dt * 0.045));
  gl_FragColor = vec4(eye, ref, cur, 1.0);
}`,
      });
      this.applyMat = new e.ShaderMaterial({
        uniforms: { tDiffuse: { value: null }, tAdapt: { value: null }, tWhite: { value: null }, strength: { value: 0 }, balance: { value: 0.45 } }, depthTest: false, depthWrite: false, vertexShader: QUAD_VERT,
        fragmentShader: `uniform sampler2D tDiffuse; uniform sampler2D tAdapt; uniform sampler2D tWhite; uniform float strength; uniform float balance; varying vec2 vUv;
void main(){ vec4 c = texture2D(tDiffuse, vUv); vec3 a = texture2D(tAdapt, vec2(0.5)).xyz;
  float ex = exp((a.y - a.x) * 0.62 * strength);
  vec2 wb = clamp(texture2D(tWhite, vec2(0.5)).xy, vec2(0.5), vec2(2.0));
  vec3 gain = vec3(1.0 / mix(1.0, wb.x, balance), 1.0, 1.0 / mix(1.0, wb.y, balance));
  // keep luminance, change only the colour of the light
  gain /= max(1e-3, dot(gain, vec3(0.2126, 0.7152, 0.0722)));
  gl_FragColor = vec4(c.rgb * gain * clamp(ex, 0.45, 2.4), c.a); }`,
      });
      this.quad = new e.FullScreenQuad(this.applyMat);
      this.dt = 0;
      this.reset = true;
      this.strength = 1;
    }
    draw(renderer, mat, target) { this.quad.material = mat; renderer.setRenderTarget(target); this.quad.render(renderer); }
    render(renderer, writeBuffer, readBuffer) {
      const auto = renderer.autoClear;
      renderer.autoClear = true;
      this.lumMat.uniforms.tDiffuse.value = readBuffer.texture;
      this.draw(renderer, this.lumMat, this.small);
      this.downMat.uniforms.tDiffuse.value = this.small.texture;
      this.downMat.uniforms.texel.value.set(1 / 64, 1 / 32);
      this.draw(renderer, this.downMat, this.tiny);
      const src = this.adapt[this.ping], dst = this.adapt[1 - this.ping];
      this.adaptMat.uniforms.tLum.value = this.tiny.texture;
      this.adaptMat.uniforms.tPrev.value = src.texture;
      this.adaptMat.uniforms.dt.value = this.dt;
      this.adaptMat.uniforms.reset.value = this.reset ? 1 : 0;
      this.draw(renderer, this.adaptMat, dst);
      const wsrc = this.white[this.ping], wdst = this.white[1 - this.ping];
      this.adaptMat.uniforms.tPrev.value = wsrc.texture;
      this.adaptMat.uniforms.white.value = 1;
      this.draw(renderer, this.adaptMat, wdst);
      this.adaptMat.uniforms.white.value = 0;
      this.applyMat.uniforms.tWhite.value = wdst.texture;
      this.ping = 1 - this.ping;
      this.reset = false;
      this.applyMat.uniforms.tDiffuse.value = readBuffer.texture;
      this.applyMat.uniforms.tAdapt.value = dst.texture;
      this.applyMat.uniforms.strength.value = this.strength;
      this.draw(renderer, this.applyMat, this.renderToScreen ? null : writeBuffer);
      renderer.autoClear = auto;
    }
    dispose() {
      for (const t of [this.small, this.tiny, ...this.adapt, ...this.white]) t.dispose();
      for (const m of [this.lumMat, this.downMat, this.adaptMat, this.applyMat]) m.dispose();
    }
  }
  const cam = (R.cameraFx = { scene: null, exposure: null, gfx: null });
  function installCameraPasses(gfx) {
    if (cam.gfx === gfx) return;
    cam.gfx = gfx;
    cam.scene = new ScenePass();
    cam.exposure = new ExposurePass();
    const passes = gfx.composer.passes;
    // [scene, ssao, viewmodel, fxaa, ...]: blur the world only, then expose
    // world + viewmodel together.
    const weaponPass = passes.find((p, i) => i > 0 && p.scene === gfx.weaponScene);
    const wi = passes.indexOf(weaponPass);
    gfx.composer.insertPass(cam.scene, wi < 0 ? 2 : wi);
    const wi2 = passes.indexOf(weaponPass);
    gfx.composer.insertPass(cam.exposure, wi2 < 0 ? 3 : wi2 + 1);
    syncCameraPasses(gfx);
  }
  function syncCameraPasses(gfx) {
    if (!cam.scene) return;
    const low = quality() === "performance";
    cam.scene.enabled = on("camera") && !low;
    cam.exposure.enabled = on("camera");
    cam.exposure.reset = true;
  }

  /* Tone response: a film-like curve that keeps highlight colour. Trims were
   * measured map by map against the original renderer: day maps keep their
   * brightness, nights land at roughly half of it (eyes adapted, lamps carry
   * the scene, the flashlight matters). */
  const TONE_TRIM = { theater: 2.25, ward: 2.45, rail: 3.9, cemetery: 5.0, yard: 1.7, forest: 0.97, urban: 3.0, bunker: 0.8, desert: 1.8, harbor: 5.6 };
  function applyTone(gfx) {
    if (!gfx) return;
    const filmic = on("filmic");
    const dbg = R.debugTone;
    const want = dbg?.mode ?? (filmic ? 7 : 4);
    if (gfx.gl.toneMapping !== want) gfx.gl.toneMapping = want;
    // Khronos PBR Neutral keeps albedo hue and contrast and only rolls off
    // highlights; it has no /0.6 pre-scale like three's ACES.
    const base = (gfx.map?.def.exposure || 1) * (gfx.settings.brightness || 1);
    const trim = filmic ? TONE_TRIM[gfx.map?.def.id] ?? 1 : 1;
    gfx.gl.toneMappingExposure = base * (dbg?.mult ?? (filmic ? 0.8 * trim : 1));
  }

  /* Photographic grade: no teal/orange split, gentle contrast. Applied over
   * the overhaul's grade whenever the filmic response is on. */
  function applyGrade() {
    const g = a.post?.grade;
    if (!g || !on("filmic") || a.settings.grade === "off") return;
    const u = g.uniforms;
    u.lift.value.set(0.012, 0.012, 0.014);
    u.gamma.value.set(1, 1, 1);
    u.gain.value.set(1, 1, 1);
    u.shadowTint.value.set(0.985, 1, 1.02);
    u.highTint.value.set(1.015, 1, 0.985);
    u.saturation.value = 0.97;
    u.contrast.value = 1.05;
  }
  R.applyGrade = applyGrade;

  /* Shadows: denser maps and softer penumbrae from the key light. */
  function applyShadows(gfx) {
    if (!gfx.sun?.shadow) return;
    const q = quality();
    if (on("camera") || on("surfaces")) {
      const size = q === "ultra" ? 3072 : q === "performance" ? 1024 : 2048;
      if (gfx.sun.shadow.mapSize.x !== size) {
        gfx.sun.shadow.mapSize.setScalar(size);
        gfx.sun.shadow.map?.dispose();
        gfx.sun.shadow.map = null;
      }
      gfx.sun.shadow.radius = q === "performance" ? 1.5 : 2.6;
      if (gfx.flashlight?.shadow) gfx.flashlight.shadow.radius = 3;
    }
  }

  /* The viewmodel has its own light rig. Outdoors it now takes the real key
   * light (direction, colour, intensity) in camera space and drops to sky
   * light when the player stands in shadow. */
  const vmLight = { t: 0, lit: 1, target: 1 };
  function viewmodelLight(gfx, dt) {
    const def = gfx.map?.def;
    if (!def || def.indoor || !on("camera") || !gfx.weaponFill) return;
    const sd = new e.Vector3(def.sun.dir.x, def.sun.dir.y, def.sun.dir.z).normalize();
    vmLight.t -= dt;
    if (vmLight.t <= 0 && gfx.map?.world) {
      vmLight.t = 0.12;
      const p = gfx.camera.position;
      vmLight.target = e.raycastWorld(gfx.map.world, { x: p.x, y: p.y, z: p.z }, { x: sd.x, y: sd.y, z: sd.z }, 80) ? 0 : 1;
    }
    vmLight.lit += (vmLight.target - vmLight.lit) * (1 - Math.exp(-dt * 10));
    const dirCam = sd.clone().applyQuaternion(gfx.camera.quaternion.clone().invert());
    gfx.weaponFill.position.copy(dirCam).multiplyScalar(5);
    gfx.weaponFill.color.set(def.sun.color);
    gfx.weaponFill.intensity = def.sun.intensity * (0.12 + 0.78 * vmLight.lit);
    const hemi = def.hemi?.intensity ?? 0.8;
    gfx.weaponAmbient.intensity = hemi * (sky.active ? sky.cfg.hemi * 0.9 : 0.7) * (0.75 + 0.25 * vmLight.lit);
    if (sky.active) gfx.weaponScene.environmentIntensity = sky.cfg.envI * (sky.cfg.day ? 0.9 : 0.5);
  }

  /* Hemisphere fill is replaced by real sky light where an HDRI is active. */
  function frameLights(gfx) {
    if (!sky.active) return;
    for (const h of sky.hemi) {
      if (h.light.intensity !== h.base * sky.cfg.hemi) h.light.intensity = h.base * sky.cfg.hemi;
    }
  }

  function onBuild(gfx) {
    sky.hemi = [];
    gfx.worldGroup.traverse((o) => { if (o.isHemisphereLight) sky.hemi.push({ light: o, base: o.intensity }); });
    sky.active = false;
    sky.oldMaterial = null;
    sky.oldDome = null;
    applySky(gfx);
    applyTone(gfx);
    applyShadows(gfx);
    for (const p of probes.list) p.rt?.dispose();
    probes.list = [];
    probes.timer = 1.2;
    probes.power = null;
    if (cam.exposure) cam.exposure.reset = true;
  }

  function attachGraphics(game) {
    const gfx = game.gfx;
    if (gfx._realismV12) return;
    gfx._realismV12 = true;
    // Material factory hooks: every surface built by mat() / worldMaterialV5()
    // is adopted when it is first stored.
    const set = gfx.materials.set;
    gfx.materials.set = function (key, m) {
      const r = set.call(this, key, m);
      // Viewmodel finishes are completed (bump, sidedness) right after they
      // are stored; adopt them once that has happened.
      if (typeof key === "string" && key.startsWith("viewmodel:")) queueMicrotask(() => { try { adoptMaterial(gfx, key, m); } catch (err) { console.error("[realism] material", err); } });
      else try { adoptMaterial(gfx, key, m); } catch (err) { console.error("[realism] material", err); }
      return r;
    };
    for (const [k, m] of gfx.materials) adoptMaterial(gfx, k, m);
    const setSettings = gfx.setSettings;
    gfx.setSettings = function (...args) {
      const r = setSettings.apply(this, args);
      applyGrade();
      refreshPhotos();
      applyTone(gfx);
      applyShadows(gfx);
      environment(gfx);
      syncCameraPasses(gfx);
      return r;
    };
    const build = gfx.build;
    gfx.build = function (...args) {
      const r = build.apply(this, args);
      try { onBuild(gfx); } catch (err) { console.error("[realism] build", err); }
      return r;
    };
    const draw = gfx.draw;
    gfx.draw = function () {
      const st = this.settings;
      if (!(cam.exposure?.enabled || cam.scene?.enabled) || st.aa || st.ao || st.filmGrain) return draw.call(this);
      st.filmGrain = true;
      try { return draw.call(this); } finally { st.filmGrain = false; }
    };
    installCameraPasses(gfx);
    applyGrade();
    if (gfx.map) onBuild(gfx);
  }

  function frameGraphics(game, dt) {
    const gfx = game.gfx;
    if (!gfx._realismV12) return;
    photo.wet.value = game.map?.def.rain && game.settings.weather ? 1 : 0;
    frameLights(gfx);
    if (game.phase === "playing") viewmodelLight(gfx, dt);
    if (cam.scene) cam.scene.update(gfx, game, dt);
    if (cam.exposure) {
      cam.exposure.dt = dt;
      cam.exposure.strength = game.phase === "playing" ? 1 : 0.35;
    }
    // Probes: (re)capture once the level has settled, after textures stream
    // in, and when the building's power state changes.
    if (gfx.map?.def.indoor && on("sky")) {
      const power = !!(gfx.theaterVisuals?.power ?? gfx.powerWasOn);
      if (probes.power !== null && probes.power !== power) probes.timer = Math.min(probes.timer > 0 ? probes.timer : 9, 0.9);
      probes.power = power;
      if (probes.dirty && probes.timer <= 0 && probes.list.length) probes.timer = 1.5;
      probes.dirty = false;
      if (probes.timer > 0) {
        const now = performance.now();
        probes.timer -= Math.max(dt, (now - (probes.wall || now)) / 1000);
        probes.wall = now;
        if (probes.timer <= 0) captureProbes(game);
      } else probes.wall = performance.now();
      if (probes.list.length > 1 && game.player) {
        const p = nearestProbe(game.player.pos);
        if (p !== probes.current) environment(gfx, game.player.pos);
      }
    }
  }

  a.on("attach", (game) => {
    try { attachGraphics(game); } catch (err) { console.error("[realism] attach graphics", err); }
  });
  a.on("frame", (game, dt) => {
    try { frameGraphics(game, dt); } catch (err) { console.error("[realism] frame graphics", err); }
  });
  a.on("settings", () => {
    const g = a.game?.gfx;
    if (!g) return;
    applyGrade();
    syncCameraPasses(g);
  });
  R.applyTone = () => a.game && applyTone(a.game.gfx);
  R.on(() => {
    const game = a.game;
    if (!game) return;
    refreshPhotos();
    if (on("filmic")) applyGrade(); else a.post?.grade?.setGrade(a.settings.grade === "off" ? "neutral" : a.settings.grade);
    applySky(game.gfx);
    applyTone(game.gfx);
    applyShadows(game.gfx);
    syncCameraPasses(game.gfx);
    probes.timer = 0.3;
  });
  if (a.game) attachGraphics(a.game);
})();

;
/* Afterlight v12 — Realism: weapons, ballistics, body and anatomy. */
(() => {
  "use strict";
  const a = window.__AF_OVERHAUL__?.state;
  const R = a?.realismV12;
  if (!R || R.gameplay) return;
  const e = a.engine, S = R.settings;
  const on = (k) => !!S[k];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const G = 9.81;
  const gp = (R.gameplay = { stats: R.stats });

  /* ------------------------------------------------------------------ */
  /* Cartridges and weapons                                             */
  /* ------------------------------------------------------------------ */
  // v0: muzzle velocity (m/s); k: velocity decay per metre (v = v0·e^(−k·x),
  // fitted to published drag tables); zero: sight zero (m); pen: relative
  // penetration energy; over: passes through soft tissue.
  const CAL = {
    ar:          { name: "5.56×45 mm NATO",        v0: 900, k: 0.00115, zero: 100, pen: 1.25, over: true },
    bullpup:     { name: "5.56×45 mm NATO",        v0: 930, k: 0.00115, zero: 100, pen: 1.3, over: true },
    smg:         { name: "9×19 mm Parabellum",     v0: 390, k: 0.0019, zero: 25, pen: 0.55, over: false },
    pistol:      { name: "9×19 mm Parabellum",     v0: 360, k: 0.0021, zero: 25, pen: 0.5, over: false },
    silenced:    { name: "9×39 mm subsonic AP",    v0: 295, k: 0.0016, zero: 50, pen: 0.95, over: false },
    revolver:    { name: ".357 Magnum",            v0: 430, k: 0.0019, zero: 25, pen: 0.85, over: false },
    shotgun:     { name: "12 ga 00 buckshot",      v0: 400, k: 0.0075, zero: 25, pen: 0.22, over: false },
    autoShotgun: { name: "12 ga 00 buckshot",      v0: 380, k: 0.0075, zero: 25, pen: 0.2, over: false },
    dmr:         { name: "7.62×51 mm NATO",        v0: 790, k: 0.0009, zero: 100, pen: 2.0, over: true },
    lmg:         { name: "7.62×51 mm NATO",        v0: 820, k: 0.0009, zero: 100, pen: 2.0, over: true },
    sniper:      { name: ".308 Winchester 175 gr", v0: 820, k: 0.00082, zero: 100, pen: 2.1, over: true },
  };
  // Realistic handling. damage ≈ wound potential of one hit to the torso;
  // recoil in radians of muzzle rise per shot (free recoil / mass / bore
  // height); sway in radians of standing ADS wobble; spread is mechanical
  // dispersion when aimed, aim error from the hip.
  const WEAPON = {
    ar:          { damage: 44, headMult: 4, legMult: 0.6, armorPen: 0.55, rpm: 800, recoilPitch: 0.0095, recoilYaw: 0.0042, hipSpread: 0.032, adsSpread: 0.0009, adsTime: 0.26, reloadTime: 2.3, emptyReloadTime: 2.85, range: 400, weight: 3.4, noiseRadius: 85, sway: 0.0021, recover: 7.5, chamber: true },
    bullpup:     { damage: 44, headMult: 4, legMult: 0.6, armorPen: 0.58, rpm: 760, recoilPitch: 0.0085, recoilYaw: 0.0036, hipSpread: 0.03, adsSpread: 0.0008, adsTime: 0.25, reloadTime: 2.6, emptyReloadTime: 3.1, range: 400, weight: 3.6, noiseRadius: 80, sway: 0.0019, recover: 7.5, chamber: true },
    smg:         { damage: 31, headMult: 4, legMult: 0.6, armorPen: 0.22, rpm: 850, recoilPitch: 0.0058, recoilYaw: 0.0042, hipSpread: 0.03, adsSpread: 0.0016, adsTime: 0.2, reloadTime: 2.0, emptyReloadTime: 2.5, range: 200, weight: 2.6, noiseRadius: 60, sway: 0.0024, recover: 8.5, chamber: true },
    pistol:      { damage: 32, headMult: 4, legMult: 0.6, armorPen: 0.2, rpm: 400, recoilPitch: 0.028, recoilYaw: 0.006, hipSpread: 0.026, adsSpread: 0.0024, adsTime: 0.15, reloadTime: 1.6, emptyReloadTime: 1.95, range: 120, weight: 0.9, noiseRadius: 55, sway: 0.0034, recover: 10, chamber: true },
    silenced:    { damage: 40, headMult: 4, legMult: 0.6, armorPen: 0.6, rpm: 800, recoilPitch: 0.0062, recoilYaw: 0.0035, hipSpread: 0.028, adsSpread: 0.0017, adsTime: 0.22, reloadTime: 2.1, emptyReloadTime: 2.6, range: 220, weight: 2.8, noiseRadius: 16, sway: 0.0023, recover: 8, chamber: true },
    revolver:    { damage: 52, headMult: 4, legMult: 0.6, armorPen: 0.45, rpm: 180, recoilPitch: 0.052, recoilYaw: 0.008, hipSpread: 0.028, adsSpread: 0.0022, adsTime: 0.17, reloadTime: 3.2, emptyReloadTime: 3.2, range: 150, weight: 1.25, noiseRadius: 75, sway: 0.0036, recover: 7, chamber: false },
    shotgun:     { damage: 17, headMult: 3, legMult: 0.6, armorPen: 0.1, rpm: 70, recoilPitch: 0.075, recoilYaw: 0.014, hipSpread: 0.06, adsSpread: 0.016, adsTime: 0.28, reloadTime: 3.4, emptyReloadTime: 4.0, range: 70, weight: 3.6, noiseRadius: 90, sway: 0.0027, recover: 5.5, chamber: true },
    autoShotgun: { damage: 15, headMult: 3, legMult: 0.6, armorPen: 0.1, rpm: 300, recoilPitch: 0.05, recoilYaw: 0.012, hipSpread: 0.062, adsSpread: 0.018, adsTime: 0.3, reloadTime: 2.9, emptyReloadTime: 3.4, range: 70, weight: 5.2, noiseRadius: 90, sway: 0.003, recover: 6, chamber: true },
    dmr:         { damage: 68, headMult: 4, legMult: 0.6, armorPen: 0.78, rpm: 300, recoilPitch: 0.034, recoilYaw: 0.006, hipSpread: 0.04, adsSpread: 0.0006, adsTime: 0.32, reloadTime: 2.6, emptyReloadTime: 3.2, range: 600, weight: 4.6, noiseRadius: 110, sway: 0.0023, recover: 5.5, chamber: true },
    lmg:         { damage: 64, headMult: 4, legMult: 0.6, armorPen: 0.78, rpm: 800, recoilPitch: 0.0105, recoilYaw: 0.0075, hipSpread: 0.055, adsSpread: 0.0012, adsTime: 0.5, reloadTime: 6.5, emptyReloadTime: 7.2, range: 600, weight: 11.6, noiseRadius: 110, sway: 0.004, recover: 6, chamber: false },
    sniper:      { damage: 98, headMult: 4, legMult: 0.6, armorPen: 0.85, rpm: 40, recoilPitch: 0.075, recoilYaw: 0.01, hipSpread: 0.07, adsSpread: 0.0002, adsTime: 0.42, reloadTime: 3.1, emptyReloadTime: 3.7, range: 800, weight: 6.2, noiseRadius: 130, sway: 0.0026, recover: 3.8, chamber: true },
  };
  const FIELDS = ["damage", "headMult", "legMult", "armorPen", "rpm", "recoilPitch", "recoilYaw", "hipSpread", "adsSpread", "adsTime", "reloadTime", "emptyReloadTime", "range", "weight", "noiseRadius"];
  const ORIGINAL = {};
  for (const [id, d] of Object.entries(e.weaponDefs)) ORIGINAL[id] = Object.fromEntries(FIELDS.map((f) => [f, d[f]]));
  gp.calibers = CAL;
  gp.weapons = WEAPON;

  // Fragmentation grenade: 4 s fuse (M67: 4–5.5 s) and real gravity, so a
  // 15 m/s throw carries about 20 m.
  const GRENADE_ORIG = { fuse: Bo.fuse, gravity: Bo.gravity, throwSpeed: Bo.throwSpeed };
  const GRENADE_REAL = { fuse: 4.0, gravity: G, throwSpeed: 15 };
  function applyWeaponDefs(game) {
    const real = on("ballistics");
    Object.assign(Bo, real ? GRENADE_REAL : GRENADE_ORIG);
    for (const [id, d] of Object.entries(e.weaponDefs)) {
      const src = real && WEAPON[id] ? WEAPON[id] : ORIGINAL[id];
      for (const f of FIELDS) if (src[f] !== undefined) d[f] = src[f];
      d.caliber = real && CAL[id] ? CAL[id].name : undefined;
    }
    // Live weapons may hold upgraded copies; rebuild them from the new base.
    for (const w of game?.weapons || []) {
      const base = e.weaponDefs[w.def.id];
      if (!base || w.def === base) continue;
      if (game.zombies?.applyWeapon) game.zombies.applyWeapon(w);
      else w.def = base;
    }
  }

  /* ------------------------------------------------------------------ */
  /* External and terminal ballistics                                    */
  /* ------------------------------------------------------------------ */
  const flight = (cal, x) => (Math.exp(cal.k * x) - 1) / (cal.k * cal.v0);
  const drop = (cal, x) => 0.5 * G * flight(cal, x) ** 2;
  // Resistance per metre of material, in the same units as CAL.pen.
  const RESIST = { window: 0.35, glass: 0.35, fabric: 0.6, carpet: 0.6, wood: 2.2, crate: 1.6, pier: 3.0, bark: 3.0, plaster: 3.5, sandbag: 14, tile: 16, brick: 20, adobe: 12, concrete: 26, rock: 30, metal: 38, container: 26, brass: 30, asphalt: 40, dirt: 40, sand: 40, grass: 40 };
  const RICOCHET = new Set(["metal", "container", "concrete", "tile", "asphalt", "rock", "brick"]);
  const add = (p, d, t) => ({ x: p.x + d.x * t, y: p.y + d.y * t, z: p.z + d.z * t });
  // A shot is traced as four straight chords of its trajectory, so the
  // existing per-hit damage/effects code receives ordinary hit records.
  function traceBallistic(world, targets, origin, dir, range, cal) {
    const hits = [];
    const R2 = Math.min(range, 800);
    const theta = drop(cal, cal.zero) / cal.zero;
    const breaks = [0, 25, 70, 160, 320, 800].filter((x) => x < R2).concat([R2]);
    const pointAt = (x) => {
      const y = theta * x - drop(cal, x);
      return { x: origin.x + dir.x * x, y: origin.y + dir.y * x + y, z: origin.z + dir.z * x };
    };
    let power = 1, skip = -1, start = origin, startX = 0;
    for (let b = 1; b < breaks.length && power > 0.1; b++) {
      const endX = breaks[b];
      const end = pointAt(endX);
      let s = start;
      let c = { x: end.x - s.x, y: end.y - s.y, z: end.z - s.z };
      let u = Math.hypot(c.x, c.y, c.z);
      if (u < 1e-4) { start = end; startX = endX; continue; }
      c = { x: c.x / u, y: c.y / u, z: c.z / u };
      let along = startX, stopped = false;
      for (let i = 0; i < 8 && u > 0.01 && power > 0.1; i++) {
        const g = hz(world, targets, s, c, u, skip, true);
        hits.push({ ...g, origin: { ...s }, power, t: along + g.t });
        R.stats.segments++;
        if (g.target) {
          // Rifle bullets pass through a body and keep part of their energy.
          if (cal.over && power > 0.55 && g.part !== "head") {
            power *= 0.42;
            skip = g.target.id;
            const adv = g.t + 0.05;
            s = add(s, c, adv); u -= adv; along += adv;
            continue;
          }
          stopped = true;
          break;
        }
        if (!g.normal) break;
        const box = g.box;
        if (!box) { stopped = true; break; }
        const v = Ms(s, c, box, u);
        const mat = box.mat || "concrete";
        const thick = v && Number.isFinite(v.exit) ? Math.max(0.005, v.exit - g.t) : Infinity;
        const need = thick * (RESIST[mat] ?? 26);
        const have = power * cal.pen;
        if (Number.isFinite(thick) && thick < 1.2 && need < have) {
          power *= Math.max(0.12, (1 - need / have) * 0.92);
          const adv = v.exit + 0.012;
          s = add(s, c, adv); u -= adv; along += adv;
          continue;
        }
        const cosI = c.x * g.normal.x + c.y * g.normal.y + c.z * g.normal.z;
        if (RICOCHET.has(mat) && Math.abs(cosI) < 0.2 && i < 2) {
          c = { x: c.x - 2 * cosI * g.normal.x, y: c.y - 2 * cosI * g.normal.y, z: c.z - 2 * cosI * g.normal.z };
          s = { x: g.point.x + g.normal.x * 0.004 + c.x * 0.02, y: g.point.y + g.normal.y * 0.004 + c.y * 0.02, z: g.point.z + g.normal.z * 0.004 + c.z * 0.02 };
          u = Math.max(0, u - g.t - 0.02);
          power *= 0.3;
          // A ricochet leaves the planned trajectory; finish it as a straight line.
          const rest = hz(world, targets, s, c, Math.min(u + (R2 - endX), 120), skip, true);
          hits.push({ ...rest, origin: { ...s }, power, t: along + g.t + rest.t });
          stopped = true;
          break;
        }
        stopped = true;
        break;
      }
      if (stopped) break;
      start = end;
      startX = endX;
    }
    return hits;
  }
  const basePz = pz, baseNp = nP;
  pz = function (world, targets, origin, dir, range) {
    const def = a.game?.weapon?.def;
    const cal = def && CAL[def.id];
    if (!on("ballistics") || !cal) return basePz(world, targets, origin, dir, range);
    return traceBallistic(world, targets, origin, dir, range, cal);
  };
  // Wounding follows retained energy, not a linear range table.
  nP = function (def, dist) {
    const cal = CAL[def?.id];
    if (!on("ballistics") || !cal) return baseNp(def, dist);
    const v = Math.exp(-cal.k * Math.max(0, dist));
    return 0.35 + 0.65 * v * v;
  };
  gp.trace = traceBallistic;
  gp.drop = (id, x) => (CAL[id] ? drop(CAL[id], x) - (drop(CAL[id], CAL[id].zero) / CAL[id].zero) * x : 0);

  /* ------------------------------------------------------------------ */
  /* Recoil, sway, breathing, sprint-out and the chambered round        */
  /* ------------------------------------------------------------------ */
  function body(p) {
    if (!p.rlBody) p.rlBody = { stamina: 1, fatigue: 0, exhausted: false, regenDelay: 0, breath: 1, holding: false, holdT: 0, gasp: 0, sway: { x: 0, y: 0 }, t: Math.random() * 100, sprintEnd: -9, wasSprinting: false, bleed: 0, mantle: null, wasGrounded: true, fallV: 0, adsT: 0 };
    return p.rlBody;
  }
  gp.body = body;
  let inShot = 0;
  const shoot = e.Game.prototype.shoot;
  e.Game.prototype.shoot = function (...args) {
    const handling = on("handling");
    const before = { p: this.recoilPitch, y: this.recoilYaw, pitch: this.player.pitch };
    const origin = this.player.eye;
    const dir = e.dirFrom(this.player.yaw + this.recoilYaw, this.player.pitch + this.recoilPitch);
    inShot++;
    let r;
    try { r = shoot.apply(this, args); } finally { inShot--; }
    R.stats.shots++;
    if (handling) {
      const b = body(this.player), w = WEAPON[this.weapon.def.id] || {};
      // Stance and fatigue scale the kick; a shouldered, crouched shooter
      // controls it better; a tired one worse.
      const stance = (this.player.crouching ? 0.78 : 1) * (this.ads > 0.5 ? 0.9 : 1.15) * (1 + b.fatigue * 0.35);
      const dp = this.recoilPitch - before.p, dy = this.recoilYaw - before.y, dpitch = this.player.pitch - before.pitch;
      this.recoilPitch = before.p + dp * stance;
      // right-handed shooters drift up and slightly right
      this.recoilYaw = before.y + dy * stance - (this.weapon.def.recoilYaw || 0) * 0.35 * stance;
      this.player.pitch = before.pitch + dpitch * stance * 1.6;
      this.kick = Math.min(1, this.kick * (0.8 + 0.4 * Math.min(1, (this.weapon.def.recoilPitch || 0.01) / 0.03)));
      b.lastShot = this.time;
      void w;
    }
    if (on("anatomy")) suppressHumans(this, origin, dir);
    return r;
  };
  // Near misses suppress soldiers: wider spread, slower reactions.
  function suppressHumans(game, origin, dir) {
    if (game.zombies || !game.ai?.enemies) return;
    for (const h of game.ai.enemies) {
      if (!h.alive) continue;
      const eye = h.eye || { x: h.pos.x, y: h.pos.y + 1.6, z: h.pos.z };
      const vx = eye.x - origin.x, vy = eye.y - origin.y, vz = eye.z - origin.z;
      const t = vx * dir.x + vy * dir.y + vz * dir.z;
      if (t < 1 || t > 140) continue;
      const d = Math.hypot(vx - dir.x * t, vy - dir.y * t, vz - dir.z * t);
      if (d < 2.2 && d > 0.25) {
        h.suppression = Math.min(1, (h.suppression || 0) + 0.32 * (1 - d / 2.2));
        h.reactionT = Math.max(h.reactionT || 0, 0.18);
      }
    }
  }
  const step = e.Game.prototype.step;
  e.Game.prototype.step = function (dt, ...rest) {
    const r = step.call(this, dt, ...rest);
    try { injuries(this, dt); } catch (err) { console.error("[realism] injuries", err); }
    if (on("handling") && this.weapon && this.phase === "playing") {
      // Recovery speed differs by weapon and shooter state (base decays at 6/s).
      const w = WEAPON[this.weapon.def.id];
      if (w) {
        const b = body(this.player);
        const k = w.recover * (1 - b.fatigue * 0.3) - 6;
        this.recoilPitch *= Math.exp(-k * dt);
        this.recoilYaw *= Math.exp(-(k + 1) * dt);
      }
    }
    return r;
  };
  // Sway is applied on top of the player's own aim every frame, so the sight
  // picture drifts and the shooter corrects it — exactly like a real hold.
  const applyLook = e.applyLook;
  e.applyLook = function (game, dt, lx, ly) {
    const r = applyLook.call(this, game, dt, lx, ly);
    try { sway(game, dt); } catch (err) { console.error("[realism] sway", err); }
    return r;
  };
  function sway(game, dt) {
    const p = game.player;
    if (!p) return;
    const b = body(p);
    let tx = 0, ty = 0;
    if (on("handling") && game.phase === "playing" && p.alive && game.weapon) {
      b.t += dt;
      const w = WEAPON[game.weapon.def.id] || { sway: 0.0024 };
      const ads = clamp(game.ads || 0, 0, 1);
      const moving = Math.min(1, p.speed / 3);
      // Hold breath: sprint key while aiming; on touch, a scoped rifle held
      // still for half a second steadies automatically.
      const touchHold = e.isTouch() && game.weapon.def.scope && ads > 0.8 && p.speed < 0.2 && (b.adsT += dt) > 0.5;
      if (ads < 0.5) b.adsT = 0;
      const wantHold = ads > 0.7 && (game.input?.sprint || game.input?.keys?.has("ShiftLeft") || game.input?.keys?.has("ShiftRight") || touchHold) && b.gasp <= 0;
      if (wantHold && b.breath > 0) {
        b.holding = true;
        b.breath = Math.max(0, b.breath - dt / 5.5);
        if (b.breath <= 0) { b.holding = false; b.gasp = 2.2; }
      } else {
        if (b.holding) b.gasp = Math.max(b.gasp, 0.6 * (1 - b.breath));
        b.holding = false;
        b.breath = Math.min(1, b.breath + dt / 4);
      }
      b.gasp = Math.max(0, b.gasp - dt);
      const hold = b.holding ? 0.12 : 1 + b.gasp * 0.9;
      const stance = p.crouching ? 0.62 : 1;
      const tired = 1 + b.fatigue * 2.4 + (p.health < 35 ? 0.6 : 0);
      const A = w.sway * stance * tired * hold * (0.35 + 0.65 * ads) * (1 + moving * 1.8);
      const br = b.holding ? 0.05 : 0.22 + b.fatigue * 0.25;
      const t = b.t;
      ty = A * (0.75 * Math.sin(t * Math.PI * 2 * br) + 0.22 * Math.sin(t * 2.31 + 1.7) + 0.12 * Math.sin(t * 5.1));
      tx = A * (0.62 * Math.sin(t * 0.83 + 0.4) + 0.3 * Math.sin(t * 1.97 + 2.2) + 0.12 * Math.sin(t * 4.3 + 0.9));
      // heartbeat twitch when exhausted
      if (b.fatigue > 0.5) ty += A * 0.25 * b.fatigue * Math.pow(Math.max(0, Math.sin(t * Math.PI * 2 * (1.2 + b.fatigue))), 24);
    }
    p.yaw += tx - b.sway.x;
    p.pitch = clamp(p.pitch + (ty - b.sway.y), -1.3, 1.3);
    b.sway.x = tx;
    b.sway.y = ty;
  }
  // No shooting until the weapon is back up from a sprint.
  const trigger = e.Weapon.prototype.trigger;
  e.Weapon.prototype.trigger = function (pull) {
    if (pull && on("handling")) {
      const game = a.game;
      const p = game?.player, b = p?.rlBody;
      if (b && game.time - b.sprintEnd < 0.16 + (this.def.weight || 3) * 0.035) pull = false;
    }
    return trigger.call(this, pull);
  };
  // A round stays in the chamber during a tactical reload.
  const startReload = e.Weapon.prototype.startReload;
  e.Weapon.prototype.startReload = function () {
    const tactical = this.mag > 0;
    const r = startReload.call(this);
    if (r) this.rlTactical = tactical;
    return r;
  };
  const wupdate = e.Weapon.prototype.update;
  e.Weapon.prototype.update = function (dt) {
    const tactical = this.rlTactical;
    const done = wupdate.call(this, dt);
    if (done && tactical && on("ballistics") && WEAPON[this.def.id]?.chamber && this.reserve > 0 && this.mag === this.def.magSize) {
      this.mag++;
      this.reserve--;
    }
    if (done) this.rlTactical = false;
    return done;
  };

  /* ------------------------------------------------------------------ */
  /* The body: inertia, stamina, mantling, falls, bleeding               */
  /* ------------------------------------------------------------------ */
  const IA_KEYS = ["walk", "sprint", "crouch", "ads", "gravity", "jumpV", "groundAccel", "airAccel", "slideTime", "slideBoost"];
  const IA_ORIG = Object.fromEntries(IA_KEYS.map((k) => [k, Ia[k]]));
  const IA_REAL = { walk: 3.7, sprint: 6.4, crouch: 1.9, ads: 2.2, gravity: G, jumpV: 3.45, groundAccel: 8.5, airAccel: 0.9, slideTime: 0.55, slideBoost: 1.06 };
  function applyBodyConstants() {
    const src = on("body") ? IA_REAL : IA_ORIG;
    for (const k of IA_KEYS) Ia[k] = src[k];
  }
  gp.applyBodyConstants = applyBodyConstants;

  function mantleTarget(game, p) {
    const world = game.map?.world;
    if (!world) return null;
    const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
    const feet = p.pos.y;
    const probe = { x: p.pos.x + fx * 0.62, z: p.pos.z + fz * 0.62 };
    let top = -Infinity, obstacle = null;
    for (const b of world.boxes) {
      if (!b.solid || b.bulletOnly || b.noRender && b.mat === "invisible") continue;
      if (probe.x < b.min.x - 0.05 || probe.x > b.max.x + 0.05 || probe.z < b.min.z - 0.05 || probe.z > b.max.z + 0.05) continue;
      if (b.max.y <= feet + 0.38 || b.min.y > feet + 1.3) continue;
      if (b.max.y > top) { top = b.max.y; obstacle = b; }
    }
    if (!obstacle || top - feet > 1.3) return null;
    if (obstacle.mat === "window" || obstacle.mat === "invisible") return null;
    // Never through boarded windows (zombie entry points lead off the map).
    for (const w of game.map.theater?.windows || []) if (Math.hypot(w.pos.x - probe.x, w.pos.z - probe.z) < 2.2) return null;
    // Clearance above the top surface for a crouched body.
    const r = Ia.radius;
    for (const b of world.boxes) {
      if (!b.solid || b.bulletOnly) continue;
      if (b.min.y >= top + 1.25 || b.max.y <= top + 0.02) continue;
      if (probe.x + r > b.min.x && probe.x - r < b.max.x && probe.z + r > b.min.z && probe.z - r < b.max.z) return null;
    }
    // Land on top if there is room, else drop beyond a thin obstacle.
    const depth = Math.abs(fx) > Math.abs(fz) ? obstacle.max.x - obstacle.min.x : obstacle.max.z - obstacle.min.z;
    let land;
    if (depth > 0.75) land = { x: probe.x, y: top + 0.01, z: probe.z };
    else {
      // First spot past the obstacle where a standing body fits.
      for (const extra of [0.45, 0.7, 0.95]) {
        const d = 0.62 + depth + extra;
        const bx = p.pos.x + fx * d, bz = p.pos.z + fz * d;
        const fy = e.floorHeight(world, { x: bx, y: top, z: bz });
        const y = Number.isFinite(fy) && fy > -50 ? fy : feet;
        if (y < feet - 1.4) continue;
        if (l9(world, { x: bx - r, y: y + 0.05, z: bz - r }, { x: bx + r, y: y + Ia.standH, z: bz + r })) continue;
        land = { x: bx, y: y + 0.01, z: bz };
        break;
      }
      if (!land) return null;
    }
    const bd = world.bounds;
    if (land.x < bd.minX + 1 || land.x > bd.maxX - 1 || land.z < bd.minZ + 1 || land.z > bd.maxZ - 1) return null;
    return { from: { ...p.pos }, top, land, t: 0, dur: 0.38 + (top - feet) * 0.32 };
  }

  gp.mantleTarget = mantleTarget;
  const pupdate = e.Player.prototype.update;
  e.Player.prototype.update = function (dt, input, world, mult = 1) {
    if (!on("body") && !on("injuries")) return pupdate.call(this, dt, input, world, mult);
    const game = a.game;
    const b = body(this);
    const tunedBody = on("body");
    // Mantle in progress: scripted climb, no physics.
    if (b.mantle) {
      const m = b.mantle;
      m.t += dt / m.dur;
      const k = Math.min(1, m.t);
      const up = Math.min(1, k / 0.55), fwd = Math.max(0, (k - 0.35) / 0.65);
      const ease = (x) => x * x * (3 - 2 * x);
      this.pos.x = m.from.x + (m.land.x - m.from.x) * ease(fwd);
      this.pos.z = m.from.z + (m.land.z - m.from.z) * ease(fwd);
      const peak = m.top + 0.02;
      this.pos.y = k < 0.55 ? m.from.y + (peak - m.from.y) * ease(up) : peak + (m.land.y - peak) * ease(fwd);
      this.vel.x = this.vel.y = this.vel.z = 0;
      this.crouching = k < 0.85;
      this.height += ((this.crouching ? Ia.crouchH : Ia.standH) - this.height) * (1 - Math.exp(-14 * dt));
      this.grounded = k >= 1;
      if (k >= 1) b.mantle = null;
      return;
    }
    let inp = input, m = mult;
    if (tunedBody) {
      // Weight carried slows you down; injuries make you limp.
      const wdef = game?.weapon?.def;
      const wgt = wdef ? WEAPON[wdef.id]?.weight ?? wdef.weight ?? 3 : 3;
      m *= clamp(1.035 - wgt * 0.017, 0.78, 1.02);
      if (this.health < 35) m *= 0.86;
      // Stamina gates sprinting; exhaustion locks it until you recover.
      if (b.stamina < 0.04) b.exhausted = true;
      if (b.exhausted && b.stamina > 0.32) b.exhausted = false;
      const canSprint = !b.exhausted && this.health >= 20;
      if (inp.sprint && !canSprint) inp = { ...inp, sprint: false };
      if (inp.jump && this.grounded && this.alive) {
        const mt = mantleTarget(game, this);
        if (mt && b.stamina > 0.08) {
          b.mantle = mt;
          b.stamina = Math.max(0, b.stamina - 0.1);
          R.stats.mantles++;
          game?.audio?.play?.("cloth_move", null, { gain: 0.5 });
          return;
        }
        if (b.stamina < 0.06) inp = { ...inp, jump: false };
        else b.stamina = Math.max(0, b.stamina - 0.07);
      }
    }
    const vyBefore = this.vel.y, wasGrounded = this.grounded;
    const r = pupdate.call(this, dt, inp, world, m);
    if (tunedBody) {
      if (this.sprinting) {
        b.stamina = Math.max(0, b.stamina - dt * (0.105 + (game?.weapon?.def.weight || 3) * 0.004));
        b.regenDelay = 0.9;
        b.wasSprinting = true;
      } else {
        if (b.wasSprinting) { b.sprintEnd = game?.time ?? 0; b.wasSprinting = false; }
        b.regenDelay = Math.max(0, b.regenDelay - dt);
        if (b.regenDelay <= 0) b.stamina = Math.min(1, b.stamina + dt * (this.speed < 0.3 ? 0.15 : this.crouching ? 0.13 : 0.075));
      }
      b.fatigue += (Math.pow(1 - b.stamina, 1.4) - b.fatigue) * (1 - Math.exp(-dt * 1.5));
      // Fall damage from impact speed (≈2.2 m is harmless, ≈6 m is lethal).
      if (this.grounded && !wasGrounded && vyBefore < -6.6 && this.alive && game?.config?.mode !== "training") {
        const v = -vyBefore;
        const dmg = Math.round((v - 6.6) * (v - 6.6) * 5.2);
        if (dmg > 0) {
          R.stats.falls++;
          fallDamage(game, dmg);
        }
      }
    }
    return r;
  };
  function fallDamage(game, dmg) {
    const p = game.player;
    p.health -= dmg;
    game.damageFlash = Math.min(1, 0.4 + dmg / 60);
    game.audio?.play?.("player_hurt", null, { gain: 0.7 });
    game.audio?.play?.("body_fall", null, { gain: 0.8 });
    const b = body(p);
    if (on("injuries")) b.bleed += dmg * 0.012;
    if (p.health <= 0) {
      p.health = 0;
      p.alive = false;
      game.zombies?.tryRevive(p);
    }
  }

  // Bleeding: wounds keep costing health until they clot. Natural recovery is
  // slow and stops while bleeding.
  const hurt = e.Game.prototype.hurt;
  e.Game.prototype.hurt = function (amount, from) {
    const before = this.player?.health ?? 0;
    const r = hurt.call(this, amount, from);
    if (on("injuries") && this.player) {
      const lost = before - this.player.health;
      if (lost > 0) body(this.player).bleed += lost * 0.03 * (S.lethality || 1);
    }
    return r;
  };
  function injuries(game, dt) {
    const p = game.player;
    if (!p || !on("injuries") || game.phase !== "playing") return;
    const b = body(p);
    if (!p.alive) { b.bleed = 0; return; }
    if (b.bleed > 0.01) {
      const loss = b.bleed * dt;
      // Hardcore wounds can kill on their own.
      p.health = Math.max(S.preset === "hardcore" ? 0 : 1, p.health - loss);
      if (p.health <= 0 && p.alive) {
        p.alive = false;
        game.zombies?.tryRevive(p);
      }
      // Clotting: half-life ≈ 9 s (hardcore: 13 s).
      b.bleed *= Math.exp(-dt * Math.LN2 / (S.preset === "hardcore" ? 13 : 9));
    } else b.bleed = 0;
  }
  // Zombie mode regenerates 6 HP/s after 6 s; real recovery is far slower.
  const zupdate = e.ZombieAI.prototype.update;
  e.ZombieAI.prototype.update = function (dt, ctx) {
    const p = ctx?.player;
    const before = p?.health;
    const r = zupdate.call(this, dt, ctx);
    if (p && on("injuries") && Number.isFinite(before) && p.health > before && p.alive) {
      const gained = p.health - before;
      // Medical supply pickups (+65) are kept; passive regeneration is slowed.
      if (gained < 20) {
        const b = body(p);
        const rate = b.bleed > 0.15 ? 0 : (S.preset === "hardcore" ? 0.9 : 2.0) * (this.time - this.lastHurt > 9 ? 1 : 0);
        p.health = Math.min(p.health, before + rate * dt);
      }
    }
    return r;
  };

  /* ------------------------------------------------------------------ */
  /* Anatomy: zombies die when the brain is destroyed; soldiers are      */
  /* fragile; legs cripple.                                              */
  /* ------------------------------------------------------------------ */
  const zdamage = e.ZombieAI.prototype.damage;
  e.ZombieAI.prototype.damage = function (z, amount, part = "torso", pen = 0.3, ...rest) {
    if (!on("anatomy") || !z?.alive || !(amount > 0)) return zdamage.call(this, z, amount, part, pen, ...rest);
    let dmg = amount;
    const bullet = inShot > 0;
    if (part === "head") {
      if (z.kind === "boss") dmg *= 1.5;
      else if (bullet && z.armor > 0 && pen < 0.5 && Math.random() < 0.55) dmg *= 1.1; // glancing off a helmet
      else dmg = Math.max(dmg, z.health + z.armor + 1);
    } else if (bullet) {
      // No pain, no shock, no bleeding out: body hits only wreck tissue.
      dmg *= part === "legs" ? 0.6 : 0.45;
      if (part === "legs" && z.kind !== "boss" && z.kind !== "crawler") z.rlLimp = Math.min(1, (z.rlLimp || 0) + amount / (z.maxHealth * 0.55));
    }
    return zdamage.call(this, z, dmg, part, pen, ...rest);
  };
  // Shambling: each corpse moves at its own pace; leg damage makes it limp.
  const zenemies = e.ZombieAI.prototype.updateEnemies;
  e.ZombieAI.prototype.updateEnemies = function (dt, player) {
    if (!on("anatomy")) return zenemies.call(this, dt, player);
    const prev = [];
    for (const z of this.enemies) {
      if (!z.alive) continue;
      if (z.rlGait === undefined) z.rlGait = z.kind === "boss" ? 1 : 0.82 + ((z.id * 2654435761) >>> 0) / 4294967296 * 0.18;
      prev.push(z, z.pos.x, z.pos.z);
    }
    const r = zenemies.call(this, dt, player);
    for (let i = 0; i < prev.length; i += 3) {
      const z = prev[i];
      if (!z.alive) continue;
      const f = z.rlGait * (1 - (z.rlLimp || 0) * 0.5);
      if (f >= 0.999) continue;
      z.pos.x = prev[i + 1] + (z.pos.x - prev[i + 1]) * f;
      z.pos.z = prev[i + 2] + (z.pos.z - prev[i + 2]) * f;
    }
    return r;
  };
  // Soldiers' rifles hit hard; hardcore adds the rare fatal head hit.
  const aiEvent = e.Game.prototype.aiEvent;
  e.Game.prototype.aiEvent = function (ev, ...rest) {
    if (on("anatomy") && ev?.type === "shot" && ev.hit && ev.dmg > 0) {
      const lethal = S.lethality || 1;
      ev = { ...ev, dmg: ev.dmg * 2.6 * lethal };
      if (S.preset === "hardcore" && Math.random() < ({ easy: 0.01, normal: 0.025, hard: 0.04, expert: 0.06 }[this.config?.difficulty] ?? 0.02)) ev.dmg = 400;
    }
    if (on("acoustics") && ev?.type === "shot" && !ev.hit && this.player) R.acoustic?.nearMiss?.(this, ev);
    return aiEvent.call(this, ev, ...rest);
  };

  /* ------------------------------------------------------------------ */
  /* Per-frame hooks                                                     */
  /* ------------------------------------------------------------------ */
  function refresh() {
    applyWeaponDefs(a.game);
    applyBodyConstants();
  }
  a.on("attach", (game) => {
    refresh();
    for (const k of ["start", "restart"]) {
      const f = game[k];
      if (typeof f !== "function" || f.rlWrapped) continue;
      game[k] = function (...args) {
        refresh();
        const r = f.apply(this, args);
        if (this.player) delete this.player.rlBody;
        return r;
      };
      game[k].rlWrapped = true;
    }
  });
  R.on(() => refresh());
  refresh();
})();

;
/* Afterlight v12 — Realism: acoustics. */
(() => {
  "use strict";
  const a = window.__AF_OVERHAUL__?.state;
  const R = a?.realismV12;
  if (!R || R.acoustic) return;
  const e = a.engine, S = R.settings;
  const on = () => !!S.acoustics;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const C = 343; // speed of sound, m/s
  const ac = (R.acoustic = { ring: 0, muffle: 0, exposure: 0, room: null, nodes: null, breathT: 0, heartT: 0, flinch: 0 });
  const proto = ez.prototype;

  // Rooms: decay time, pre-delay, high-frequency damping, discrete echoes
  // (seconds, gain) from nearby facades for open-air maps.
  const ROOMS = {
    hall: { rt: 2.3, pre: 0.024, damp: 0.55, wet: 0.36, echoes: [] },
    corridor: { rt: 1.35, pre: 0.008, damp: 0.35, wet: 0.32, echoes: [[0.031, 0.25], [0.062, 0.14]] },
    bunker: { rt: 1.1, pre: 0.006, damp: 0.3, wet: 0.34, echoes: [[0.018, 0.3], [0.036, 0.18], [0.054, 0.1]] },
    yard: { rt: 0.9, pre: 0.02, damp: 0.7, wet: 0.16, echoes: [[0.14, 0.32], [0.29, 0.2], [0.46, 0.12]] },
    city: { rt: 1.3, pre: 0.012, damp: 0.6, wet: 0.2, echoes: [[0.06, 0.34], [0.11, 0.26], [0.19, 0.18], [0.33, 0.1]] },
    forest: { rt: 1.6, pre: 0.03, damp: 0.8, wet: 0.14, echoes: [[0.42, 0.08], [0.9, 0.05]] },
    open: { rt: 0.7, pre: 0.03, damp: 0.85, wet: 0.1, echoes: [[0.6, 0.1], [1.3, 0.06]] },
    dock: { rt: 1.2, pre: 0.015, damp: 0.65, wet: 0.18, echoes: [[0.09, 0.3], [0.21, 0.2], [0.38, 0.12]] },
  };
  const MAP_ROOM = { theater: "hall", ward: "corridor", bunker: "bunker", yard: "yard", urban: "city", forest: "forest", desert: "open", harbor: "dock", rail: "dock", cemetery: "forest" };
  function impulse(ctx, room) {
    const sr = ctx.sampleRate, len = Math.floor(sr * Math.min(3.2, room.rt * 1.15 + room.pre + 0.1));
    const buf = ctx.createBuffer(2, len, sr);
    let seed = 90127;
    const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296) * 2 - 1;
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let lp = 0;
      const pre = Math.floor(room.pre * sr);
      for (let i = pre; i < len; i++) {
        const t = (i - pre) / sr;
        // -60 dB at rt; high frequencies die faster (one-pole lowpass whose
        // cutoff falls with time).
        const env = Math.pow(10, (-3 * t) / room.rt);
        const k = clamp(0.95 - room.damp * (t / room.rt) * 0.9, 0.04, 0.95);
        lp += (rnd() - lp) * k;
        d[i] = lp * env * 0.5;
      }
      for (const [dt, g] of room.echoes) {
        const at = Math.floor((dt + (ch ? 0.0035 : 0)) * sr);
        for (let j = 0; j < 220 && at + j < len; j++) d[at + j] += rnd() * g * Math.exp(-j / 40);
      }
    }
    return buf;
  }
  function setRoom(audio, mapId) {
    if (!audio?.ctx || !audio.reverb) return;
    const name = on() ? MAP_ROOM[mapId] || "open" : null;
    if (ac.room === name && ac.roomAudio === audio) return;
    ac.room = name;
    ac.roomAudio = audio;
    if (!name) {
      if (ac.originalIR) audio.reverb.buffer = ac.originalIR;
      return;
    }
    if (!ac.originalIR) ac.originalIR = audio.reverb.buffer;
    audio.reverb.buffer = impulse(audio.ctx, ROOMS[name]);
  }
  // Ears: a muffling lowpass in the master chain and a ringing tone after
  // blasts or sustained unprotected gunfire indoors.
  function ears(audio) {
    if (ac.nodes?.audio === audio || !audio?.ctx || !audio.master || !audio.compressor) return ac.nodes;
    const ctx = audio.ctx;
    const muffle = ctx.createBiquadFilter();
    muffle.type = "lowpass";
    muffle.frequency.value = 20000;
    muffle.Q.value = 0.5;
    try { audio.master.disconnect(audio.compressor); } catch {}
    audio.master.connect(muffle);
    muffle.connect(audio.compressor);
    const ring = ctx.createGain();
    ring.gain.value = 0;
    ring.connect(audio.compressor);
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
    o1.frequency.value = 6150; o2.frequency.value = 6420;
    o1.type = o2.type = "sine";
    o1.connect(ring); o2.connect(ring);
    o1.start(); o2.start();
    ac.nodes = { audio, muffle, ring };
    return ac.nodes;
  }
  ac.concuss = function (strength) {
    ac.ring = clamp(Math.max(ac.ring, strength), 0, 1);
    ac.muffle = clamp(Math.max(ac.muffle, strength * 1.1), 0, 1);
    if (R.cameraFx) R.cameraFx.concussion = Math.max(R.cameraFx.concussion || 0, strength);
  };
  function tickEars(audio, dt) {
    const n = ears(audio);
    if (!n) return;
    ac.ring = Math.max(0, ac.ring - dt / 7.5);
    ac.muffle = Math.max(0, ac.muffle - dt / 4.5);
    ac.exposure = Math.max(0, ac.exposure - dt * 0.05);
    const t = audio.ctx.currentTime;
    const f = on() ? 20000 * Math.pow(650 / 20000, Math.min(1, ac.muffle)) : 20000;
    n.muffle.frequency.setTargetAtTime(f, t, 0.05);
    n.ring.gain.setTargetAtTime(on() ? ac.ring * ac.ring * 0.045 * (audio.volume || 0.65) : 0, t, 0.08);
  }

  const MAX_DIST = 55;
  const LOUD = /^(gun_|explosion|debris|grenade_)/;
  const IMPULSIVE = /^(gun_|explosion|impact_|ricochet|grenade_bounce|glass|debris)/;
  const play = proto.play;
  proto.play = function (name, pos, opts = {}) {
    if (!on() || !pos || opts.loop || !this.listenerPos) return play.call(this, name, pos, opts);
    const L = this.listenerPos;
    const dx = pos.x - L.x, dy = pos.y - L.y, dz = pos.z - L.z;
    const d = Math.hypot(dx, dy, dz);
    let p = pos, gain = opts.gain ?? 1;
    // Gunfire and blasts carry hundreds of metres; the core mixer culls at
    // 55 m, so far sources are placed on the same bearing at 54 m and
    // attenuated for the true distance.
    if (d > MAX_DIST - 1) {
      if (!LOUD.test(name) || d > 420) return null;
      const s = (MAX_DIST - 1) / d;
      p = { x: L.x + dx * s, y: L.y + dy * s, z: L.z + dz * s };
      gain *= Math.pow((MAX_DIST - 1) / d, 0.85);
    }
    const o = { ...opts, gain, delay: (opts.delay || 0) + d / C };
    if (IMPULSIVE.test(name)) {
      const room = ROOMS[ac.room] || ROOMS.open;
      o.reverb = Math.max(opts.reverb || 0, room.wet * (name.startsWith("impact") ? 0.35 : 1) * (opts.suppressed ? 0.4 : 1));
    }
    const h = play.call(this, name, p, o);
    // Air absorbs high frequencies with distance.
    const filter = h?.nodes?.[2];
    if (filter?.frequency) {
      const cutoff = clamp(20000 * Math.exp(-d / 42), 1600, 20000);
      if (cutoff < filter.frequency.value) filter.frequency.value = cutoff;
    }
    return h;
  };
  // The shooter's own report: louder reverb indoors, cumulative exposure.
  const shot = proto.shot;
  proto.shot = function (def, pos, indoor = false) {
    if (!on()) return shot.call(this, def, pos, indoor);
    const room = ROOMS[ac.room] || ROOMS.open;
    if (!pos) {
      // Own weapon: route through play() without a position, so give it the
      // room's reverb explicitly.
      const fam = this.families.has("gun_" + def.id) ? def.id : def.sound?.family || def.id;
      this.play("gun_" + fam, null, { gain: 0.9 * (def.sound?.gain || 1), rate: def.sound?.rate || void 0, reverb: def.suppressed ? room.wet * 0.25 : room.wet * (indoor ? 1.25 : 0.9) });
      if (def.casingKind !== "none") this.play("casing_" + (this.surface === "metal" ? "metal" : "tile"), null, { gain: 0.23, delay: 0.17 });
      if (def.id === "shotgun") this.play("reload_pump", null, { gain: 0.65, delay: 0.19 });
      if (def.id === "sniper") this.play("reload_bolt", null, { gain: 0.6, delay: 0.23 });
      if (!def.suppressed && indoor) {
        ac.exposure += def.id === "sniper" || def.id === "shotgun" || def.id === "autoShotgun" || def.id === "lmg" || def.id === "dmr" ? 0.06 : 0.03;
        if (ac.exposure > 0.6) ac.concuss(Math.min(0.32, (ac.exposure - 0.6) * 0.6));
      }
      return;
    }
    return shot.call(this, def, pos, indoor);
  };
  // Blasts: delayed by distance (via play), plus overpressure on the ears.
  const explosion = proto.explosion;
  proto.explosion = function (pos) {
    const r = explosion.call(this, pos);
    if (on() && pos && this.listenerPos) {
      const d = Math.hypot(pos.x - this.listenerPos.x, pos.y - this.listenerPos.y, pos.z - this.listenerPos.z);
      if (d < 14) {
        const s = clamp(1.1 - d / 12, 0, 1);
        const delay = d / C;
        setTimeout(() => ac.concuss(s), delay * 1000);
      }
    }
    return r;
  };

  // Supersonic crack and the flinch of a round passing close by.
  let crackBuf = null;
  function crack(audio, pos, strength) {
    const ctx = audio?.ctx;
    if (!ctx || audio.paused) return;
    if (!crackBuf) {
      const n = Math.floor(ctx.sampleRate * 0.03);
      crackBuf = ctx.createBuffer(1, n, ctx.sampleRate);
      const d = crackBuf.getChannelData(0);
      for (let i = 0; i < n; i++) {
        const t = i / ctx.sampleRate;
        // N-wave: sharp positive edge, linear fall, sharp return.
        const nw = t < 0.0004 ? 1 : t < 0.0028 ? 1 - 2 * ((t - 0.0004) / 0.0024) : t < 0.0032 ? -1 : 0;
        d[i] = nw * 0.9 + (Math.random() * 2 - 1) * Math.exp(-t * 300) * 0.35;
      }
    }
    const src = ctx.createBufferSource();
    src.buffer = crackBuf;
    const g = ctx.createGain();
    g.gain.value = 0.5 * strength * (audio.volume || 0.65);
    const pan = ctx.createPanner();
    pan.panningModel = "HRTF";
    pan.positionX.value = pos.x; pan.positionY.value = pos.y; pan.positionZ.value = pos.z;
    src.connect(g); g.connect(pan); pan.connect(audio.buses?.effects || audio.master);
    src.onended = () => { try { src.disconnect(); g.disconnect(); pan.disconnect(); } catch {} };
    src.start();
  }
  ac.nearMiss = function (game, ev) {
    const p = game.player, eye = p.eye;
    const f = ev.from, t = ev.to;
    const dx = t.x - f.x, dy = t.y - f.y, dz = t.z - f.z;
    const len = Math.hypot(dx, dy, dz) || 1;
    const ux = dx / len, uy = dy / len, uz = dz / len;
    const s = clamp((eye.x - f.x) * ux + (eye.y - f.y) * uy + (eye.z - f.z) * uz, 0, len);
    const cx = f.x + ux * s, cy = f.y + uy * s, cz = f.z + uz * s;
    const d = Math.hypot(eye.x - cx, eye.y - cy, eye.z - cz);
    if (d > 3.2 || s >= len - 0.01) return;
    const strength = clamp(1 - d / 3.2, 0, 1);
    // pistol-calibre SMG rounds are subsonic-ish; rifle rounds crack
    if (ev.weapon !== "smg") crack(game.audio, { x: cx, y: cy, z: cz }, strength);
    ac.flinch = Math.max(ac.flinch, strength);
    game.recoilPitch += (Math.random() - 0.3) * 0.006 * strength;
    game.recoilYaw += (Math.random() - 0.5) * 0.008 * strength;
  };

  // Breathing and heartbeat, synthesised so they follow the body exactly.
  let noiseBuf = null;
  function breath(audio, strength, exhale) {
    const ctx = audio?.ctx;
    if (!ctx || audio.paused || strength < 0.02) return;
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = exhale ? 900 : 1500;
    bp.Q.value = 0.8;
    const g = ctx.createGain();
    const dur = exhale ? 0.55 : 0.42;
    const peak = 0.055 * strength * (audio.volume || 0.65);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + dur * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    src.connect(bp); bp.connect(g); g.connect(audio.master);
    src.start(t, Math.random());
    src.stop(t + dur + 0.05);
    src.onended = () => { try { src.disconnect(); bp.disconnect(); g.disconnect(); } catch {} };
  }
  function beat(audio, strength) {
    const ctx = audio?.ctx;
    if (!ctx || audio.paused || strength < 0.03) return;
    const t = ctx.currentTime;
    for (const [off, amp] of [[0, 1], [0.16, 0.65]]) {
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(62, t + off);
      o.frequency.exponentialRampToValueAtTime(38, t + off + 0.12);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t + off);
      g.gain.linearRampToValueAtTime(0.16 * strength * amp * (audio.volume || 0.65), t + off + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0005, t + off + 0.16);
      o.connect(g); g.connect(audio.master);
      o.start(t + off); o.stop(t + off + 0.2);
      o.onended = () => { try { o.disconnect(); g.disconnect(); } catch {} };
    }
  }
  function tickBody(game, dt) {
    const audio = game.audio, p = game.player, b = p?.rlBody;
    if (!b || !on() || game.phase !== "playing" || !p.alive) return;
    const hurt = clamp((45 - p.health) / 40, 0, 1);
    // Breathing: rate and loudness follow fatigue; silent while holding.
    const rate = 0.28 + b.fatigue * 0.55;
    ac.breathT -= dt;
    if (ac.breathT <= 0 && !b.holding) {
      const exhale = (ac.breathPhase = !ac.breathPhase);
      ac.breathT = (1 / rate) * (exhale ? 0.55 : 0.45);
      const loud = Math.max(b.fatigue * 0.9, b.gasp > 0 ? 0.8 : 0, hurt * 0.4);
      breath(audio, loud, exhale);
    }
    const bpm = 70 + b.fatigue * 70 + hurt * 50;
    ac.heartT -= dt;
    if (ac.heartT <= 0) {
      ac.heartT = 60 / bpm;
      beat(audio, Math.max(hurt, b.fatigue > 0.6 ? (b.fatigue - 0.6) * 1.5 : 0, b.holding && b.breath < 0.4 ? 0.4 : 0));
    }
  }

  a.on("frame", (game, dt) => {
    try {
      const audio = game.audio;
      if (!audio) return;
      setRoom(audio, game.map?.def.id);
      tickEars(audio, dt);
      tickBody(game, dt);
      ac.flinch = Math.max(0, ac.flinch - dt * 3);
      if (R.cameraFx) R.cameraFx.concussion = Math.max(0, (R.cameraFx.concussion || 0) - dt / 5);
    } catch (err) {
      console.error("[realism] acoustics", err);
    }
  });
  R.on(() => {
    const audio = a.game?.audio;
    if (audio) setRoom(audio, a.game.map?.def.id);
  });
})();

;
/* Afterlight v12 — Realism: settings panel and immersive HUD. */
(() => {
  "use strict";
  const a = window.__AF_OVERHAUL__?.state;
  const R = a?.realismV12;
  if (!R || R.ui) return;
  const S = R.settings;
  const ui = (R.ui = {});
  const h = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
      else if (v !== null && v !== undefined && v !== false) n.setAttribute(k, v === true ? "" : v);
    }
    for (const c of kids.flat()) if (c !== null && c !== undefined && c !== false) n.append(c instanceof Node ? c : document.createTextNode(String(c)));
    return n;
  };
  const CSS = `
.rl-tab { margin-left: 4px; }
.rl-tab::after { content: "NEW"; font-size: 9px; letter-spacing: .12em; margin-left: 6px; color: #e8c27a; }
.rl-panel .af-seg button[aria-pressed="true"] { }
.rl-presets { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 12px; }
.rl-presets button { text-align: left; padding: 10px 12px; min-height: 64px; display: flex; flex-direction: column; gap: 4px; }
.rl-presets button b { font-family: "Barlow Condensed", sans-serif; font-size: 20px; font-weight: 600; letter-spacing: .02em; }
.rl-presets button small { font-size: 10px; color: var(--muted, #abb0a2); line-height: 1.35; letter-spacing: .02em; text-transform: none; }
.rl-presets button[aria-pressed="true"] { border-color: #c6ad80; background: #2b2a20; }
.rl-cal { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
.rl-cal td, .rl-cal th { text-align: left; padding: 4px 6px; border-bottom: 1px solid #3c433766; }
.rl-cal th { color: var(--muted, #abb0a2); font-weight: 400; letter-spacing: .14em; font-size: 9px; text-transform: uppercase; }
.rl-sub { color: #c6ad80; letter-spacing: .24em; font-size: 10px; margin: 16px 0 0; }
@media (max-width: 560px) { .rl-presets { grid-template-columns: 1fr; } }
/* Immersive HUD: no damage numbers, no reticle while aiming, quieter marks. */
body.rl-hud-immersive .hit-number, body.rl-hud-minimal .hit-number { display: none !important; }
body.rl-hud-immersive .crosshair.aiming, body.rl-hud-minimal .crosshair { display: none !important; }
body.rl-hud-immersive .hitmark { opacity: .45; transform: translate(-50%, -50%) scale(.7); }
body.rl-hud-minimal .hitmark { display: none !important; }
body.rl-hud-immersive .ammo > span, body.rl-hud-minimal .ammo > span { display: none !important; }
.rl-ammo { display: block; text-align: right; font-family: "Barlow Condensed", sans-serif; pointer-events: none; line-height: 1.05; }
.rl-ammo b { font-size: 26px; font-weight: 600; letter-spacing: .04em; }
.rl-ammo i { display: inline-block; width: 7px; height: 16px; margin-left: 3px; background: #eeecdf; opacity: .9; border-radius: 1px; vertical-align: -2px; }
.rl-ammo i.rl-empty { background: transparent; border: 1px solid #eeecdf66; }
.rl-ammo small { display: block; font-family: "IBM Plex Mono", monospace; font-size: 10px; color: #c9cdbd; letter-spacing: .12em; }
body.rl-hud-minimal .rl-ammo.rl-idle { opacity: 0; transition: opacity .6s; }
.rl-breath { position: fixed; left: 50%; bottom: 18%; transform: translateX(-50%); width: 120px; height: 3px; background: #ffffff1a; pointer-events: none; z-index: 4; opacity: 0; transition: opacity .25s; }
.rl-breath i { display: block; height: 100%; background: #e8e4d4; }
.rl-breath.rl-on { opacity: .8; }
.rl-stamina { position: fixed; left: 12px; bottom: 54px; width: 110px; height: 2px; background: #ffffff1a; pointer-events: none; z-index: 4; opacity: 0; transition: opacity .4s; }
.rl-stamina i { display: block; height: 100%; background: #d6d2bf; }
.rl-stamina.rl-on { opacity: .85; }
body.rl-hud-minimal .rl-stamina { display: none; }
`;
  function css() {
    if (!document.getElementById("rl-css")) document.head.append(h("style", { id: "rl-css" }, CSS));
  }
  const seg = (options, value, set) => h("div", { class: "af-seg" }, options.map(([v, label]) => h("button", { type: "button", "aria-pressed": String(v === value), onclick: () => set(v) }, label)));
  const field = (label, control) => h("label", { class: "af-field" }, h("span", {}, label), control);
  const onOff = (key) => seg([[true, "ON"], [false, "OFF"]], S[key], (v) => { R.save({ [key]: v, preset: "custom" }); render(); });
  let panel = null, modal = null;
  function close() {
    modal?.remove();
    modal = panel = null;
  }
  function render() {
    if (!panel) return;
    const p = S.preset;
    const preset = (name, title, text) => h("button", { type: "button", "aria-pressed": String(p === name), onclick: () => { R.applyPreset(name); render(); } }, h("b", {}, title), h("small", {}, text));
    const W = R.gameplay?.weapons || {}, C = R.gameplay?.calibers || {}, defs = a.engine.weaponDefs;
    panel.replaceChildren(
      h("header", {}, h("div", {}, h("p", { class: "eyebrow" }, "REALISM / v" + R.version), h("h2", {}, "As real as it gets")), h("button", { type: "button", class: "af-close", onclick: close }, "CLOSE")),
      h("div", { class: "rl-presets" },
        preset("authentic", "Authentic", "Real calibres, drop and penetration, recoil and sway, stamina, bleeding, headshot-only zombies, photoscanned world."),
        preset("hardcore", "Hardcore", "Authentic plus lethal soldiers, slower healing, wounds that can kill, no reticle or hit markers."),
        preset("off", "Off", "The original v11 game, untouched.")),
      h("p", { class: "rl-sub" }, p === "custom" ? "CUSTOM MIX" : "ASPECTS"),
      h("div", { class: "af-grid" },
        field("Photoscanned surfaces", onOff("surfaces")),
        field("HDRI skies & reflections", onOff("sky")),
        field("Camera: exposure, white balance, focus", onOff("camera")),
        field("Motion blur", seg([[true, "ON"], [false, "OFF"]], S.motionBlur, (v) => { R.save({ motionBlur: v }); render(); })),
        field("Film response & grade", onOff("filmic")),
        field("Ballistics & calibres", onOff("ballistics")),
        field("Recoil, sway & breathing", onOff("handling")),
        field("Body: inertia, stamina, mantling, falls", onOff("body")),
        field("Injuries & healing", onOff("injuries")),
        field("Anatomy & lethality", onOff("anatomy")),
        field("Acoustics", onOff("acoustics")),
        field("HUD", seg([["standard", "STANDARD"], ["immersive", "IMMERSIVE"], ["minimal", "MINIMAL"]], S.hud, (v) => { R.save({ hud: v, preset: "custom" }); render(); }))),
      h("p", { class: "af-note" },
        "Hold breath: SHIFT while aiming (touch: hold a scoped rifle still). Vault: JUMP at a waist-high obstacle. Check the magazine: F / hold RLD. ",
        "Zombies only stop when the brain is destroyed; leg hits slow them. Bullets drop, lose energy and punch through thin cover; rifle rounds pass through bodies. ",
        "Sprinting tires you and makes your aim shake; wounds bleed until they clot. Gunfire arrives at the speed of sound and echoes off its surroundings; blasts ring your ears."),
      h("p", { class: "rl-sub" }, "ARSENAL"),
      h("table", { class: "rl-cal" },
        h("tr", {}, h("th", {}, "Weapon"), h("th", {}, "Cartridge"), h("th", {}, "Muzzle velocity"), h("th", {}, "Rate")),
        Object.keys(C).map((id) => h("tr", {}, h("td", {}, defs[id]?.name || id), h("td", {}, C[id].name), h("td", {}, C[id].v0 + " m/s"), h("td", {}, (W[id]?.rpm || defs[id]?.rpm) + " rpm")))),
      h("p", { class: "af-note" }, "Surface scans and skies: Poly Haven (CC0). Gun finishes generated for this build."),
    );
  }
  function open() {
    css();
    close();
    panel = h("div", { class: "af-panel rl-panel", role: "dialog" });
    modal = h("div", { class: "af-modal", onclick: (ev) => ev.target === modal && close() }, panel);
    document.body.append(modal);
    render();
  }
  ui.open = open;
  function tab() {
    const nav = document.querySelector("nav.tabs");
    if (!nav || nav.querySelector(".rl-tab")) return;
    css();
    nav.append(h("button", { type: "button", class: "rl-tab", onclick: open }, "REALISM"));
  }
  function attachTab() {
    const root = document.getElementById("root");
    if (!root) return;
    new MutationObserver(() => tab()).observe(root, { childList: true, subtree: true });
    tab();
  }
  // HUD layer
  function hudClass() {
    document.body.classList.toggle("rl-hud-immersive", S.hud === "immersive");
    document.body.classList.toggle("rl-hud-minimal", S.hud === "minimal");
  }
  let ammoEl = null, breathEl = null, stamEl = null, lastShown = -9, lastMag = null, lastHud = 0;
  function hudFrame(game, dt) {
    if (game.phase !== "playing" || a.coop?.active) return;
    const now = performance.now();
    if (now - lastHud < 60) return;
    lastHud = now;
    const box = document.querySelector(".hud .ammo");
    const w = game.weapon;
    if (S.hud === "standard" || !box || !w) { ammoEl?.remove(); ammoEl = null; }
    else {
      if (!ammoEl || !box.contains(ammoEl)) {
        ammoEl = h("div", { class: "rl-ammo" });
        const span = box.querySelector(":scope > span");
        span ? span.after(ammoEl) : box.append(ammoEl);
      }
      // You feel a magazine's weight, you don't count it. Exact counts only
      // when checking it (inspect), reloading, or for tube/cylinder guns.
      const def = w.def, cap = def.magSize;
      const checking = game.inspect > 0 || w.reloading;
      if (checking) lastShown = game.time;
      const exact = game.time - lastShown < 2.2 || cap <= 8;
      const frac = Math.min(1, w.mag / cap);
      const mags = Math.floor(w.reserve / cap), loose = w.reserve - mags * cap;
      const bars = 5, filled = w.mag <= 0 ? 0 : Math.max(1, Math.round(frac * bars));
      const label = w.mag === 0 ? "EMPTY" : exact ? String(w.mag) : frac > 0.85 ? "FULL" : frac > 0.6 ? "HEAVY" : frac > 0.35 ? "HALF" : "LIGHT";
      const res = mags > 0 ? `+${mags} MAG${mags > 1 ? "S" : ""}${loose ? ` · ${loose} LOOSE` : ""}` : loose ? `${loose} LOOSE` : "NO RESERVE";
      const key = label + filled + res;
      if (key !== ammoEl.dataset.k) {
        ammoEl.dataset.k = key;
        ammoEl.replaceChildren(h("b", {}, label), ...Array.from({ length: bars }, (_, i) => h("i", { class: i < filled ? "" : "rl-empty" })), h("small", {}, res));
      }
      if (lastMag !== w.mag) { lastMag = w.mag; ammoEl.classList.remove("rl-idle"); ammoEl.rlT = game.time; }
      ammoEl.classList.toggle("rl-idle", !checking && game.time - (ammoEl.rlT || 0) > 3);
    }
    const b = game.player?.rlBody;
    if (!breathEl) { breathEl = h("div", { class: "rl-breath" }, h("i")); document.body.append(breathEl); }
    if (!stamEl) { stamEl = h("div", { class: "rl-stamina" }, h("i")); document.body.append(stamEl); }
    const holding = !!b && (b.holding || b.breath < 0.99) && game.ads > 0.6 && R.settings.handling;
    breathEl.classList.toggle("rl-on", holding);
    if (b) breathEl.firstChild.style.width = Math.round(b.breath * 100) + "%";
    const tired = !!b && b.stamina < 0.98 && R.settings.body;
    stamEl.classList.toggle("rl-on", tired);
    if (b) stamEl.firstChild.style.width = Math.round(b.stamina * 100) + "%";
  }
  a.on("frame", (game, dt) => { try { hudFrame(game, dt); } catch (err) { console.error("[realism] hud", err); } });
  a.on("detach", () => { ammoEl?.remove(); ammoEl = null; });
  R.on(() => hudClass());
  hudClass();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", attachTab);
  else attachTab();
})();
