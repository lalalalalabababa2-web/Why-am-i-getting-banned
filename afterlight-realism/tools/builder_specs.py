#!/usr/bin/env python3
"""Body variants for Afterlight v12.2 (run: python3 tools/builder_specs.py [names...])."""
import json, os, sys
import numpy as np
from PIL import Image, ImageFilter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mhbuild as mb

A = mb.A
C = lambda *p: os.path.join(A, "clothes", *p)
ONLY = set(sys.argv[1:])
TEX = 1024

def hand_glove(tris, Wv):
    dom = np.argmax(Wv[tris].sum(1), axis=1)
    return ["glove" if mb.BONES[d] in mb.HAND else "skin" for d in dom]

def soldier_parts(V, delete):
    return [
        mb.fit(C("male_casualsuit05", "male_casualsuit05.mhclo"), V, "suit", delete),
        mb.fit(C("shoes03", "shoes03.mhclo"), V, "boots", delete),
        mb.fit(os.path.join(A, "eyes", "low-poly", "low-poly.mhclo"), V, "eyes"),
        mb.fit(os.path.join(A, "eyebrows", "eyebrow001", "eyebrow001.mhclo"), V, "brows"),
    ]

SOLDIERS = [
    ("s0", {"race": {"caucasian": 1.0}, "muscle": 0.78, "weight": 0.55, "height": 0.6, "prop": 0.8}, "young_caucasian_male/young_lightskinned_male_diffuse.png",
     [(122, 112, 86), (86, 84, 58), (104, 82, 56), (58, 54, 40), (150, 140, 112)], (1, 1, 1)),
    ("s1", {"race": {"african": 1.0}, "muscle": 0.82, "weight": 0.5, "height": 0.62, "prop": 0.8}, "young_african_male/young_darkskinned_male_diffuse.png",
     [(112, 108, 84), (78, 82, 56), (98, 80, 58), (56, 52, 40), (140, 134, 108)], (0.97, 1.0, 0.97)),
    ("s2", {"race": {"asian": 0.75, "caucasian": 0.25}, "muscle": 0.72, "weight": 0.52, "height": 0.52, "prop": 0.75}, "young_asian_male/young_lightskinned_male_diffuse3.png",
     [(118, 114, 92), (90, 90, 66), (108, 88, 62), (60, 58, 44), (146, 142, 116)], (1.0, 0.98, 0.95)),
]

manifest_path = os.path.join(mb.OUT, "bodies.json")
manifest = json.load(open(manifest_path)) if os.path.exists(manifest_path) else {"bones": None, "variants": {}}
manifest["bones"] = mb.BONES
manifest["license"] = "Bodies built from MakeHuman / MPFB2 assets, CC0 1.0 (makehumancommunity.org)."

def glove_tex(skin_path, name):
    d = mb.img(skin_path, TEX)
    det = mb.detail_from(d, 3)
    n = mb.fbm(TEX, 77, octaves=4, base=40)
    base = np.array([0.16, 0.155, 0.14]) * (0.85 + 0.3 * n[..., None])
    c = base * det[..., None] ** 1.4
    return mb.save_jpg(Image.fromarray(np.clip(c * 255, 0, 255).astype(np.uint8)), name)

def eye_tex():
    return mb.save_jpg(mb.img(os.path.join(A, "eyes", "materials", "brown_eye.png"), 256), "eye_brown.jpg")

def brow_tex():
    im = Image.open(os.path.join(A, "eyebrows", "eyebrow001", "eyebrow001.png")).convert("RGBA").resize((256, 256), Image.LANCZOS)
    return mb.save_png(im, "brow.png")

def boots_tex():
    return mb.save_jpg(mb.img(C("shoes03", "shoes03_diffuse.png"), 512), "boots_black.jpg")

for name, shape, skin, pal, tint in SOLDIERS:
    if ONLY and name not in ONLY: continue
    spec = {"shape": shape, "height_m": 1.8, "body_mat": hand_glove}
    v = mb.build(name, spec, soldier_parts, ["skin", "glove", "suit", "boots", "eyes", "brows"])
    skin_path = os.path.join(A, "skins", skin)
    v["textures"] = {
        "skin": mb.save_jpg(mb.img(skin_path, TEX), f"skin_{name}.jpg"),
        "glove": glove_tex(skin_path, f"glove_{name}.jpg"),
        "suit": mb.save_jpg(mb.uniform_tex(C("male_casualsuit05"), "male_casualsuit05", TEX, pal, 11 + len(name) + ord(name[1]), tint=tint), f"suit_{name}.jpg"),
        "suitNormal": mb.save_jpg(mb.img(C("male_casualsuit05", "male_casualsuit05_normal.png"), TEX), "suit05_n.jpg", 90),
        "boots": boots_tex(), "eyes": eye_tex(), "brows": brow_tex(),
    }
    v["kind"] = "soldier"
    manifest["variants"][name] = v


