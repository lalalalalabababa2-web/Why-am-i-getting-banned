#!/usr/bin/env python3
"""Build realistic, skinned human bodies for Afterlight from MakeHuman CC0 assets.

Inputs (all CC0):
  mh/base.obj, mh/rig.game_engine.json, mh/weights.game_engine.json  (MPFB2 data)
  mh/a/...  makehuman_system_assets_cc0.zip (skins, clothes, eyes, brows, hair)
  macro targets fetched from the MakeHuman 1.x repository into mh/t/

For every body variant this applies the macro targets (gender, age, muscle,
weight, height, proportions, ethnicity), fits the clothes (.mhclo barycentric
references), deletes skin hidden under them, transfers the 53-bone game-engine
skin weights, paints the textures and writes one compact binary per variant
plus bodies.json.
"""
import json, os, subprocess, struct, sys, math
import numpy as np
from PIL import Image, ImageFilter

S = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MH = os.path.join(S, "mh")
A = os.path.join(MH, "a")
OUT = os.environ.get("BODIES_OUT") or (os.path.join(S, "assets", "realism", "bodies") if os.path.isdir(os.path.join(S, "assets", "realism"))
                                        else os.path.join(S, "work", "realism", "bodies"))
TB = "https://raw.githubusercontent.com/makehumancommunity/makehuman/master/makehuman/data/targets/"
os.makedirs(OUT, exist_ok=True)
os.makedirs(os.path.join(MH, "t"), exist_ok=True)

# ---------------------------------------------------------------- io
def read_obj(path):
    V, VT, F, FT, G = [], [], [], [], []
    g = None
    with open(path) as f:
        for line in f:
            if line.startswith("v "):
                V.append([float(x) for x in line.split()[1:4]])
            elif line.startswith("vt "):
                VT.append([float(x) for x in line.split()[1:3]])
            elif line.startswith("g "):
                p = line.split()
                g = p[1] if len(p) > 1 else None
            elif line.startswith("f "):
                vi, ti = [], []
                for p in line.split()[1:]:
                    s = p.split("/")
                    vi.append(int(s[0]) - 1)
                    ti.append(int(s[1]) - 1 if len(s) > 1 and s[1] else -1)
                F.append(vi); FT.append(ti); G.append(g)
    return np.array(V, float), np.array(VT, float).reshape(-1, 2), F, FT, G

_tcache = {}
def target(name):
    if name in _tcache: return _tcache[name]
    p = os.path.join(MH, "t", name.replace("/", "__") + ".target")
    if not os.path.exists(p):
        r = subprocess.run(["curl", "-sS", "-f", "-o", p, TB + name + ".target"])
        if r.returncode != 0:
            raise SystemExit("missing target " + name)
    idx, d = [], []
    for line in open(p):
        if not line.strip() or line[0] == "#": continue
        a = line.split()
        idx.append(int(a[0])); d.append([float(a[1]), float(a[2]), float(a[3])])
    _tcache[name] = (np.array(idx, int), np.array(d, float).reshape(-1, 3))
    return _tcache[name]

def parse_ranges(tokens):
    out, i = [], 0
    while i < len(tokens):
        a = int(tokens[i])
        if i + 2 < len(tokens) and tokens[i + 1] == "-":
            out.extend(range(a, int(tokens[i + 2]) + 1)); i += 3
        else:
            out.append(a); i += 1
    return out

