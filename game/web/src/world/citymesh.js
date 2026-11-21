// Builds all static city geometry from citygen data. Buildings, roads, ground and landmarks are
// merged into a few chunk meshes sharing one atlas material; props are instanced.

import * as THREE from 'three';
import {
  BLOCK, ROAD_HALF, WALK, CURB, NX, NZ, nodeX, nodeZ, CITY, LAND, PIER, WATER_LEVEL, landSdf,
} from './citygen.js';
import { tileOrigin, makeCityMaterial, buildAtlas, makeSignTexture, nightUniform } from './textures.js';
import { makeRng } from '../util.js';

const CHUNK = 250;
const FACADE = 7.2; // world size of one facade tile (2 bays x 2 floors)

const col = (hex, mul = 1) => {
  const c = new THREE.Color(hex);
  if (mul !== 1) c.multiplyScalar(mul);
  return c;
};

export class GeoBuilder {
  constructor() {
    this.p = []; this.n = []; this.uv = []; this.c = []; this.t = []; this.i = [];
    this.vc = 0;
  }
  vert(x, y, z, nx, ny, nz, u, v, color, tile, tz) {
    this.p.push(x, y, z);
    this.n.push(nx, ny, nz);
    this.uv.push(u, v);
    this.c.push(color.r, color.g, color.b);
    this.t.push(tile[0], tile[1], tz);
    return this.vc++;
  }
  /** a,b,c,d counter-clockwise seen from the normal side. */
  quad(a, b, c, d, nrm, u0, v0, u1, v1, color, tileName = 'white', mode = 2, seed = 0) {
    const tile = tileOrigin(tileName);
    const tz = mode + Math.min(seed, 0.999);
    const i0 = this.vert(a[0], a[1], a[2], nrm[0], nrm[1], nrm[2], u0, v0, color, tile, tz);
    this.vert(b[0], b[1], b[2], nrm[0], nrm[1], nrm[2], u1, v0, color, tile, tz);
    this.vert(c[0], c[1], c[2], nrm[0], nrm[1], nrm[2], u1, v1, color, tile, tz);
    this.vert(d[0], d[1], d[2], nrm[0], nrm[1], nrm[2], u0, v1, color, tile, tz);
    this.i.push(i0, i0 + 1, i0 + 2, i0, i0 + 2, i0 + 3);
  }
  /** Horizontal rectangle facing up. uvScale = metres per texture tile. */
  top(x0, z0, x1, z1, y, color, tileName = 'white', uvScale = 0, mode = 2) {
    let u0 = 0.5, v0 = 0.5, u1 = 0.5, v1 = 0.5;
    if (uvScale > 0) {
      const ox = Math.floor(x0 / uvScale / 8) * 8, oz = Math.floor(z0 / uvScale / 8) * 8;
      u0 = x0 / uvScale - ox; u1 = x1 / uvScale - ox;
      v0 = z0 / uvScale - oz; v1 = z1 / uvScale - oz;
    }
    // (x0,z1) (x1,z1) (x1,z0) (x0,z0)
    const tile = tileOrigin(tileName);
    const tz = mode;
    const nrm = [0, 1, 0];
    const i0 = this.vert(x0, y, z1, 0, 1, 0, u0, v1, color, tile, tz);
    this.vert(x1, y, z1, 0, 1, 0, u1, v1, color, tile, tz);
    this.vert(x1, y, z0, 0, 1, 0, u1, v0, color, tile, tz);
    this.vert(x0, y, z0, 0, 1, 0, u0, v0, color, tile, tz);
    this.i.push(i0, i0 + 1, i0 + 2, i0, i0 + 2, i0 + 3);
    void nrm;
  }
  /** Axis-aligned box. faces: object with optional per-face {tile, uScale, vScale, color}. */
  box(x0, y0, z0, x1, y1, z1, color, opts = {}) {
    const tile = opts.tile || 'white';
    const us = opts.uScale || 0; // metres per tile horizontally (0 = flat)
    const vs = opts.vScale || 0;
    const mode = opts.mode ?? 2;
    const seed = opts.seed || 0;
    const topTile = opts.topTile || tile;
    const topColor = opts.topColor || color;
    const w = x1 - x0, h = y1 - y0, d = z1 - z0;
    const uw = us ? Math.max(1, Math.round(w / us)) : 0;
    const ud = us ? Math.max(1, Math.round(d / us)) : 0;
    const vh = vs ? h / vs : 0;
    const vOff = opts.vOff || 0;
    const fu = (n) => (us ? n : 0.5);
    const fv0 = vs ? vOff : 0.5, fv1 = vs ? vOff + vh : 0.5;
    // +Z
    this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], fu(0), fv0, fu(uw), fv1, color, tile, mode, seed);
    // -Z
    this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], fu(0), fv0, fu(uw), fv1, color, tile, mode, seed + 0.13);
    // +X
    this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], fu(0), fv0, fu(ud), fv1, color, tile, mode, seed + 0.27);
    // -X
    this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], fu(0), fv0, fu(ud), fv1, color, tile, mode, seed + 0.41);
    if (opts.noTop) return;
    if (topTile === 'roof') this.top(x0, z0, x1, z1, y1, topColor, 'roof', 8, 2);
    else this.top(x0, z0, x1, z1, y1, topColor, topTile, opts.topScale || 0, 2);
  }
  /** Merge an arbitrary three.js geometry with a transform, flat-tiled with one colour. */
  geo(geometry, matrix, color, tileName = 'white', mode = 2) {
    const g = geometry.index ? geometry.toNonIndexed() : geometry;
    const pos = g.attributes.position, nor = g.attributes.normal;
    const nm = new THREE.Matrix3().getNormalMatrix(matrix);
    const v = new THREE.Vector3(), n = new THREE.Vector3();
    const tile = tileOrigin(tileName);
    const base = this.vc;
    const colAttr = g.attributes.color;
    const cc = new THREE.Color();
    for (let k = 0; k < pos.count; k++) {
      v.fromBufferAttribute(pos, k).applyMatrix4(matrix);
      n.fromBufferAttribute(nor, k).applyMatrix3(nm).normalize();
      if (colAttr) {
        cc.setRGB(colAttr.getX(k) * color.r, colAttr.getY(k) * color.g, colAttr.getZ(k) * color.b);
        this.vert(v.x, v.y, v.z, n.x, n.y, n.z, 0.5, 0.5, cc, tile, mode);
      } else {
        this.vert(v.x, v.y, v.z, n.x, n.y, n.z, 0.5, 0.5, color, tile, mode);
      }
    }
    for (let k = 0; k < pos.count; k++) this.i.push(base + k);
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('tinfo', new THREE.Float32BufferAttribute(this.t, 3));
    g.setIndex(this.vc > 65535 ? new THREE.Uint32BufferAttribute(this.i, 1) : new THREE.Uint16BufferAttribute(this.i, 1));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

const STYLE = {
  glass: { tile: 'glass', u: FACADE, v: FACADE, mode: 0 },
  darkglass: { tile: 'darkglass', u: FACADE, v: FACADE, mode: 0 },
  office: { tile: 'office', u: FACADE, v: FACADE, mode: 0 },
  deco: { tile: 'deco', u: FACADE, v: FACADE, mode: 0 },
  hotel: { tile: 'hotel', u: FACADE, v: FACADE, mode: 0 },
  brick: { tile: 'brick', u: FACADE, v: FACADE, mode: 0 },
  house: { tile: 'house', u: 8, v: 7.2, mode: 0 },
  warehouse: { tile: 'warehouse', u: 8, v: 0, mode: 0 },
  container: { tile: 'container', u: 4, v: 0, mode: 2 },
  plain: { tile: 'white', u: 0, v: 0, mode: 2 },
};

function addBuilding(gb, b) {
  const st = STYLE[b.style] || STYLE.plain;
  const x0 = b.x - b.w / 2, x1 = b.x + b.w / 2, z0 = b.z - b.d / 2, z1 = b.z + b.d / 2;
  const y0 = b.y0, y1 = b.y0 + b.h;
  const color = col(b.color ?? 0xffffff);
  const roofCol = col(0xd8dadc);
  const seed = b.seed || 0;
  if (b.style === 'warehouse' || b.style === 'container') {
    // whole height maps to one tile vertically
    gb.box(x0, y0, z0, x1, y1, z1, color, { tile: st.tile, uScale: st.u, vScale: b.h, mode: st.mode, seed, topTile: b.style === 'container' ? 'container' : 'roof', topColor: b.style === 'container' ? color : roofCol, topScale: 4 });
    return;
  }
  if (b.style === 'plain') {
    gb.box(x0, y0, z0, x1, y1, z1, color, { tile: 'white', mode: 2, noTop: false });
    return;
  }
  let ys = y0;
  if (b.shop && b.h > 7) {
    const sh = 4.2;
    gb.box(x0, y0, z0, x1, y0 + sh, z1, color, { tile: 'shop', uScale: FACADE, vScale: sh, mode: 1, seed, noTop: true });
    ys = y0 + sh;
  }
  if (b.roof === 'gable') {
    gb.box(x0, ys, z0, x1, y1, z1, color, { tile: st.tile, uScale: st.u, vScale: st.v, mode: st.mode, seed, noTop: true });
    addGable(gb, x0, z0, x1, z1, y1, b.ridgeAlongX, color, col(b.roofColor ?? 0xb85432));
    return;
  }
  gb.box(x0, ys, z0, x1, y1, z1, color, { tile: st.tile, uScale: st.u, vScale: st.v, mode: st.mode, seed, topTile: 'roof', topColor: roofCol });
  // roof parapet lip
  if (b.h > 6 && b.w > 6 && b.d > 6) {
    const t = 0.4, ph = 0.9;
    const pc = color.clone().multiplyScalar(0.92);
    gb.box(x0, y1, z0, x1, y1 + ph, z0 + t, pc);
    gb.box(x0, y1, z1 - t, x1, y1 + ph, z1, pc);
    gb.box(x0, y1, z0 + t, x0 + t, y1 + ph, z1 - t, pc);
    gb.box(x1 - t, y1, z0 + t, x1, y1 + ph, z1 - t, pc);
  }
}

function addGable(gb, x0, z0, x1, z1, y, alongX, wallColor, roofColor) {
  const rh = 2.4, ov = 0.5;
  if (alongX) {
    const zm = (z0 + z1) / 2;
    // two slopes: north slope from z0-ov up to zm, south from z1+ov to zm
    const ny = (z1 - z0) / 2, nz = rh;
    const l = Math.hypot(ny, nz);
    gb.quad([x1 + ov, y - 0.2, z0 - ov], [x0 - ov, y - 0.2, z0 - ov], [x0 - ov, y + rh, zm], [x1 + ov, y + rh, zm], [0, ny / l, -nz / l], 0.5, 0.5, 0.5, 0.5, roofColor);
    gb.quad([x0 - ov, y - 0.2, z1 + ov], [x1 + ov, y - 0.2, z1 + ov], [x1 + ov, y + rh, zm], [x0 - ov, y + rh, zm], [0, ny / l, nz / l], 0.5, 0.5, 0.5, 0.5, roofColor);
    // gable triangles (degenerate quads)
    gb.quad([x0, y, z0], [x0, y, z1], [x0, y + rh, zm], [x0, y + rh, zm], [-1, 0, 0], 0.5, 0.5, 0.5, 0.5, wallColor);
    gb.quad([x1, y, z1], [x1, y, z0], [x1, y + rh, zm], [x1, y + rh, zm], [1, 0, 0], 0.5, 0.5, 0.5, 0.5, wallColor);
  } else {
    const xm = (x0 + x1) / 2;
    const nx = (x1 - x0) / 2, ny = rh;
    const l = Math.hypot(nx, ny);
    gb.quad([x0 - ov, y - 0.2, z0 - ov], [x0 - ov, y - 0.2, z1 + ov], [xm, y + rh, z1 + ov], [xm, y + rh, z0 - ov], [-ny / l, nx / l, 0], 0.5, 0.5, 0.5, 0.5, roofColor);
    gb.quad([x1 + ov, y - 0.2, z1 + ov], [x1 + ov, y - 0.2, z0 - ov], [xm, y + rh, z0 - ov], [xm, y + rh, z1 + ov], [ny / l, nx / l, 0], 0.5, 0.5, 0.5, 0.5, roofColor);
    gb.quad([x0, y, z1], [x1, y, z1], [xm, y + rh, z1], [xm, y + rh, z1], [0, 0, 1], 0.5, 0.5, 0.5, 0.5, wallColor);
    gb.quad([x1, y, z0], [x0, y, z0], [xm, y + rh, z0], [xm, y + rh, z0], [0, 0, -1], 0.5, 0.5, 0.5, 0.5, wallColor);
  }
}

const GROUND = {
  plaza: { tile: 'sidewalk', color: 0xe8e2d6, scale: 6 },
  grass: { tile: 'grass', color: 0xffffff, scale: 8 },
  concrete: { tile: 'roof', color: 0xc9c6c0, scale: 10 },
  asphalt: { tile: 'asphalt', color: 0xd8d8d8, scale: 10 },
  drive: { tile: 'roof', color: 0xe0ddd6, scale: 4 },
  path: { tile: 'sand', color: 0xd9c9a0, scale: 6 },
};

function addRaisedSlab(gb, x0, z0, x1, z1, inner, interiorKind) {
  const sw = col(0xffffff);
  const curbCol = col(0xa9a69f);
  const y = CURB;
  if (inner) {
    gb.top(x0, z0, x1, inner.z0, y, sw, 'sidewalk', 4, 2);
    gb.top(x0, inner.z1, x1, z1, y, sw, 'sidewalk', 4, 2);
    gb.top(x0, inner.z0, inner.x0, inner.z1, y, sw, 'sidewalk', 4, 2);
    gb.top(inner.x1, inner.z0, x1, inner.z1, y, sw, 'sidewalk', 4, 2);
    const k = GROUND[interiorKind] || GROUND.plaza;
    gb.top(inner.x0, inner.z0, inner.x1, inner.z1, y, col(k.color), k.tile, k.scale, 2);
  } else {
    gb.top(x0, z0, x1, z1, y, sw, 'sidewalk', 4, 2);
  }
  // curb faces
  gb.quad([x0, 0, z1], [x1, 0, z1], [x1, y, z1], [x0, y, z1], [0, 0, 1], 0.5, 0.5, 0.5, 0.5, curbCol);
  gb.quad([x1, 0, z0], [x0, 0, z0], [x0, y, z0], [x1, y, z0], [0, 0, -1], 0.5, 0.5, 0.5, 0.5, curbCol);
  gb.quad([x1, 0, z1], [x1, 0, z0], [x1, y, z0], [x1, y, z1], [1, 0, 0], 0.5, 0.5, 0.5, 0.5, curbCol);
  gb.quad([x0, 0, z0], [x0, 0, z1], [x0, y, z1], [x0, y, z0], [-1, 0, 0], 0.5, 0.5, 0.5, 0.5, curbCol);
}

export function buildCity(city, scene, quality) {
  const atlas = buildAtlas();
  const material = makeCityMaterial(atlas);
  const chunks = new Map();
  const chunkOf = (x, z) => {
    const key = Math.floor(x / CHUNK) + ',' + Math.floor(z / CHUNK);
    if (!chunks.has(key)) chunks.set(key, new GeoBuilder());
    return chunks.get(key);
  };
  const rng = makeRng(4242);

  // ---- lots, sidewalks, ground ----
  for (const lot of city.lots) {
    const gb = chunkOf((lot.ox0 + lot.ox1) / 2, (lot.oz0 + lot.oz1) / 2);
    addRaisedSlab(gb, lot.ox0, lot.oz0, lot.ox1, lot.oz1, { x0: lot.x0, z0: lot.z0, x1: lot.x1, z1: lot.z1 }, lotGroundKind(city, lot));
  }
  // outer ring sidewalk around the whole grid
  {
    const rx0 = nodeX(0) - ROAD_HALF, rx1 = nodeX(NX - 1) + ROAD_HALF;
    const rz0 = nodeZ(0) - ROAD_HALF, rz1 = nodeZ(NZ - 1) + ROAD_HALF;
    const strips = [
      [CITY.minX, CITY.minZ, CITY.maxX, rz0],
      [CITY.minX, rz1, CITY.maxX, CITY.maxZ],
      [CITY.minX, rz0, rx0, rz1],
      [rx1, rz0, CITY.maxX, rz1],
    ];
    for (const [x0, z0, x1, z1] of strips) {
      const steps = Math.ceil(Math.max(x1 - x0, z1 - z0) / CHUNK);
      for (let s = 0; s < steps; s++) {
        if (x1 - x0 > z1 - z0) {
          const a = x0 + ((x1 - x0) * s) / steps, b = x0 + ((x1 - x0) * (s + 1)) / steps;
          addRaisedSlab(chunkOf((a + b) / 2, z0), a, z0, b, z1, null);
        } else {
          const a = z0 + ((z1 - z0) * s) / steps, b = z0 + ((z1 - z0) * (s + 1)) / steps;
          addRaisedSlab(chunkOf(x0, (a + b) / 2), x0, a, x1, b, null);
        }
      }
    }
  }
  for (const g of city.grounds) {
    const k = GROUND[g.kind] || GROUND.plaza;
    chunkOf((g.x0 + g.x1) / 2, (g.z0 + g.z1) / 2).top(g.x0, g.z0, g.x1, g.z1, CURB + 0.015, col(k.color), k.tile, k.scale, 2);
  }
  for (const p of city.pools) {
    const gb = chunkOf(p.x, p.z);
    gb.box(p.x - p.w / 2 - 0.4, CURB, p.z - p.d / 2 - 0.4, p.x + p.w / 2 + 0.4, CURB + 0.06, p.z + p.d / 2 + 0.4, col(0xf0f0f0));
    gb.top(p.x - p.w / 2, p.z - p.d / 2, p.x + p.w / 2, p.z + p.d / 2, CURB + 0.08, col(0x3fd0f0), 'white', 0, 2);
  }

  // ---- roads ----
  const asph = col(0xffffff);
  const white = col(0xf4f4f4, 1.1), yellow = col(0xffc423);
  const MY = 0.025;
  for (const n of city.nodes) {
    if (!n.nb.length) continue;
    const gb = chunkOf(n.x, n.z);
    gb.top(n.x - ROAD_HALF, n.z - ROAD_HALF, n.x + ROAD_HALF, n.z + ROAD_HALF, 0, asph, 'asphalt', 10, 2);
  }
  for (const e of city.edges) {
    const a = city.nodes[e.a], b = city.nodes[e.b];
    const gb = chunkOf((a.x + b.x) / 2, (a.z + b.z) / 2);
    if (e.horiz) {
      const x0 = a.x + ROAD_HALF, x1 = b.x - ROAD_HALF, z = a.z;
      gb.top(x0, z - ROAD_HALF, x1, z + ROAD_HALF, 0, asph, 'asphalt', 10, 2);
      gb.top(x0, z - 0.3, x1, z - 0.15, MY, yellow);
      gb.top(x0, z + 0.15, x1, z + 0.3, MY, yellow);
      for (let x = x0 + 4; x < x1 - 6; x += 9) {
        gb.top(x, z - 3.95, x + 3, z - 3.8, MY, white);
        gb.top(x, z + 3.8, x + 3, z + 3.95, MY, white);
      }
      // edge lines
      gb.top(x0, z - ROAD_HALF + 0.3, x1, z - ROAD_HALF + 0.45, MY, white);
      gb.top(x0, z + ROAD_HALF - 0.45, x1, z + ROAD_HALF - 0.3, MY, white);
      // crosswalks + stop lines (traffic heading +x stops before b on the south half(right side))
      if (b.light) crosswalkX(gb, x1, z, -1, white);
      if (a.light) crosswalkX(gb, x0, z, 1, white);
    } else {
      const z0 = a.z + ROAD_HALF, z1 = b.z - ROAD_HALF, x = a.x;
      gb.top(x - ROAD_HALF, z0, x + ROAD_HALF, z1, 0, asph, 'asphalt', 10, 2);
      gb.top(x - 0.3, z0, x - 0.15, z1, MY, yellow);
      gb.top(x + 0.15, z0, x + 0.3, z1, MY, yellow);
      for (let z = z0 + 4; z < z1 - 6; z += 9) {
        gb.top(x - 3.95, z, x - 3.8, z + 3, MY, white);
        gb.top(x + 3.8, z, x + 3.95, z + 3, MY, white);
      }
      gb.top(x - ROAD_HALF + 0.3, z0, x - ROAD_HALF + 0.45, z1, MY, white);
      gb.top(x + ROAD_HALF - 0.45, z0, x + ROAD_HALF - 0.3, z1, MY, white);
      if (b.light) crosswalkZ(gb, x, z1, -1, white);
      if (a.light) crosswalkZ(gb, x, z0, 1, white);
    }
  }

  // ---- buildings ----
  for (const b of city.buildings) addBuilding(chunkOf(b.x, b.z), b);

  // ---- beach / coast terrain ----
  buildCoast(chunkOf, city);

  // ---- extras ----
  const dynamic = buildExtras(city, chunkOf, scene, rng);

  // ---- ramps ----
  for (const r of city.ramps) {
    const gb = chunkOf(r.x, r.z);
    addRamp(gb, r);
  }

  // ---- create chunk meshes ----
  const meshes = [];
  for (const gb of chunks.values()) {
    if (!gb.vc) continue;
    const mesh = new THREE.Mesh(gb.build(), material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    scene.add(mesh);
    meshes.push(mesh);
  }

  // ---- neon strips (unlit) ----
  const neonGB = new GeoBuilder();
  for (const s of city.neon) {
    neonGB.box(s.x0, s.y0, s.z0, s.x1, s.y1, s.z1, col(s.color, 1.0));
  }
  const neonMat = new THREE.MeshBasicMaterial({ vertexColors: true });
  const neonMesh = new THREE.Mesh(neonGB.build(), neonMat);
  neonMesh.matrixAutoUpdate = false;
  scene.add(neonMesh);

  // ---- signs ----
  for (const s of city.signs) {
    const { tex, aspect } = makeSignTexture(s.text, s.color, s.bg);
    const w = s.w, h = Math.min(s.h, w / aspect * 1.0) || s.h;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, Math.max(h, w / aspect)), new THREE.MeshBasicMaterial({ map: tex }));
    m.position.set(s.x, s.y, s.z);
    m.rotation.y = s.rot;
    scene.add(m);
  }

  return { meshes, material, atlas, neonMat, dynamic };
}

