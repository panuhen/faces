"""Trace a character turnaround sheet into per-part silhouettes.

    python3 blender/trace_sketch.py sam      -> blender/traces/sam.json + review/trace_sam.png

For every body part ("volume") we flood-fill from a seed point inside a window,
in the FRONT view and in the SIDE view. Parts are separated by the sketch's
black outlines. For each image row we store the part's extent:
    front view -> x range (width), side view -> y range (depth).
build_character.py lofts each part from these rows, so the model matches the
sketch silhouette from the front and from the side.

Coordinates in the JSON are metres: x = character's left (+), y = back (+),
front = -y, z = up from the feet. One pixel = `scale` metres.
"""

import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Coordinates are full-sheet pixels (x, y). "win" = (x0, y0, x1, y1).
# Bilateral parts are traced on the viewer's LEFT side (the character's right,
# -x) and mirrored.
CONFIGS = {
    "sam": {
        "sheet": "concepts/sam_turnaround_4.png",
        "scale": 0.0034,
        "base_row": 832,
        "eye_row": 395,
        "front_cols": (22, 383),
        "side_cols": (793, 1133),
        "volumes": {
            "head":  {"front": {"seed": (200, 440), "win": (60, 220, 340, 508)},
                      "side":  {"seed": (870, 450), "win": (800, 150, 1140, 506)}, "sym": True,
                      "fit_below": (400, None), "fit_top": (238, None), "fit_p": 2.35,
                      "skull": {"top": 238, "inset": 18, "fit_cut": 360}},
            "ear":   {"front": {"seed": (50, 420), "win": (18, 370, 82, 472)},
                      "side":  {"seed": (985, 432), "win": (948, 370, 1012, 476)}, "mirror": True},
            "neck":  {"front": {"seed": (206, 518), "win": (170, 500, 240, 536)},
                      "side":  {"seed": (925, 512), "win": (895, 495, 965, 522)}, "sym": True},
            "shirt": {"front": {"seed": (200, 600), "win": (95, 515, 312, 696)},
                      "side":  {"seed": (900, 620), "win": (868, 505, 1012, 672)}, "sym": True},
            "arm":   {"front": {"seed": (112, 625), "win": (40, 578, 142, 692)},
                      "side":  {"seed": (935, 640), "win": (900, 585, 995, 722)}, "mirror": True},
            "shorts": {"front": {"seeds": [(165, 685), (240, 685)], "win": (112, 668, 298, 702)},
                       "side":  {"seed": (950, 685), "win": (875, 660, 1012, 702)}, "sym": True},
            "shorts_leg": {"front": {"seed": (160, 711), "win": (112, 696, 201, 726)},
                           "side":  {"seed": (950, 711), "win": (875, 696, 1012, 728)}, "mirror": True},
            "leg":   {"front": {"seed": (160, 768), "win": (128, 744, 194, 797)},
                      "side":  {"seed": (950, 752), "win": (912, 730, 990, 792)}, "mirror": True},
            "shoe":  {"front": {"seed": (150, 815), "win": (95, 772, 198, 836)},
                      "side":  {"seed": (900, 812), "win": (855, 765, 1002, 836)}, "mirror": True},
            # Hair: the dark region; in the side view only what lies behind the face
            "hair":  {"front": {"dark": True, "win": (15, 140, 392, 480)},
                      "side":  {"dark": True, "win": (795, 140, 1140, 500), "behind": "head",
                                "behind_from_row": 300}, "sym": True},
        },
        "palette": {"skin": (240, 470), "ear_inner": (57, 436), "hair": (200, 200)},
        "decals": [{"name": "EarInner", "cls": "ear_inner", "win": (30, 395, 70, 455), "on": "ear", "min_px": 40}],
        # Face feature positions (front view px): used for the face layout
        "face": {"eye": (130, 390, 37), "brow_in": (160, 320), "brow_mid": (130, 312),
                 "brow_out": (100, 322), "brow_r": 10, "nose": (203, 428, 15, 10),
                 "mouth": (203, 465, 45, 8)},
    },
    "miso": {
        "sheet": "concepts/miso_turnaround_1.png",
        "scale": 0.00307,
        "base_row": 812,
        "eye_row": 380,
        "front_cols": (19, 385),
        "side_cols": (793, 1126),
        "volumes": {
            "head":  {"front": {"seed": (200, 350), "win": (20, 146, 386, 522)},
                      "side":  {"seed": (1000, 450), "win": (795, 146, 1124, 520)}, "sym": True,
                      "fit_below": (335, 335), "fit_top": (None, 232)},
            "ear":   {"front": {"seed": (75, 280), "win": (30, 150, 200, 335)},
                      "side":  {"seed": (965, 230), "win": (915, 146, 1010, 335)}, "mirror": True,
                      "minus": "head"},
            "torso": {"front": {"seed": (200, 600), "win": (105, 512, 295, 735),
                                "exclude": {"seeds": [(110, 600), (290, 600)], "win": (30, 578, 370, 700)}},
                      "side":  {"seed": (885, 600), "win": (860, 512, 1012, 735),
                                "exclude": {"seeds": [(950, 620)], "win": (900, 590, 1000, 705)}}, "sym": True},
            "arm":   {"front": {"seed": (110, 600), "win": (38, 578, 150, 692)},
                      "side":  {"seed": (950, 620), "win": (900, 590, 1000, 705)}, "mirror": True},
            "leg":   {"front": {"seed": (155, 760), "win": (105, 700, 200, 816)},
                      "side":  {"seed": (950, 750), "win": (888, 700, 1018, 816)}, "mirror": True},
            "tail":  {"front": {"seed": (362, 620), "win": (300, 515, 386, 728)},
                      "side":  {"seed": (1080, 640), "win": (1015, 530, 1124, 720)}, "side_sign": 1},
        },
        "palette": {"fur": (300, 200), "stripe": (200, 250), "cream": (200, 620), "pink": (55, 220)},
        "bands": {"arm": ["fur", "cream"], "leg": ["fur", "cream"], "tail": ["fur", "cream"]},
        "decals": [
            {"name": "Muzzle", "cls": "cream", "win": (40, 395, 360, 520), "on": "head", "min_px": 400},
            {"name": "Belly", "cls": "cream", "win": (140, 520, 262, 720), "on": "torso", "min_px": 400},
            {"name": "EarInner", "cls": "pink", "win": (35, 165, 130, 320), "on": "ear", "min_px": 60},
            {"name": "Stripe", "cls": "stripe", "win": (25, 150, 380, 400), "on": "head", "min_px": 60, "max_px": 6000},
        ],
        "face": {"eye": (117, 380, 45), "brow_in": (152, 305), "brow_mid": (115, 290),
                 "brow_out": (82, 305), "brow_r": 12, "nose": (200, 420, 18, 10),
                 "mouth": (200, 447, 58, 8)},
    },
}