# ------------------------------------------------------------------ zombies
def zombie_parts(suit, shoes, hair):
    def fn(V, delete):
        ps = [mb.fit(C(suit, suit + ".mhclo"), V, "suit", delete),
              mb.fit(C(shoes, shoes + ".mhclo"), V, "boots", delete),
              mb.fit(os.path.join(A, "eyes", "low-poly", "low-poly.mhclo"), V, "eyes")]
        if hair:
            ps.append(mb.fit(os.path.join(A, "hair", hair, hair + ".mhclo"), V, "hair"))
        return ps
    return fn

ZOMBIES = [
    ("z0", {"race": {"caucasian": 1.0}, "age": 0.56, "muscle": 0.5, "weight": 0.58}, "middleage_caucasian_male/middleage_lightskinned_male_diffuse.png", "male_casualsuit02", "shoes02", "short03"),
    ("z1", {"race": {"african": 1.0}, "age": 0.62, "muscle": 0.45, "weight": 0.88}, "middleage_african_male/middleage_darkskinned_male_diffuse.png", "male_worksuit01", "shoes04", None),
    ("z2", {"race": {"asian": 0.7, "caucasian": 0.3}, "age": 0.5, "muscle": 0.3, "weight": 0.18}, "young_asian_male/young_lightskinned_male_diffuse3.png", "male_casualsuit06", "shoes05", "short01"),
    ("z3", {"race": {"caucasian": 1.0}, "age": 0.86, "muscle": 0.32, "weight": 0.45}, "old_caucasian_male/old_lightskinned_male_diffuse.png", "male_elegantsuit01", "shoes01", None),
    ("z4", {"race": {"african": 0.5, "caucasian": 0.5}, "age": 0.5, "muscle": 0.68, "weight": 0.5}, "young_african_male/young_darkskinned_male_diffuse.png", "male_casualsuit03", "shoes06", "short03"),
    ("z5", {"race": {"caucasian": 1.0}, "age": 0.7, "muscle": 0.45, "weight": 0.62}, "young_caucasian_male2/young_lightskinned_male_diffuse2.png", "male_casualsuit04", "shoes02", "short01"),
]

def nrm01(x):
    x = np.asarray(x, float); return (x - x.min()) / (x.max() - x.min() + 1e-9)