def read_mhclo(path):
    d = {"refs": [], "w": [], "off": [], "delete": set(), "scale": {}}
    mode = None
    folder = os.path.dirname(path)
    dtok = []
    for line in open(path, encoding="utf-8", errors="replace"):
        s = line.strip()
        if not s or s.startswith("#"): continue
        p = s.split()
        if p[0] == "verts": mode = "verts"; continue
        if p[0] == "delete_verts": mode = "delete"; continue
        if mode == "verts" and p[0].lstrip("-").isdigit():
            if len(p) >= 9:
                d["refs"].append([int(p[0]), int(p[1]), int(p[2])])
                d["w"].append([float(p[3]), float(p[4]), float(p[5])])
                d["off"].append([float(p[6]), float(p[7]), float(p[8])])
                continue
            if len(p) == 1:
                d["refs"].append([int(p[0])] * 3); d["w"].append([1, 0, 0]); d["off"].append([0, 0, 0]); continue
        if mode == "verts" and d["refs"] and p[0][0].isalpha():
            mode = None
        if mode == "delete" and (p[0][0].isdigit() or p[0] == "-"):
            dtok.extend(p); continue
        if mode == "delete": mode = None
        if p[0] in ("x_scale", "y_scale", "z_scale"):
            d["scale"][p[0][0]] = (int(p[1]), int(p[2]), float(p[3]))
        elif p[0] == "obj_file":
            d["obj"] = os.path.join(folder, p[1])
        elif p[0] == "material":
            d["material"] = os.path.join(folder, p[1])
    d["delete"] = set(parse_ranges(dtok))
    for k in ("refs", "w", "off"): d[k] = np.array(d[k])
    return d

# ---------------------------------------------------------------- base data
BV, BVT, BF, BFT, BG = read_obj(os.path.join(MH, "base.obj"))
RIG = json.load(open(os.path.join(MH, "rig.game_engine.json")))
WJ = json.load(open(os.path.join(MH, "weights.game_engine.json")))["weights"]

# Bones in parent-first order.
order, seen = [], set()
def visit(n):
    if n in seen: return
    par = RIG[n]["parent"]
    if par: visit(par)
    seen.add(n); order.append(n)
for n in RIG: visit(n)
BONES = order
BI = {n: i for i, n in enumerate(BONES)}
NB = len(BONES)
W = np.zeros((len(BV), NB))
for b, lst in WJ.items():
    for vi, w in lst: W[vi, BI[b]] += w

groups = {}
for fi, g in enumerate(BG): groups.setdefault(g, []).append(fi)
def group_verts(g):
    return sorted({v for fi in groups[g] for v in BF[fi]})
GROUP_VERTS = {g: np.array(group_verts(g)) for g in groups}
BODY_FACES = groups["body"]

UPPER = {"spine_02", "spine_03", "neck_01", "head"} | {b for b in BONES if any(k in b for k in ("clavicle", "upperarm", "lowerarm", "hand", "thumb", "index", "middle", "ring", "pinky"))}
HAND = {b for b in BONES if any(k in b for k in ("hand", "thumb", "index", "middle", "ring", "pinky"))}

# ---------------------------------------------------------------- shape
def macro_targets(age=0.5, muscle=0.5, weight=0.5, height=0.5, prop=0.5, race=None):
    race = race or {"caucasian": 1.0}
    old = max(0.0, (age - 0.5) * 2)
    ages = {"young": 1 - old, "old": old}
    mus = {"averagemuscle": 1 - abs(muscle - 0.5) * 2, "maxmuscle": max(0, (muscle - 0.5) * 2), "minmuscle": max(0, (0.5 - muscle) * 2)}
    wei = {"averageweight": 1 - abs(weight - 0.5) * 2, "maxweight": max(0, (weight - 0.5) * 2), "minweight": max(0, (0.5 - weight) * 2)}
    T = []
    for r, rw in race.items():
        for a, aw in ages.items():
            if rw * aw > 1e-4: T.append((f"macrodetails/{r}-male-{a}", rw * aw))
    hw, pw = (height - 0.5) * 2, (prop - 0.5) * 2
    for a, aw in ages.items():
        for m, mw in mus.items():
            for w, ww in wei.items():
                k = aw * mw * ww
                if k < 1e-4: continue
                T.append((f"macrodetails/universal-male-{a}-{m}-{w}", k))
                if abs(hw) * k > 1e-4:
                    T.append((f"macrodetails/height/male-{a}-{m}-{w}-{'max' if hw > 0 else 'min'}height", abs(hw) * k))
                if pw * k > 1e-4:
                    T.append((f"macrodetails/proportions/male-{a}-{m}-{w}-idealproportions", pw * k))
    return T

