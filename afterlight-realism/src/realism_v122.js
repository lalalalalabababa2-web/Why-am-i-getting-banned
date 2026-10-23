;
/* Afterlight v12.2 — Realistic bodies.
 * Soldiers, zombies and your own body are skinned MakeHuman (CC0) humans:
 * real anatomy, skin, fitted clothes, boots and eyes. The game's own
 * animation, IK, ragdolls, gore and hitboxes still drive everything; each
 * frame the 53-bone skeleton is solved from the stock joints (trunk frames,
 * two-bone IK for limbs, hinge-plane twist, gripping fingers). The stock
 * joints themselves are moved to the new proportions so hitboxes match.
 */
(() => {
  "use strict";
  const a = window.__AF_OVERHAUL__?.state;
  const R = a?.realismV12;
  if (!a?.engine || !R || R.v122) return;
  const e = a.engine, S = R.settings;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const asset = (p) => new URL("./realism/" + p, import.meta.url).href;
  const on = () => !!S.bodies;
  const V3 = e.Vector3, M4 = e.Matrix4, Q4 = e.Quaternion;
  const M = (R.v122 = { stats: { soldiers: 0, zombies: 0, players: 0, solved: 0, severed: 0, assets: 0, failed: 0 } });

  /* ------------------------------------------------------------------ */
  /* Minimal skinned mesh. SkinnedMesh/Skeleton were tree-shaken out of   */
  /* the bundle, but the renderer still skins anything that quacks.       */
  /* ------------------------------------------------------------------ */
  class Skel {
    constructor(n) {
      this.n = n;
      this.bones = new Array(n);
      let size = Math.ceil(Math.sqrt(n * 4) / 4) * 4;
      size = Math.max(size, 4);
      this.boneMatrices = new Float32Array(size * size * 4);
      for (let i = 0; i < n; i++) this.boneMatrices[i * 16] = this.boneMatrices[i * 16 + 5] = this.boneMatrices[i * 16 + 10] = this.boneMatrices[i * 16 + 15] = 1;
      this.boneTexture = new Uf(this.boneMatrices, size, size, 1023, 1015);
      this.boneTexture.needsUpdate = true;
      this.frame = -1;
    }
    computeBoneTexture() { return this; }
    update() {}
    dispose() { this.boneTexture?.dispose(); }
  }
  class BodyMesh extends e.Mesh {
    constructor(geo, mats, skel) {
      super(geo, mats);
      this.isSkinnedMesh = true;
      this.skeleton = skel;
      this.bindMode = "detached";
      this.bindMatrix = new M4();
      this.bindMatrixInverse = new M4();
      this.boundingSphere = new wl(new V3(0, 1, 0), 1.35);
      this.castShadow = true;
      this.receiveShadow = true;
      this.userData.rlBodyV122 = true;
    }
    raycast() {}
  }

  /* ------------------------------------------------------------------ */
  /* Assets                                                              */
  /* ------------------------------------------------------------------ */
  const BODY = { manifest: null, promise: null, assets: new Map(), tex: new Map() };
  function manifest() {
    if (!BODY.promise) BODY.promise = fetch(asset("bodies/bodies.json")).then((r) => r.json()).then((m) => (BODY.manifest = m));
    return BODY.promise;
  }
  function loadImage(url) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => res(img);
      img.onerror = () => rej(new Error("bodies: cannot load " + url));
      img.src = url;
    });
  }
  function texture(file, color = true) {
    let t = BODY.tex.get(file);
    if (t) return t;
    t = new e.CanvasTexture(document.createElement("canvas"));
    t.colorSpace = color ? "srgb" : "";
    t.anisotropy = 4;
    BODY.tex.set(file, t);
    loadImage(asset("bodies/" + file)).then((img) => { t.image = img; t.needsUpdate = true; }).catch((err) => console.warn("[realism] body texture", err));
    return t;
  }
  const ROUGH = { skin: 0.52, glove: 0.68, suit: 0.92, boots: 0.55, eyes: 0.12, brows: 0.9, hair: 0.75 };
  function material(m, T) {
    const o = { roughness: ROUGH[m] ?? 0.8, metalness: 0, envMapIntensity: m === "eyes" ? 1.0 : 0.55 };
    if (T[m]) o.map = texture(T[m]);
    if (m === "suit" && T.suitNormal) { o.normalMap = texture(T.suitNormal, false); o.normalScale = new e.Vector2(0.9, 0.9); }
    if (m === "brows" || m === "hair") { o.alphaTest = 0.42; o.side = 2; }
    const mat = new e.MeshStandardMaterial(o);
    mat.name = "rl-body:" + m;
    return mat;
  }

  const F = new V3(0, 0, -1), U = new V3(0, 1, 0);
  const _x = new V3(), _y = new V3(), _z = new V3(), _t = new V3(), _q = new Q4(), _m = new M4();
  // Frame with Y along `y`, Z as close to `zref` as possible, origin `o`.
  function frame(out, o, y, zref) {
    _y.copy(y).normalize();
    _z.copy(zref).addScaledVector(_y, -zref.dot(_y));
    if (_z.lengthSq() < 1e-8) { _z.set(0, 0, 1).addScaledVector(_y, -_y.z); if (_z.lengthSq() < 1e-8) _z.set(1, 0, 0); }
    _z.normalize();
    _x.crossVectors(_y, _z);
    out.makeBasis(_x, _y, _z);
    out.elements[12] = o.x; out.elements[13] = o.y; out.elements[14] = o.z;
    return out;
  }
  const axisY = (m, out) => out.set(m.elements[4], m.elements[5], m.elements[6]);
  const axisZ = (m, out) => out.set(m.elements[8], m.elements[9], m.elements[10]);
  const axisX = (m, out) => out.set(m.elements[0], m.elements[1], m.elements[2]);
  const origin = (m, out) => out.set(m.elements[12], m.elements[13], m.elements[14]);

  function getAsset(name) {
    let A = BODY.assets.get(name);
    if (A) return A;
    A = { name, ready: false, failed: false, waiters: [] };
    BODY.assets.set(name, A);
    manifest().then(async (m) => {
      const v = m.variants[name];
      if (!v) throw new Error("no body " + name);
      const buf = await fetch(asset("bodies/" + v.file)).then((r) => r.arrayBuffer());
      const n = v.vertices, o = v.offsets;
      const g = new e.BufferGeometry();
      g.setAttribute("position", new e.BufferAttribute(new Float32Array(buf, o.position, n * 3), 3));
      const nrm = new Float32Array(n * 3), ni = new Int16Array(buf, o.normal, n * 4);
      for (let i = 0; i < n; i++) { nrm[i * 3] = ni[i * 4] / 32767; nrm[i * 3 + 1] = ni[i * 4 + 1] / 32767; nrm[i * 3 + 2] = ni[i * 4 + 2] / 32767; }
      g.setAttribute("normal", new e.BufferAttribute(nrm, 3));
      g.setAttribute("uv", new e.BufferAttribute(new Float32Array(buf, o.uv, n * 2), 2));
      g.setAttribute("skinIndex", new e.BufferAttribute(new Uint8Array(buf, o.skinIndex, n * 4), 4));
      g.setAttribute("skinWeight", new e.BufferAttribute(new Uint8Array(buf, o.skinWeight, n * 4), 4, true));
      g.setIndex(new e.BufferAttribute(v.indexType === "u16" ? new Uint16Array(buf, o.index, v.indices) : new Uint32Array(buf, o.index, v.indices), 1));
      if (!g.attributes.tangent && v.textures.suitNormal) {} // normal maps use derivative tangents
      g.boundingSphere = new wl(new V3(0, 0.9, 0), 1.2);
      // Materials, and groups for full / lower-only / upper-only rendering.
      const names = [...new Set(v.groups.map((x) => x.material))];
      A.materials = names.map((mn) => material(mn, v.textures));
      A.names = names;
      g.clearGroups();
      for (const gr of v.groups) g.addGroup(gr.start, gr.count, names.indexOf(gr.material));
      A.geometry = g;
      // Sub-geometries sharing the buffers: used to split your own body into
      // visible legs, a shadow-only torso/arms and a shadow-only head.
      const HEADMATS = new Set(["skin", "eyes", "brows", "hair"]);
      const sub = (pred) => {
        const rg = new e.BufferGeometry();
        for (const k of ["position", "normal", "uv", "skinIndex", "skinWeight"]) rg.setAttribute(k, g.attributes[k]);
        rg.setIndex(g.index);
        rg.boundingSphere = g.boundingSphere;
        for (const gr of v.groups) if (pred(gr)) rg.addGroup(gr.start, gr.count, names.indexOf(gr.material));
        return rg;
      };
      A.parts = {
        lower: sub((gr) => gr.region === "lower"),
        torso: sub((gr) => gr.region === "upper" && !HEADMATS.has(gr.material)),
        head: sub((gr) => gr.region === "upper" && HEADMATS.has(gr.material)),
      };
      bindData(A, v);
      A.v = v;
      A.ready = true;
      M.stats.assets++;
      for (const fn of A.waiters.splice(0)) try { fn(A); } catch (err) { console.error("[realism] body attach", err); }
    }).catch((err) => { A.failed = true; M.stats.failed++; console.warn("[realism] body asset", name, err); });
    return A;
  }

  // Bind frames, lengths and anatomy landmarks for one variant.
  function bindData(A, v) {
    const B = v.bones, n = B.length;
    const I = {};
    B.forEach((b, i) => (I[b.name] = i));
    const H = B.map((b) => new V3(...b.head)), T = B.map((b) => new V3(...b.tail));
    const bind = new Array(n), inv = new Array(n);
    for (let i = 0; i < n; i++) {
      const b = B[i], name = b.name;
      const dir = new V3().subVectors(T[i], H[i]);
      let zref = F;
      if (/^(foot|ball)_/.test(name)) zref = U;
      else if (/^(thumb|index|middle|ring|pinky)_/.test(name) || /^ball_/.test(name)) zref = axisZ(bind[b.parent], new V3());
      if (name === "Root") { bind[i] = new M4().setPosition(H[i]); inv[i] = new M4(); inv[i].copy(bind[i]).invert(); continue; }
      bind[i] = frame(new M4(), H[i], dir.lengthSq() > 1e-10 ? dir : U, zref);
      inv[i] = bind[i].clone().invert();
    }
    const side = ["l", "r"];
    const L = { upper: [], fore: [], thigh: [], shin: [] };
    for (const s of side) {
      L.upper.push(H[I["lowerarm_" + s]].distanceTo(H[I["upperarm_" + s]]));
      L.fore.push(H[I["hand_" + s]].distanceTo(H[I["lowerarm_" + s]]));
      L.thigh.push(H[I["calf_" + s]].distanceTo(H[I["thigh_" + s]]));
      L.shin.push(H[I["foot_" + s]].distanceTo(H[I["calf_" + s]]));
    }
    // Hand geometry: pointing direction, palm normal and the grip point.
    const hand = side.map((s, k) => {
      const w = H[I["hand_" + s]], mid = H[I["middle_01_" + s]], ix = H[I["index_01_" + s]], pk = H[I["pinky_01_" + s]];
      const point = new V3().subVectors(mid, w).normalize();
      const across = new V3().subVectors(ix, pk).normalize();
      // Left hand (k=0, −x side): palm = across × point; right hand mirrored.
      const palm = k === 0 ? new V3().crossVectors(across, point) : new V3().crossVectors(point, across);
      palm.addScaledVector(point, -palm.dot(point)).normalize();
      const grip = new V3().lerpVectors(w, mid, 0.55).addScaledVector(palm, 0.022);
      const handInv = inv[I["hand_" + s]];
      return {
        point, palm, gripLocal: grip.clone().applyMatrix4(handInv),
        // (point, palm) basis -> hand bone rotation
        toBone: new M4().makeBasis(new V3().crossVectors(point, palm), point, palm).invert().multiply(new M4().extractRotation(bind[I["hand_" + s]])),
      };
    });
    // Finger chains with their curl hinge (local) axis.
    const fingers = [];
    for (const s of side) for (const f of ["thumb", "index", "middle", "ring", "pinky"]) {
      const chain = [1, 2, 3].map((q) => I[`${f}_0${q}_${s}`]);
      const k = s === "l" ? 0 : 1;
      const hinges = chain.map((bi) => {
        const pl = hand[k].palm.clone().transformDirection(_m.copy(inv[bi]));
        return new V3().crossVectors(new V3(0, 1, 0), pl).normalize();
      });
      fingers.push({ k, thumb: f === "thumb", chain, hinges });
    }
    // Relative transforms of every bone to its parent.
    const relM = B.map((x, i) => (x.parent >= 0 ? inv[x.parent].clone().multiply(bind[i]) : new M4()));
    const rel = (child) => relM[child];
    A.bind = { I, H, T, bind, inv, L, hand, fingers, rel, n, names: B.map((b) => b.name), parent: B.map((b) => b.parent) };
    A.lm = v.landmarks;
    A.dims = {
      shoulder: [H[I.upperarm_l].clone(), H[I.upperarm_r].clone()],
      hip: [H[I.thigh_l].clone(), H[I.thigh_r].clone()],
      ankle: [H[I.foot_l].clone(), H[I.foot_r].clone()],
      chest: new V3(...v.landmarks.chest), pelvis: new V3(...v.landmarks.pelvis), skull: new V3(...v.landmarks.skull),
      L,
    };
  }

  /* ------------------------------------------------------------------ */
  /* Variant choice and attaching to rigs                                */
  /* ------------------------------------------------------------------ */
  const SOLDIERS = ["s0", "s1", "s2"];
  const ZOMBIES = ["z0", "z1", "z2", "z3", "z4", "z5"];
  function soldierVariant(id) { return SOLDIERS[((id || 0) % 3 + 3) % 3]; }
  function zombieVariant(actor) {
    if (actor.kind === "heavy" || actor.kind === "boss") return "z1";
    const v = ((actor.variant || 0) % 6 + 6) % 6;
    return ZOMBIES[v === 1 ? (actor.id || 0) % 2 ? 0 : 3 : v];
  }
  const HIDE = new e.MeshBasicMaterial({ visible: false });
  HIDE.name = "rl-body:hidden";
  let keyOf = null;
  function materialKey(gfx, m) {
    if (!keyOf || keyOf.size < gfx.materials.size) {
      keyOf = new Map();
      for (const [k, mat] of gfx.materials) keyOf.set(mat, k);
    }
    return keyOf.get(m) || m?.name || "";
  }
  function hideMesh(o) {
    if (!o.isMesh || o.userData.rlBodyV122) return;
    if (!o.userData.rlStockMat) o.userData.rlStockMat = o.material;
    o.material = HIDE;
  }
  function showMesh(o) {
    if (o.userData.rlStockMat) { o.material = o.userData.rlStockMat; delete o.userData.rlStockMat; }
  }
  function under(node, fn) { node?.traverse((o) => o.isMesh && fn(o)); }

  // Soldier: hide the body volumes, keep the field gear and the rifle.
  function hideSoldier(gfx, rig) {
    const weapon = new Set();
    under(rig.weaponRoot, (o) => weapon.add(o));
    const key = (o) => materialKey(gfx, Array.isArray(o.material) ? o.material[0] : o.material);
    for (const o of rig.torso.children) if (o.isMesh && /:cloth:/.test(key(o))) hideMesh(o);
    for (const o of rig.pelvis.children) if (o.isMesh && /:cloth:/.test(key(o))) hideMesh(o);
    for (const o of rig.head.children) if (o.isMesh && /:(skin|glove)/.test(key(o))) hideMesh(o);
    for (let k = 0; k < 2; k++) {
      for (const n of ["upperArm", "lowerArm", "upperLeg", "lowerLeg"]) under(rig.limbs[k][n], hideMesh);
      for (const n of ["shoulders", "hips", "elbows"]) under(rig.joints[n][k], hideMesh);
      for (const o of rig.joints.knees[k].children) if (o.isMesh && o.geometry.type === "SphereGeometry") hideMesh(o);
      under(rig.joints.palms[k], (o) => { if (!weapon.has(o)) hideMesh(o); });
      under(rig.boots[k], hideMesh);
      under(rig.joints.ankles[k], hideMesh);
    }
    under(rig.low, hideMesh);
  }
  // Plate carrier and belt were sized for the old torso; fit them to this one.
  function fitGear(inst) {
    const rig = inst.rig, lm = inst.A.lm;
    const wb = lm.waistBox, half = wb[0], depth = (wb[2] - wb[1]) / 2;
    const sx = clamp(half / 0.224 * 1.05, 0.78, 1.05);
    for (const o of rig.torso.children) if (o.isMesh && o.material !== HIDE) { o.userData.rlScale = o.userData.rlScale || o.scale.clone(); o.scale.set(sx, 1, 1); }
    const px = clamp(half / 0.176 * 1.04, 0.9, 1.25), pz = clamp(depth / 0.133 * 1.04, 0.9, 1.25);
    for (const o of rig.pelvis.children) if (o.isMesh && o.material !== HIDE) { o.userData.rlScale = o.userData.rlScale || o.scale.clone(); o.scale.set(px, 1, pz); }
  }
  function hideZombie(rig) { under(rig.high, hideMesh); under(rig.low, hideMesh); }

  function attach(gfx, rig, kind, vname, actor) {
    if (!rig?.root || rig.realBodyV122) return rig?.realBodyV122;
    const A = getAsset(vname);
    const inst = { rig, kind, vname, A, ready: false, meshes: [], skel: null, prev: {}, actor, gfx, severedDone: {} };
    rig.realBodyV122 = inst;
    const go = () => { if (rig.realBodyV122 === inst && on()) build(inst); };
    A.ready ? go() : A.waiters.push(go);
    return inst;
  }
  function build(inst) {
    const { rig, A } = inst;
    if (inst.ready) return;
    inst.skel = new Skel(A.bind.n);
    const player = inst.kind === "player";
    if (player) {
      for (const part of ["lower", "torso", "head"]) {
        const m = new BodyMesh(A.parts[part], A.materials, inst.skel);
        m.userData.rlPart = part;
        inst.meshes.push(m);
      }
      playerGhost(inst, rig.rlDeathV122 ? "head" : "all");
    } else {
      inst.meshes.push(new BodyMesh(A.geometry, A.materials, inst.skel));
    }
    for (const m of inst.meshes) rig.root.add(m);
    if (inst.kind === "zombie") { hideZombie(rig); fitZombie(inst); M.stats.zombies++; }
    else if (player) {
      // your own rig: only the rifle stays (as a shadow); the legs are the real ones
      const keep = new Set();
      under(rig.weaponRoot, (o) => keep.add(o));
      rig.root.traverse((o) => { if (o.isMesh && !keep.has(o)) hideMesh(o); });
      M.stats.players++;
    } else { hideSoldier(inst.gfx, rig); fitGear(inst); M.stats.soldiers++; }
    inst.dims = A.dims;
    inst.ready = true;
    computeOffsets(inst);
    try { solve(inst); } catch (err) { console.error("[realism] body solve", err); }
  }
  function detach(rig) {
    const inst = rig?.realBodyV122;
    if (!inst) return;
    for (const m of inst.meshes) m.parent?.remove(m);
    inst.skel?.dispose();
    rig.root.traverse((o) => { showMesh(o); if (o.userData.rlScale) { o.scale.copy(o.userData.rlScale); delete o.userData.rlScale; } });
    if (inst.kind === "zombie") unfitZombie(inst);
    rig.realBodyV122 = null;
  }

  /* ------------------------------------------------------------------ */
  /* Proportions: the stock joints move to the realistic body's           */
  /* ------------------------------------------------------------------ */
  // Soldiers: nl() is the human pose solver; this is the same solver with
  // the realistic body's joint layout and limb lengths.
  const baseNl = nl;
  nl = function (rig, t) {
    const inst = rig?.realBodyV122;
    if (!inst?.ready || !on()) return baseNl(rig, t);
    const D = inst.dims;
    const i = Ni((1.78 - (t.height || 1.78)) / 0.58, 0, 1),
      aa = i * 0.58,
      r = t.walkPhase || 0,
      o = t.moveSpeed || 0,
      s = Ni(o / 3.6, 0, 1),
      c = Math.sin((t.age || t.stateT || 0) * 2.4) * 0.004;
    rig.torso.position.set(0, D.chest.y - aa + c, D.chest.z - i * 0.06);
    rig.pelvis.position.set(0, D.pelvis.y - aa, D.pelvis.z + i * 0.09);
    rig.head.position.set(0, D.skull.y - 0.027 - aa + c, D.skull.z - 0.016 - i * 0.06);
    const u = Ni(t.aimPitch || 0, -0.7, 0.65),
      d = t.hitFlinch ? Math.sin(t.hitFlinch * 21) * t.hitFlinch * 0.08 : 0;
    rig.torso.rotation.set(u * 0.12, 0, d);
    rig.head.rotation.x = u * 0.45;
    const p = rig.joints.palms[1];
    p.position.set(0.16, 1.29 - aa + c, -0.18 - i * 0.06);
    p.rotation.set(u, 0, 0);
    rig.weaponRoot.position.set(0, 0, (t.flashT || 0) > 0.001 ? 0.012 : 0);
    rig.weaponRoot.rotation.set(0, 0, 0);
    const g = t.reloadT > 0 ? 1 - Ni(t.reloadT / (t.reloadTotal || 2.6), 0, 1) : 0,
      f = t.reloadT > 0 ? Math.sin(g * Math.PI) : 0;
    rig.magazine.position.set(0, -0.07 - f * 0.17, -0.07 + f * 0.015);
    rig.magazine.rotation.x = f * 0.2;
    const v = new V3(-0.05, f > 0 ? -0.09 - f * 0.16 : 0.04, f > 0 ? -0.07 : -0.23).add(rig.weaponRoot.position).applyEuler(p.rotation).add(p.position);
    rig.joints.palms[0].position.copy(v);
    rig.joints.palms[0].rotation.set(u, 0, 0);
    for (let P = 0; P < 2; P++) {
      const y = P === 0 ? -1 : 1, w = rig.joints.shoulders[P], b = rig.joints.hips[P], Sk = rig.joints.knees[P], j = rig.joints.ankles[P];
      const sh = D.shoulder[P], hp = D.hip[P], an = D.ankle[P];
      w.position.set(sh.x, sh.y - aa, sh.z - i * 0.06);
      const z = rig.joints.palms[P].position;
      rig.joints.elbows[P].position.copy(Ru(w.position, z, D.L.upper[P], D.L.fore[P], new V3(y * 0.43, 1.12 - aa, 0.06)));
      Or(rig.limbs[P].upperArm, w.position, rig.joints.elbows[P].position);
      Or(rig.limbs[P].lowerArm, rig.joints.elbows[P].position, z);
      const A2 = r + (P ? Math.PI : 0),
        C = Math.sin(A2) * 0.2 * s * (1 - i * 0.6),
        I2 = Math.max(0, Math.cos(A2)) * 0.075 * s;
      b.position.set(hp.x, hp.y - aa, hp.z + i * 0.11);
      j.position.set(an.x + y * i * 0.04, an.y + I2, an.z + C);
      Sk.position.copy(Ru(b.position, j.position, D.L.thigh[P], D.L.shin[P], new V3(y * (0.17 + i * 0.11), 0.37, -0.48)));
      Or(rig.limbs[P].upperLeg, b.position, Sk.position);
      Or(rig.limbs[P].lowerLeg, Sk.position, j.position);
      rig.boots[P].rotation.x = -Math.cos(A2) * s * 0.08;
    }
    rig.low.position.y = 0;
    rig.low.scale.y = (t.height || 1.78) / 1.78;
    rig.high.rotation.z = 0;
    rig.root.updateMatrixWorld(true);
  };

  // Zombies: forward-kinematic rig. Limb lengths change once; the joint
  // heights are shifted after each animation update.
  const ZREST = { torso: 1.24, pelvis: 0.86, head: 1.6, headZ: -0.025, arm: 1.43, leg: 0.84 };
  function fitZombie(inst) {
    const rig = inst.rig, D = inst.A.dims;
    inst.zsave = { fore: [], hand: [], knee: [], foot: [], contact: [] };
    for (let k = 0; k < 2; k++) {
      inst.zsave.fore.push(rig.forearms[k].position.y);
      inst.zsave.hand.push(rig.hands[k].position.y);
      inst.zsave.knee.push(rig.knees[k].position.y);
      inst.zsave.foot.push(rig.feet[k].position.y);
      if (inst.actor?.kind === "crawler") continue;
      rig.forearms[k].position.y = -D.L.upper[k];
      rig.hands[k].position.y = -D.L.fore[k];
      rig.knees[k].position.y = -D.L.thigh[k];
      rig.feet[k].position.y = -D.L.shin[k];
      const box = rig.footContactLocal?.[k];
      if (box) { inst.zsave.contact.push(box.min.y); box.min.y = -D.ankle[k].y; }
    }
  }
  function unfitZombie(inst) {
    const rig = inst.rig, z = inst.zsave;
    if (!z) return;
    for (let k = 0; k < 2; k++) {
      rig.forearms[k].position.y = z.fore[k]; rig.hands[k].position.y = z.hand[k];
      rig.knees[k].position.y = z.knee[k]; rig.feet[k].position.y = z.foot[k];
      const box = rig.footContactLocal?.[k];
      if (box && z.contact[k] !== undefined) box.min.y = z.contact[k];
    }
  }
  function shiftZombie(inst) {
    const rig = inst.rig, D = inst.A.dims, act = inst.actor;
    if (!act || act.kind === "crawler" || rig.ragdollV6) return;
    if (inst.lastTorsoY === rig.torso.position.y) return; // animation was skipped this frame
    rig.torso.position.y += D.chest.y - ZREST.torso;
    rig.pelvis.position.y += D.pelvis.y - ZREST.pelvis;
    rig.head.position.y += D.skull.y - 0.02 - ZREST.head;
    for (let k = 0; k < 2; k++) {
      rig.arms[k].position.x = D.shoulder[k].x * 1.08;
      rig.arms[k].position.y += D.shoulder[k].y - ZREST.arm;
      rig.legs[k].position.x = D.hip[k].x;
      rig.legs[k].position.y += D.hip[k].y - ZREST.leg;
    }
    inst.lastTorsoY = rig.torso.position.y;
    rig.root.updateMatrixWorld(true);
  }

  /* ------------------------------------------------------------------ */
  /* Trunk offsets: stock node rest frame -> realistic bone bind frame    */
  /* ------------------------------------------------------------------ */
  function computeOffsets(inst) {
    const { A, kind, actor } = inst, b = A.bind, D = A.dims, I = b.I;
    let rest;
    if (kind === "zombie" && actor?.kind === "crawler") {
      rest = { pelvis: new V3(0, ZREST.pelvis, 0), chest: new V3(0, ZREST.torso, 0), head: new V3(0, ZREST.head, ZREST.headZ) };
    } else if (kind === "zombie") {
      rest = { pelvis: new V3(0, D.pelvis.y, 0), chest: new V3(0, D.chest.y, 0), head: new V3(0, D.skull.y - 0.02, ZREST.headZ) };
    } else {
      rest = { pelvis: D.pelvis.clone(), chest: D.chest.clone(), head: new V3(0, D.skull.y - 0.027, D.skull.z - 0.016) };
    }
    const off = (restPos, bone) => new M4().makeTranslation(-restPos.x, -restPos.y, -restPos.z).multiply(b.bind[I[bone]]);
    const offPos = (restPos, p) => p.clone().sub(restPos);
    inst.off = {
      pelvisP: off(rest.pelvis, "pelvis"),
      s1P: off(rest.pelvis, "spine_01"), s1C: off(rest.chest, "spine_01"),
      s2P: off(rest.pelvis, "spine_02"), s2C: off(rest.chest, "spine_02"),
      s3C: off(rest.chest, "spine_03"),
      neckC: off(rest.chest, "neck_01"), neckH: off(rest.head, "neck_01"),
      headH: off(rest.head, "head"),
      clav: [off(rest.chest, "clavicle_l"), off(rest.chest, "clavicle_r")],
      shoulder: [offPos(rest.chest, b.H[I.upperarm_l]), offPos(rest.chest, b.H[I.upperarm_r])],
      hip: [offPos(rest.pelvis, b.H[I.thigh_l]), offPos(rest.pelvis, b.H[I.thigh_r])],
      neckLen: b.H[I.head].distanceTo(b.H[I.neck_01]),
    };
  }

  /* ------------------------------------------------------------------ */
  /* Solver                                                              */
  /* ------------------------------------------------------------------ */
  const W = [];                       // world (mesh-local) bone frames
  for (let i = 0; i < 64; i++) W.push(new M4());
  const invRoot = new M4(), tmpM = new M4(), tmpM2 = new M4();
  const pA = new V3(), pB = new V3(), qA = new Q4(), qB = new Q4(), sA = new V3();
  const P = { pelvis: new M4(), chest: new M4(), head: new M4() };
  const J = { S: [new V3(), new V3()], E: [new V3(), new V3()], Wr: [new V3(), new V3()], H: [new V3(), new V3()], N: [new V3(), new V3()], A: [new V3(), new V3()], T: [new V3(), new V3()] };
  const handM = [new M4(), new M4()], footM = [new M4(), new M4()];
  const v1 = new V3(), v2 = new V3(), v3 = new V3(), v4 = new V3(), v5 = new V3(), v6 = new V3();

  function local(node, out) { return out.multiplyMatrices(invRoot, node.matrixWorld); }
  function localPos(node, out) { node.getWorldPosition(out); return out.applyMatrix4(invRoot); }
  function blend(out, ma, mb, t) {
    ma.decompose(pA, qA, sA); mb.decompose(pB, qB, sA);
    pA.lerp(pB, t); qA.slerp(qB, t);
    return out.compose(pA, qA, v6.set(1, 1, 1));
  }
  // Two-bone IK: joint position given root, target, lengths and pole.
  function ik(out, root, target, l1, l2, pole) {
    v1.subVectors(target, root);
    let d = v1.length();
    const dmax = (l1 + l2) * 0.999;
    if (d < 1e-5) { v1.set(0, -1, 0); d = 1e-5; } else v1.divideScalar(d);
    d = clamp(d, Math.abs(l1 - l2) + 1e-3, dmax);
    const x = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
    v2.subVectors(pole, root);
    v2.addScaledVector(v1, -v2.dot(v1));
    if (v2.lengthSq() < 1e-8) v2.set(0, 0, 1).addScaledVector(v1, -v1.z);
    v2.normalize();
    return out.copy(root).addScaledVector(v1, x).addScaledVector(v2, h);
  }
  // Limb segment frames from joint positions. Elbows flex toward the front
  // of the upper arm, knees toward the back of the thigh; when nearly
  // straight, the twist falls back to the trunk, rotated with the limb.
  function limbFrames(outA, outB, j0, j1, j2, trunk, knee) {
    const ya = v3.subVectors(j1, j0).normalize(), yb = v4.subVectors(j2, j1).normalize();
    const perp = v5.copy(yb).addScaledVector(ya, -yb.dot(ya));
    const bend = perp.length();
    // fallback: trunk front rotated by the limb's flexion in the sagittal plane
    const tf = axisZ(trunk, _t).negate(), tu = axisY(trunk, v6);
    const fy = ya.dot(tu), fz = ya.dot(tf);
    const phi = Math.atan2(fz, -fy);
    const fb = v2.copy(tf).multiplyScalar(Math.cos(phi)).addScaledVector(tu, Math.sin(phi));
    const w = clamp((bend - 0.06) / 0.25, 0, 1);
    if (bend > 1e-6) perp.divideScalar(bend);
    if (knee) perp.negate();
    const zref = fb.multiplyScalar(1 - w).addScaledVector(perp, w);
    frame(outA, j0, ya, zref.lengthSq() > 1e-8 ? zref : tf);
    // hinge: child Z = X_parent × Y_child
    axisX(outA, v2);
    v1.crossVectors(v2, yb);
    frame(outB, j1, yb, v1);
  }
  function setBone(i, m) { W[i].copy(m); }
  function collapseAt(i, p) { W[i].set(0, 0, 0, p.x, 0, 0, 0, p.y, 0, 0, 0, p.z, 0, 0, 0, 1); W[i].userData = 1; }

  function drive(inst) {
    const { rig, kind } = inst;
    const rd = rig.ragdollV6 && !rig.ragdollV6.hidden ? rig.ragdollV6 : null;
    invRoot.copy(rig.root.matrixWorld).invert();
    local(rig.pelvis, P.pelvis); local(rig.torso, P.chest); local(rig.head, P.head);
    // remove node scale (zombie torso breathing) from trunk frames
    for (const m of [P.pelvis, P.chest, P.head]) { m.decompose(pA, qA, sA); m.compose(pA, qA, v6.set(1, 1, 1)); }
    if (rd) {
      const p = rd.points;
      for (let k = 0; k < 2; k++) {
        J.S[k].copy(p[3 + k].p); J.H[k].copy(p[5 + k].p); J.E[k].copy(p[7 + k].p); J.Wr[k].copy(p[9 + k].p);
        J.N[k].copy(p[11 + k].p); J.A[k].copy(p[13 + k].p); J.T[k].copy(p[15 + k].p);
      }
      inst.mode = "ragdoll";
      return;
    }
    if (kind === "zombie") {
      for (let k = 0; k < 2; k++) {
        localPos(rig.arms[k], J.S[k]); localPos(rig.forearms[k], J.E[k]); localPos(rig.hands[k], J.Wr[k]);
        localPos(rig.legs[k], J.H[k]); localPos(rig.knees[k], J.N[k]); localPos(rig.feet[k], J.A[k]);
        local(rig.hands[k], handM[k]); local(rig.feet[k], footM[k]);
        J.T[k].set(0, -0.03, -0.14).applyMatrix4(footM[k]);
      }
      inst.mode = "zombie";
      return;
    }
    for (let k = 0; k < 2; k++) {
      const jn = rig.joints;
      localPos(jn.shoulders[k], J.S[k]); localPos(jn.elbows[k], J.E[k]); localPos(jn.palms[k], J.Wr[k]);
      localPos(jn.hips[k], J.H[k]); localPos(jn.knees[k], J.N[k]); localPos(jn.ankles[k], J.A[k]);
      local(jn.palms[k], handM[k]); local(rig.boots[k], footM[k]);
      J.T[k].set(0, 0, -0.15).applyMatrix4(footM[k]);
    }
    inst.mode = "soldier";
  }

  // Grip orientation of each hand in the stock palm frame (x right, y up, z back).
  const GRIP = [
    { point: new V3(0.38, 0.12, -0.92), palm: new V3(0.35, 0.9, 0.1), curl: [0.75, 0.95, 0.65], thumb: [0.35, 0.45, 0.3] },   // left, under the handguard
    { point: new V3(-0.18, -0.32, -0.93), palm: new V3(-1, 0.05, 0), curl: [1.15, 1.25, 0.85], thumb: [0.55, 0.65, 0.4] },   // right, on the pistol grip
  ];
  const RELAX = { curl: [0.32, 0.42, 0.3], thumb: [0.15, 0.2, 0.1] };
  const CLAW = { curl: [0.55, 0.75, 0.6], thumb: [0.25, 0.3, 0.2] };

  function solve(inst) {
    const { A } = inst, b = A.bind, I = b.I, o = inst.off;
    drive(inst);
    const mode = inst.mode;
    const sev = inst.actor?.severedV8 || {};
    // trunk
    W[I.Root].copy(b.bind[I.Root]);
    W[I.pelvis].multiplyMatrices(P.pelvis, o.pelvisP);
    blend(W[I.spine_01], tmpM.multiplyMatrices(P.pelvis, o.s1P), tmpM2.multiplyMatrices(P.chest, o.s1C), 0.35);
    blend(W[I.spine_02], tmpM.multiplyMatrices(P.pelvis, o.s2P), tmpM2.multiplyMatrices(P.chest, o.s2C), 0.7);
    W[I.spine_03].multiplyMatrices(P.chest, o.s3C);
    if (sev.head) {
      // the head is gone (and its ragdoll point no longer simulated)
      W[I.neck_01].multiplyMatrices(P.chest, o.neckC);
    } else {
      W[I.head].multiplyMatrices(P.head, o.headH);
      blend(W[I.neck_01], tmpM.multiplyMatrices(P.chest, o.neckC), tmpM2.multiplyMatrices(P.head, o.neckH), 0.3);
      // aim the neck at the head and stretch it to reach
      origin(W[I.neck_01], v1); origin(W[I.head], v2);
      const nd = v3.subVectors(v2, v1), nl2 = nd.length();
      frame(tmpM, v1, nd, axisZ(W[I.neck_01], v4));
      W[I.neck_01].copy(tmpM).multiply(_m.makeScale(1, clamp(nl2 / o.neckLen, 0.8, 1.3), 1));
    }
    // arms
    for (let k = 0; k < 2; k++) {
      const s = k ? "r" : "l";
      W[I["clavicle_" + s]].multiplyMatrices(P.chest, o.clav[k]);
      const sh = v5.copy(o.shoulder[k]).applyMatrix4(P.chest).clone();
      let wrist = J.Wr[k];
      let handFrame = null;
      if (mode === "soldier") {
        // hand orientation from the grip, wrist from the grip point
        const gp = GRIP[k];
        const hm = handM[k];
        const pt = v1.copy(gp.point).transformDirection(hm), pm = v2.copy(gp.palm).transformDirection(hm);
        pm.addScaledVector(pt, -pm.dot(pt)).normalize();
        handFrame = tmpM.makeBasis(v3.crossVectors(pt, pm), pt, pm).multiply(A.bind.hand[k].toBone);
        const grip = v4.copy(A.bind.hand[k].gripLocal).applyMatrix4(_m.copy(handFrame).setPosition(0, 0, 0));
        wrist = pB.copy(J.Wr[k]).sub(grip);
      }
      const elbow = ik(v6.set(0, 0, 0), sh, wrist, b.L.upper[k], b.L.fore[k], J.E[k]).clone();
      const reach = v2.subVectors(wrist, elbow);
      const wr = elbow.clone().addScaledVector(reach.normalize(), b.L.fore[k]);
      limbFrames(W[I["upperarm_" + s]], W[I["lowerarm_" + s]], sh, elbow, wr, P.chest, false);
      const H = W[I["hand_" + s]];
      if (handFrame) {
        H.copy(handFrame); H.elements[12] = wr.x; H.elements[13] = wr.y; H.elements[14] = wr.z;
      } else {
        H.multiplyMatrices(W[I["lowerarm_" + s]], b.rel(I["hand_" + s]));
        H.elements[12] = wr.x; H.elements[13] = wr.y; H.elements[14] = wr.z;
      }
      if (sev[k ? "rightArm" : "leftArm"]) {
        for (const n of ["upperarm_", "lowerarm_", "hand_"]) collapseAt(I[n + s], sh);
      }
    }
    // fingers
    const pose = mode === "soldier" ? null : mode === "zombie" ? CLAW : RELAX;
    for (const f of b.fingers) {
      const s = f.k ? "r" : "l";
      const c = pose ? (f.thumb ? pose.thumb : pose.curl) : (f.thumb ? GRIP[f.k].thumb : GRIP[f.k].curl);
      let parent = W[I["hand_" + s]];
      for (let q = 0; q < 3; q++) {
        const bi = f.chain[q];
        W[bi].multiplyMatrices(parent, b.rel(bi)).multiply(_m.makeRotationAxis(f.hinges[q], c[q]));
        parent = W[bi];
      }
    }
    // legs
    for (let k = 0; k < 2; k++) {
      const s = k ? "r" : "l";
      const hp = v5.copy(o.hip[k]).applyMatrix4(P.pelvis).clone();
      const knee = ik(v6.set(0, 0, 0), hp, J.A[k], b.L.thigh[k], b.L.shin[k], J.N[k]).clone();
      const an = knee.clone().addScaledVector(v2.subVectors(J.A[k], knee).normalize(), b.L.shin[k]);
      limbFrames(W[I["thigh_" + s]], W[I["calf_" + s]], hp, knee, an, P.pelvis, true);
      // foot: sole frame from ankle -> toe, up from the shin (ragdoll) or world up
      const fw = v1.subVectors(J.T[k], J.A[k]);
      const up = mode === "ragdoll" ? v2.subVectors(knee, an).normalize() : axisY(footM[k], v2);
      fw.addScaledVector(up, -fw.dot(up));
      const sole = frame(tmpM, an, up, fw.lengthSq() > 1e-8 ? fw : v3.set(0, 0, -1));
      W[I["foot_" + s]].multiplyMatrices(sole, inst.soleOff?.[k] || (inst.soleOff = soleOffsets(A))[k]);
      W[I["ball_" + s]].multiplyMatrices(W[I["foot_" + s]], b.rel(I["ball_" + s]));
      if (sev[k ? "rightLeg" : "leftLeg"]) for (const n of ["thigh_", "calf_", "foot_", "ball_"]) collapseAt(I[n + s], hp);
    }
    if (sev.head) { origin(W[I.neck_01], v1).lerp(origin(W[I.spine_03], v2), -0.35); collapseAt(I.head, v1.copy(v1).addScaledVector(axisY(W[I.neck_01], v3), o.neckLen * 0.55)); }
    write(inst);
    M.stats.solved++;
  }
  function soleOffsets(A) {
    const b = A.bind, I = b.I;
    return ["l", "r"].map((s) => {
      const fi = I["foot_" + s];
      const sole = frame(new M4(), b.H[fi], U, F);
      return sole.invert().multiply(b.bind[fi]);
    });
  }
  function write(inst) {
    const b = inst.A.bind, out = inst.skel.boneMatrices;
    for (let i = 0; i < b.n; i++) {
      if (W[i].userData === 1) { W[i].userData = 0; tmpM.copy(W[i]); }
      else tmpM.multiplyMatrices(W[i], b.inv[i]);
      tmpM.toArray(out, i * 16);
    }
    inst.skel.boneTexture.needsUpdate = true;
    // bounding sphere follows the pelvis
    const bs = inst.meshes[0].boundingSphere;
    origin(W[b.I.pelvis], bs.center);
    for (const m of inst.meshes) m.boundingSphere = bs;
  }

  /* ------------------------------------------------------------------ */
  /* Hooks                                                               */
  /* ------------------------------------------------------------------ */
  const humanBuild = e.Graphics.prototype.human;
  e.Graphics.prototype.human = function (actor) {
    const rig = humanBuild.call(this, actor);
    try {
      if (on() && rig && !rig.realBodyV122) {
        const player = actor?.id === 97531;
        attach(this, rig, player ? "player" : "soldier", player ? "s0" : soldierVariant(actor?.id), actor);
      }
    } catch (err) { console.error("[realism] body", err); }
    return rig;
  };
  const zBuild = e.ZombieVisuals.prototype.build;
  e.ZombieVisuals.prototype.build = function (actor) {
    const rig = zBuild.call(this, actor);
    try { if (on() && rig && !rig.realBodyV122) attach(this.r, rig, "zombie", zombieVariant(actor), actor); }
    catch (err) { console.error("[realism] body", err); }
    return rig;
  };
  const zUpdate = e.ZombieVisuals.prototype.update;
  e.ZombieVisuals.prototype.update = function (actor) {
    const r = zUpdate.call(this, actor);
    const inst = this.rigs.get(actor.id)?.realBodyV122;
    if (inst?.ready) { inst.actor = actor; try { shiftZombie(inst); } catch (err) { console.error("[realism] zombie fit", err); } }
    return r;
  };
  const zRemove = e.ZombieVisuals.prototype.remove;
  e.ZombieVisuals.prototype.remove = function (id) {
    const rig = this.rigs.get(id);
    if (rig?.realBodyV122) { rig.realBodyV122.skel?.dispose(); rig.realBodyV122.dead = true; }
    return zRemove.call(this, id);
  };

  /* ------------------------------------------------------------------ */
  /* Gore: a severed limb leaves with its realistic flesh                 */
  /* ------------------------------------------------------------------ */
  const REGION = {
    leftArm: { root: "upperarm_l", bones: /^(upperarm|lowerarm|hand|thumb|index|middle|ring|pinky)(_0\d)?_l$/ },
    rightArm: { root: "upperarm_r", bones: /^(upperarm|lowerarm|hand|thumb|index|middle|ring|pinky)(_0\d)?_r$/ },
    leftLeg: { root: "thigh_l", bones: /^(thigh|calf|foot|ball)_l$/ },
    rightLeg: { root: "thigh_r", bones: /^(thigh|calf|foot|ball)_r$/ },
    head: { root: "head", bones: /^head$/ },
    arms: { root: "upperarm_r", bones: /^(upperarm|lowerarm|hand|thumb|index|middle|ring|pinky)(_0\d)?_[lr]$/ },
  };
  // Triangles that belong to a region (any corner mostly weighted to it).
  function regionGeometry(A, part) {
    A.regionGeo = A.regionGeo || {};
    if (A.regionGeo[part]) return A.regionGeo[part];
    const g = A.geometry, b = A.bind, re = REGION[part].bones;
    const inRegion = new Uint8Array(b.n);
    b.names.forEach((n, i) => (inRegion[i] = re.test(n) ? 1 : 0));
    const si = g.attributes.skinIndex.array, sw = g.attributes.skinWeight.array, idx = g.index.array;
    const nv = g.attributes.position.count, vin = new Uint8Array(nv);
    for (let v = 0; v < nv; v++) {
      let w = 0;
      for (let k = 0; k < 4; k++) if (inRegion[si[v * 4 + k]]) w += sw[v * 4 + k];
      vin[v] = w > 110 ? 1 : 0;
    }
    const out = [], groups = [];
    for (const gr of g.groups) {
      const start = out.length;
      for (let t = gr.start; t < gr.start + gr.count; t += 3)
        if (vin[idx[t]] || vin[idx[t + 1]] || vin[idx[t + 2]]) out.push(idx[t], idx[t + 1], idx[t + 2]);
      if (out.length > start) groups.push([start, out.length - start, gr.materialIndex]);
    }
    const rg = new e.BufferGeometry();
    for (const k of ["position", "normal", "uv", "skinIndex", "skinWeight"]) rg.setAttribute(k, g.attributes[k]);
    rg.setIndex(new e.BufferAttribute(nv < 65536 ? new Uint16Array(out) : new Uint32Array(out), 1));
    for (const [st, c, m] of groups) rg.addGroup(st, c, m);
    rg.boundingSphere = new wl(new V3(0, 0, 0), 0.8);
    return (A.regionGeo[part] = { geo: rg, inRegion });
  }
  const baseJh = Jh;
  Jh = function (game, actor, part, point, dir, force) {
    const rig = actor?.renderRig, inst = rig?.realBodyV122;
    let before = null;
    if (inst?.ready && on() && REGION[part]) {
      try {
        solve(inst);
        rig.root.updateMatrixWorld(true);
        before = W.slice(0, inst.A.bind.n).map((m) => m.clone().premultiply(rig.root.matrixWorld));
      } catch (err) { before = null; }
    }
    const r = baseJh.apply(this, arguments);
    if (!r || !before) return r;
    try {
      const reg = K9(game.gfx).bodies;
      const piece = [...reg].reverse().find((b) => b.actorId === actor.id && b.part === part);
      if (!piece) return r;
      const grp = piece.group;
      grp.updateMatrixWorld(true);
      const toGroup = new M4().copy(grp.matrixWorld).invert();
      const A = inst.A, b = A.bind, { geo, inRegion } = regionGeometry(A, part);
      const skel = new Skel(b.n);
      const cut = origin(before[b.I[REGION[part].root]], new V3()).applyMatrix4(toGroup);
      for (let i = 0; i < b.n; i++) {
        if (inRegion[i]) tmpM.multiplyMatrices(toGroup, before[i]).multiply(b.inv[i]);
        else tmpM.set(0, 0, 0, cut.x, 0, 0, 0, cut.y, 0, 0, 0, cut.z, 0, 0, 0, 1);
        tmpM.toArray(skel.boneMatrices, i * 16);
      }
      skel.boneTexture.needsUpdate = true;
      const mesh = new BodyMesh(geo, A.materials, skel);
      mesh.boundingSphere = new wl(cut.clone(), 0.9);
      grp.add(mesh);
      const dispose = grp.removeFromParent.bind(grp);
      grp.removeFromParent = function () { skel.dispose(); return dispose(); };
      M.stats.severed++;
    } catch (err) { console.error("[realism] severed body", err); }
    return r;
  };
  if (e.sever) e.sever = Jh;

  /* ------------------------------------------------------------------ */
  /* First-person arms: camo sleeves and gloved hands on the weapon       */
  /* ------------------------------------------------------------------ */
  const FP = { mesh: null, skel: null, hands: null, weapon: null, A: null };
  // Hand orientation in each stock hand group's frame (x right, y up, z back).
  const FPGRIP = [
    { point: new V3(0.12, 0.16, -1), palm: new V3(0.9, 0.5, 0), curl: [1.0, 1.1, 0.8], thumb: [0.35, 0.45, 0.3], offset: new V3(-0.026, 0.006, 0) },
    { point: new V3(0.02, -0.18, -1), palm: new V3(-1, 0.06, 0), curl: [1.3, 1.4, 0.95], thumb: [0.65, 0.75, 0.5] },
  ];
  const FPSH = [new V3(-0.36, -0.44, 0.82).normalize(), new V3(0.34, -0.5, 0.8).normalize()];
  const FPPOLE = [new V3(-0.7, -1, 0.25), new V3(0.75, -1, 0.3)];
  const IDM = new M4();
  function fpStock(gfx, hide) {
    const key = (o) => materialKey(gfx, Array.isArray(o.material) ? o.material[0] : o.material);
    const apply = hide ? hideMesh : showMesh;
    under(gfx.rightHand, apply);
    under(gfx.leftHand, apply);
    for (const o of gfx.weapon.children) if (o.isMesh && (hide ? /viewmodel:sleeve/.test(key(o)) : o.userData.rlStockMat)) apply(o);
  }
  function ensureFP(gfx) {
    if (!gfx.weapon || !gfx.rightHand || !gfx.leftHand) return false;
    const A = FP.A || (FP.A = getAsset("s0"));
    if (!A.ready) return false;
    if (FP.hands !== gfx.rightHand || FP.weapon !== gfx.weapon || FP.mesh?.parent !== gfx.weapon) {
      if (!FP.mesh) {
        FP.skel = new Skel(A.bind.n);
        FP.mesh = new BodyMesh(regionGeometry(A, "arms").geo, A.materials, FP.skel);
        FP.mesh.castShadow = FP.mesh.receiveShadow = false;
        FP.mesh.frustumCulled = false;
      }
      gfx.weapon.add(FP.mesh);
      fpStock(gfx, true);
      FP.hands = gfx.rightHand;
      FP.weapon = gfx.weapon;
    }
    return true;
  }
  const fpInv = new M4(), fpH = new M4(), fpSh = [new V3(), new V3()];
  function updateFP(game) {
    const gfx = game.gfx;
    if (!ensureFP(gfx)) return;
    const A = FP.A, b = A.bind, I = b.I;
    gfx.weapon.updateMatrixWorld(true);
    fpInv.copy(gfx.weapon.matrixWorld).invert();
    for (let k = 0; k < 2; k++) {
      const s = k ? "r" : "l", grp = k ? gfx.rightHand : gfx.leftHand, gp = FPGRIP[k];
      fpH.multiplyMatrices(fpInv, grp.matrixWorld);
      const pt = v1.copy(gp.point).transformDirection(fpH), pm = v2.copy(gp.palm).transformDirection(fpH);
      pm.addScaledVector(pt, -pm.dot(pt)).normalize();
      const hf = handM[k].makeBasis(v3.crossVectors(pt, pm), pt, pm).multiply(b.hand[k].toBone);
      const grip = v4.copy(b.hand[k].gripLocal).applyMatrix4(_m.copy(hf).setPosition(0, 0, 0));
      const palmAt = origin(fpH, pB);
      if (gp.offset) palmAt.add(v6.copy(gp.offset).transformDirection(fpH).multiplyScalar(gp.offset.length()));
      const wrist = palmAt.sub(grip).clone();
      const reach = b.L.upper[k] + b.L.fore[k];
      const sh = fpSh[k].copy(wrist).addScaledVector(FPSH[k], reach * 0.93);
      const pole = v5.copy(sh).add(FPPOLE[k]).clone();
      const elbow = ik(v6.set(0, 0, 0), sh, wrist, b.L.upper[k], b.L.fore[k], pole).clone();
      const wr = elbow.clone().addScaledVector(v2.subVectors(wrist, elbow).normalize(), b.L.fore[k]);
      limbFrames(W[I["upperarm_" + s]], W[I["lowerarm_" + s]], sh, elbow, wr, IDM, false);
      const H = W[I["hand_" + s]].copy(hf);
      H.elements[12] = wr.x; H.elements[13] = wr.y; H.elements[14] = wr.z;
    }
    for (const f of b.fingers) {
      const s = f.k ? "r" : "l", c = f.thumb ? FPGRIP[f.k].thumb : FPGRIP[f.k].curl;
      let parent = W[I["hand_" + s]];
      for (let q = 0; q < 3; q++) {
        const bi = f.chain[q];
        W[bi].multiplyMatrices(parent, b.rel(bi)).multiply(_m.makeRotationAxis(f.hinges[q], c[q]));
        parent = W[bi];
      }
    }
    const re = REGION.arms.bones;
    const mid = v3.addVectors(fpSh[0], fpSh[1]).multiplyScalar(0.5);
    for (let i = 0; i < b.n; i++) {
      if (re.test(b.names[i])) continue;
      const n = b.names[i];
      collapseAt(i, /_l$/.test(n) ? fpSh[0] : /_r$/.test(n) ? fpSh[1] : mid);
    }
    const out = FP.skel.boneMatrices;
    for (let i = 0; i < b.n; i++) {
      if (W[i].userData === 1) { W[i].userData = 0; tmpM.copy(W[i]); }
      else tmpM.multiplyMatrices(W[i], b.inv[i]);
      tmpM.toArray(out, i * 16);
    }
    FP.skel.boneTexture.needsUpdate = true;
  }
  function removeFP(gfx) {
    if (FP.mesh) FP.mesh.parent?.remove(FP.mesh);
    if (gfx?.weapon && gfx.rightHand) fpStock(gfx, false);
    FP.hands = FP.weapon = null;
  }

  const removeActor = e.Graphics.prototype.removeActor;
  if (removeActor) e.Graphics.prototype.removeActor = function (id) {
    const inst = this.actors?.get(id)?.realBodyV122;
    if (inst) { inst.skel?.dispose(); inst.dead = true; }
    return removeActor.call(this, id);
  };

  function eachRig(gfx, fn) {
    for (const rig of gfx.zombieVisuals?.rigs?.values() || []) fn(rig);
    for (const rig of gfx.actors?.values() || []) fn(rig);
    const pb = R.v121?.body?.rig;
    if (pb) fn(pb);
  }
  function frameUpdate(game) {
    const gfx = game.gfx;
    if (!gfx || !on()) return;
    const cam = gfx.camera.position;
    eachRig(gfx, (rig) => {
      const inst = rig.realBodyV122;
      if (!inst?.ready || inst.dead || !rig.root.visible || !rig.root.parent) return;
      // soldiers far away: the stock LOD swaps to the static low model; keep the animated one
      if (inst.kind === "soldier" && rig.low.visible) { rig.low.visible = false; rig.high.visible = true; }
      if (inst.kind !== "zombie") inst.actor = inst.actor || null;
      const rd = rig.ragdollV6;
      // a settled corpse keeps its last pose
      if (rd && rd.sleeping && !rd.hidden) { if (inst.slept) return; inst.slept = true; } else inst.slept = false;
      const pos = rd ? origin(rig.pelvis.matrixWorld, v1) : rig.root.position;
      const d2 = cam.distanceToSquared(pos);
      const far = d2 > 45 * 45 && !rd;
      if (far && (inst.skip = (inst.skip || 0) + 1) % 3) return;
      for (const m of inst.meshes) m.castShadow = d2 < 30 * 30 || inst.kind === "player";
      try { solve(inst); } catch (err) { if (!inst.err) console.error("[realism] body solve", err); inst.err = true; }
    });
  }
  a.on("frame", (game) => {
    try { frameUpdate(game); } catch (err) { console.error("[realism] bodies", err); }
    try { if (on() && game.gfx && !a.coop?.active) updateFP(game); } catch (err) { if (!FP.err) console.error("[realism] arms", err); FP.err = true; }
  });

  // Your own body: legs are seen; torso, arms and head only cast shadows
  // (v12.1's ghost technique). After death the torso and arms show.
  const ghostCache = new WeakMap();
  function ghostOf(mat) {
    let g = ghostCache.get(mat);
    if (!g) { g = mat.clone(); g.colorWrite = false; g.depthWrite = false; ghostCache.set(mat, g); }
    return g;
  }
  function playerGhost(inst, which) {
    const body = R.v121?.body;
    for (const m of inst.meshes) {
      const ghost = m.userData.rlPart === "head" || (m.userData.rlPart === "torso" && which === "all");
      m.material = ghost ? inst.A.materials.map(ghostOf) : inst.A.materials;
      if (!body) continue;
      const i = body.ghosts.indexOf(m);
      if (ghost && i < 0) body.ghosts.push(m);
      if (!ghost && i >= 0) { body.ghosts.splice(i, 1); m.visible = true; }
    }
  }
  M.playerGhost = function (rig, which) {
    const inst = rig?.realBodyV122;
    rig && (rig.rlDeathV122 = which === "head");
    if (inst?.ready) playerGhost(inst, which);
  };
  M.debugBones = function (rig, names) {
    const inst = rig?.realBodyV122;
    if (!inst?.ready) return null;
    solve(inst);
    const out = {}, I = inst.A.bind.I;
    for (const n of names) { const p = origin(W[I[n]], new V3()).applyMatrix4(rig.root.matrixWorld); out[n] = [+p.x.toFixed(3), +p.y.toFixed(3), +p.z.toFixed(3)]; }
    const np = (o) => { const p = o.getWorldPosition(new V3()); return [+p.x.toFixed(3), +p.y.toFixed(3), +p.z.toFixed(3)]; };
    out.node = { torso: np(rig.torso), pelvis: np(rig.pelvis), head: np(rig.head), root: np(rig.root) };
    return out;
  };
  /* ------------------------------------------------------------------ */
  /* Bodycam: chest-mounted wide lens and its sensor                      */
  /* ------------------------------------------------------------------ */
  const BC = { pass: null, gfx: null, el: null, t: 0, sway: 0, lastSec: -1 };
  const QV = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";
  const BCFS = `
uniform sampler2D tDiffuse; uniform vec2 res; uniform float k, time, ca, grain, vig, sharp;
varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
vec2 lens(vec2 uv, float kk) {
  float aspect = res.x / res.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  float r = length(p) / length(vec2(0.5 * aspect, 0.5));
  p *= (1.0 + kk * r * r) / (1.0 + kk);
  return p / vec2(aspect, 1.0) + 0.5;
}
void main() {
  vec2 uvG = lens(vUv, k);
  // lateral chromatic aberration grows from zero at the centre
  vec2 d = uvG - 0.5;
  vec2 uvR = 0.5 + d * (1.0 + 0.0035 * ca);
  vec2 uvB = 0.5 + d * (1.0 - 0.0035 * ca);
  vec3 col = vec3(texture2D(tDiffuse, uvR).r, texture2D(tDiffuse, uvG).g, texture2D(tDiffuse, uvB).b);
  vec2 px = 1.0 / res;
  // camera DSP sharpening
  vec3 nb = texture2D(tDiffuse, uvG + vec2(px.x, 0.0)).rgb + texture2D(tDiffuse, uvG - vec2(px.x, 0.0)).rgb
          + texture2D(tDiffuse, uvG + vec2(0.0, px.y)).rgb + texture2D(tDiffuse, uvG - vec2(0.0, px.y)).rgb;
  col += (col - nb * 0.25) * sharp;
  // small-sensor highlight bloom
  vec3 glow = vec3(0.0);
  for (int i = 0; i < 6; i++) {
    float a = float(i) * 1.0472;
    glow += max(texture2D(tDiffuse, uvG + vec2(cos(a), sin(a)) * px * 9.0).rgb - 0.72, 0.0);
  }
  col += glow * 0.16;
  // sensor response: punchy contrast, crushed blacks, a little desaturated, cool
  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(l), col, 0.84);
  col = max(col - 0.018, 0.0) * 1.05;
  vec3 sc = col * col * (3.0 - 2.0 * col);
  col = mix(col, sc, 0.38);
  col *= vec3(0.975, 1.005, 1.01);
  // lens falloff
  float aspect = res.x / res.y;
  float rn = length((vUv - 0.5) * vec2(aspect, 1.0)) / length(vec2(0.5 * aspect, 0.5));
  col *= 1.0 - vig * 0.62 * pow(rn, 2.3);
  // sensor noise, heavier in the shadows
  float n = hash(floor(vUv * res) + fract(time * 7.13) * 91.7) - 0.5;
  float n2 = hash(floor(vUv * res * 0.5) + fract(time * 3.1) * 47.0) - 0.5;
  col += (n * 0.7 + n2 * 0.3) * grain * (0.03 + 0.07 * (1.0 - clamp(l, 0.0, 1.0)));
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;
  class BodycamPass extends e.Pass {
    constructor() {
      super();
      this.needsSwap = true;
      this.uniforms = { tDiffuse: { value: null }, res: { value: new e.Vector2(1, 1) }, k: { value: 0.45 }, time: { value: 0 }, ca: { value: 1 }, grain: { value: 1 }, vig: { value: 1 }, sharp: { value: 0.55 } };
      this.material = new e.ShaderMaterial({ uniforms: this.uniforms, vertexShader: QV, fragmentShader: BCFS, depthTest: false, depthWrite: false });
      this.quad = new e.FullScreenQuad(this.material);
    }
    render(renderer, writeBuffer, readBuffer) {
      this.uniforms.tDiffuse.value = readBuffer.texture;
      this.uniforms.res.value.set(readBuffer.width, readBuffer.height);
      renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
      this.quad.render(renderer);
    }
    dispose() { this.material.dispose(); this.quad.dispose?.(); }
  }
  function bodycamOverlay(show) {
    if (!BC.el) {
      const st = document.createElement("style");
      st.textContent = `.rl-bodycam{position:fixed;top:calc(env(safe-area-inset-top,0px) + 68px);right:calc(env(safe-area-inset-right,0px) + 16px);z-index:40;pointer-events:none;font:600 12px/1.35 "IBM Plex Mono",ui-monospace,monospace;color:#f4f4ef;text-align:right;text-shadow:0 0 2px #000,0 1px 2px #000;letter-spacing:.04em;opacity:.92}
.rl-bodycam b{display:inline-block;width:8px;height:8px;border-radius:50%;background:#e33;margin-right:6px;vertical-align:1px;animation:rlrec 1s steps(2,start) infinite}
@keyframes rlrec{to{visibility:hidden}}
@media (max-width:700px){.rl-bodycam{font-size:10px;top:calc(env(safe-area-inset-top,0px) + 56px)}}`;
      document.head.appendChild(st);
      BC.el = document.createElement("div");
      BC.el.className = "rl-bodycam";
      document.body.appendChild(BC.el);
    }
    BC.el.style.display = show ? "block" : "none";
    if (!show) return;
    const now = new Date(), sec = Math.floor(now.getTime() / 1000);
    if (sec === BC.lastSec) return;
    BC.lastSec = sec;
    const z = (n) => String(n).padStart(2, "0");
    const ts = `${now.getUTCFullYear()}-${z(now.getUTCMonth() + 1)}-${z(now.getUTCDate())} T${z(now.getUTCHours())}:${z(now.getUTCMinutes())}:${z(now.getUTCSeconds())}Z`;
    BC.el.innerHTML = `<div><b></b>REC  FIELDLINE BC-4</div><div>X7A0${(BC.unit ||= 1000 + Math.floor(Math.random() * 8999))}</div><div>${ts}</div>`;
  }
  const bcOn = () => !!S.bodycam;
  function bodycamFrame(game, dt) {
    const gfx = game.gfx;
    if (!gfx?.composer) return;
    if (BC.gfx !== gfx) {
      BC.pass = new BodycamPass();
      gfx.composer.addPass(BC.pass);
      BC.gfx = gfx;
    }
    const active = bcOn() && (game.phase === "playing" || game.rlDeath) && !a.coop?.active;
    BC.pass.enabled = active;
    bodycamOverlay(active && game.phase === "playing");
    if (!active) return;
    BC.t += dt;
    const u = BC.pass.uniforms;
    const ads = clamp(game.ads || 0, 0, 1), scoped = !!game.weapon?.def.scope && ads > 0.6;
    u.k.value = scoped ? 0 : 0.42 * (1 - 0.55 * ads);
    u.ca.value = scoped ? 0.2 : 1;
    u.time.value = BC.t;
    u.vig.value = scoped ? 0.3 : 1;
    // wide lens: more of the world, with the gun closer to the middle
    const c = gfx.camera;
    if (!scoped) { c.fov = Math.min(110, c.fov * 1.14); c.updateProjectionMatrix(); }
    // chest mount: the camera rides the body, not a stabilised head
    if (game.phase === "playing" && game.player?.alive && !game.settings.reducedMotion) {
      const p = game.player, mv = clamp(p.speed / 3.6, 0, 1.6);
      BC.sway += dt * (1.3 + mv * 4.5);
      const shake = (game.settings.shake ?? 0.35) / 0.35;
      const j = (0.0012 + mv * 0.0035) * shake;
      c.rotation.x += Math.sin(BC.sway * 1.7) * j + (Math.random() - 0.5) * 0.0006 * shake;
      c.rotation.y += Math.sin(BC.sway * 0.9 + 1.3) * j * 0.8;
      c.rotation.z += Math.sin(BC.sway * 0.85) * j * 2.2;
      c.position.y -= 0.05;
      c.updateMatrixWorld();
    }
  }
  a.on("frame", (game, dt) => { try { bodycamFrame(game, dt); } catch (err) { if (!BC.err) console.error("[realism] bodycam", err); BC.err = true; } });
  M.bodycam = BC;

  M.attach = attach; M.detach = detach; M.solve = solve; M.getAsset = getAsset; M.preload = () => { for (const n of [...SOLDIERS, ...ZOMBIES]) getAsset(n); };

  // Settings: turning bodies off restores the stock rigs.
  R.on((s) => {
    const gfx = a.game?.gfx;
    if (!gfx) return;
    eachRig(gfx, (rig) => { if (!s.bodies && rig.realBodyV122) detach(rig); });
    if (!s.bodies) removeFP(gfx);
    if (s.bodies) {
      const g = a.game;
      for (const h of g?.ai?.enemies || []) if (h.renderRig && !h.renderRig.realBodyV122) attach(gfx, h.renderRig, "soldier", soldierVariant(h.id), h);
      for (const z of g?.zombies?.enemies || []) if (z.renderRig && !z.renderRig.realBodyV122 && !z.renderRig.ragdollV6) attach(gfx, z.renderRig, "zombie", zombieVariant(z), z);
    }
  });
  if (on()) M.preload();
})();