def load(path):
    a = np.asarray(Image.open(os.path.join(ROOT, path)).convert("RGB")).astype(np.int16)
    bg = np.median(a[5:40, 5:40].reshape(-1, 3), axis=0)
    nonbg = np.abs(a - bg).sum(2) > 45
    # "lum" here = brightest channel: outlines are dark in every channel, while
    # tabby stripes and shadows stay bright in red.
    lum = a.max(2)
    return a, nonbg, lum


def flood(mask, seed):
    """Connected component of mask containing seed (4-connectivity)."""
    sx, sy = seed
    if not mask[sy, sx]:
        ys, xs = np.nonzero(mask)
        if len(xs) == 0:
            raise RuntimeError(f"empty mask at seed {seed}")
        k = np.argmin((xs - sx) ** 2 + (ys - sy) ** 2)
        sx, sy = xs[k], ys[k]
    comp = np.zeros_like(mask)
    comp[sy, sx] = True
    while True:
        grow = comp.copy()
        grow[1:, :] |= comp[:-1, :]
        grow[:-1, :] |= comp[1:, :]
        grow[:, 1:] |= comp[:, :-1]
        grow[:, :-1] |= comp[:, 1:]
        grow &= mask
        if (grow == comp).all():
            return comp
        comp = grow


def dilate(m, n):
    for _ in range(n):
        g = m.copy()
        g[1:, :] |= m[:-1, :]
        g[:-1, :] |= m[1:, :]
        g[:, 1:] |= m[:, :-1]
        g[:, :-1] |= m[:, 1:]
        m = g
    return m