def shaped(spec):
    V = BV.copy()
    for name, w in macro_targets(**spec):
        idx, d = target(name)
        V[idx] += d * w
    return V

def joint(V, cube):
    return V[GROUP_VERTS[cube]].mean(0)

# ---------------------------------------------------------------- parts
class Part:
    def __init__(self, name, V, VT, tris, ttris, Wv, mat):
        self.name, self.V, self.VT, self.tris, self.ttris, self.W, self.mat = name, V, VT, tris, ttris, Wv, mat

def tri(faces, ftex):
    t, tt = [], []
    for f, ft in zip(faces, ftex):
        for k in range(1, len(f) - 1):
            t.append([f[0], f[k], f[k + 1]]); tt.append([ft[0], ft[k], ft[k + 1]])
    return np.array(t, int).reshape(-1, 3), np.array(tt, int).reshape(-1, 3)

def fit(clo_path, V, mat, delete_acc=None):
    c = read_mhclo(clo_path)
    cv, cvt, cf, cft, _ = read_obj(c["obj"])
    sc = []
    for ax, k in (("x", 0), ("y", 1), ("z", 2)):
        a, b, ref = c["scale"][ax]
        sc.append(abs(V[a][k] - V[b][k]) / ref)
    r, w = c["refs"], c["w"]
    P = (V[r[:, 0]] * w[:, :1] + V[r[:, 1]] * w[:, 1:2] + V[r[:, 2]] * w[:, 2:3]) + c["off"] * np.array(sc)
    Wc = W[r[:, 0]] * w[:, :1] + W[r[:, 1]] * w[:, 1:2] + W[r[:, 2]] * w[:, 2:3]
    t, tt = tri(cf, cft)
    if delete_acc is not None: delete_acc |= c["delete"]
    return Part(os.path.basename(clo_path), P, cvt, t, tt, Wc, mat)

def body_part(V, delete, mat_fn):
    faces = [BF[i] for i in BODY_FACES]
    ftex = [BFT[i] for i in BODY_FACES]
    keep = [k for k, f in enumerate(faces) if not any(v in delete for v in f)]
    t, tt = tri([faces[k] for k in keep], [ftex[k] for k in keep])
    return Part("body", V, BVT, t, tt, W, mat_fn)

# ---------------------------------------------------------------- export
BUILT = {}
def to_game(P):
    return np.stack([-P[:, 0], P[:, 1], -P[:, 2]], 1) * 0.1

def vertex_normals(P, t):
    n = np.zeros_like(P)
    fn = np.cross(P[t[:, 1]] - P[t[:, 0]], P[t[:, 2]] - P[t[:, 0]])
    for k in range(3): np.add.at(n, t[:, k], fn)
    l = np.linalg.norm(n, axis=1, keepdims=True); l[l == 0] = 1
    return n / l

def top4(Wv):
    idx = np.argsort(-Wv, axis=1)[:, :4]
    w = np.take_along_axis(Wv, idx, 1)
    s = w.sum(1, keepdims=True); s[s == 0] = 1
    w = w / s
    q = np.round(w * 255).astype(int)
    q[:, 0] += 255 - q.sum(1)
    return idx.astype(np.uint8), np.clip(q, 0, 255).astype(np.uint8)