function lotGroundKind(city, lot) {
  switch (lot.d) {
    case 'R': case 'P': return 'grass';
    case 'D': return 'concrete';
    case 'S': return 'asphalt';
    default: return 'plaza';
  }
}

function crosswalkX(gb, xEdge, z, dir, white) {
  // dir: +1 => crosswalk extends toward +x from the edge start, -1 toward -x
  const cw0 = xEdge + dir * 1.0, cw1 = xEdge + dir * 4.2;
  const xa = Math.min(cw0, cw1), xb = Math.max(cw0, cw1);
  for (let t = -ROAD_HALF + 0.8; t < ROAD_HALF - 0.6; t += 1.4) gb.top(xa, z + t, xb, z + t + 0.7, 0.025, white);
  // stop line on the side of traffic approaching this node
  const sx = xEdge + dir * 5.2;
  if (dir < 0) gb.top(sx - 0.5, z, sx, z + ROAD_HALF - 0.4, 0.025, white); // heading +x drives on +z side
  else gb.top(sx, z - ROAD_HALF + 0.4, sx + 0.5, z, 0.025, white); // heading -x drives on -z side
}
function crosswalkZ(gb, x, zEdge, dir, white) {
  const cw0 = zEdge + dir * 1.0, cw1 = zEdge + dir * 4.2;
  const za = Math.min(cw0, cw1), zb = Math.max(cw0, cw1);
  for (let t = -ROAD_HALF + 0.8; t < ROAD_HALF - 0.6; t += 1.4) gb.top(x + t, za, x + t + 0.7, zb, 0.025, white);
  const sz = zEdge + dir * 5.2;
  // heading +z: right = (-1,0) => drives on -x side; heading -z drives on +x side
  if (dir < 0) gb.top(x - ROAD_HALF + 0.4, sz - 0.5, x, sz, 0.025, white);
  else gb.top(x, sz, x + ROAD_HALF - 0.4, sz + 0.5, 0.025, white);
}