def decay_skin(skin_path, body, lm, seed):
    n = TEX
    c = np.asarray(mb.img(skin_path, n), float) / 255
    lum = (c * [0.2126, 0.7152, 0.0722]).sum(2, keepdims=True)
    dead = lum * np.array([0.74, 0.80, 0.66]) + 0.06
    c = (c * 0.12 + dead * 0.88) * 0.93
    mot = mb.fbm(n, seed, octaves=5, base=5)
    c *= (0.82 + 0.3 * mot)[..., None]
    yel = mb.fbm(n, seed + 3, octaves=4, base=8)
    c = c * (1 - 0.18 * yel[..., None]) + np.array([0.48, 0.45, 0.25]) * 0.18 * yel[..., None]
    liv = mb.fbm(n, seed + 9, octaves=4, base=4)
    m = np.clip((liv - 0.62) * 4, 0, 1)[..., None]
    c = c * (1 - m * 0.45) + np.array([0.30, 0.20, 0.30]) * m * 0.45
    veins = mb.fbm(n, seed + 21, octaves=6, base=10)
    vm = np.clip(1 - np.abs(veins - 0.5) * 40, 0, 1) * np.clip((mb.fbm(n, seed + 22, 3, 3) - 0.4) * 3, 0, 1)
    c = c * (1 - vm[..., None] * 0.35) + np.array([0.22, 0.20, 0.32]) * vm[..., None] * 0.35
    P = body["P"]
    eye = np.array(lm["eye"]); mouth = eye + np.array([0, -0.085, -0.005])
    d_eye = np.minimum(np.linalg.norm(P - (eye + [0.032, 0, 0]), axis=1), np.linalg.norm(P - (eye - [0.032, 0, 0]), axis=1))
    sunk = np.clip(1 - d_eye / 0.042, 0, 1) ** 1.2
    rng = np.random.default_rng(seed)
    dm = np.linalg.norm((P - mouth) * [1, 0.6, 1], axis=1)
    below = np.clip((mouth[1] - P[:, 1]) / 0.25, 0, 1)
    front = np.clip(-(P[:, 2] - mouth[2]) / 0.08 + 0.6, 0, 1)
    drip_x = np.sin(P[:, 0] * 160 + seed) * 0.5 + 0.5
    # dried blood at the lips and chin, a few thin runs down the throat
    blood = np.clip(1 - dm / 0.042, 0, 1) * 0.95 + np.clip(1 - dm / 0.17, 0, 1) * below * front * (drip_x > 0.62) * 0.65
    # bites on forearms, neck or shoulders
    ws = [mb.BI[b] for b in ("lowerarm_l", "lowerarm_r", "neck_01", "upperarm_l")]
    for k in range(3):
        b = ws[rng.integers(len(ws))]
        cand = np.where(body["W"][:, b] > 0.8)[0]
        if not len(cand): continue
        ctr = P[cand[rng.integers(len(cand))]]
        db = np.linalg.norm(P - ctr, axis=1)
        blood += np.clip(1 - db / 0.045, 0, 1) * 1.4
        sunk += np.clip(1 - db / 0.018, 0, 1) * 0.8
    dirt = np.clip((0.95 - P[:, 1]) / 0.9, 0, 1) * 0.6 + np.isin(np.argmax(body["W"], 1), [mb.BI[b] for b in mb.HAND]) * 0.7
    B = mb.paint_part(n, body, np.clip(blood, 0, 1))
    K = mb.paint_part(n, body, np.clip(sunk, 0, 1))
    D = mb.paint_part(n, body, np.clip(dirt, 0, 1))
    spl = mb.fbm(n, seed + 40, octaves=5, base=14)
    B = np.clip(B * (0.6 + 0.8 * spl), 0, 1)[..., None]
    c = c * (1 - K[..., None] * 0.75) + np.array([0.16, 0.07, 0.09]) * K[..., None] * 0.45
    # old blood oxidises to a dark brown-red; only the freshest is still red
    bloodcol = np.array([0.21, 0.045, 0.035]) * (0.7 + 0.5 * spl[..., None])
    c = c * (1 - B * 0.78) + bloodcol * B * 0.78
    dn = mb.fbm(n, seed + 50, octaves=5, base=18)[..., None]
    Dm = (D[..., None] * (0.4 + 0.6 * dn))
    c = c * (1 - Dm * 0.5) + np.array([0.20, 0.16, 0.11]) * Dm * 0.5
    return Image.fromarray(np.clip(c * 255, 0, 255).astype(np.uint8))