def build(name, spec, parts_fn, materials, region_split=True):
    V = shaped(spec["shape"])
    delete = set()
    parts = parts_fn(V, delete)
    parts.insert(0, body_part(V, delete, spec.get("body_mat", "skin")))
    # Ground on the lowest sole, scale to the requested height (with footwear).
    allP = np.concatenate([to_game(p.V[np.unique(p.tris)]) for p in parts])
    ground, top = allP[:, 1].min(), allP[:, 1].max()
    scale = spec.get("height_m", 1.8) / (top - ground)
    def G(P):
        g = to_game(P); g[:, 1] -= ground; return g * scale

    pos, nor, uv, si, sw, idx_groups = [], [], [], [], [], {}
    base = 0
    info_parts = []
    for p in parts:
        Pg = G(p.V)
        N = vertex_normals(Pg, p.tris)
        info_parts.append({"name": p.name, "mat": p.mat if isinstance(p.mat, str) else "body", "P": Pg, "N": N, "VT": p.VT, "tris": p.tris, "ttris": p.ttris, "W": p.W})
        # unique (vertex, uv) corners
        corners = np.stack([p.tris.reshape(-1), p.ttris.reshape(-1)], 1)
        uniq, inv = np.unique(corners, axis=0, return_inverse=True)
        inv = inv.reshape(-1, 3)
        vi, ti = uniq[:, 0], uniq[:, 1]
        pos.append(Pg[vi]); nor.append(N[vi])
        uv.append(p.VT[ti] if len(p.VT) else np.zeros((len(vi), 2)))
        i4, w4 = top4(p.W[vi]); si.append(i4); sw.append(w4)
        # material per face
        mats = p.mat if callable(p.mat) else (lambda tris, Wv, m=p.mat: [m] * len(tris))
        fm = mats(p.tris, p.W)
        dom = np.argmax(p.W[p.tris].sum(1), axis=1)
        for k in range(len(inv)):
            reg = "upper" if region_split and BONES[dom[k]] in UPPER else "lower"
            idx_groups.setdefault((fm[k], reg), []).append(inv[k] + base)
        base += len(vi)
    pos = np.concatenate(pos).astype(np.float32)
    nor = np.concatenate(nor)
    uv = np.concatenate(uv).astype(np.float32)
    si = np.concatenate(si); sw = np.concatenate(sw)
    groups_out, index = [], []
    for m in materials:
        for reg in ("lower", "upper"):
            tris = idx_groups.get((m, reg))
            if not tris: continue
            groups_out.append({"material": m, "region": reg, "start": len(index) * 3, "count": len(tris) * 3})
            index.extend(tris)
    missing = {k for k in idx_groups if k[0] not in materials}
    assert not missing, missing
    index = np.array(index, np.int64).reshape(-1)
    itype = np.uint16 if len(pos) < 65536 else np.uint32

    # Skeleton (bind pose) and landmarks in game space.
    bones = []
    for b in BONES:
        h = G(joint(V, RIG[b]["head"]["cube_name"])[None])[0]
        tail = RIG[b]["tail"]
        tp = joint(V, tail["cube_name"]) if tail["strategy"] == "CUBE" else V[tail["vertex_indices"]].mean(0)
        t = G(tp[None])[0]
        bones.append({"name": b, "parent": BI[RIG[b]["parent"]] if RIG[b]["parent"] else -1, "head": h.round(5).tolist(), "tail": t.round(5).tolist()})
    Bg = G(V[:13380])
    def slab_center(y, h=0.03, sel=None):
        m = np.abs(Bg[:, 1] - y) < h
        if sel is not None: m &= sel
        q = Bg[m]
        return [0.0, float(y), float((q[:, 2].min() + q[:, 2].max()) / 2)]
    hb = {x["name"]: x for x in bones}
    lm_parts = np.concatenate([ip["P"] for ip in info_parts if ip["mat"] not in ("eyes", "brows", "hair")])
    def slab_box(Pall, y, h=0.03):
        q = Pall[(np.abs(Pall[:, 1] - y) < h) & (np.abs(Pall[:, 0]) < 0.3)]
        xs = np.sort(np.abs(q[:, 0]))
        gaps = np.where(np.diff(xs) > 0.012)[0]
        half = float(xs[gaps[0]]) if len(gaps) else float(xs.max())
        trunk = q[np.abs(q[:, 0]) < half]
        return [half, float(trunk[:, 2].min()), float(trunk[:, 2].max()), float(y)]
    headW = W[:13380, BI["head"]] > 0.6
    hv = Bg[headW]
    eye = G(((joint(V, "joint-l-eye") + joint(V, "joint-r-eye")) / 2)[None])[0]
    lm = {
        "chest": slab_center(hb["spine_03"]["head"][1] + 0.02, sel=np.abs(Bg[:, 0]) < 0.12),
        "pelvis": slab_center(hb["thigh_l"]["head"][1] + 0.03, sel=np.abs(Bg[:, 0]) < 0.12),
        "skull": [0.0, float((hv[:, 1].max() + eye[1]) / 2), float((hv[:, 2].min() + hv[:, 2].max()) / 2)],
        "eye": eye.round(4).tolist(),
        "top": float(hv[:, 1].max()),
        "chestBox": slab_box(lm_parts, hb["spine_03"]["head"][1] + 0.04),
        "waistBox": slab_box(lm_parts, hb["thigh_l"]["head"][1] + 0.1),
        "headMin": hv.min(0).round(4).tolist(), "headMax": hv.max(0).round(4).tolist(),
    }

    # Binary: pos f32x3 | nrm i16x4 | uv f32x2 | skinIndex u8x4 | skinWeight u8x4 | index
    nq = np.zeros((len(nor), 4), np.int16); nq[:, :3] = np.clip(np.round(nor * 32767), -32767, 32767)
    blobs = [pos.tobytes(), nq.tobytes(), uv.tobytes(), si.tobytes(), sw.tobytes(), index.astype(itype).tobytes()]
    offs, cur = [], 0
    for bl in blobs:
        offs.append(cur); cur += len(bl); cur += (-cur) % 4
    with open(os.path.join(OUT, name + ".bin"), "wb") as f:
        for bl in blobs:
            f.write(bl); f.write(b"\0" * ((-len(bl)) % 4))
    print(f"{name}: verts {len(pos)} tris {len(index)//3} bytes {cur} scale {scale:.4f}")
    BUILT[name] = {"parts": info_parts, "landmarks": lm}
    return {
        "file": name + ".bin", "vertices": int(len(pos)), "indices": int(len(index)),
        "indexType": "u16" if itype == np.uint16 else "u32",
        "offsets": dict(zip(["position", "normal", "uv", "skinIndex", "skinWeight", "index"], offs)),
        "groups": groups_out, "bones": bones, "landmarks": lm,
    }