/** Terrain height outside the city slab: flat sand that slopes into the sea. */
export function coastHeight(x, z) {
  const d = landSdf(x, z);
  if (d <= 0) return 0;
  return -Math.min(d * 0.085, 7);
}

function buildCoast(chunkOf, city) {
  const W = CITY.maxX - CITY.minX, D = CITY.maxZ - CITY.minZ;
  const nx = Math.round(W / 10), nz = Math.round(D / 10);
  const sx = W / nx, sz = D / nz;
  const ex0 = Math.ceil((CITY.minX - (LAND.minX - 90)) / sx), ex1 = Math.ceil((LAND.maxX + 90 - CITY.maxX) / sx);
  const ez0 = Math.ceil((CITY.minZ - (LAND.minZ - 90)) / sz), ez1 = Math.ceil((LAND.maxZ + 90 - CITY.maxZ) / sz);
  const sand = col(0xffffff), wet = col(0xc9b48a), under = col(0x8c7b5e), quay = col(0xb8b6b0);
  const docksX = nodeX(4) + 20;
  for (let j = -ez0; j < nz + ez1; j++) {
    for (let i = -ex0; i < nx + ex1; i++) {
      if (i >= 0 && i < nx && j >= 0 && j < nz) continue; // inside the city slab
      const x0 = CITY.minX + i * sx, x1 = x0 + sx, z0 = CITY.minZ + j * sz, z1 = z0 + sz;
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      const d = landSdf(cx, cz);
      if (d > 85) continue;
      const isQuay = cx < docksX && cz < CITY.minZ;
      const h00 = isQuay ? quayH(x0, z0) : coastHeight(x0, z0);
      const h10 = isQuay ? quayH(x1, z0) : coastHeight(x1, z0);
      const h11 = isQuay ? quayH(x1, z1) : coastHeight(x1, z1);
      const h01 = isQuay ? quayH(x0, z1) : coastHeight(x0, z1);
      let c = sand;
      if (isQuay) c = quay;
      else if (d > 14) c = under;
      else if (d > 3) c = wet;
      const gb = chunkOf(cx, cz);
      const tile = isQuay ? 'roof' : 'sand';
      const s = 8;
      const ox = Math.floor(x0 / s / 8) * 8, oz = Math.floor(z0 / s / 8) * 8;
      const u0 = x0 / s - ox, u1 = x1 / s - ox, v0 = z0 / s - oz, v1 = z1 / s - oz;
      // approximate normal from slopes
      const nxv = (h00 + h01 - h10 - h11) / (2 * sx), nzv = (h00 + h10 - h01 - h11) / (2 * sz);
      const l = Math.hypot(nxv, 1, nzv);
      const nrm = [nxv / l, 1 / l, nzv / l];
      const tileO = tileOrigin(tile);
      const i0 = gb.vert(x0, h01, z1, nrm[0], nrm[1], nrm[2], u0, v1, c, tileO, 2);
      gb.vert(x1, h11, z1, nrm[0], nrm[1], nrm[2], u1, v1, c, tileO, 2);
      gb.vert(x1, h10, z0, nrm[0], nrm[1], nrm[2], u1, v0, c, tileO, 2);
      gb.vert(x0, h00, z0, nrm[0], nrm[1], nrm[2], u0, v0, c, tileO, 2);
      gb.i.push(i0, i0 + 1, i0 + 2, i0, i0 + 2, i0 + 3);
    }
  }
  // quay wall face toward the sea on the north-west
  const gb = chunkOf(CITY.minX + 200, LAND.minZ);
  gb.box(LAND.minX + 10, -4, LAND.minZ - 1, docksX, 0, LAND.minZ + 1, col(0x8f8c86));
  void city;
}