def ruin_clothes(src_dir, stem, suit, skin_rgb, seed):
    n = TEX
    c = np.asarray(mb.img(os.path.join(src_dir, stem + "_diffuse.png"), n), float) / 255
    ao_p = os.path.join(src_dir, stem + "_ao.png")
    if os.path.exists(ao_p):
        c *= (0.4 + 0.6 * np.asarray(mb.img(ao_p, n, "L"), float) / 255)[..., None]
    lum = (c * [0.2126, 0.7152, 0.0722]).sum(2, keepdims=True)
    c = (c * 0.45 + lum * 0.55) * 0.82
    P, N = suit["P"], suit["N"]
    low = np.clip((0.6 - P[:, 1]) / 0.6, 0, 1)
    chest = np.clip(1 - np.linalg.norm((P - [0, 1.3, -0.12]) * [1, 0.7, 1.5], axis=1) / 0.3, 0, 1) * np.clip(-N[:, 2] * 1.5, 0, 1)
    rng = np.random.default_rng(seed)
    spots = np.zeros(len(P))
    for k in range(8):
        ctr = P[rng.integers(len(P))]
        spots += np.clip(1 - np.linalg.norm(P - ctr, axis=1) / (0.06 + rng.random() * 0.12), 0, 1)
    knees = np.clip(1 - np.abs(P[:, 1] - 0.5) / 0.08, 0, 1) * np.clip(-N[:, 2], 0, 1)
    Dm = mb.paint_part(n, suit, np.clip(low * 0.9 + 0.35, 0, 1))
    Bm = mb.paint_part(n, suit, np.clip(chest * 1.2 + spots, 0, 1))
    Tm = mb.paint_part(n, suit, np.clip(knees + spots * 0.6 + chest * 0.4, 0, 1))
    dn = mb.fbm(n, seed + 1, octaves=5, base=10)
    dirt = (Dm * (0.5 + dn))[..., None]
    c = c * (1 - dirt * 0.62) + np.array([0.22, 0.18, 0.12]) * dirt * 0.62
    bn = mb.fbm(n, seed + 2, octaves=5, base=12)
    bl = np.clip(Bm * (0.3 + 1.1 * bn) - 0.25, 0, 1)[..., None]
    bloodcol = np.array([0.24, 0.035, 0.03]) * (0.6 + 0.6 * bn[..., None])
    c = c * (1 - bl * 0.92) + bloodcol * bl * 0.92
    # rips: a few isolated, stretched tears with a shadowed inside
    tn = mb.fbm(n, seed + 3, octaves=6, base=14)
    tn = np.asarray(Image.fromarray((tn * 255).astype(np.uint8)).resize((n, n // 4), Image.BILINEAR).resize((n, n), Image.BILINEAR), float) / 255
    hole = np.clip((tn - np.quantile(tn, 0.965)) * 14, 0, 1) * np.clip(Tm * 2.2 - 0.3, 0, 1)
    ring = np.asarray(Image.fromarray((hole * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.GaussianBlur(1.5)), float) / 255
    c = c * (1 - ring[..., None] * 0.55) + np.array([0.12, 0.10, 0.08]) * ring[..., None] * 0.55
    inner = np.array(skin_rgb) * 0.5
    c = c * (1 - hole[..., None]) + inner * hole[..., None]
    return Image.fromarray(np.clip(c * 255, 0, 255).astype(np.uint8))

def milky_eye():
    c = np.asarray(mb.img(os.path.join(A, "eyes", "materials", "grey_eye.png"), 256), float) / 255
    lum = (c * [0.2126, 0.7152, 0.0722]).sum(2, keepdims=True)
    c = c * 0.25 + (lum * 0.5 + 0.45) * np.array([0.86, 0.88, 0.82]) * 0.75
    return mb.save_jpg(Image.fromarray(np.clip(c * 255, 0, 255).astype(np.uint8)), "eye_dead.jpg")

def hair_tex(h):
    src = os.path.join(A, "hair", h, h + "_diffuse.png")
    im = Image.open(src).convert("RGBA").resize((512, 512), Image.LANCZOS)
    a = np.asarray(im, float)
    a[..., :3] *= 0.55  # dirty, matted
    return mb.save_png(Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)), f"hair_{h}.png")

for i, (name, shape, skin, suit, shoes, hair) in enumerate(ZOMBIES):
    if ONLY and name not in ONLY: continue
    spec = {"shape": shape, "height_m": 1.78}
    mats = ["skin", "suit", "boots", "eyes"] + (["hair"] if hair else [])
    v = mb.build(name, spec, zombie_parts(suit, shoes, hair), mats)
    info = mb.BUILT[name]
    body = next(p for p in info["parts"] if p["name"] == "body")
    suitp = next(p for p in info["parts"] if p["mat"] == "suit")
    skin_path = os.path.join(A, "skins", skin)
    sk = decay_skin(skin_path, body, info["landmarks"], 100 + i * 7)
    skin_rgb = (np.asarray(sk.resize((8, 8)), float).reshape(-1, 3).mean(0) / 255 * 0.8).tolist()
    shoe_src = C(shoes, shoes + "_diffuse.png")
    sh = np.asarray(mb.img(shoe_src, 512), float) / 255
    sh = sh * 0.6 + np.array([0.2, 0.16, 0.11]) * 0.3
    v["textures"] = {
        "skin": mb.save_jpg(sk, f"skin_{name}.jpg"),
        "suit": mb.save_jpg(ruin_clothes(C(suit), suit, suitp, skin_rgb, 300 + i * 13), f"suit_{name}.jpg"),
        "boots": mb.save_jpg(Image.fromarray(np.clip(sh * 255, 0, 255).astype(np.uint8)), f"shoes_{name}.jpg"),
        "eyes": milky_eye(),
    }
    np_path = C(suit, suit + "_normal.png")
    if os.path.exists(np_path):
        v["textures"]["suitNormal"] = mb.save_jpg(mb.img(np_path, TEX), f"{suit}_n.jpg", 90)
    if hair: v["textures"]["hair"] = hair_tex(hair)
    v["kind"] = "zombie"
    manifest["variants"][name] = v

json.dump(manifest, open(manifest_path, "w"), separators=(",", ":"))
print("wrote", manifest_path)