# ---------------------------------------------------------------- textures
def img(path, size=None, mode="RGB"):
    im = Image.open(path).convert(mode)
    return im.resize((size, size), Image.LANCZOS) if size and im.size[0] != size else im

def save_jpg(im, name, q=86):
    im.convert("RGB").save(os.path.join(OUT, name), quality=q, optimize=True, progressive=False)
    return name

def save_png(im, name):
    im.save(os.path.join(OUT, name), optimize=True)
    return name

def fbm(n, seed, octaves=5, base=4, tile=True):
    """Tileable fractal noise in [0,1] (FFT-filtered white noise)."""
    rng = np.random.default_rng(seed)
    out = np.zeros((n, n))
    amp, tot = 1.0, 0.0
    fy = np.fft.fftfreq(n)[:, None]; fx = np.fft.fftfreq(n)[None, :]
    r = np.sqrt(fx * fx + fy * fy) * n
    for o in range(octaves):
        f0 = base * (2 ** o)
        filt = np.exp(-((r - f0) ** 2) / (2 * (f0 * 0.6) ** 2))
        noise = np.fft.ifft2(np.fft.fft2(rng.standard_normal((n, n))) * filt).real
        noise /= noise.std() + 1e-9
        out += noise * amp; tot += amp; amp *= 0.55
    out /= tot
    return (out - out.min()) / (out.max() - out.min())

def detail_from(diffuse, sigma=6):
    """High-pass luminance of a texture, centred at 1.0."""
    g = np.asarray(diffuse.convert("L"), float) / 255
    blur = np.asarray(diffuse.convert("L").filter(ImageFilter.GaussianBlur(sigma)), float) / 255
    return np.clip(1 + (g - blur) * 1.6, 0.55, 1.45)