/** The docks quay is a flat concrete apron with a hard edge into deep water. */
export function quayH(x, z) {
  const d = landSdf(x, z);
  if (d <= 0.5) return 0;
  return -6;
}

function addRamp(gb, r) {
  // ramp local: along +Z of heading, rises from 0 to height over len
  const y0 = r.y0 || 0;
  const s = Math.sin(r.h), c = Math.cos(r.h);
  const L = r.len, W = r.wid / 2;
  const tr = (lx, lz, y) => [r.x + lx * c + lz * s, y0 + y, r.z - lx * s + lz * c];
  // local x axis = (cos h, 0, -sin h); local z = (sin h, 0, cos h)
  const p0 = tr(-W, -L / 2, 0), p1 = tr(W, -L / 2, 0), p2 = tr(W, L / 2, r.height), p3 = tr(-W, L / 2, r.height);
  const rampCol = col(0xff6a2b);
  const stripe = col(0xffd23f);
  // sloped top: normal computed from the edges
  const ex = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const ez = [p3[0] - p0[0], p3[1] - p0[1], p3[2] - p0[2]];
  const n = [ex[1] * ez[2] - ex[2] * ez[1], ex[2] * ez[0] - ex[0] * ez[2], ex[0] * ez[1] - ex[1] * ez[0]];
  const nl = Math.hypot(...n);
  const nn = [n[0] / nl, n[1] / nl, n[2] / nl];
  if (nn[1] < 0) {
    gb.quad(p1, p0, p3, p2, [-nn[0], -nn[1], -nn[2]], 0.5, 0.5, 0.5, 0.5, rampCol);
  } else {
    gb.quad(p0, p1, p2, p3, nn, 0.5, 0.5, 0.5, 0.5, rampCol);
  }
  // stripes on top
  for (let k = 0; k < 4; k++) {
    const t0 = 0.1 + k * 0.22, t1 = t0 + 0.08;
    const a = tr(-W, -L / 2 + L * t0, r.height * t0 + 0.03), b = tr(W, -L / 2 + L * t0, r.height * t0 + 0.03);
    const cc = tr(W, -L / 2 + L * t1, r.height * t1 + 0.03), d = tr(-W, -L / 2 + L * t1, r.height * t1 + 0.03);
    if (nn[1] < 0) gb.quad(b, a, d, cc, [-nn[0], -nn[1], -nn[2]], 0.5, 0.5, 0.5, 0.5, stripe);
    else gb.quad(a, b, cc, d, nn, 0.5, 0.5, 0.5, 0.5, stripe);
  }
  // back face + sides (simple)
  const q0 = tr(-W, L / 2, 0), q1 = tr(W, L / 2, 0);
  const side = col(0x9a3a14);
  const addTri = (A, B, C) => {
    const ux = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], vx = [C[0] - A[0], C[1] - A[1], C[2] - A[2]];
    const nx = [ux[1] * vx[2] - ux[2] * vx[1], ux[2] * vx[0] - ux[0] * vx[2], ux[0] * vx[1] - ux[1] * vx[0]];
    const l = Math.hypot(...nx) || 1;
    gb.quad(A, B, C, C, [nx[0] / l, nx[1] / l, nx[2] / l], 0.5, 0.5, 0.5, 0.5, side);
  };
  // both windings so it shows either way (cheap)
  addTri(p0, q0, p3); addTri(p0, p3, q0);
  addTri(p1, p2, q1); addTri(p1, q1, p2);
  gb.quad(q1, q0, p3, p2, [s, 0, c], 0.5, 0.5, 0.5, 0.5, side);
  gb.quad(q0, q1, p2, p3, [-s, 0, -c], 0.5, 0.5, 0.5, 0.5, side);
}

