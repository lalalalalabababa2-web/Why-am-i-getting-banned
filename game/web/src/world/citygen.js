// Port Solace city layout: road grid, districts, buildings, props, parking, ramps, places.
// Everything here is plain data; citymesh.js turns it into geometry and physics.js into colliders.

import { makeRng, clamp } from '../util.js';

export const BLOCK = 100; // distance between road centre lines
export const ROAD_HALF = 8; // 2 lanes each way
export const WALK = 4.5; // sidewalk width
export const CURB = 0.12; // sidewalk / lot height above the road
export const NX = 15; // nodes along x
export const NZ = 11; // nodes along z
export const X0 = -((NX - 1) / 2) * BLOCK;
export const Z0 = -((NZ - 1) / 2) * BLOCK;
export const LANES = [2.0, 5.8]; // lane centre offsets from the road centre line (right-hand side)
export const WATER_LEVEL = -0.6;

export const nodeX = (i) => X0 + i * BLOCK;
export const nodeZ = (j) => Z0 + j * BLOCK;

export const CITY = {
  minX: X0 - ROAD_HALF - WALK,
  maxX: X0 + (NX - 1) * BLOCK + ROAD_HALF + WALK,
  minZ: Z0 - ROAD_HALF - WALK,
  maxZ: Z0 + (NZ - 1) * BLOCK + ROAD_HALF + WALK,
};
// Sand / land outline (rounded rectangle). The east side is the wide Coral Beach.
export const LAND = {
  minX: CITY.minX - 55,
  maxX: CITY.maxX + 150,
  minZ: CITY.minZ - 55,
  maxZ: CITY.maxZ + 55,
  r: 45,
};
export const PIER = { x0: 780, x1: 1010, z0: -8, z1: 8, y: 1.3, ramp: 16 };

// District map, [cj][ci]. D docks, S stadium, M midtown, T downtown towers, O ocean drive,
// R residential, P park, B bank plaza.
const DMAP = [
  'DDDDSSMTTTTMOO',
  'DDDDMMTTTTTMOO',
  'DDDMMMTTBTTMOO',
  'DDMMMMTTTTMMOO',
  'MMMMMMMMMMMMOO',
  'RRRMMMMMMMMMOO',
  'RRRRMMMPPMMMOO',
  'RRRRRMMPPMMROO',
  'RRRRRRRRRRRROO',
  'RRRRRRRRRRRROO',
];
export const DISTRICT_NAMES = {
  D: 'The Docks',
  S: 'Solace Stadium',
  M: 'Midtown',
  T: 'Downtown',
  B: 'Downtown',
  O: 'Ocean Drive',
  R: 'Palm Heights',
  P: 'Starlight Park',
};

export const PASTELS = [0xf2c4c8, 0xbfe0d2, 0xd5ccea, 0xf3d6b6, 0xc2dcec, 0xf4ead0, 0xeec9d8, 0xffffff, 0xf0efe8];
export const NEONS = [0xff4fa8, 0x3fc8ff, 0xff5a3c, 0x7ce86a, 0xffe08a];
const CAR_SAFE_STYLES = ['glass', 'office', 'darkglass'];