def camo(n, seed, palette, coverage=(0.42, 0.3, 0.14, 0.1)):
    """Woodland-style camouflage: layered blobs with exact coverage per colour."""
    rgb = np.ones((n, n, 3)) * np.array(palette[0]) / 255
    for k, col in enumerate(palette[1:]):
        f = fbm(n, seed + k * 17, octaves=4, base=3 + k)
        f2 = fbm(n, seed + k * 31 + 5, octaves=3, base=16)
        f = f + f2 * 0.22
        cov = coverage[k] if k < len(coverage) else 0.1
        m = f > np.quantile(f, 1 - cov)
        m = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.0)), float)[..., None] / 255
        rgb = rgb * (1 - m) + np.array(col) / 255 * m
    return rgb

def uniform_tex(src_dir, stem, size, palette, seed, ao=True, tint=(1, 1, 1), extra=None):
    d = img(os.path.join(src_dir, stem + "_diffuse.png"), size)
    det = detail_from(d)
    c = camo(size, seed, palette) * np.array(tint)
    if ao and os.path.exists(os.path.join(src_dir, stem + "_ao.png")):
        a = np.asarray(img(os.path.join(src_dir, stem + "_ao.png"), size, "L"), float) / 255
        c *= (0.35 + 0.65 * a)[..., None]
    c *= det[..., None]
    if extra is not None: c = extra(c)
    return Image.fromarray(np.clip(c * 255, 0, 255).astype(np.uint8))

def normal_map(src, size):
    return img(src, size)

# 3D-aware painting: rasterise triangles in UV space with a per-vertex value.
def paint_uv(size, uvs, tris, values, mask=None):
    acc = np.zeros((size, size)); cnt = np.zeros((size, size))
    U = uvs[:, 0] * (size - 1); Vv = (1 - uvs[:, 1]) * (size - 1)
    for t in tris:
        x, y, v = U[t], Vv[t], values[t]
        if mask is not None and not mask[t].any(): continue
        x0, x1 = int(max(0, math.floor(x.min()))), int(min(size - 1, math.ceil(x.max())))
        y0, y1 = int(max(0, math.floor(y.min()))), int(min(size - 1, math.ceil(y.max())))
        if x1 < x0 or y1 < y0 or (x1 - x0) * (y1 - y0) > 40000: continue
        X, Y = np.meshgrid(np.arange(x0, x1 + 1), np.arange(y0, y1 + 1))
        d = (y[1] - y[2]) * (x[0] - x[2]) + (x[2] - x[1]) * (y[0] - y[2])
        if abs(d) < 1e-9: continue
        l0 = ((y[1] - y[2]) * (X - x[2]) + (x[2] - x[1]) * (Y - y[2])) / d
        l1 = ((y[2] - y[0]) * (X - x[2]) + (x[0] - x[2]) * (Y - y[2])) / d
        l2 = 1 - l0 - l1
        inside = (l0 >= -0.02) & (l1 >= -0.02) & (l2 >= -0.02)
        val = l0 * v[0] + l1 * v[1] + l2 * v[2]
        acc[Y[inside], X[inside]] += val[inside]; cnt[Y[inside], X[inside]] += 1
    out = np.where(cnt > 0, acc / np.maximum(cnt, 1), 0)
    # bleed a few pixels past seams
    o = Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8))
    filled = cnt > 0
    for _ in range(3):
        g = np.asarray(o.filter(ImageFilter.MaxFilter(3)), float) / 255
        out = np.where(filled, out, g); filled = filled | (g > 0)
        o = Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8))
    return out

def paint_part(size, part, values):
    """values: per-vertex (part vertex index) floats -> UV-space image via per-corner UVs."""
    t, tt = part["tris"], part["ttris"]
    VT = part["VT"]
    # expand to corner-indexed arrays so seams use the right UVs
    cu = VT[tt.reshape(-1)]
    cv = values[t.reshape(-1)]
    ct = np.arange(len(cu)).reshape(-1, 3)
    return paint_uv(size, cu, ct, cv)

if __name__ == "__main__":
    import builder_specs  # noqa: F401  (variants live in tools/builder_specs.py)