function buildExtras(city, chunkOf, scene, rng) {
  const M = new THREE.Matrix4();
  const dynamic = { ferris: null, lighthouseBeam: null, antennaLights: [] };
  const box = (gb, x, y, z, w, h, d, c) => gb.box(x - w / 2, y, z - d / 2, x + w / 2, y + h, z + d / 2, col(c));
  const neonGB = new GeoBuilder();
  for (const e of city.extras) {
    switch (e.type) {
      case 'antenna': {
        const gb = chunkOf(e.x, e.z);
        box(gb, e.x, e.y, e.z, 0.5, e.h, 0.5, 0xc8ccd0);
        box(gb, e.x, e.y, e.z, 1.6, 1.0, 1.6, 0x8a8f96);
        neonGB.box(e.x - 0.35, e.y + e.h, e.z - 0.35, e.x + 0.35, e.y + e.h + 0.6, e.z + 0.35, col(0xff2020));
        break;
      }
      case 'watertank': {
        const gb = chunkOf(e.x, e.z);
        for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(gb, e.x + dx * 1.3, e.y, e.z + dz * 1.3, 0.25, 2.2, 0.25, 0x5b4636);
        M.makeTranslation(e.x, e.y + 3.6, e.z);
        gb.geo(new THREE.CylinderGeometry(2.0, 2.0, 2.8, 10), M, col(0x8a6a4e));
        M.makeTranslation(e.x, e.y + 5.4, e.z);
        gb.geo(new THREE.ConeGeometry(2.2, 1.0, 10), M, col(0x4d3a2c));
        break;
      }
      case 'fountain': {
        const gb = chunkOf(e.x, e.z);
        M.makeTranslation(e.x, CURB + 0.4, e.z);
        gb.geo(new THREE.CylinderGeometry(5, 5.2, 0.8, 24), M, col(0xf0ebe0));
        M.makeTranslation(e.x, CURB + 0.82, e.z);
        gb.geo(new THREE.CylinderGeometry(4.5, 4.5, 0.05, 24), M, col(0x3fb8e0));
        M.makeTranslation(e.x, CURB + 1.6, e.z);
        gb.geo(new THREE.CylinderGeometry(0.6, 0.9, 2.4, 10), M, col(0xf0ebe0));
        M.makeTranslation(e.x, CURB + 2.9, e.z);
        gb.geo(new THREE.CylinderGeometry(1.8, 0.8, 0.4, 16), M, col(0xf0ebe0));
        M.makeTranslation(e.x, CURB + 3.4, e.z);
        gb.geo(new THREE.ConeGeometry(0.5, 1.4, 8), M, col(0x9fe8ff));
        break;
      }
      case 'tank': {
        const gb = chunkOf(e.x, e.z);
        M.makeTranslation(e.x, CURB + e.h / 2, e.z);
        gb.geo(new THREE.CylinderGeometry(e.r, e.r, e.h, 24), M, col(0xe8e8e4));
        M.makeTranslation(e.x, CURB + e.h + 0.8, e.z);
        gb.geo(new THREE.CylinderGeometry(e.r * 0.4, e.r, 1.6, 24), M, col(0xd0d0cc));
        M.makeTranslation(e.x, CURB + e.h * 0.55, e.z);
        gb.geo(new THREE.CylinderGeometry(e.r + 0.05, e.r + 0.05, 1.2, 24, 1, true), M, col(0xff6a2b));
        break;
      }
      case 'pond': {
        const gb = chunkOf(e.x, e.z);
        M.makeScale(e.rx, 1, e.rz).premultiply(new THREE.Matrix4().makeTranslation(e.x, CURB + 0.03, e.z));
        gb.geo(new THREE.CylinderGeometry(1, 1, 0.02, 32), M, col(0x2aa7b8));
        M.makeScale(e.rx + 1.2, 1, e.rz + 1.2).premultiply(new THREE.Matrix4().makeTranslation(e.x, CURB + 0.01, e.z));
        gb.geo(new THREE.CylinderGeometry(1, 1, 0.02, 32), M, col(0xd9c9a0));
        break;
      }
      case 'gazebo': {
        const gb = chunkOf(e.x, e.z);
        M.makeTranslation(e.x, CURB + 0.2, e.z);
        gb.geo(new THREE.CylinderGeometry(5, 5, 0.4, 8), M, col(0xf2efe8));
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
          box(gb, e.x + Math.cos(a) * 4.4, CURB + 0.4, e.z + Math.sin(a) * 4.4, 0.3, 3.2, 0.3, 0xffffff);
        }
        M.makeTranslation(e.x, CURB + 4.6, e.z);
        gb.geo(new THREE.ConeGeometry(5.6, 2.2, 8), M, col(0x3a8f8a));
        break;
      }
      case 'stadium': {
        const gb = chunkOf(e.x, e.z);
        const segs = 48;
        const outer = col(0xe9edf2), inner = col(0x6c7a8a), seats = col(0x2f6bd0), rim = col(0xffffff);
        for (let k = 0; k < segs; k++) {
          const a0 = (k / segs) * Math.PI * 2, a1 = ((k + 1) / segs) * Math.PI * 2;
          const o0 = [e.x + Math.cos(a0) * e.ax, e.z + Math.sin(a0) * e.az];
          const o1 = [e.x + Math.cos(a1) * e.ax, e.z + Math.sin(a1) * e.az];
          const f = 0.62;
          const i0 = [e.x + Math.cos(a0) * e.ax * f, e.z + Math.sin(a0) * e.az * f];
          const i1 = [e.x + Math.cos(a1) * e.ax * f, e.z + Math.sin(a1) * e.az * f];
          const am = (a0 + a1) / 2;
          const nx = Math.cos(am) / e.ax, nz = Math.sin(am) / e.az, nl = Math.hypot(nx, nz);
          // outer wall (normal outward)
          gb.quad([o1[0], 0, o1[1]], [o0[0], 0, o0[1]], [o0[0], e.h, o0[1]], [o1[0], e.h, o1[1]], [nx / nl, 0, nz / nl], 0.5, 0.5, 0.5, 0.5, k % 2 ? outer : rim);
          // seating slope from rim (h) down to inner ring (2)
          gb.quad([i0[0], 2, i0[1]], [i1[0], 2, i1[1]], [o1[0], e.h, o1[1]], [o0[0], e.h, o0[1]], [-nx / nl * 0.6, 0.8, -nz / nl * 0.6], 0.5, 0.5, 0.5, 0.5, k % 3 ? seats : inner);
          // inner wall
          gb.quad([i0[0], 0, i0[1]], [i1[0], 0, i1[1]], [i1[0], 2, i1[1]], [i0[0], 2, i0[1]], [-nx / nl, 0, -nz / nl], 0.5, 0.5, 0.5, 0.5, inner);
          neonGB.box(Math.min(o0[0], o1[0]) - 0.2, e.h - 0.4, Math.min(o0[1], o1[1]) - 0.2, Math.max(o0[0], o1[0]) + 0.2, e.h, Math.max(o0[1], o1[1]) + 0.2, col(k % 2 ? 0x22f3ff : 0xff2bd6));
        }
        M.makeScale(e.ax * 0.62, 1, e.az * 0.62).premultiply(new THREE.Matrix4().makeTranslation(e.x, 0.3, e.z));
        gb.geo(new THREE.CylinderGeometry(1, 1, 0.1, 40), M, col(0x3f9a3a));
        // floodlight towers
        for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          const tx = e.x + dx * e.ax * 0.8, tz = e.z + dz * e.az * 0.95;
          box(gb, tx, 0, tz, 0.8, 34, 0.8, 0xbfc4ca);
          box(gb, tx, 34, tz, 5, 3, 1, 0x50565e);
          neonGB.box(tx - 2.3, 34.3, tz - 0.6, tx + 2.3, 36.7, tz + 0.6, col(0xfff6d8));
        }
        break;
      }
      case 'lifeguard': {
        const gb = chunkOf(e.x, e.z);
        for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(gb, e.x + dx * 1.4, 0, e.z + dz * 1.4, 0.25, 2.6, 0.25, 0xf0f0f0);
        box(gb, e.x, 2.6, e.z, 3.4, 0.25, 3.4, 0xf4f0e6);
        const c = rng.pick([0xffd23f, 0xff4f7b, 0x22d3ee, 0xa8f0d8]);
        box(gb, e.x, 2.85, e.z, 3.0, 2.2, 3.0, c);
        M.makeRotationY(Math.PI / 4).premultiply(new THREE.Matrix4().makeTranslation(e.x, 5.5, e.z));
        gb.geo(new THREE.ConeGeometry(2.7, 1.2, 4), M, col(0xff4040));
        break;
      }
      case 'pier': {
        const P = PIER;
        const deck = col(0x9a6b45);
        for (let x = P.x0 + P.ramp; x < P.x1; x += 40) {
          const gb = chunkOf(x + 20, 0);
          const xe = Math.min(P.x1, x + 40);
          gb.box(x, P.y - 0.4, P.z0, xe, P.y, P.z1, deck, { tile: 'container', uScale: 2, vScale: 0, topTile: 'container', topColor: deck, topScale: 3 });
          for (let px = x; px < xe; px += 10) {
            box(gb, px, -5, P.z0 + 0.5, 0.6, 5 + P.y - 0.4, 0.6, 0x5a4030);
            box(gb, px, -5, P.z1 - 0.5, 0.6, 5 + P.y - 0.4, 0.6, 0x5a4030);
          }
          // railings
          gb.box(x, P.y, P.z1 - 0.15, xe, P.y + 1.1, P.z1, col(0xf4f4f4));
          gb.box(x, P.y, P.z0, xe, P.y + 1.1, P.z0 + 0.15, col(0xf4f4f4));
        }
        // ramp from the sand onto the deck
        const gb = chunkOf(P.x0, 0);
        gb.quad([P.x0, 0.02, P.z1], [P.x0 + P.ramp, P.y, P.z1], [P.x0 + P.ramp, P.y, P.z0], [P.x0, 0.02, P.z0], [-0.08, 1, 0], 0, 0, 1, 1, deck);
        // pier lamps
        for (let x = P.x0 + P.ramp + 10; x < P.x1; x += 24) {
          city.props.lamps.push({ x, z: P.z1 - 0.6, rot: Math.PI, y: P.y });
          city.props.lamps.push({ x, z: P.z0 + 0.6, rot: 0, y: P.y });
        }
        break;
      }
      case 'ferris': {
        const gb = chunkOf(e.x, e.z);
        const H = 30;
        // A-frame supports
        for (const dz of [-11, 11]) {
          for (const dx of [-7, 7]) {
            const top = new THREE.Vector3(e.x, PIER.y + H, e.z + dz * 0.25);
            const bot = new THREE.Vector3(e.x + dx, PIER.y, e.z + dz);
            const mid = top.clone().add(bot).multiplyScalar(0.5);
            const len = top.distanceTo(bot);
            const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), top.clone().sub(bot).normalize());
            M.compose(mid, q, new THREE.Vector3(1, 1, 1));
            gb.geo(new THREE.BoxGeometry(0.7, len, 0.7), M, col(0xf2f2f2));
          }
        }
        const wheel = new THREE.Group();
        wheel.position.set(e.x, PIER.y + H, e.z);
        const R = 24;
        const ringGeo = new THREE.TorusGeometry(R, 0.35, 6, 64);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xff2bd6 });
        const ring1 = new THREE.Mesh(ringGeo, ringMat);
        ring1.position.z = 1.2;
        const ring2 = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0x22f3ff }));
        ring2.position.z = -1.2;
        wheel.add(ring1, ring2);
        const spokeGB = new GeoBuilder();
        for (let k = 0; k < 16; k++) {
          const a = (k / 16) * Math.PI * 2;
          M.makeRotationZ(a).premultiply(new THREE.Matrix4());
          const m2 = new THREE.Matrix4().makeRotationZ(a).multiply(new THREE.Matrix4().makeTranslation(0, R / 2, 0));
          spokeGB.geo(new THREE.BoxGeometry(0.25, R, 0.25), m2.clone().premultiply(new THREE.Matrix4().makeTranslation(0, 0, 1.2)), col(0xe6e6e6));
          spokeGB.geo(new THREE.BoxGeometry(0.25, R, 0.25), m2.clone().premultiply(new THREE.Matrix4().makeTranslation(0, 0, -1.2)), col(0xe6e6e6));
        }
        spokeGB.geo(new THREE.CylinderGeometry(1.2, 1.2, 3.4, 12), new THREE.Matrix4().makeRotationX(Math.PI / 2), col(0xb0b0b0));
        const spokes = new THREE.Mesh(spokeGB.build(), new THREE.MeshLambertMaterial({ vertexColors: true }));
        wheel.add(spokes);
        const cabGeo = new THREE.BoxGeometry(2.2, 2.4, 2.0);
        cabGeo.translate(0, -1.4, 0);
        const cabins = new THREE.InstancedMesh(cabGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), 16);
        const cols = [0xff4f7b, 0x22d3ee, 0xfff23d, 0x9dff2e, 0xff9f1c, 0xb14bff];
        for (let k = 0; k < 16; k++) cabins.setColorAt(k, new THREE.Color(cols[k % cols.length]));
        cabins.frustumCulled = false;
        scene.add(wheel);
        scene.add(cabins);
        dynamic.ferris = { wheel, cabins, R, cx: e.x, cy: PIER.y + H, cz: e.z, angle: 0 };
        break;
      }
      case 'lighthouse': {
        const gb = chunkOf(e.x, e.z);
        for (let k = 0; k < 6; k++) {
          const r0 = 3.8 - k * 0.35, r1 = 3.8 - (k + 1) * 0.35;
          M.makeTranslation(e.x, k * 4.5 + 2.25, e.z);
          gb.geo(new THREE.CylinderGeometry(r1, r0, 4.5, 16), M, col(k % 2 ? 0xe23b3b : 0xf8f8f8));
        }
        M.makeTranslation(e.x, 27 + 1.5, e.z);
        neonGB.geo(new THREE.CylinderGeometry(1.6, 1.6, 3, 12), M, col(0xfff4b0));
        M.makeTranslation(e.x, 31, e.z);
        gb.geo(new THREE.ConeGeometry(2.4, 2.2, 12), M, col(0x2a2a2a));
        M.makeTranslation(e.x, 27, e.z);
        gb.geo(new THREE.CylinderGeometry(2.8, 2.8, 0.4, 16), M, col(0x333333));
        // rotating beam
        const beamGeo = new THREE.ConeGeometry(4, 60, 16, 1, true);
        beamGeo.translate(0, -30, 0);
        beamGeo.rotateZ(Math.PI / 2);
        const beamMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
        const beam = new THREE.Mesh(beamGeo, beamMat);
        beam.position.set(e.x, 28.5, e.z);
        scene.add(beam);
        dynamic.lighthouseBeam = beam;
        break;
      }
      case 'crane': {
        const gb = chunkOf(e.x, e.z);
        const c = 0xff8a1a;
        const z0 = e.z - 8, z1 = e.z + 8;
        for (const dx of [-8, 8]) {
          for (const z of [z0, z1]) box(gb, e.x + dx, 0, z, 1.6, 34, 1.6, c);
          box(gb, e.x + dx, 8, e.z, 1.2, 1.2, 16, c);
          box(gb, e.x + dx, 34, e.z, 1.8, 2.4, 18, c);
        }
        box(gb, e.x, 34, z0, 18, 2.4, 1.8, c);
        box(gb, e.x, 34, z1, 18, 2.4, 1.8, c);
        // boom over the water (north = -z)
        gb.box(e.x - 1.6, 37, e.z - 50, e.x + 1.6, 39.5, e.z + 18, col(c));
        box(gb, e.x, 30.5, e.z - 2, 4, 3.5, 4, 0x2f3a46);
        box(gb, e.x, 39.5, e.z + 10, 6, 3, 8, 0x50565e);
        neonGB.box(e.x - 0.4, 39.5, e.z - 50, e.x + 0.4, 40.3, e.z - 49.2, col(0xff2020));
        break;
      }
    }
  }
  const neonMesh = new THREE.Mesh(neonGB.build(), new THREE.MeshBasicMaterial({ vertexColors: true }));
  scene.add(neonMesh);
  return dynamic;
}

/** Animate the ferris wheel and the lighthouse beam. */
export function updateCityDynamic(dyn, dt, night) {
  if (dyn.ferris) {
    const f = dyn.ferris;
    f.angle += dt * 0.08;
    f.wheel.rotation.z = f.angle;
    const m = new THREE.Matrix4();
    for (let k = 0; k < 16; k++) {
      const a = f.angle + (k / 16) * Math.PI * 2;
      m.makeTranslation(f.cx + Math.sin(a) * 0, f.cy + Math.cos(a) * f.R, f.cz);
      // wheel rotates around z; cabin positions in x-y plane
      m.makeTranslation(f.cx - Math.sin(a) * f.R, f.cy + Math.cos(a) * f.R, f.cz);
      f.cabins.setMatrixAt(k, m);
    }
    f.cabins.instanceMatrix.needsUpdate = true;
  }
  if (dyn.lighthouseBeam) {
    dyn.lighthouseBeam.rotation.y += dt * 0.9;
    dyn.lighthouseBeam.visible = night > 0.3;
    dyn.lighthouseBeam.material.opacity = 0.2 * night;
  }
}