export function generateCity(seed = 1337) {
  const rng = makeRng(seed);
  const NCX = NX - 1, NCZ = NZ - 1;

  // ---------- cells & merges ----------
  const cells = [];
  for (let j = 0; j < NCZ; j++) {
    for (let i = 0; i < NCX; i++) {
      cells.push({ i, j, d: DMAP[j][i], group: j * NCX + i });
    }
  }
  const cell = (i, j) => (i < 0 || j < 0 || i >= NCX || j >= NCZ ? null : cells[j * NCX + i]);
  // merges: stadium (4,0)-(5,0), park (7,6)-(8,7)
  const merge = (list) => {
    const g = cell(list[0][0], list[0][1]).group;
    for (const [i, j] of list) cell(i, j).group = g;
  };
  merge([[4, 0], [5, 0]]);
  merge([[7, 6], [8, 6], [7, 7], [8, 7]]);

  // ---------- road graph ----------
  const nodes = [];
  for (let j = 0; j < NZ; j++) {
    for (let i = 0; i < NX; i++) {
      nodes.push({ id: j * NX + i, i, j, x: nodeX(i), z: nodeZ(j), nb: [], light: false, phase: 0 });
    }
  }
  const node = (i, j) => (i < 0 || j < 0 || i >= NX || j >= NZ ? null : nodes[j * NX + i]);
  const edges = [];
  const edgeMap = new Map();
  const addEdge = (a, b) => {
    const e = { id: edges.length, a: a.id, b: b.id, horiz: a.j === b.j };
    edges.push(e);
    edgeMap.set(a.id + ':' + b.id, e);
    edgeMap.set(b.id + ':' + a.id, e);
    a.nb.push(b.id);
    b.nb.push(a.id);
  };
  // horizontal edge (i,j)-(i+1,j) separates cell (i,j-1) and (i,j)
  for (let j = 0; j < NZ; j++) {
    for (let i = 0; i < NX - 1; i++) {
      const c1 = cell(i, j - 1), c2 = cell(i, j);
      if (c1 && c2 && c1.group === c2.group) continue;
      addEdge(node(i, j), node(i + 1, j));
    }
  }
  // vertical edge (i,j)-(i,j+1) separates cell (i-1,j) and (i,j)
  for (let i = 0; i < NX; i++) {
    for (let j = 0; j < NZ - 1; j++) {
      const c1 = cell(i - 1, j), c2 = cell(i, j);
      if (c1 && c2 && c1.group === c2.group) continue;
      addEdge(node(i, j), node(i, j + 1));
    }
  }
  for (const n of nodes) {
    n.light = n.nb.length >= 3;
    n.phase = rng() * 18;
  }

  // ---------- lots ----------
  const inset = ROAD_HALF + WALK;
  const groups = new Map();
  for (const c of cells) {
    if (!groups.has(c.group)) groups.set(c.group, []);
    groups.get(c.group).push(c);
  }
  const lots = [];
  for (const [g, list] of groups) {
    let i0 = 99, i1 = -1, j0 = 99, j1 = -1;
    for (const c of list) {
      i0 = Math.min(i0, c.i); i1 = Math.max(i1, c.i);
      j0 = Math.min(j0, c.j); j1 = Math.max(j1, c.j);
    }
    lots.push({
      group: g,
      d: list[0].d,
      i0, i1, j0, j1,
      cells: list,
      // outer = sidewalk outer edge (raised area), inner = buildable area
      ox0: nodeX(i0) + ROAD_HALF, ox1: nodeX(i1 + 1) - ROAD_HALF,
      oz0: nodeZ(j0) + ROAD_HALF, oz1: nodeZ(j1 + 1) - ROAD_HALF,
      x0: nodeX(i0) + inset, x1: nodeX(i1 + 1) - inset,
      z0: nodeZ(j0) + inset, z1: nodeZ(j1 + 1) - inset,
    });
  }
  const lotAt = (i, j) => lots.find((l) => i >= l.i0 && i <= l.i1 && j >= l.j0 && j <= l.j1);

  // ---------- output containers ----------
  const buildings = []; // boxes with style
  const boxes = []; // colliders {minX,maxX,minZ,maxZ,h}
  const circles = []; // colliders {x,z,r,h}
  const props = { palms: [], trees: [], lamps: [], lights: [], umbrellas: [], benches: [], hydrants: [], bins: [] };
  const neon = []; // {x0,y0,z0,x1,y1,z1,color} thin glowing boxes
  const signs = [];
  const parking = [];
  const ramps = [];
  const grounds = []; // {x0,z0,x1,z1,kind} lot ground patches
  const pools = [];
  const places = {};
  const extras = []; // special meshes: fountain, stadium, cranes, tanks, ferris
  const collect = []; // collectible shell positions
  const jumps = []; // stunt jump info

  const addCollider = (minX, maxX, minZ, maxZ, h) => boxes.push({ minX, maxX, minZ, maxZ, h });
  const addBuilding = (b) => {
    b.y0 = b.y0 ?? CURB;
    b.seed = b.seed ?? rng();
    buildings.push(b);
    if (b.collide !== false) addCollider(b.x - b.w / 2, b.x + b.w / 2, b.z - b.d / 2, b.z + b.d / 2, b.y0 + b.h);
    return b;
  };
  const floors = (n) => Math.max(1, Math.round(n)) * 3.6;

  // Which side of a rect faces a road? returns unit dir (dx,dz) toward the closest lot edge.
  const faceToward = (lot, x, z) => {
    const dl = x - lot.x0, dr = lot.x1 - x, dt = z - lot.z0, db = lot.z1 - z;
    const m = Math.min(dl, dr, dt, db);
    if (m === dl) return [-1, 0];
    if (m === dr) return [1, 0];
    if (m === dt) return [0, -1];
    return [0, 1];
  };

  const subdivide = (lot, nx, nz, gap) => {
    const out = [];
    const w = (lot.x1 - lot.x0 - gap * (nx - 1)) / nx;
    const d = (lot.z1 - lot.z0 - gap * (nz - 1)) / nz;
    for (let a = 0; a < nx; a++) {
      for (let b = 0; b < nz; b++) {
        const x0 = lot.x0 + a * (w + gap), z0 = lot.z0 + b * (d + gap);
        out.push({ x0, z0, x1: x0 + w, z1: z0 + d, cx: x0 + w / 2, cz: z0 + d / 2, w, d, a, b, nx, nz });
      }
    }
    return out;
  };

  const addParkingLot = (s, lot) => {
    grounds.push({ x0: s.x0, z0: s.z0, x1: s.x1, z1: s.z1, kind: 'asphalt' });
    const alongX = s.w > s.d;
    const n = Math.floor((alongX ? s.w : s.d) / 3.2) - 1;
    for (let k = 0; k < n; k++) {
      const t = (k + 1) / (n + 1);
      if (rng() < 0.45) continue;
      if (alongX) {
        const x = s.x0 + t * s.w;
        parking.push({ x, z: s.cz - s.d * 0.22, h: Math.PI });
        if (s.d > 16) parking.push({ x, z: s.cz + s.d * 0.22, h: 0 });
      } else {
        const z = s.z0 + t * s.d;
        parking.push({ x: s.cx - s.w * 0.22, z, h: -Math.PI / 2 });
        if (s.w > 16) parking.push({ x: s.cx + s.w * 0.22, z, h: Math.PI / 2 });
      }
    }
    // a lamp in the lot
    props.lamps.push({ x: s.cx, z: s.cz, rot: 0, solo: true });
    circles.push({ x: s.cx, z: s.cz, r: 0.3, h: 7 });
  };

  const towerStyles = ['glass', 'glass', 'darkglass', 'office', 'office'];
  const towerTints = [0xffffff, 0xdfe9f5, 0xcfe6ff, 0xe8f7ff, 0xfff4dc, 0xd8fff4, 0xf0e0ff];
  const midStyles = ['office', 'brick', 'deco', 'hotel', 'office', 'brick'];
  const midTints = [0xffffff, 0xf2e6d8, 0xd9c7b0, 0xc8d8e8, 0xffd9c2, 0xe0f0d8, 0xf5f5f5, 0xffe0e8];

  // downtown height falloff around (8.5, 2.5)
  const towerHeight = (cx, cz) => {
    const di = (cx - 8.6), dj = (cz - 2.4);
    const f = Math.exp(-(di * di * 0.08 + dj * dj * 0.12));
    return 40 + 170 * f;
  };

  const addTower = (x, z, w, d, hmax, lotIdx) => {
    const style = rng.pick(towerStyles);
    const tint = rng.pick(towerTints);
    const n = Math.max(8, Math.round((hmax * rng.range(0.55, 1.0)) / 3.6));
    const h = n * 3.6;
    const shop = rng() < 0.7;
    const setback = rng() < 0.45 && h > 60;
    const base = addBuilding({ x, z, w, d, h: setback ? floors(n * 0.62) : h, style, color: tint, shop, roof: 'flat' });
    let top = base;
    if (setback) {
      const ins = rng.range(2.5, 5);
      top = addBuilding({
        x, z, w: w - ins * 2, d: d - ins * 2, h: floors(n * 0.38), y0: base.y0 + base.h, style, color: tint,
        roof: 'flat', collide: false,
      });
      if (rng() < 0.5 && top.w > 14) {
        top = addBuilding({
          x, z, w: top.w - 6, d: top.d - 6, h: floors(rng.int(3, 7)), y0: top.y0 + top.h, style, color: tint,
          roof: 'flat', collide: false,
        });
      }
    }
    const roofY = top.y0 + top.h;
    // roof details
    if (rng() < 0.55) {
      extras.push({ type: 'antenna', x: top.x + rng.range(-2, 2), z: top.z + rng.range(-2, 2), y: roofY, h: rng.range(8, 26) });
    }
    const nAc = rng.int(1, 4);
    for (let k = 0; k < nAc; k++) {
      buildings.push({
        x: top.x + rng.range(-top.w * 0.3, top.w * 0.3), z: top.z + rng.range(-top.d * 0.3, top.d * 0.3),
        w: rng.range(2, 5), d: rng.range(2, 5), h: rng.range(1.5, 3.5), y0: roofY, style: 'plain', color: 0xbfc4c8,
        roof: 'flat', seed: rng(), collide: false,
      });
    }
    if (rng() < 0.12) {
      // a few towers get a lit crown, in plain architectural colours
      neonRing(top.x, top.z, top.w + 0.3, top.d + 0.3, roofY - 0.6, rng.pick([0xf4f0e6, 0xbfd8ff, 0xffd28a]));
    }
    return { roofY };
  };

  function neonRing(x, z, w, d, y, color) {
    const t = 0.25;
    neon.push({ x0: x - w / 2, x1: x + w / 2, y0: y, y1: y + t, z0: z - d / 2 - 0.05, z1: z - d / 2 + 0.15, color });
    neon.push({ x0: x - w / 2, x1: x + w / 2, y0: y, y1: y + t, z0: z + d / 2 - 0.15, z1: z + d / 2 + 0.05, color });
    neon.push({ x0: x - w / 2 - 0.05, x1: x - w / 2 + 0.15, y0: y, y1: y + t, z0: z - d / 2, z1: z + d / 2, color });
    neon.push({ x0: x + w / 2 - 0.15, x1: x + w / 2 + 0.05, y0: y, y1: y + t, z0: z - d / 2, z1: z + d / 2, color });
  }

  const addHouse = (s, lot) => {
    const [fx, fz] = faceToward(lot, s.cx, s.cz);
    const along = fx !== 0; // facing ±x => house depth along x
    const hw = rng.range(10, 14), hd = rng.range(8.5, 11.5);
    const w = along ? hd : hw, d = along ? hw : hd;
    // push house toward the street side
    const off = (along ? s.w : s.d) * 0.5 - (along ? w : d) * 0.5 - rng.range(5, 7);
    const x = s.cx + fx * off * 0.6, z = s.cz + fz * off * 0.6;
    const twoStory = rng() < 0.35;
    const color = rng.pick([0xffffff, 0xfff3dc, 0xffe2e8, 0xdff7ff, 0xe8ffe8, 0xfff0c8, 0xf0e4ff, 0xffd9b8]);
    const roofColor = rng.pick([0xc0603a, 0xb85432, 0x8a8f99, 0x5d6a7a, 0xd27a4a, 0x7a4b3a]);
    addBuilding({
      x, z, w, d, h: twoStory ? 7.2 : 3.9, style: 'house', color, roof: 'gable', roofColor,
      ridgeAlongX: !along,
    });
    // driveway + parking spot beside the house on the street side
    const sx = s.cx + fx * (along ? s.w : s.d) * 0.36, sz = s.cz + fz * (along ? s.w : s.d) * 0.36;
    const side = rng() < 0.5 ? 1 : -1;
    const px = along ? sx : sx + side * (w * 0.5 + 2.5);
    const pz = along ? sz + side * (d * 0.5 + 2.5) : sz;
    grounds.push({ x0: px - (along ? 4 : 1.8), x1: px + (along ? 4 : 1.8), z0: pz - (along ? 1.8 : 4), z1: pz + (along ? 1.8 : 4), kind: 'drive' });
    if (rng() < 0.55) parking.push({ x: px, z: pz, h: Math.atan2(-fx, -fz) });
    // pool in the back
    if (rng() < 0.4) {
      const bx = s.cx - fx * (along ? s.w : s.d) * 0.28, bz = s.cz - fz * (along ? s.w : s.d) * 0.28;
      pools.push({ x: bx, z: bz, w: along ? 4 : 7, d: along ? 7 : 4 });
    }
    // garden plants
    const nPlants = rng.int(1, 3);
    for (let k = 0; k < nPlants; k++) {
      const tx = s.x0 + 2 + rng() * (s.w - 4), tz = s.z0 + 2 + rng() * (s.d - 4);
      if (Math.abs(tx - x) < w / 2 + 2 && Math.abs(tz - z) < d / 2 + 2) continue;
      if (rng() < 0.6) {
        props.palms.push({ x: tx, z: tz, s: rng.range(0.7, 1.1), rot: rng() * 6.28 });
        circles.push({ x: tx, z: tz, r: 0.4, h: 8 });
      } else {
        props.trees.push({ x: tx, z: tz, s: rng.range(0.8, 1.3), rot: rng() * 6.28 });
        circles.push({ x: tx, z: tz, r: 0.5, h: 6 });
      }
    }
  };

  // ---------- fill lots by district ----------
  for (const lot of lots) {
    const ci = lot.i0, cj = lot.j0;
    const cx = (lot.x0 + lot.x1) / 2, cz = (lot.z0 + lot.z1) / 2;
    lot.cx = cx; lot.cz = cz;
    switch (lot.d) {
      case 'T': {
        grounds.push({ x0: lot.x0, z0: lot.z0, x1: lot.x1, z1: lot.z1, kind: 'plaza' });
        const hmax = towerHeight(ci + 0.5, cj + 0.5);
        const mode = rng.int(0, 3);
        if (mode === 0) {
          addTower(cx, cz, rng.range(44, 58), rng.range(44, 58), hmax);
        } else if (mode === 1) {
          const subs = subdivide(lot, 2, 1, 10);
          for (const s of subs) addTower(s.cx, s.cz, s.w - rng.range(2, 6), s.d - rng.range(8, 20), hmax);
        } else if (mode === 2) {
          const subs = subdivide(lot, 1, 2, 10);
          for (const s of subs) addTower(s.cx, s.cz, s.w - rng.range(8, 20), s.d - rng.range(2, 6), hmax);
        } else {
          const subs = subdivide(lot, 2, 2, 8);
          for (const s of subs) {
            if (rng() < 0.2) addParkingLot(s, lot);
            else addTower(s.cx, s.cz, s.w - rng.range(2, 6), s.d - rng.range(2, 6), hmax * 0.8);
          }
        }
        break;
      }
      case 'B': {
        grounds.push({ x0: lot.x0, z0: lot.z0, x1: lot.x1, z1: lot.z1, kind: 'plaza' });
        // Solace National Bank: wide classical block on the north half, plaza + fountain south
        const bx = cx, bz = lot.z0 + 18;
        addBuilding({ x: bx, z: bz, w: 52, d: 30, h: 18, style: 'office', color: 0xf3e9d2, roof: 'flat', shop: false, bank: true });
        for (let k = 0; k < 8; k++) {
          const colX = bx - 21 + k * 6;
          buildings.push({ x: colX, z: bz + 16.2, w: 1.6, d: 1.6, h: 14, y0: CURB, style: 'plain', color: 0xfff8ea, roof: 'flat', seed: 0, collide: false });
          circles.push({ x: colX, z: bz + 16.2, r: 0.9, h: 14 });
        }
        buildings.push({ x: bx, z: bz + 16.4, w: 50, d: 3.2, h: 2.2, y0: CURB + 14, style: 'plain', color: 0xfff8ea, roof: 'flat', seed: 0, collide: false });
        signs.push({ text: 'SOLACE NATIONAL BANK', x: bx, y: CURB + 15.1, z: bz + 18.05, rot: 0, w: 30, h: 1.6, color: '#ffd76a', bg: '#3a2a10' });
        places.bank = { x: bx, z: bz + 20.5 };
        extras.push({ type: 'fountain', x: cx, z: lot.z1 - 18 });
        circles.push({ x: cx, z: lot.z1 - 18, r: 5.2, h: 1.2 });
        places.plaza = { x: cx, z: lot.z1 - 8 };
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2;
          const tx = cx + Math.cos(a) * 14, tz = lot.z1 - 18 + Math.sin(a) * 11;
          props.trees.push({ x: tx, z: tz, s: 1, rot: a });
          circles.push({ x: tx, z: tz, r: 0.5, h: 6 });
        }
        break;
      }
      case 'M': {
        grounds.push({ x0: lot.x0, z0: lot.z0, x1: lot.x1, z1: lot.z1, kind: 'plaza' });
        const nx = rng() < 0.5 ? 2 : 3, nz = 2;
        const subs = subdivide(lot, nx, nz, 6);
        for (const s of subs) {
          if (rng() < 0.16) {
            addParkingLot(s, lot);
            continue;
          }
          const style = rng.pick(midStyles);
          const n = rng.int(2, 8);
          const w = s.w - rng.range(1, 4), d = s.d - rng.range(1, 4);
          const b = addBuilding({
            x: s.cx, z: s.cz, w, d, h: floors(n), style, color: rng.pick(midTints),
            shop: rng() < 0.8, roof: 'flat',
          });
          if (rng() < 0.06) neonRing(b.x, b.z, b.w + 0.3, b.d + 0.3, b.y0 + 4.2, rng.pick(NEONS));
          if (rng() < 0.4) {
            buildings.push({
              x: b.x + rng.range(-w / 4, w / 4), z: b.z + rng.range(-d / 4, d / 4), w: 3, d: 3, h: 2.5,
              y0: b.y0 + b.h, style: 'plain', color: 0xb0b4b8, roof: 'flat', seed: 0, collide: false,
            });
          }
          if (rng() < 0.25 && n >= 3) {
            extras.push({ type: 'watertank', x: b.x + rng.range(-w / 4, w / 4), z: b.z + rng.range(-d / 4, d / 4), y: b.y0 + b.h });
          }
        }
        break;
      }
      case 'O': {
        grounds.push({ x0: lot.x0, z0: lot.z0, x1: lot.x1, z1: lot.z1, kind: 'plaza' });
        const subs = subdivide(lot, 2, 3, 5);
        for (const s of subs) {
          const n = rng.int(2, 7);
          const color = rng.pick(PASTELS);
          const b = addBuilding({
            x: s.cx, z: s.cz, w: s.w - rng.range(1, 3), d: s.d - rng.range(1, 3), h: floors(n), style: rng() < 0.75 ? 'deco' : 'hotel',
            color, shop: rng() < 0.7, roof: 'flat',
          });
          if (rng() < 0.4) neonRing(b.x, b.z, b.w + 0.3, b.d + 0.3, b.y0 + b.h - 0.9, rng.pick(NEONS));
          // parapet
          buildings.push({
            x: b.x, z: b.z, w: b.w * 0.5, d: b.d * 0.5, h: 2.2, y0: b.y0 + b.h, style: 'plain', color,
            roof: 'flat', seed: 0, collide: false,
          });
          // vertical neon blade on the corner facing the street
          const ex = s.a === 0 ? b.x - b.w / 2 : b.x + b.w / 2;
          if (rng() < 0.22) {
            neon.push({ x0: ex - 0.2, x1: ex + 0.2, y0: b.y0 + 5, y1: b.y0 + b.h - 1.5, z0: b.z - 0.2, z1: b.z + 0.2, color: rng.pick(NEONS) });
          }
        }
        // palms on the sidewalk
        for (let z = lot.oz0 + 6; z < lot.oz1 - 4; z += 14) {
          for (const x of [lot.ox0 + 2.2, lot.ox1 - 2.2]) {
            props.palms.push({ x, z, s: rng.range(0.95, 1.25), rot: rng() * 6.28 });
            circles.push({ x, z, r: 0.45, h: 10 });
          }
        }
        break;
      }
      case 'R': {
        grounds.push({ x0: lot.x0, z0: lot.z0, x1: lot.x1, z1: lot.z1, kind: 'grass' });
        const subs = subdivide(lot, 3, 3, 2);
        for (const s of subs) {
          if (s.a === 1 && s.b === 1) {
            // shared back garden
            for (let k = 0; k < 3; k++) {
              const tx = s.x0 + 3 + rng() * (s.w - 6), tz = s.z0 + 3 + rng() * (s.d - 6);
              props.trees.push({ x: tx, z: tz, s: rng.range(0.9, 1.4), rot: rng() * 6.28 });
              circles.push({ x: tx, z: tz, r: 0.5, h: 7 });
            }
            continue;
          }
          addHouse(s, lot);
        }
        // hedges along lot edges (gaps at the middle for paths)
        break;
      }
      case 'D': {
        grounds.push({ x0: lot.x0, z0: lot.z0, x1: lot.x1, z1: lot.z1, kind: 'concrete' });
        const r = rng();
        if (r < 0.45) {
          // one big warehouse + loading yard
          const w = rng.range(46, 62), d = rng.range(28, 38);
          const wx = cx + rng.range(-4, 4), wz = lot.z0 + d / 2 + 3;
          addBuilding({ x: wx, z: wz, w, d, h: rng.pick([10.8, 12.6, 14.4]), style: 'warehouse', color: rng.pick([0xc65a3a, 0x8f9aa5, 0x5f7f99, 0x4f9a8f, 0xd0b48a]), roof: 'flat' });
          addContainers(lot.x0 + 4, lot.z1 - 26, lot.x1 - 4, lot.z1 - 4);
        } else if (r < 0.8) {
          addContainers(lot.x0 + 4, lot.z0 + 4, lot.x1 - 4, lot.z1 - 4);
        } else {
          // fuel tanks
          for (let a = 0; a < 2; a++) {
            for (let b = 0; b < 2; b++) {
              const tx = lot.x0 + 18 + a * 38, tz = lot.z0 + 18 + b * 38;
              extras.push({ type: 'tank', x: tx, z: tz, r: 11, h: 13 });
              circles.push({ x: tx, z: tz, r: 11, h: 13 });
            }
          }
        }
        break;
      }
      case 'S': {
        grounds.push({ x0: lot.x0, z0: lot.z0, x1: lot.x1, z1: lot.z1, kind: 'asphalt' });
        const sx = cx, sz = cz;
        const ax = 62, az = 24;
        extras.push({ type: 'stadium', x: sx, z: sz, ax, az, h: 22 });
        // ellipse wall colliders
        const segs = 28;
        for (let k = 0; k < segs; k++) {
          const a0 = (k / segs) * Math.PI * 2, a1 = ((k + 1) / segs) * Math.PI * 2;
          const x0 = sx + Math.cos(a0) * ax, z0 = sz + Math.sin(a0) * az;
          const x1 = sx + Math.cos(a1) * ax, z1 = sz + Math.sin(a1) * az;
          addCollider(Math.min(x0, x1) - 1.5, Math.max(x0, x1) + 1.5, Math.min(z0, z1) - 1.5, Math.max(z0, z1) + 1.5, 22);
        }
        addCollider(sx - ax + 4, sx + ax - 4, sz - az + 4, sz + az - 4, 22);
        places.stadium = { x: sx, z: lot.z1 - 4 };
        // parking rows around the stadium
        for (let x = lot.x0 + 6; x < lot.x1 - 6; x += 3.4) {
          if (rng() < 0.5) parking.push({ x, z: lot.z1 - 5, h: 0 });
        }
        signs.push({ text: 'SOLACE STADIUM', x: sx, y: 16, z: sz + az + 1.2, rot: 0, w: 26, h: 3, color: '#22f3ff', bg: '#101030' });
        break;
      }
      case 'P': {
        grounds.push({ x0: lot.x0, z0: lot.z0, x1: lot.x1, z1: lot.z1, kind: 'grass' });
        extras.push({ type: 'pond', x: cx + 20, z: cz - 15, rx: 26, rz: 17 });
        places.park = { x: cx, z: cz + 40 };
        // paths: a cross
        grounds.push({ x0: lot.x0, x1: lot.x1, z0: cz + 30, z1: cz + 35, kind: 'path' });
        grounds.push({ x0: cx - 42, x1: cx - 37, z0: lot.z0, z1: lot.z1, kind: 'path' });
        for (let k = 0; k < 90; k++) {
          const tx = lot.x0 + 4 + rng() * (lot.x1 - lot.x0 - 8), tz = lot.z0 + 4 + rng() * (lot.z1 - lot.z0 - 8);
          if (((tx - cx - 20) / 32) ** 2 + ((tz - cz + 15) / 23) ** 2 < 1) continue;
          if (Math.abs(tz - cz - 32.5) < 5 || Math.abs(tx - cx + 39.5) < 5) continue;
          if (Math.abs(tx - (cx - 10)) < 14 && Math.abs(tz - (cz + 60)) < 14) continue;
          if (rng() < 0.3) {
            props.palms.push({ x: tx, z: tz, s: rng.range(0.8, 1.2), rot: rng() * 6.28 });
            circles.push({ x: tx, z: tz, r: 0.4, h: 9 });
          } else {
            props.trees.push({ x: tx, z: tz, s: rng.range(0.9, 1.6), rot: rng() * 6.28 });
            circles.push({ x: tx, z: tz, r: 0.55, h: 8 });
          }
        }
        for (let k = 0; k < 12; k++) {
          props.benches.push({ x: lot.x0 + 10 + k * 13, z: cz + 28.5, rot: 0 });
        }
        // park jump: a grassy kicker
        ramps.push({ x: cx - 10, z: cz + 60, h: 0, len: 14, wid: 7, height: 2.6, name: 'Park Kicker' });
        extras.push({ type: 'gazebo', x: cx - 50, z: cz - 40 });
        circles.push({ x: cx - 50, z: cz - 40, r: 5, h: 5 });
        break;
      }
    }
  }

  function addContainers(x0, z0, x1, z1) {
    const cols = [0xd8572a, 0x2a6fd8, 0xc23b3b, 0x3b9c5a, 0x8a8f99, 0xe0a030, 0x2aa8a8];
    const rows = Math.floor((z1 - z0) / 6);
    for (let r = 0; r < rows; r++) {
      const z = z0 + 3 + r * 6;
      if (r % 3 === 2) continue; // aisle
      let x = x0 + 1;
      while (x + 12 < x1) {
        if (rng() < 0.8) {
          const stack = rng.int(1, 3);
          for (let s = 0; s < stack; s++) {
            buildings.push({
              x: x + 6, z, w: 12, d: 2.5, h: 2.6, y0: CURB + s * 2.6, style: 'container',
              color: rng.pick(cols), roof: 'flat', seed: rng(), collide: false,
            });
          }
          addCollider(x, x + 12, z - 1.25, z + 1.25, CURB + stack * 2.6);
        }
        x += 12.6;
      }
    }
  }

  // ---------- special places ----------
  const lotCenterSide = (i, j, side) => {
    const l = lotAt(i, j);
    const cx = (nodeX(i) + nodeX(i + 1)) / 2, cz = (nodeZ(j) + nodeZ(j + 1)) / 2;
    const s = BLOCK / 2 - ROAD_HALF - 1.6;
    const off = { n: [0, -s], s: [0, s], w: [-s, 0], e: [s, 0] }[side];
    return { x: cx + off[0], z: cz + off[1], lot: l };
  };

  // Named buildings get signs on the street-facing facade nearest the marker.
  const signOn = (b, side, text, color, bg) => {
    const map = {
      s: { x: b.x, z: b.z + b.d / 2 + 0.06, rot: 0 },
      n: { x: b.x, z: b.z - b.d / 2 - 0.06, rot: Math.PI },
      e: { x: b.x + b.w / 2 + 0.06, z: b.z, rot: Math.PI / 2 },
      w: { x: b.x - b.w / 2 - 0.06, z: b.z, rot: -Math.PI / 2 },
    }[side];
    const w = Math.min(text.length * 1.15 + 2, (side === 'e' || side === 'w' ? b.d : b.w) - 1);
    signs.push({ text, x: map.x, y: b.y0 + 5.6, z: map.z, rot: map.rot, w, h: 1.8, color, bg });
  };
  // find the main building in a cell nearest to a point
  const nearestBuilding = (x, z) => {
    let best = null, bd = 1e9;
    for (const b of buildings) {
      if (b.collide === false || b.style === 'container' || b.style === 'plain') continue;
      const d = Math.hypot(b.x - x, b.z - z);
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  };

  const mk = (name, i, j, side, label, color, bg) => {
    const p = lotCenterSide(i, j, side);
    places[name] = { x: p.x, z: p.z };
    if (label) {
      const b = nearestBuilding(p.x, p.z);
      if (b) signOn(b, side, label, color, bg);
    }
    return p;
  };
  mk('club', 12, 3, 'e', 'CLUB MIRAGE', '#ff2bd6', '#200018');
  mk('safehouse', 12, 6, 'e', 'HOTEL FLAMINGO', '#ff7ab8', '#1a0710');
  mk('garage', 3, 4, 's', 'DEX AUTO', '#ffb020', '#1a1000');
  mk('gunshop', 6, 4, 's', 'SOLACE ARMS', '#ff3b3b', '#140404');
  mk('respray1', 2, 3, 's', 'QUICK COAT', '#22f3ff', '#001418');
  mk('respray2', 11, 1, 'w', 'QUICK COAT', '#22f3ff', '#001418');
  mk('police', 5, 5, 'n', 'POLICE', '#4aa3ff', '#04102a');
  mk('hospital', 10, 6, 'n', 'HOSPITAL', '#ff4040', '#ffffff');
  mk('docksYard', 1, 1, 's', null);
  mk('carlot', 9, 4, 's', 'SUNSET MOTORS', '#9dff2e', '#0a1400');
  places.beach = { x: CITY.maxX + 60, z: 120 };
  places.pierEnd = { x: PIER.x1 - 40, z: 0 };

  // ---------- street furniture along roads ----------
  for (const e of edges) {
    const a = nodes[e.a], b = nodes[e.b];
    const len = e.horiz ? b.x - a.x : b.z - a.z;
    const n = Math.floor(len / 34);
    for (let k = 1; k <= n; k++) {
      const t = k / (n + 1);
      for (const side of [-1, 1]) {
        const off = ROAD_HALF + 0.9;
        const x = e.horiz ? a.x + (b.x - a.x) * t : a.x + side * off;
        const z = e.horiz ? a.z + side * off : a.z + (b.z - a.z) * t;
        // lamp faces the road
        const rot = e.horiz ? (side > 0 ? Math.PI : 0) : (side > 0 ? -Math.PI / 2 : Math.PI / 2);
        props.lamps.push({ x, z, rot });
        circles.push({ x, z, r: 0.22, h: 7 });
      }
    }
    // hydrants and bins sometimes
    if (rng() < 0.35) {
      const t = rng.range(0.2, 0.8), side = rng() < 0.5 ? -1 : 1;
      const off = ROAD_HALF + 1.4;
      const x = e.horiz ? a.x + (b.x - a.x) * t : a.x + side * off;
      const z = e.horiz ? a.z + side * off : a.z + (b.z - a.z) * t;
      props.hydrants.push({ x, z, rot: 0 });
    }
  }
  // traffic lights: one pole per approach, on the right-hand far corner
  for (const n of nodes) {
    if (!n.light) continue;
    for (const nbId of n.nb) {
      const m = nodes[nbId];
      // approach coming from m towards n; direction d = n - m
      const dx = Math.sign(n.x - m.x), dz = Math.sign(n.z - m.z);
      // right of travel = (-dz, dx)
      const rx = -dz, rz = dx;
      const c = ROAD_HALF + 0.7;
      // pole on the near-right corner, before the intersection, facing the oncoming car
      const x = n.x - dx * c + rx * c, z = n.z - dz * c + rz * c;
      props.lights.push({ x, z, rot: Math.atan2(-dx, -dz), node: n.id, axis: dx !== 0 ? 'x' : 'z', dx, dz });
      circles.push({ x, z, r: 0.25, h: 6 });
    }
  }

  // ---------- coast: promenade palms, beach, pier ----------
  // palms along the outer edge of the ring road sidewalks
  for (let z = CITY.minZ + 10; z < CITY.maxZ - 10; z += 18) {
    props.palms.push({ x: CITY.maxX + 4, z: z + rng.range(-3, 3), s: rng.range(1.0, 1.35), rot: rng() * 6.28 });
    circles.push({ x: CITY.maxX + 4, z, r: 0.45, h: 10 });
  }
  for (let x = CITY.minX + 30; x < CITY.maxX - 30; x += 26) {
    if (x < nodeX(4)) continue; // docks quay on the north-west
    props.palms.push({ x: x + rng.range(-4, 4), z: CITY.minZ - 5, s: rng.range(0.9, 1.2), rot: rng() * 6.28 });
  }
  for (let x = CITY.minX + 20; x < CITY.maxX - 20; x += 24) {
    props.palms.push({ x: x + rng.range(-4, 4), z: CITY.maxZ + 6, s: rng.range(0.9, 1.25), rot: rng() * 6.28 });
  }
  for (let z = CITY.minZ + 140; z < CITY.maxZ - 20; z += 24) {
    props.palms.push({ x: CITY.minX - 6, z: z + rng.range(-4, 4), s: rng.range(0.9, 1.2), rot: rng() * 6.28 });
  }
  // beach umbrellas and lifeguard towers on Coral Beach
  for (let k = 0; k < 70; k++) {
    const x = CITY.maxX + 45 + rng() * 85, z = CITY.minZ + 20 + rng() * (CITY.maxZ - CITY.minZ - 40);
    if (Math.abs(z) < 16) continue;
    props.umbrellas.push({ x, z, rot: rng() * 6.28, color: rng.pick([0xd84a3a, 0x2a7ab8, 0xf0c040, 0xf4f1ea, 0x3a8a6a, 0xe07a3a]) });
  }
  for (let z = -420; z <= 420; z += 140) {
    if (Math.abs(z) < 30) continue;
    extras.push({ type: 'lifeguard', x: CITY.maxX + 110, z });
    addCollider(CITY.maxX + 108, CITY.maxX + 112, z - 2, z + 2, 5);
  }
  extras.push({ type: 'pier' });
  extras.push({ type: 'ferris', x: PIER.x1 - 30, z: 0 });
  addCollider(PIER.x1 - 34, PIER.x1 - 26, -14, -9, 30);
  addCollider(PIER.x1 - 34, PIER.x1 - 26, 9, 14, 30);
  // pier railings: thin colliders so cars don't drop off too easily
  addCollider(PIER.x0 + PIER.ramp, PIER.x1, PIER.z1 - 0.1, PIER.z1 + 0.4, PIER.y + 1.2);
  addCollider(PIER.x0 + PIER.ramp, PIER.x1, PIER.z0 - 0.4, PIER.z0 + 0.1, PIER.y + 1.2);
  addCollider(PIER.x1, PIER.x1 + 0.5, PIER.z0, PIER.z1, PIER.y + 1.2);
  // lighthouse at the south-east tip
  extras.push({ type: 'lighthouse', x: LAND.maxX - 30, z: LAND.maxZ - 30 });
  circles.push({ x: LAND.maxX - 30, z: LAND.maxZ - 30, r: 4.5, h: 30 });
  // docks quay cranes on the north shore
  for (let k = 0; k < 4; k++) {
    const x = CITY.minX + 60 + k * 85;
    extras.push({ type: 'crane', x, z: LAND.minZ + 20 });
    addCollider(x - 9, x - 7, LAND.minZ + 12, LAND.minZ + 14, 40);
    addCollider(x + 7, x + 9, LAND.minZ + 12, LAND.minZ + 14, 40);
    addCollider(x - 9, x - 7, LAND.minZ + 26, LAND.minZ + 28, 40);
    addCollider(x + 7, x + 9, LAND.minZ + 26, LAND.minZ + 28, 40);
  }

  // ---------- stunt ramps ----------
  ramps.push({ x: nodeX(2) - 20, z: nodeZ(2) + 50, h: Math.PI / 2, len: 16, wid: 8, height: 3.2, name: 'Container Leap' });
  ramps.push({ x: CITY.maxX + 70, z: 260, h: Math.PI, len: 18, wid: 8, height: 3.0, name: 'Dune Launcher' });
  ramps.push({ x: CITY.maxX + 70, z: -300, h: 0, len: 18, wid: 8, height: 3.0, name: 'Coral Kicker' });
  ramps.push({ x: nodeX(13) + 2, z: nodeZ(8) + 52, h: 0, len: 14, wid: 7, height: 2.4, name: 'Ocean Drive Hop' });
  ramps.push({ x: nodeX(4) + 50, z: CITY.maxZ + 22, h: Math.PI / 2, len: 18, wid: 8, height: 3.4, name: 'Shoreline Flyer' });
  ramps.push({ x: PIER.x0 + 120, z: 0, h: Math.PI / 2, len: 12, wid: 6, height: 2.0, name: 'Pier Pop', y0: PIER.y });
  for (const r of ramps) {
    jumps.push({ name: r.name, ramp: r });
  }

  // ---------- collectible neon shells ----------
  const shellSpots = [
    [CITY.maxX + 140, -480], [CITY.maxX + 120, 470], [PIER.x1 - 4, 5], [nodeX(0) - 40, nodeZ(10) + 40],
    [nodeX(7) + 50, nodeZ(6) + 50], [nodeX(1) + 50, nodeZ(0) + 30], [nodeX(4) + 90, nodeZ(0) + 70],
    [nodeX(8) + 50, nodeZ(2) + 80], [nodeX(10) + 50, nodeZ(9) + 50], [nodeX(3) + 50, nodeZ(7) + 50],
    [nodeX(13) + 50, nodeZ(0) + 20], [nodeX(6) + 50, nodeZ(4) + 50], [LAND.minX + 30, LAND.minZ + 140],
    [nodeX(11) + 50, nodeZ(7) + 50], [nodeX(9) + 50, nodeZ(9) + 85], [nodeX(0) + 20, nodeZ(4) + 50],
    [LAND.maxX - 45, LAND.maxZ - 30], [nodeX(5) + 50, nodeZ(2) + 50], [nodeX(12) + 50, nodeZ(5) + 50],
    [nodeX(2) + 50, nodeZ(9) + 50],
  ];
  for (const [x, z] of shellSpots) collect.push({ x, z });

  // Region lookup for HUD district names
  const districtAt = (x, z) => {
    if (x > CITY.maxX) return 'Coral Beach';
    if (x < CITY.minX || z < CITY.minZ || z > CITY.maxZ) return 'Port Solace Coast';
    const i = clamp(Math.floor((x - X0) / BLOCK), 0, NCX - 1);
    const j = clamp(Math.floor((z - Z0) / BLOCK), 0, NCZ - 1);
    return DISTRICT_NAMES[DMAP[j][i]];
  };

  return {
    seed, nodes, edges, edgeMap, cells, lots, buildings, boxes, circles, props, neon, signs, parking, ramps,
    grounds, pools, places, extras, collect, jumps, districtAt,
    getEdge: (a, b) => edgeMap.get(a + ':' + b),
    nodeAtGrid: node,
  };
}