def part_mask(nonbg, lum, spec, other=None):
    x0, y0, x1, y1 = spec["win"]
    win = np.zeros_like(nonbg)
    win[y0:y1, x0:x1] = True
    if spec.get("dark"):
        m = nonbg & (lum < 120) & win
        if other is not None:
            # keep dark pixels behind the face (side view): right of the face part in each row
            for r in range(max(y0, spec.get("behind_from_row", 0)), y1):
                xs = np.nonzero(other[r])[0]
                if len(xs):
                    m[r, : xs.max() - 4] = False
        return m
    light = nonbg & (lum >= 120) & win
    seeds = spec.get("seeds") or [spec["seed"]]
    comp = np.zeros_like(light)
    for sd in seeds:
        comp |= flood(light, sd)
    ex = spec.get("exclude")
    if ex:
        ex0, ey0, ex1, ey1 = ex["win"]
        exwin = np.zeros_like(light)
        exwin[ey0:ey1, ex0:ex1] = True
        for sd in ex["seeds"]:
            comp &= ~dilate(flood(light & exwin, sd), 3)
    # grow back over the outline (dark pixels) the fill stopped at
    return dilate(comp, 3) & nonbg & win


def fit_rows(rows, cut, mask, top=None, p=2.0):
    """Rows at or below `cut` are kept as traced. Above it, where other parts
    (ears) join the outline, use an ellipse through the widest row and the
    part's real top at its centre column."""
    ref = {r: v for r, v in rows.items() if r >= cut}
    rc, (a0, b0) = max(ref.items(), key=lambda kv: kv[1][1] - kv[1][0])
    wmax = (b0 - a0) / 2
    c = (a0 + b0) / 2
    if top is None:
        top = int(np.nonzero(mask[:, int(round(c))])[0].min())
    out = dict(ref)
    for r in range(top, cut):
        t = (rc - r) / max(rc - top, 1)
        if t >= 1:
            continue
        w = wmax * max(0.0, 1 - t ** p) ** (1 / p) if r < rc else wmax
        out[r] = (int(round(c - w)), int(round(c + w)))
    return out


def ellipse_mask(shape, rows):
    m = np.zeros(shape, bool)
    for r, (a, b) in rows.items():
        m[r, a:b + 1] = True
    return m


def rows_of(m):
    out = {}
    for r in np.nonzero(m.any(1))[0]:
        xs = np.nonzero(m[r])[0]
        out[int(r)] = (int(xs.min()), int(xs.max()))
    return out