/** Nearest road node to a world position (searching around the grid cell). */
export function nearestNode(city, x, z) {
  const fi = Math.round((x - X0) / BLOCK), fj = Math.round((z - Z0) / BLOCK);
  let best = null, bd = 1e18;
  for (let dj = -1; dj <= 1; dj++) {
    for (let di = -1; di <= 1; di++) {
      const n = city.nodeAtGrid(clamp(fi + di, 0, NX - 1), clamp(fj + dj, 0, NZ - 1));
      if (!n || n.nb.length === 0) continue;
      const d = (n.x - x) ** 2 + (n.z - z) ** 2;
      if (d < bd) { bd = d; best = n; }
    }
  }
  return best;
}

/** Is (x,z) on a road surface (lanes or intersection)? */
export function isOnRoad(city, x, z) {
  const fi = (x - X0) / BLOCK, fj = (z - Z0) / BLOCK;
  const i = Math.round(fi), j = Math.round(fj);
  const inI = i >= 0 && i < NX, inJ = j >= 0 && j < NZ;
  const nearX = inI && Math.abs(x - nodeX(i)) < ROAD_HALF;
  const nearZ = inJ && Math.abs(z - nodeZ(j)) < ROAD_HALF;
  if (nearX && nearZ) return city.nodeAtGrid(i, j).nb.length > 0;
  if (nearX) {
    const j0 = Math.floor(fj);
    if (j0 < 0 || j0 >= NZ - 1) return false;
    return !!city.getEdge(city.nodeAtGrid(i, j0).id, city.nodeAtGrid(i, j0 + 1).id);
  }
  if (nearZ) {
    const i0 = Math.floor(fi);
    if (i0 < 0 || i0 >= NX - 1) return false;
    return !!city.getEdge(city.nodeAtGrid(i0, j).id, city.nodeAtGrid(i0 + 1, j).id);
  }
  return false;
}

/** Signed distance outside the land rounded-rect (negative = inside). */
export function landSdf(x, z) {
  const cx = (LAND.minX + LAND.maxX) / 2, cz = (LAND.minZ + LAND.maxZ) / 2;
  const hx = (LAND.maxX - LAND.minX) / 2 - LAND.r, hz = (LAND.maxZ - LAND.minZ) / 2 - LAND.r;
  const qx = Math.abs(x - cx) - hx, qz = Math.abs(z - cz) - hz;
  const ox = Math.max(qx, 0), oz = Math.max(qz, 0);
  return Math.hypot(ox, oz) + Math.min(Math.max(qx, qz), 0) - LAND.r;
}