def main():
    name = sys.argv[1]
    cfg = CONFIGS[name]
    img, nonbg, lum = load(cfg["sheet"])
    s, base = cfg["scale"], cfg["base_row"]

    # Origins: front = centre of the head part at its widest row;
    # side = middle of the whole silhouette at eye height.
    masks = {}
    for vname, v in cfg["volumes"].items():
        if v["front"].get("dark"):
            continue
        masks[vname] = (part_mask(nonbg, lum, v["front"]), part_mask(nonbg, lum, v["side"]))
    head_f = rows_of(masks["head"][0])
    widest = max(head_f.items(), key=lambda kv: kv[1][1] - kv[1][0])
    cx0 = (widest[1][0] + widest[1][1]) / 2
    sc0, sc1 = cfg["side_cols"]
    xs = np.nonzero(nonbg[cfg["eye_row"], sc0:sc1])[0] + sc0
    cy0 = (xs.min() + xs.max()) / 2

    out = {"scale": s, "volumes": {}, "origin_px": {"front_x": cx0, "side_x": cy0, "base_row": base}}
    base_img = Image.open(os.path.join(ROOT, cfg["sheet"])).convert("RGB")
    tint = np.asarray(base_img).astype(float)
    palette = [(230, 30, 30), (30, 160, 30), (30, 60, 230), (200, 0, 200), (0, 170, 190), (240, 140, 0),
               (120, 60, 0), (60, 60, 60), (255, 0, 120)]
    fitted = {}
    for i, (vname, v) in enumerate(cfg["volumes"].items()):
        if vname in masks:
            fm, sm = masks[vname]
        else:
            fm = part_mask(nonbg, lum, v["front"])
            other = masks.get(v["side"].get("behind"), (None, None))[1]
            sm = part_mask(nonbg, lum, v["side"], other)
        fr, sr = rows_of(fm), rows_of(sm)
        if "fit_below" in v:                     # (front_row, side_row); None = keep as traced
            tops = v.get("fit_top", (None, None))
            if v["fit_below"][0] is not None:
                fr = fit_rows(fr, v["fit_below"][0], fm, tops[0], v.get("fit_p", 2.0))
            if v["fit_below"][1] is not None:
                sr = fit_rows(sr, v["fit_below"][1], sm, tops[1])
            fitted[vname] = (ellipse_mask(fm.shape, fr), ellipse_mask(sm.shape, sr))
        if "skull" in v:
            # Side view of a head under hair: face profile in front where skin
            # shows, otherwise the hair outline pulled in by the hair thickness.
            sk = v["skull"]
            x0, y0, x1, y1 = v["side"]["win"]
            chin = max(sr)
            sr2 = {}
            for r in range(sk["top"], chin + 1):
                xs = np.nonzero(nonbg[r, x0:x1])[0]
                if len(xs) == 0:
                    continue
                front = sr[r][0] if r in sr else xs.min() + x0 + sk["inset"]
                back = xs.max() + x0 - sk["inset"]
                if r in sr and r > sk.get("face_from", 10 ** 6):
                    back = max(sr[r][1], back)
                if back > front:
                    sr2[r] = (int(front), int(back))
            sr = sr2
            if "fit_cut" in sk:
                # round the hidden top of the skull the same way as the front view
                ref = {r: v for r, v in sr.items() if r >= sk["fit_cut"]}
                rc, (a0, b0) = max(ref.items(), key=lambda kv: kv[1][1] - kv[1][0])
                c, wmax = (a0 + b0) / 2, (b0 - a0) / 2
                pp = v.get("fit_p", 2.0)
                for r in range(sk["top"], sk["fit_cut"]):
                    t = (rc - r) / max(rc - sk["top"], 1)
                    if 0 <= t < 1:
                        w = wmax * (1 - t ** pp) ** (1 / pp)
                        sr[r] = (int(round(c - w)), int(round(c + w)))
        if "minus" in v:
            ef, es = fitted[v["minus"]]
            fr, sr = rows_of(fm & ~dilate(ef, 2)), rows_of(sm & ~dilate(es, 2))
        col = np.array(palette[i % len(palette)], float)
        for rows in (fr, sr):
            for r, (a, b) in rows.items():
                tint[r, a:b + 1] = tint[r, a:b + 1] * 0.55 + col * 0.45
        rows = []
        for r in sorted(set(fr) | set(sr)):
            nf = min(fr, key=lambda k: abs(k - r))
            ns = min(sr, key=lambda k: abs(k - r))
            if abs(nf - r) > 6 or abs(ns - r) > 6:
                continue
            f, d = fr[nf], sr[ns]
            x0, x1 = (f[0] - cx0) * s, (f[1] - cx0) * s
            y0, y1 = (d[0] - cy0) * s, (d[1] - cy0) * s
            rows.append([round((base - r) * s, 4), round(x0, 4), round(x1, 4), round(y0, 4), round(y1, 4)])
        out["volumes"][vname] = {"rows": rows, "sym": bool(v.get("sym")), "mirror": bool(v.get("mirror"))}
        print(f"{vname:7s} rows={len(rows):4d} z {rows[-1][0]:.2f}..{rows[0][0]:.2f}")
    overlay = Image.fromarray(tint.astype(np.uint8))
    draw = ImageDraw.Draw(overlay)
    for v in cfg["volumes"].values():
        for view in ("front", "side"):
            for sd in v[view].get("seeds") or ([v[view]["seed"]] if "seed" in v[view] else []):
                draw.ellipse([sd[0] - 4, sd[1] - 4, sd[0] + 4, sd[1] + 4], outline=(255, 255, 255), width=2)

    # Colour classes sampled from the sheet itself
    pal = {k: img[y - 2:y + 3, x - 2:x + 3].reshape(-1, 3).mean(0) for k, (x, y) in cfg.get("palette", {}).items()}
    if pal:
        names = list(pal)
        dist = np.stack([np.sqrt(((img - pal[k]) ** 2).sum(2)) for k in names])
        cls = np.argmin(dist, 0)
        ok = (dist.min(0) < 38) & nonbg
    # Per-row colour bands (paws, feet, tail tip): colour at each row's centre in the front view
    for vname, band in cfg.get("bands", {}).items():
        v = cfg["volumes"][vname]
        fm = part_mask(nonbg, lum, v["front"])
        fr = rows_of(fm)
        out_rows = out["volumes"][vname]["rows"]
        for row in out_rows:
            r = int(round(base - row[0] / s))
            if r not in fr:
                row.append(band[0])
                continue
            a, b = fr[r]
            seg = cls[r, a:b + 1][ok[r, a:b + 1]]
            votes = [int((seg == names.index(k)).sum()) for k in band]
            row.append(band[int(np.argmax(votes))] if seg.size else band[0])
    # Decals: connected colour regions in the front view, stored as rows (z, x0, x1)
    out["decals"] = []
    for d in cfg.get("decals", []):
        x0, y0, x1, y1 = d["win"]
        m = np.zeros_like(nonbg)
        m[y0:y1, x0:x1] = ok[y0:y1, x0:x1] & (cls[y0:y1, x0:x1] == names.index(d["cls"]))
        seen = np.zeros_like(m)
        ys, xs = np.nonzero(m)
        for yy, xx in zip(ys, xs):
            if seen[yy, xx]:
                continue
            comp = flood(m, (xx, yy))
            seen |= comp
            n = int(comp.sum())
            if n < d.get("min_px", 40) or n > d.get("max_px", 10 ** 9):
                continue
            rr = rows_of(comp)
            out["decals"].append({"name": d["name"], "cls": d["cls"], "on": d["on"],
                                  "rows": [[round((base - r) * s, 4), round((a - cx0) * s, 4), round((b - cx0) * s, 4)]
                                           for r, (a, b) in sorted(rr.items())]})
            for r, (a, b) in rr.items():
                tint[r, a:b + 1] = tint[r, a:b + 1] * 0.4 + np.array((255, 255, 0)) * 0.6
    print("decals", [(d["name"], len(d["rows"])) for d in out["decals"]])
    overlay = Image.fromarray(tint.astype(np.uint8))

    f = cfg["face"]
    px = lambda x: round((x - cx0) * s, 4)       # noqa: E731
    pz = lambda y: round((base - y) * s, 4)      # noqa: E731
    out["face"] = {
        "eye_x": abs(px(f["eye"][0])), "eye_z": pz(f["eye"][1]), "eye_r": round(f["eye"][2] * s, 4),
        "brow_in": (abs(px(f["brow_in"][0])), pz(f["brow_in"][1])),
        "brow_mid": (abs(px(f["brow_mid"][0])), pz(f["brow_mid"][1])),
        "brow_out": (abs(px(f["brow_out"][0])), pz(f["brow_out"][1])),
        "brow_r": round(f["brow_r"] * s, 4),
        "nose_z": pz(f["nose"][1]), "nose_size": (round(f["nose"][2] * s, 4), round(f["nose"][3] * s, 4)),
        "mouth_z": pz(f["mouth"][1]), "mouth_half_w": round(f["mouth"][2] * s, 4),
        "mouth_curve": round(f["mouth"][3] * s, 4),
    }
    os.makedirs(os.path.join(ROOT, "blender", "traces"), exist_ok=True)
    with open(os.path.join(ROOT, "blender", "traces", f"{name}.json"), "w") as fh:
        json.dump(out, fh, indent=1)
    overlay.crop((0, 120, 1150, 850)).save(os.path.join(ROOT, "review", f"trace_{name}.png"))
    print("face", out["face"])


main()
