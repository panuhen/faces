"""Build a Face Feelings character on the shared rig and export it as GLB.

Run headless:
    blender -b --factory-startup --python blender/build_character.py -- pip

Shared rig:
  * Body bones use Mixamo names (without the "mixamorig:" prefix), so Mixamo
    clips can be retargeted later.
  * Face bones are children of Head and have the same names on every
    character, so one set of feature poses works for all of them.
  * Face parts are placed on the character's own face surface by raycasting,
    so the same face code works on a round head, an apple body or a cat head.
  * Each facial "feature" (browInnerUp, jawOpen, mouthSmile_L, ...) is exported
    as its own animation clip: frame 0 = rest, frame 1 = full pose, LINEAR keys.
    The game plays the clips additively and sets each clip's weight, from an
    emotion preset or live from the MediaPipe blendshape of the same name.
  * Accent bone: an extra expressive part (Pip's sprout, later Miso's ears),
    with clips accentDroop and accentPerk.
  * _L / _R are the CHARACTER's left/right (+X is the character's left;
    the character faces -Y).
"""

import bpy
import bmesh
import json
import math
import os
import sys
from types import SimpleNamespace
from mathutils import Vector, Quaternion, Matrix
from mathutils.bvhtree import BVHTree

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_GLB = os.path.join(ROOT, "web", "public", "characters")
OUT_BLEND = os.path.join(ROOT, "blender", "out")

# Mouth/brow deltas were tuned on this mouth width; horizontal moves scale with it.
REF_MOUTH_HALF_W = 0.095
# The mouth floats this far in front of the face, so an open mouth never sinks
# into a face that bulges forward below it (Pip's apple shape).
MOUTH_OFF = 0.022


# --------------------------------------------------------------------------
# Character definitions
# --------------------------------------------------------------------------

CHARACTERS = {
    # Pip: coral apple creature with a leaf sprout, two stubby legs, no arms.
    # Layout traced from concepts/pip_apple_turnaround_2.png (front view).
    "pip": {
        "colors": {
            "skin": "#fb8a8a",
            "skin_dark": "#ee7373",
            "brow": "#2d2422",
            "leaf": "#8fd05c",
            "stem": "#6cb544",
            "shine": "#ffd0d0",
            "nose": "#d8505a",
        },
        "layout": dict(
            eye_x=0.285, eye_z=0.60, eye_r=0.128, eye_sink=0.045,
            lid_up_rest=72.0, lid_low_rest=-80.0,
            brow_in=(0.195, 0.835), brow_mid=(0.285, 0.862), brow_out=(0.37, 0.832),
            brow_r=0.024, brow_off=0.028,
            mouth_z=0.445, mouth_half_w=0.16, mouth_curve=0.012,
            nose_z=0.53, nose_size=(0.062, 0.036, 0.044),
            sneer_z=0.59,
            # LeftArm head -> tail as (x, z); hands sit on the body sides
            arm=((0.40, 0.44), (0.50, 0.38)),
            head=((0, 0, 0.50), (0, 0, 1.15)),
            leg_x=0.27, hip_z=0.12,
            accent_bones=[("Accent", (0, 0.0, 1.10), (0, 0.0, 1.30))],
        ),
        # Sprout tips sideways (rotation about the front-back axis)
        "accent_poses": {
            "accentDroop": {"Accent": {"rot": ((0, 1, 0), 42)}},
            "accentPerk": {"Accent": {"rot": ((0, 1, 0), -14)}},
        },
        "builder": "build_pip",
    },
    # Miso and Sam are TRACED from their turnaround sheets: blender/trace_sketch.py
    # writes blender/traces/<name>.json (per-part silhouettes from the front and
    # side views, colour decals, face positions). build_traced() lofts the parts.
    "miso": {
        "traced": True,
        "colors": {
            "skin": "#f2a24c", "skin_dark": "#d9822b", "brow": "#4a2a1a", "nose": "#f0868a",
            "cream": "#fbe3bf", "pink": "#f6a9a3", "stripe": "#d9822b", "whisker": "#3a2a22",
        },
        # part -> (material, bone); bilateral parts are traced on the character's right
        "parts": {"head": ("skin", "Head"), "ear": ("skin", "Accent_{tag}"), "torso": ("skin", "Spine1"),
                  "arm": ("skin", "{side}Arm"), "leg": ("skin", "{side}UpLeg"), "tail": ("skin", "Hips")},
        "decal_mats": {"Muzzle": "cream", "Belly": "cream", "EarInner": "pink", "Stripe": "stripe"},
        "layout": dict(lid_up_rest=72.0, lid_low_rest=-80.0, brow_off=0.032, eye_sink=0.045, iris_k=1.15,
                       nose_size_y=0.034),
        "whiskers": True,
        "skip": ["tail"],
        # (top, bottom) extension along the part's own centre line, metres
        "extend": {"arm": (0.12, 0.0), "leg": (0.06, 0.0), "ear": (0.0, 0.2)},
        "min_z": {"ear": 1.86},
        "dome": {"head": (False, True), "torso": (False, True), "leg": (False, False)},
        # Tail centre line (x, y, z) measured from the front and side views
        "tail": [(0.12, 0.22, 0.36), (0.38, 0.3, 0.37), (0.48, 0.32, 0.52), (0.5, 0.3, 0.72),
                 (0.46, 0.27, 0.84), (0.38, 0.24, 0.86)],
        # Ears fold out sideways when sad or scared, prick up when surprised
        "accent_poses": {
            "accentDroop": {"Accent_L": {"rot": ((0, 1, 0), 55)}, "Accent_R": {"rot": ((0, 1, 0), -55)}},
            "accentPerk": {"Accent_L": {"rot": ((0, 1, 0), -10)}, "Accent_R": {"rot": ((0, 1, 0), 10)}},
        },
        "builder": "build_traced",
    },
    "sam": {
        "traced": True,
        "colors": {
            "skin": "#c78557", "skin_dark": "#a9683f", "brow": "#2b1a12", "nose": "#b0704a",
            "hair": "#3b2418", "shirt": "#2a9d9b", "shorts": "#f2c14e", "shoe": "#f7f7f4",
            "collar": "#1f7d7b", "band": "#dba23a", "sole": "#d5dbe4", "lace": "#2a9d9b",
        },
        # hair comes later; shoes and clothes are built as garments in sam_details()
        "skip": ["hair", "shoe", "shirt", "shorts", "shorts_leg", "arm", "leg", "neck"],
        "body": True,          # metaball body (BODY); clothes are built on it
        "collar_z": 1.005,            # side of the relaxed round neck; front scoops lower
        "round_parts": ["ear"],
        "hold_below": {"leg": 0.245, "neck": 1.10},
        "hold_scale": {"neck": 0.82},     # the sketch's neck is slimmer than the trace
        "arm_line": {"from": 0.74, "to": 0.68, "top": 0.93},
        # broad, flat face front so the big eyes sit inside the head outline
        "loft_p": {"head": 3.0},
        # Side profile of the bald skull (the sketch's side view is mostly hair):
        # depth follows a rounded superellipse over the head's height, so the jaw
        # and chin curve back into the neck. Front-view widths stay as traced.
        "head_profile": {"zc": 1.5625, "hh": 0.465, "depth": 0.92, "yc": -0.07, "p": 2.3},
        "details": "sam_details",
        "parts": {"head": ("skin", "Head"), "ear": ("skin", "Head"), "neck": ("skin", "Neck"),
                  "shirt": ("shirt", "Spine1"), "arm": ("skin", "{side}Arm"), "shorts": ("shorts", "Hips"),
                  "shorts_leg": ("shorts", "{side}UpLeg"), "leg": ("skin", "{side}UpLeg"),
                  "shoe": ("shoe", "{side}UpLeg"), "hair": ("hair", "Head")},
        "decal_mats": {"EarInner": "skin_dark", "Bangs": "hair"},
        "extend": {"arm": (0.0, 0.0), "leg": (0.05, 0.06), "neck": (0.04, 0.04), "shorts_leg": (0.03, 0.0)},
        "dome": {"head": (False, True), "shirt": (False, True), "neck": (False, False),
                 "leg": (False, False), "shorts_leg": (False, True), "shoe": (True, False), "arm": (True, True)},
        "smooth": {"hair": 1},
        "layout": dict(lid_up_rest=72.0, lid_low_rest=-80.0, brow_off=0.03, eye_sink=0.04, iris_k=1.22,
                       nose_size_y=0.032, painted_eyes=True),
        "accent_poses": {},
        "builder": "build_traced",
    },
}


# --------------------------------------------------------------------------
# Layout + face surface
# --------------------------------------------------------------------------

L = SimpleNamespace()
SURF = {"bvh": None}
ACCENT_POSES = {}
CFG = {}


def set_surface(ob):
    """Face parts are placed on this object's front surface by raycasting."""
    deps = bpy.context.evaluated_depsgraph_get()
    SURF["bvh"] = BVHTree.FromObject(ob, deps)


def surf_y(x, z, off=0.0):
    """Front surface y at (x, z); off > 0 moves outwards (towards -Y)."""
    hit, _n, _i, _d = SURF["bvh"].ray_cast(Vector((x, -5.0, z)), Vector((0, 1, 0)))
    if hit is None:
        raise RuntimeError(f"No face surface at x={x:.3f} z={z:.3f}")
    return hit.y - off


def surf_point(x, z, off=0.0):
    return Vector((x, surf_y(x, z, off), z))


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------

def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def material(name, hex_color):
    m = bpy.data.materials.new(name)
    lin = tuple(srgb_to_linear(c) for c in hex_rgb(hex_color))
    m.diffuse_color = (*lin, 1.0)
    if m.node_tree:
        bsdf = m.node_tree.nodes.get("Principled BSDF")
        if bsdf:
            bsdf.inputs["Base Color"].default_value = (*lin, 1.0)
            bsdf.inputs["Roughness"].default_value = 1.0
    return m


def obj_from_bmesh(name, bm, mat):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(mat)
    for p in me.polygons:
        p.use_smooth = True
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def sphere_bm(radius, segs=32, rings=16):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=rings, radius=radius)
    return bm


def transform_bm(bm, scale=(1, 1, 1), rot_x_deg=0.0, loc=(0, 0, 0)):
    for v in bm.verts:
        co = Vector((v.co.x * scale[0], v.co.y * scale[1], v.co.z * scale[2]))
        if rot_x_deg:
            co = Quaternion((1, 0, 0), math.radians(rot_x_deg)) @ co
        v.co = co + Vector(loc)


def assign_rigid(ob, bone):
    vg = ob.vertex_groups.new(name=bone)
    vg.add([v.index for v in ob.data.vertices], 1.0, "REPLACE")


def assign_weights(ob, fn):
    """fn(co) -> {bone: weight}"""
    groups = {}
    for v in ob.data.vertices:
        for bone, w in fn(v.co).items():
            if w <= 1e-4:
                continue
            if bone not in groups:
                groups[bone] = ob.vertex_groups.new(name=bone)
            groups[bone].add([v.index], w, "REPLACE")


def smoothstep(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


def tube_bm(points, radius_fn, n_round=12, flat=1.0):
    """Closed tube along a polyline. radius_fn(t) gives the radius at t in [0,1].
    flat < 1 squashes the tube in Y (front-back)."""
    bm = bmesh.new()
    rings = []
    n = len(points)
    for i, c in enumerate(points):
        t = i / (n - 1)
        r = radius_fn(t)
        nxt = points[min(i + 1, n - 1)] - points[max(i - 1, 0)]
        nxt.normalize()
        side = nxt.cross(Vector((0, 1, 0)))
        if side.length < 1e-6:
            side = Vector((1, 0, 0))
        side.normalize()
        ring = []
        for k in range(n_round):
            a = 2 * math.pi * k / n_round
            off = side * math.cos(a) * r + Vector((0, 1, 0)) * math.sin(a) * r * flat
            ring.append(bm.verts.new(c + off))
        rings.append(ring)
    for i in range(n - 1):
        for k in range(n_round):
            bm.faces.new((rings[i][k], rings[i][(k + 1) % n_round],
                          rings[i + 1][(k + 1) % n_round], rings[i + 1][k]))
    bm.faces.new(list(reversed(rings[0])))
    bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


# --------------------------------------------------------------------------
# Skeleton
# --------------------------------------------------------------------------

def eye_centre(side):
    x = L.eye_x * side
    return Vector((x, surf_y(x, L.eye_z) + L.eye_sink, L.eye_z))


def default_body_bones(bone, head_h, head_t):
    """Body bones for the procedural / traced characters (Pip, Miso)."""
    hip_z = L.hip_z
    leg_x = L.leg_x
    neck_z = head_h.z
    step = (neck_z - hip_z) / 5
    # Body (Mixamo names); spine evenly spaced from hips to the head bone
    bone("Hips", (0, 0, hip_z), (0, 0, hip_z + step))
    bone("Spine", (0, 0, hip_z + step), (0, 0, hip_z + 2 * step), "Hips")
    bone("Spine1", (0, 0, hip_z + 2 * step), (0, 0, hip_z + 3 * step), "Spine")
    bone("Spine2", (0, 0, hip_z + 3 * step), (0, 0, hip_z + 4 * step), "Spine1")
    bone("Neck", (0, 0, hip_z + 4 * step), (0, 0, neck_z), "Spine2")
    bone("Head", head_h, head_t, "Neck")
    sh_z = hip_z + 4 * step
    (ax0, az0), (ax1, az1) = getattr(L, "arm", ((0.18, sh_z), (0.28, sh_z - 0.1)))
    dx, dz = ax1 - ax0, az1 - az0
    for side, s in (("Left", 1), ("Right", -1)):
        bone(f"{side}Shoulder", (0.05 * s, 0, az0), (ax0 * s, 0, az0), "Spine2")
        bone(f"{side}Arm", (ax0 * s, 0, az0), (ax1 * s, 0, az1), f"{side}Shoulder")
        bone(f"{side}ForeArm", (ax1 * s, 0, az1), ((ax1 + 0.5 * dx) * s, 0, az1 + 0.5 * dz), f"{side}Arm")
        bone(f"{side}Hand", ((ax1 + 0.5 * dx) * s, 0, az1 + 0.5 * dz),
             ((ax1 + 0.8 * dx) * s, 0, az1 + 0.8 * dz), f"{side}ForeArm")
        knee_z = 0.04 + 0.5 * (hip_z - 0.04)
        bone(f"{side}UpLeg", (leg_x * s, 0, hip_z), (leg_x * s, 0, knee_z), "Hips")
        bone(f"{side}Leg", (leg_x * s, 0, knee_z), (leg_x * s, 0, 0.04), f"{side}UpLeg")
        bone(f"{side}Foot", (leg_x * s, 0, 0.04), (leg_x * s, -0.06, 0.02), f"{side}Leg")


def body_bones(bone, head_h, head_t):
    """Body bones placed inside the metaball body: joints sit where the body's
    capsules meet (shoulder, elbow, wrist, hip, knee, ankle)."""
    seg = {bn: (A, B) for A, B, bn, _s in BODY_INFO["placed"] if B is not None}
    y = -0.100                                        # the body's centre line
    hip_z, neck_z = 0.500, 0.950
    zs = [hip_z, 0.620, 0.730, 0.840, neck_z]
    bone("Hips", (0, y, zs[0]), (0, y, zs[1]))
    bone("Spine", (0, y, zs[1]), (0, y, zs[2]), "Hips")
    bone("Spine1", (0, y, zs[2]), (0, y, zs[3]), "Spine")
    bone("Spine2", (0, y, zs[3]), (0, y, zs[4]), "Spine1")
    bone("Neck", (0, y, neck_z), (0, -0.093, head_h.z), "Spine2")
    bone("Head", head_h, head_t, "Neck")
    for side, s in (("Left", 1), ("Right", -1)):
        sh, el = seg[f"{side}Arm"]
        _el, wr = seg[f"{side}ForeArm"]
        a, _n, _b = hand_frame(s)
        palm = Vector((PALM[0] * s, PALM[1], PALM[2]))
        bone(f"{side}Shoulder", (0.06 * s, y, sh.z), sh, "Spine2")
        bone(f"{side}Arm", sh, el, f"{side}Shoulder")
        bone(f"{side}ForeArm", el, wr, f"{side}Arm")
        bone(f"{side}Hand", wr, palm + a * 0.03, f"{side}ForeArm")
        hip, knee = seg[f"{side}UpLeg"]
        _k, ankle = seg[f"{side}Leg"]
        bone(f"{side}UpLeg", hip, knee, "Hips")
        bone(f"{side}Leg", knee, ankle, f"{side}UpLeg")
        bone(f"{side}Foot", ankle, ankle + Vector((0, -0.11, -0.05)), f"{side}Leg")


def build_armature():
    arm_data = bpy.data.armatures.new("Rig")
    arm = bpy.data.objects.new("Rig", arm_data)
    bpy.context.scene.collection.objects.link(arm)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode="EDIT")
    eb = arm_data.edit_bones

    def bone(name, head, tail, parent=None):
        b = eb.new(name)
        b.head = Vector(head)
        b.tail = Vector(tail)
        b.roll = 0.0
        if parent:
            b.parent = eb[parent]
            b.use_connect = False
        return b

    head_h, head_t = (Vector(p) for p in L.head)
    if BODY_INFO.get("placed"):
        body_bones(bone, head_h, head_t)
    else:
        default_body_bones(bone, head_h, head_t)
    for name, head, tail, parent in FINGER_BONES:     # characters with fingers
        bone(name, head, tail, parent)

    # Face bones: all point straight out of the face (-Y)
    fwd = Vector((0, -0.04, 0))

    def face_bone(name, head):
        h = Vector(head)
        bone(name, h, h + fwd, "Head")

    for tag, s in (("L", 1), ("R", -1)):
        ec = eye_centre(s)
        face_bone(f"Eye_{tag}", ec)
        face_bone(f"LidUp_{tag}", ec)
        face_bone(f"LidLow_{tag}", ec)
        face_bone(f"BrowInner_{tag}", surf_point(L.brow_in[0] * s, L.brow_in[1], L.brow_off))
        face_bone(f"BrowOuter_{tag}", surf_point(L.brow_out[0] * s, L.brow_out[1], L.brow_off))
        face_bone(f"MouthCorner_{tag}", surf_point(L.mouth_half_w * s, L.mouth_z + L.mouth_curve, MOUTH_OFF))
    face_bone("LipUp", surf_point(0, L.mouth_z, MOUTH_OFF))
    face_bone("Jaw", surf_point(0, L.mouth_z, MOUTH_OFF))
    face_bone("Sneer", surf_point(0, L.sneer_z, 0.0))
    face_bone("Nose", surf_point(0, L.nose_z, 0.0))
    for name, ah, at in L.accent_bones:
        bone(name, ah, at, "Head")

    bpy.ops.object.mode_set(mode="OBJECT")
    return arm


# --------------------------------------------------------------------------
# Meshes: Pip
# --------------------------------------------------------------------------

PIP_CENTRE_Z = 0.57
PIP_RX, PIP_RY, PIP_RZ = 0.5, 0.44, 0.56


def pip_body_bm():
    """Apple/bean body: narrower dome on top, widest low, flattened bottom,
    a small dip where the stem goes in."""
    bm = sphere_bm(1.0, 64, 40)
    for v in bm.verts:
        x, y, z = v.co
        taper = 1 - 0.16 * z
        nx, ny, nz = x * PIP_RX * taper, y * PIP_RY * taper, z * PIP_RZ
        if nz < -0.39:
            nz = -0.39 + (nz + 0.39) * 0.35
        nz -= 0.035 * math.exp(-(nx * nx + ny * ny) / 0.006) * max(z, 0)
        v.co = Vector((nx, ny, nz + PIP_CENTRE_Z))
    return bm


def build_pip(mats):
    parts = []

    body = obj_from_bmesh("Body", pip_body_bm(), mats["skin"])
    assign_rigid(body, "Head")
    parts.append(body)
    set_surface(body)
    top_z = max(v.co.z for v in body.data.vertices if abs(v.co.x) < 0.02 and abs(v.co.y) < 0.02)

    # Stubby legs
    for side, s in (("Left", 1), ("Right", -1)):
        bm = sphere_bm(1.0, 24, 14)
        transform_bm(bm, scale=(0.075, 0.07, 0.07), loc=(0.27 * s, -0.02, 0.085))
        leg = obj_from_bmesh(f"{side}LegMesh", bm, mats["skin_dark"])
        assign_rigid(leg, f"{side}UpLeg")
        parts.append(leg)

    # Sprout: curved stem and two leaves, all on the Accent bone
    base = Vector((0, 0, top_z - 0.02))
    stem_pts = [base + Vector((0.025 * t * t, 0, 0.17 * t)) for t in (i / 10 for i in range(11))]
    stem = obj_from_bmesh("Stem", tube_bm(stem_pts, lambda t: 0.022 - 0.006 * t, 10), mats["stem"])
    assign_rigid(stem, "Accent")
    parts.append(stem)
    tip = stem_pts[-1]
    for length, width, ang in ((0.25, 0.115, 28), (0.15, 0.07, 150)):
        bm = sphere_bm(1.0, 32, 16)
        for v in bm.verts:
            x, y, z = v.co
            pinch = (1 - x * x) ** 0.35       # pointed ends
            co = Vector((x * length / 2, y * 0.012, z * width / 2 * pinch))
            co.x += length / 2                # leaf starts at the stem tip
            co = Quaternion((0, 1, 0), math.radians(-ang)) @ co
            v.co = co + tip
        leaf = obj_from_bmesh("Leaf", bm, mats["leaf"])
        assign_rigid(leaf, "Accent")
        parts.append(leaf)

    # Small mitten hands on the body sides, on the arm bones (pivot at the body)
    for side, s in (("Left", 1), ("Right", -1)):
        hx, hz = 0.505, 0.36
        bm = sphere_bm(1.0, 24, 14)
        for v in bm.verts:
            co = Vector((v.co.x * 0.055, v.co.y * 0.05, v.co.z * 0.075))
            co = Quaternion((0, 1, 0), math.radians(-28 * s)) @ co   # tips point outwards-down
            v.co = co + Vector((hx * s, -0.03, hz))
        hand = obj_from_bmesh(f"{side}HandMesh", bm, mats["skin_dark"])
        assign_rigid(hand, f"{side}Arm")
        parts.append(hand)

    # Glossy shine (static decal on the upper left of the body)
    p = surf_point(-0.2, 1.0, -0.004)
    bm = sphere_bm(1.0, 24, 12)
    for v in bm.verts:
        co = Vector((v.co.x * 0.075, v.co.y * 0.012, v.co.z * 0.032))
        co = Quaternion((0, 1, 0), math.radians(35)) @ co
        v.co = co + p
    shine = obj_from_bmesh("Shine", bm, mats["shine"])
    assign_rigid(shine, "Head")
    parts.append(shine)

    parts += build_face(mats)
    return parts


# --------------------------------------------------------------------------
# Meshes: shared body-part helpers
# --------------------------------------------------------------------------

def ellipsoid(name, scale, loc, mat, bone, rot_y=0.0, segs=28):
    bm = sphere_bm(1.0, segs, segs // 2)
    for v in bm.verts:
        co = Vector((v.co.x * scale[0], v.co.y * scale[1], v.co.z * scale[2]))
        if rot_y:
            co = Quaternion((0, 1, 0), math.radians(rot_y)) @ co
        v.co = co + Vector(loc)
    ob = obj_from_bmesh(name, bm, mat)
    assign_rigid(ob, bone)
    return ob


def capsule(name, p0, p1, r, mat, bone):
    """Tube with round ends between two points."""
    p0, p1 = Vector(p0), Vector(p1)
    pts = [p0.lerp(p1, i / 8) for i in range(9)]
    bm = tube_bm(pts, lambda t: r, 14)
    for end in (p0, p1):
        s = sphere_bm(r, 14, 8)
        transform_bm(s, loc=end)
        tmp = bpy.data.meshes.new("tmp")
        s.to_mesh(tmp)
        s.free()
        bm.from_mesh(tmp)
        bpy.data.meshes.remove(tmp)
    ob = obj_from_bmesh(name, bm, mat)
    assign_rigid(ob, bone)
    return ob


def decal(name, cx, cz, rx, rz, mat, bone, off=0.006, angle=0.0, n=24):
    """Flat disc projected onto the face surface (muzzle, stripes)."""
    bm = bmesh.new()
    ca, sa = math.cos(math.radians(angle)), math.sin(math.radians(angle))
    rings = []
    for j in range(1, 5):
        rr = j / 4
        ring = []
        for k in range(n):
            a = 2 * math.pi * k / n
            lx, lz = rx * rr * math.cos(a), rz * rr * math.sin(a)
            x, z = cx + lx * ca - lz * sa, cz + lx * sa + lz * ca
            ring.append(bm.verts.new(surf_point(x, z, off)))
        rings.append(ring)
    centre = bm.verts.new(surf_point(cx, cz, off))
    for k in range(n):
        bm.faces.new((centre, rings[0][k], rings[0][(k + 1) % n]))
    for j in range(3):
        for k in range(n):
            bm.faces.new((rings[j][k], rings[j + 1][k], rings[j + 1][(k + 1) % n], rings[j][(k + 1) % n]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if sum(f.normal.y for f in bm.faces) > 0:
        bmesh.ops.reverse_faces(bm, faces=bm.faces)
    ob = obj_from_bmesh(name, bm, mat)
    assign_rigid(ob, bone)
    return ob


def head_bm(rx, ry, rz, centre_z, cheek=0.06):
    """Round head, a little fuller at the cheeks."""
    bm = sphere_bm(1.0, 64, 40)
    for v in bm.verts:
        x, y, z = v.co
        k = 1 + cheek * max(0.0, -z) * (1 + z)   # widest a bit below the middle
        v.co = Vector((x * rx * k, y * ry * k, z * rz + centre_z))
    return bm


# --------------------------------------------------------------------------
# Meshes: traced characters (Miso, Sam)
# --------------------------------------------------------------------------

TRACE = {}


def spline(ctrl, n):
    """Catmull-Rom through control points, n samples."""
    ctrl = [Vector(c) for c in ctrl]
    pts = []
    segs = len(ctrl) - 1
    for i in range(n):
        u = i / (n - 1) * segs
        k = min(int(u), segs - 1)
        t = u - k
        p0 = ctrl[max(k - 1, 0)]
        p1, p2 = ctrl[k], ctrl[k + 1]
        p3 = ctrl[min(k + 2, segs)]
        pts.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t
                          + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    return pts


def load_trace(name):
    with open(os.path.join(ROOT, "blender", "traces", f"{name}.json")) as fh:
        TRACE.clear()
        TRACE.update(json.load(fh))


def ring_params(rows, sym, smooth=5, step=3):
    """Smooth the traced rows and thin them out: [(z, cx, rx, cy, ry, band)]."""
    rows = sorted(rows, key=lambda r: -r[0])
    n = len(rows)
    out = []
    for i in range(0, n, step):
        lo, hi = max(0, i - smooth), min(n, i + smooth + 1)
        win = rows[lo:hi]
        z = rows[i][0]
        x0 = sum(r[1] for r in win) / len(win)
        x1 = sum(r[2] for r in win) / len(win)
        y0 = sum(r[3] for r in win) / len(win)
        y1 = sum(r[4] for r in win) / len(win)
        band = rows[i][5] if len(rows[i]) > 5 else None
        cx = 0.0 if sym else (x0 + x1) / 2
        out.append((z, cx, max((x1 - x0) / 2, 0.004), (y0 + y1) / 2, max((y1 - y0) / 2, 0.004), band))
    if (n - 1) % step:
        r = rows[-1]
        out.append((r[0], 0.0 if sym else (r[1] + r[2]) / 2, max((r[2] - r[1]) / 2, 0.004),
                    (r[3] + r[4]) / 2, max((r[4] - r[3]) / 2, 0.004), r[5] if len(r) > 5 else None))
    return out


def extend_rings(rings, top=0.0, bottom=0.0):
    """Continue a part past its traced ends along its own centre line."""
    def ext(rs, dz, sign):
        if dz <= 0 or len(rs) < 4:
            return []
        a, b = rs[0], rs[3]
        dzr = a[0] - b[0]
        sx = (a[1] - b[1]) / dzr if dzr else 0
        sy = (a[3] - b[3]) / dzr if dzr else 0
        out = []
        for i in range(1, 5):
            d = dz * i / 4 * sign
            out.append((a[0] + d, a[1] + sx * d, a[2], a[3] + sy * d, a[4], a[5]))
        return out[::-1]
    top_ext = ext(rings, top, 1)
    bot = rings[::-1]
    bot_ext = ext(bot, bottom, -1)[::-1]
    return top_ext + rings + bot_ext


def dome(rings, top=True, bottom=True, steps=5):
    """Round off the ends: shrinking rings over a quarter circle."""
    def cap(r, sign):
        z, cx, rx, cy, ry, band = r
        h = min(rx, ry)
        out = []
        for i in range(1, steps + 1):
            t = i / steps * math.pi / 2
            out.append((z + sign * h * math.sin(t), cx, max(rx * math.cos(t), 0.003), cy,
                        max(ry * math.cos(t), 0.003), band))
        return out
    res = list(rings)
    if top:
        res = cap(rings[0], 1)[::-1] + res
    if bottom:
        res = res + cap(rings[-1], -1)
    return res


def loft(name, rings, mats_by_band, default_mat, bone, flip=False, n=40, p=2.15):
    """Closed mesh through elliptical rings (one per traced row)."""
    bm = bmesh.new()
    vrings = []
    for z, cx, rx, cy, ry, _band in rings:
        if flip:
            cx = -cx
        ring = []
        for k in range(n):
            a = 2 * math.pi * k / n
            c, s = math.cos(a), math.sin(a)
            x = cx + rx * math.copysign(abs(c) ** (2 / p), c)
            y = cy + ry * math.copysign(abs(s) ** (2 / p), s)
            ring.append(bm.verts.new((x, y, z)))
        vrings.append(ring)
    mat_list = [default_mat] + [m for m in mats_by_band.values() if m is not default_mat]
    faces = []
    for i in range(len(vrings) - 1):
        band = rings[i][5]
        mi = mat_list.index(mats_by_band.get(band, default_mat)) if band else 0
        for k in range(n):
            f = bm.faces.new((vrings[i][k], vrings[i][(k + 1) % n], vrings[i + 1][(k + 1) % n], vrings[i + 1][k]))
            f.material_index = mi
            faces.append(f)
    for ring, z_off, idx in ((vrings[0], 0.003, 0), (vrings[-1], -0.003, -1)):
        z, cx, _rx, cy, _ry, band = rings[idx]
        c = bm.verts.new((-cx if flip else cx, cy, z + z_off))
        mi = mat_list.index(mats_by_band.get(band, default_mat)) if band else 0
        for k in range(n):
            f = bm.faces.new((c, ring[k], ring[(k + 1) % n]) if idx == 0 else (c, ring[(k + 1) % n], ring[k]))
            f.material_index = mi
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for m in mat_list:
        me.materials.append(m)
    for poly in me.polygons:
        poly.use_smooth = True
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    assign_rigid(ob, bone)
    return ob


def decal_rows(name, rows, mat, bone, off=0.005, flip=False, cols=10, step=2):
    """Traced colour region (rows of z, x0, x1) projected onto the current surface."""
    rows = sorted(rows, key=lambda r: -r[0])[::step]
    if len(rows) < 2:
        return None
    bm = bmesh.new()
    grid = []
    for z, x0, x1 in rows:
        if flip:
            x0, x1 = -x1, -x0
        row = []
        for i in range(cols + 1):
            x = x0 + (x1 - x0) * i / cols
            try:
                hit, nrm, _i, _d = SURF["bvh"].ray_cast(Vector((x, -5.0, z)), Vector((0, 1, 0)))
                if hit is None or nrm.y > -0.35:      # missed, or the surface turns away
                    raise RuntimeError
                row.append(bm.verts.new(Vector((x, hit.y - off, z))))
            except RuntimeError:
                row.append(None)
        grid.append(row)
    for j in range(len(grid) - 1):
        for i in range(cols):
            q = (grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i])
            if all(q):
                bm.faces.new(q)
    if not bm.faces:
        bm.free()
        return None
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if sum(f.normal.y for f in bm.faces) > 0:
        bmesh.ops.reverse_faces(bm, faces=bm.faces)
    ob = obj_from_bmesh(name, bm, mat)
    assign_rigid(ob, bone)
    return ob


def traced_layout(cfg):
    """Face layout and bone positions from the trace."""
    t = TRACE
    f = t["face"]
    vols = t["volumes"]
    lay = dict(cfg["layout"])
    lay.update(eye_x=f["eye_x"], eye_z=f["eye_z"], eye_r=f["eye_r"],
               brow_in=tuple(f["brow_in"]), brow_mid=tuple(f["brow_mid"]), brow_out=tuple(f["brow_out"]),
               brow_r=f["brow_r"], mouth_z=f["mouth_z"], mouth_half_w=f["mouth_half_w"],
               mouth_curve=f["mouth_curve"], nose_z=f["nose_z"],
               nose_size=(f["nose_size"][0], lay.pop("nose_size_y"), f["nose_size"][1]))
    lay["sneer_z"] = f["nose_z"] + 0.45 * (f["eye_z"] - f["nose_z"])
    head = vols["head"]["rows"]
    chin, top = min(r[0] for r in head), max(r[0] for r in head)
    lay["head"] = ((0, 0, chin), (0, 0, top + 0.2))
    arm = sorted(vols["arm"]["rows"], key=lambda r: -r[0])
    a0, a1 = arm[0], arm[len(arm) // 2]
    lay["arm"] = ((abs((a0[1] + a0[2]) / 2), a0[0]), (abs((a1[1] + a1[2]) / 2), a1[0]))
    leg = sorted(vols["leg"]["rows"], key=lambda r: -r[0])
    lay["leg_x"] = abs((leg[0][1] + leg[0][2]) / 2)
    lay["hip_z"] = leg[0][0]
    lay["accent_bones"] = []
    if "ear" in vols and cfg["parts"]["ear"][1].startswith("Accent"):
        ear = sorted(vols["ear"]["rows"], key=lambda r: -r[0])
        tip, base = ear[0], ear[-1]
        for tag, s in (("L", 1), ("R", -1)):
            bx, tx = abs((base[1] + base[2]) / 2) * s, abs((tip[1] + tip[2]) / 2) * s
            by = (base[3] + base[4]) / 2
            lay["accent_bones"].append((f"Accent_{tag}", (bx, by, base[0] - 0.04), (tx, by, tip[0])))
    return lay


def torus(name, centre, rx, ry, minor, mat, bone, axis=(0, 0, 1), n=48, m=12):
    """Elliptical ring (rims, cuffs, collars)."""
    axis = Vector(axis).normalized()
    u = Vector((1, 0, 0)) - axis * axis.x
    if u.length < 1e-4:
        u = Vector((0, 1, 0)) - axis * axis.y
    u.normalize()
    v = axis.cross(u)
    c = Vector(centre)
    bm = bmesh.new()
    rings = []
    for i in range(n):
        a = 2 * math.pi * i / n
        p = c + u * rx * math.cos(a) + v * ry * math.sin(a)
        radial = (u * math.cos(a) * ry + v * math.sin(a) * rx).normalized()
        ring = []
        for j in range(m):
            b = 2 * math.pi * j / m
            ring.append(bm.verts.new(p + radial * minor * math.cos(b) + axis * minor * math.sin(b)))
        rings.append(ring)
    for i in range(n):
        for j in range(m):
            bm.faces.new((rings[i][j], rings[(i + 1) % n][j], rings[(i + 1) % n][(j + 1) % m], rings[i][(j + 1) % m]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = obj_from_bmesh(name, bm, mat)
    assign_rigid(ob, bone)
    return ob


def ring_at(rings, z):
    return min(rings, key=lambda r: abs(r[0] - z))


def band_bm(points, normals, width, thick, n_round=10):
    """Flat strap along a polyline lying on a surface (normals point outwards)."""
    bm = bmesh.new()
    rings = []
    n = len(points)
    for i, (c, nr) in enumerate(zip(points, normals)):
        tan = points[min(i + 1, n - 1)] - points[max(i - 1, 0)]
        side = tan.cross(nr).normalized()
        ring = []
        for k in range(n_round):
            a = 2 * math.pi * k / n_round
            ring.append(bm.verts.new(c + side * (width / 2 * math.cos(a)) + nr * (thick / 2 * math.sin(a))))
        rings.append(ring)
    for i in range(n - 1):
        for k in range(n_round):
            bm.faces.new((rings[i][k], rings[i][(k + 1) % n_round], rings[i + 1][(k + 1) % n_round], rings[i + 1][k]))
    for ring in (rings[0], rings[-1]):
        bm.faces.new(ring)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


LEG_HOLD = 0.245
SHOE = dict(W=0.120, L=0.190, back=0.058, sole=0.034, toe_h=0.050, heel_h=0.150, p=2.5, q=2.2)


def sneaker(tag, side, traced, mats, flip):
    """Toony low-top sneaker like the sketch: a round bun-shaped upper on a flat
    sole band, a toe-cap seam, two strap bands over the instep and an ankle rim
    where the leg goes in."""
    s = 1 if flip else -1
    bone = f"{side}Foot" if CFG.get("body") else f"{side}UpLeg"
    leg = ring_at(traced["leg"], LEG_HOLD)
    lx, lrx, ly, lry = s * abs(leg[1]), leg[2], leg[3], leg[4]
    W, L, p, q = SHOE["W"], SHOE["L"], SHOE["p"], SHOE["q"]
    cx, cy = lx + s * 0.006, ly + lry + SHOE["back"] - L - 0.02   # heel just behind the leg
    z0 = SHOE["sole"]

    def spow(v, e):
        return math.copysign(abs(v) ** e, v)

    def height(y):
        t = (y - (cy - L)) / (2 * L)          # 0 at the toe tip, 1 at the heel
        return SHOE["toe_h"] + (SHOE["heel_h"] - SHOE["toe_h"]) * smoothstep(0.08, 0.72, t)

    def norm(x, y):
        return (abs((x - cx) / W) ** p + abs((y - cy) / L) ** p) ** (1 / p)

    def surf(x, y):
        u = min(norm(x, y), 1.0)
        return z0 + height(y) * (1 - u ** q) ** (1 / q)

    def normal(x, y, e=0.002):
        dzx = (surf(x + e, y) - surf(x - e, y)) / (2 * e)
        dzy = (surf(x, y + e) - surf(x, y - e)) / (2 * e)
        return Vector((-dzx, -dzy, 1)).normalized()

    out = []
    # Sole band: flat, a little wider than the upper, softly rounded edges.
    sole_rings = [(z, cx, W * k, cy, L * k, None)
                  for z, k in ((0.0, 0.96), (0.007, 1.04), (z0 - 0.004, 1.04), (z0 + 0.004, 0.99))]
    out.append(loft(f"Sole_{tag}", sole_rings[::-1], {}, mats["sole"], bone, n=72, p=p))

    # Upper: a dome over the footprint, height rising from toe to heel.
    bm, n, m = bmesh.new(), 72, 16
    top = bm.verts.new((cx, cy, surf(cx, cy)))
    rows = []
    for i in range(1, m + 1):
        u = math.sin(math.pi / 2 * i / m)
        row = []
        for k in range(n):
            a = 2 * math.pi * k / n
            x = cx + W * u * spow(math.cos(a), 2 / p)
            y = cy + L * u * spow(math.sin(a), 2 / p)
            row.append(bm.verts.new((x, y, surf(x, y) if i < m else z0)))
        rows.append(row)
    tuck = [bm.verts.new((v.co.x - (v.co.x - cx) * 0.03, v.co.y - (v.co.y - cy) * 0.03, z0 - 0.006)) for v in rows[-1]]
    rows.append(tuck)
    for k in range(n):
        bm.faces.new((top, rows[0][k], rows[0][(k + 1) % n]))
    for i in range(len(rows) - 1):
        for k in range(n):
            bm.faces.new((rows[i][k], rows[i + 1][k], rows[i + 1][(k + 1) % n], rows[i][(k + 1) % n]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    upper = obj_from_bmesh(f"Upper_{tag}", bm, mats["shoe"])
    assign_rigid(upper, bone)
    out.append(upper)

    # Ankle rim: follows the upper where the leg goes in.
    pts = []
    for k in range(48):
        a = 2 * math.pi * k / 48
        x = lx + (lrx + 0.010) * math.cos(a)
        y = ly + (lry + 0.010) * math.sin(a)
        pts.append(Vector((x, y, surf(x, y) - 0.002)))
    pts.append(pts[0].copy())
    ob = obj_from_bmesh(f"AnkleRim_{tag}", tube_bm(pts, lambda t: 0.012, 10), mats["shoe"])
    assign_rigid(ob, bone)
    out.append(ob)

    # Toe-cap seam: an arc over the toe, ending at the sole on both sides.
    pts = []
    for k in range(41):
        w = -0.97 + 1.94 * k / 40
        x = cx + w * W
        y = cy - L * (0.30 + 0.42 * math.sqrt(max(0.0, 1 - w * w)))
        pts.append(Vector((x, y, surf(x, y))) + normal(x, y) * 0.003)
    ob = obj_from_bmesh(f"ToeSeam_{tag}", tube_bm(pts, lambda t: 0.0035, 8), mats["shoe"])
    assign_rigid(ob, bone)
    out.append(ob)

    # Two strap bands over the instep, in front of the leg, slightly slanted.
    for i, dy in enumerate((0.020, 0.052)):
        pts, nrs = [], []
        for k in range(31):
            w = -0.70 + 1.40 * k / 30
            x = cx + w * W
            y = ly - lry - dy + s * w * 0.012
            nr = normal(x, y)
            # ends sink into the upper so the strap looks sewn on, not curled
            pts.append(Vector((x, y, surf(x, y))) + nr * (0.006 - 0.012 * abs(w / 0.70) ** 6))
            nrs.append(nr)
        ob = obj_from_bmesh(f"Strap_{tag}_{i}", band_bm(pts, nrs, 0.024, 0.010), mats["shoe"])
        assign_rigid(ob, bone)
        out.append(ob)
    return out


def ring_path(ring, p=2.15, n=64, flip=False):
    """Points and outward normals of a loft ring (same superellipse as loft())."""
    z, cx, rx, cy, ry, _band = ring
    if flip:
        cx = -cx
    pts = []
    for k in range(n):
        a = 2 * math.pi * k / n
        c, s = math.cos(a), math.sin(a)
        pts.append(Vector((cx + rx * math.copysign(abs(c) ** (2 / p), c),
                           cy + ry * math.copysign(abs(s) ** (2 / p), s), z)))
    nrm = []
    for k in range(n):
        t = pts[(k + 1) % n] - pts[k - 1]
        o = Vector((t.y, -t.x, 0)).normalized()
        if o.dot(pts[k] - Vector((cx, cy, z))) < 0:
            o = -o
        nrm.append(o)
    return pts, nrm


def band(name, ring, minor, mat, bone, flip=False, p=2.15, sink=0.45, m=12):
    """Round rim swept along a loft ring, half sunk into the cloth so it sits on it."""
    pts, nrm = ring_path(ring, p, flip=flip)
    n = len(pts)
    bm = bmesh.new()
    rings = []
    up = Vector((0, 0, 1))
    for k in range(n):
        c = pts[k] + nrm[k] * minor * (1 - sink)
        ring_v = []
        for j in range(m):
            b = 2 * math.pi * j / m
            ring_v.append(bm.verts.new(c + nrm[k] * minor * math.cos(b) + up * minor * math.sin(b)))
        rings.append(ring_v)
    for k in range(n):
        for j in range(m):
            bm.faces.new((rings[k][j], rings[(k + 1) % n][j], rings[(k + 1) % n][(j + 1) % m], rings[k][(j + 1) % m]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = obj_from_bmesh(name, bm, mat)
    assign_rigid(ob, bone)
    return ob


# ---- one-piece garments -------------------------------------------------

def apply_mod(ob, mod):
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.modifier_apply(modifier=mod.name)


def fuse(name, objs, voxel=0.008, smooth=5):
    """Join overlapping pieces into ONE watertight surface (voxel remesh), then smooth
    the joins so sleeves grow out of the shirt instead of being stuck on."""
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = name
    ob.vertex_groups.clear()
    m = ob.modifiers.new("Remesh", "REMESH")
    m.mode = "VOXEL"
    m.voxel_size = voxel
    apply_mod(ob, m)
    m = ob.modifiers.new("Smooth", "SMOOTH")
    m.factor = 0.7
    m.iterations = smooth
    apply_mod(ob, m)
    return ob


def cut(ob, co, no):
    """Cut the surface open with a plane, removing everything on the +no side."""
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:],
                           plane_co=Vector(co), plane_no=Vector(no), clear_outer=True)
    bm.to_mesh(ob.data)
    bm.free()


def cut_near(ob, co, no, centre, radius):
    """Plane cut limited to the cloth within `radius` of `centre` (a sleeve end),
    so the plane doesn't slice through the rest of the garment."""
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    c, ax = Vector(centre), Vector(no).normalized()

    def near(f):
        q = f.calc_center_median() - c
        along = q.dot(ax)
        return -0.06 < along and (q - ax * along).length < radius   # close to the sleeve's axis line
    faces = [f for f in bm.faces if near(f)]
    verts = list({v for f in faces for v in f.verts})
    edges = list({e for f in faces for e in f.edges})
    bmesh.ops.bisect_plane(bm, geom=verts + edges + faces, plane_co=Vector(co), plane_no=Vector(no),
                           clear_outer=True)
    bm.to_mesh(ob.data)
    bm.free()


def hole(ob, centre, radius, zmin):
    """Round hole through the top of the cloth (neck opening)."""
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    c = Vector(centre)
    dead = [f for f in bm.faces
            if f.calc_center_median().z > zmin
            and Vector((f.calc_center_median().x - c.x, f.calc_center_median().y - c.y)).length < radius]
    bmesh.ops.delete(bm, geom=dead, context="FACES")
    bm.to_mesh(ob.data)
    bm.free()


def decimate(ob, target):
    m = ob.modifiers.new("Decimate", "DECIMATE")
    m.ratio = min(1.0, target / max(1, len(ob.data.polygons)))
    apply_mod(ob, m)
    for poly in ob.data.polygons:
        poly.use_smooth = True


def boundary_loops(ob):
    """Open edges of the cloth (the cut openings), as ordered point loops."""
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    adj = {}
    for e in bm.edges:
        if len(e.link_faces) == 1:
            a, b = e.verts
            adj.setdefault(a.index, []).append(b.index)
            adj.setdefault(b.index, []).append(a.index)
    co = {v.index: v.co.copy() for v in bm.verts}
    bm.free()
    loops, seen = [], set()
    for start in adj:
        if start in seen:
            continue
        loop, prev, cur = [start], None, start
        seen.add(start)
        while True:
            nxt = [n for n in adj[cur] if n != prev and n not in seen]
            if not nxt:
                break
            prev, cur = cur, nxt[0]
            loop.append(cur)
            seen.add(cur)
        if len(loop) > 12:
            loops.append([co[i] for i in loop])
    return loops


def resample(loop, n=72, smooth=2):
    pts = loop + [loop[0]]
    seg = [(pts[i + 1] - pts[i]).length for i in range(len(pts) - 1)]
    total = sum(seg)
    out, acc, i = [], 0.0, 0
    for k in range(n):
        target = total * k / n
        while acc + seg[i] < target:
            acc += seg[i]
            i += 1
        t = (target - acc) / seg[i] if seg[i] else 0
        out.append(pts[i].lerp(pts[i + 1], t))
    for _ in range(smooth):
        out = [(out[k - 1] + out[k] * 2 + out[(k + 1) % n]) / 4 for k in range(n)]
    return out


def rim(name, loop, minor, mat, weights, sink=0.35, m=12, smooth=0):
    """Round rim swept along a cut edge of the cloth, so it sits exactly on it."""
    pts = resample(loop, n=96, smooth=smooth)
    n = len(pts)
    c = sum(pts, Vector()) / n
    bm = bmesh.new()
    rings = []
    for k in range(n):
        t = (pts[(k + 1) % n] - pts[k - 1]).normalized()
        r = pts[k] - c
        r = (r - t * r.dot(t)).normalized()
        b = t.cross(r).normalized()
        centre = pts[k] + r * minor * (1 - sink)
        rings.append([bm.verts.new(centre + minor * (math.cos(2 * math.pi * j / m) * r
                                                     + math.sin(2 * math.pi * j / m) * b)) for j in range(m)])
    for k in range(n):
        for j in range(m):
            bm.faces.new((rings[k][j], rings[(k + 1) % n][j], rings[(k + 1) % n][(j + 1) % m], rings[k][(j + 1) % m]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = obj_from_bmesh(name, bm, mat)
    assign_weights(ob, weights)
    return ob


def inside_rings(rings, pnt, margin=0.7):
    r = ring_at(rings, pnt.z)
    if abs(r[0] - pnt.z) > 0.03:
        return False
    return ((pnt.x - r[1]) / r[2]) ** 2 + ((pnt.y - r[3]) / r[4]) ** 2 < margin


SLEEVE_TILT = 42          # degrees from vertical
SLEEVE_END = (0.312, -0.075, 0.800)
SLEEVE_R = (0.086, 0.090)


def build_shirt(mats, traced):
    """Sew two sleeves into the torso surface; all four openings share cloth edges.

    A branched quad surface avoids the extra torso cuts and lumpy intersections
    of remeshing cylinders into a narrow shoulder.
    """
    z_collar, hem_z = CFG["collar_z"], 0.580
    lower = ring_at(traced["shirt"], 0.60)
    # The head's existing bottom dome extends over the very thin traced neck.
    # Fit the opening outside that visible skin surface, keeping the head intact.
    # Row 0 is the neck opening: wide and relaxed, well outside the neck.
    # Front-view half widths per row; the side profile comes from PROFILE.
    sections = [(z_collar, 0.158), (0.975, 0.205), (0.946, 0.232), (0.922, 0.240),
                (0.895, 0.242), (0.868, 0.235), (0.842, 0.244), (0.816, 0.250),
                (0.790, 0.255), (0.745, 0.254), (0.700, 0.253), (0.640, 0.260),
                (hem_z, lower[2] * 1.025)]
    # Side profile (z, front y, back y): an upright torso centred over the
    # shorts, a little wider at the hem, rounding in at the shoulders.
    PROFILE = [(1.030, -0.236, 0.022), (1.005, -0.248, 0.025), (0.975, -0.262, 0.050),
               (0.946, -0.272, 0.068), (0.922, -0.282, 0.080), (0.895, -0.288, 0.087),
               (0.868, -0.292, 0.091), (0.842, -0.295, 0.094), (0.790, -0.297, 0.096),
               (0.745, -0.299, 0.098), (0.700, -0.301, 0.100), (0.640, -0.305, 0.104),
               (0.560, -0.310, 0.110)]

    def side(z):
        for (z0, f0, b0), (z1, f1, b1) in zip(PROFILE, PROFILE[1:]):
            if z1 <= z <= z0:
                t = (z0 - z) / (z0 - z1)
                return f0 + (f1 - f0) * t, b0 + (b1 - b0) * t
        return PROFILE[-1][1:] if z < PROFILE[-1][0] else PROFILE[0][1:]

    # The neck opening scoops down at the front; the rows under it dip a
    # little less each, so the cloth never folds over itself.
    DIP = [0.060, 0.045, 0.025, 0.010]
    bm, grid, n = bmesh.new(), [], 64
    for i, (z, rx) in enumerate(sections):
        row = []
        for k in range(n):
            a = 2 * math.pi * k / n
            c, sn = math.cos(a), math.sin(a)
            dip = DIP[i] if i < len(DIP) else 0.0
            zz = z + dip * min(sn, 0) + (0.012 * max(sn, 0) if i == 0 else 0.0)
            fy, by = side(zz)
            cy, ry = (fy + by) / 2, (by - fy) / 2
            xx = rx * math.copysign(abs(c) ** (2/2.25), c)
            yy = cy + ry * math.copysign(abs(sn) ** (2/2.25), sn)
            row.append(bm.verts.new((xx, yy, zz)))
        if i == 0:
            for _ in range(4):
                coords = [(row[k-1].co + row[k].co*2 + row[(k+1)%n].co)/4 for k in range(n)]
                for vert, co in zip(row, coords):
                    vert.co = co
        grid.append(row)
    for i in range(len(grid)-1):
        for k in range(n):
            # Two armholes cut into the side of the torso, ready to be sewn.
            side_arc = k < 8 or k >= 56 or 24 <= k < 40
            if 2 <= i < 8 and side_arc:
                continue
            bm.faces.new((grid[i][k], grid[i][(k+1)%n], grid[i+1][(k+1)%n], grid[i+1][k]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = obj_from_bmesh("Shirt", bm, mats["shirt"])
    arm = traced["arm"]
    a, b = ring_at(arm, 0.78), ring_at(arm, 0.68)
    # Capture the side boundaries before adding sleeves. Neck and hem stay open.
    roots = [loop for loop in boundary_loops(ob)
             if 0.80 < sum(p.z for p in loop)/len(loop) < 0.95]
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    lookup = {tuple(v.co): v for v in bm.verts}
    for loop in roots:
        c = sum(loop, Vector()) / len(loop)
        sgn = 1 if c.x > 0 else -1
        # Sleeve axis points down and out along the arm, like the sketch; the hem
        # opening is perpendicular to it, so it reads as a slanted sleeve end.
        tilt = math.radians(SLEEVE_TILT)
        axis = Vector((sgn * math.sin(tilt), 0, -math.cos(tilt)))
        u = Vector((-sgn * axis.z, 0, sgn * axis.x)).normalized()
        v = Vector((0, 1, 0))
        end = Vector((sgn * SLEEVE_END[0], SLEEVE_END[1], SLEEVE_END[2]))
        angles = [math.atan2((p.y-c.y)/0.125, (p.z-c.z)/0.078) for p in loop]
        targets = [end + u * (SLEEVE_R[0] * math.cos(t)) + v * (SLEEVE_R[1] * math.sin(t)) for t in angles]
        prev = [lookup[tuple(p)] for p in loop]
        for j in range(1, 9):
            t = j / 8
            row = []
            for p, target in zip(loop, targets):
                co = p.lerp(target, t)
                # Soft fullness in the sleeve, without a raised shoulder cap.
                around = math.sin(angles[len(row)])
                fullness = math.sin(math.pi*t)
                # Only a little fullness: the sleeve top continues the shoulder line.
                co.z += fullness * 0.030 * max(0, around)
                co.y += 0.012 * fullness * around
                row.append(bm.verts.new(co))
            for k in range(len(loop)):
                bm.faces.new((prev[k], prev[(k+1)%len(loop)], row[(k+1)%len(loop)], row[k]))
            prev = row
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    front = [f for f in bm.faces if f.calc_center_median().y < -0.25
             and abs(f.calc_center_median().x) < 0.12 and f.calc_center_median().z < 0.78]
    if sum(f.normal.y for f in front) > 0:
        bmesh.ops.reverse_faces(bm, faces=bm.faces)
    bm.to_mesh(ob.data)
    bm.free()
    for poly in ob.data.polygons:
        poly.use_smooth = True
    sub = ob.modifiers.new("Round cloth", "SUBSURF")
    sub.levels = 1
    apply_mod(ob, sub)
    def w(co):
        t = smoothstep(0.220, 0.322, abs(co.x)) * smoothstep(0.70, 0.82, co.z)
        return {"Spine1": 1-t, ("LeftArm" if co.x > 0 else "RightArm"): t}

    assign_weights(ob, w)
    out = [ob]
    # Skin seen inside the open neckline: a chest piece from the neck down,
    # kept just inside the shirt so only the scooped opening shows it.
    chest = [(1.035, 0.0, 0.072, -0.100, 0.066, None),
             (1.000, 0.0, 0.135, -0.115, 0.118, None),
             (0.965, 0.0, 0.175, -0.120, 0.133, None),
             (0.930, 0.0, 0.195, -0.120, 0.143, None),
             (0.880, 0.0, 0.200, -0.110, 0.160, None)]
    out.append(loft("Chest", dome(chest, top=False, bottom=True), {}, mats["skin"], "Spine1"))
    loops = boundary_loops(ob)
    if len(roots) != 2 or len(loops) != 4:
        raise RuntimeError(f"T-shirt needs two sewn sleeves and four openings: {len(roots)}, {len(loops)}")
    for loop in loops:
        c = sum(loop, Vector()) / len(loop)
        if c.z > 0.96:
            out.append(rim("Collar", loop, 0.012, mats["collar"], lambda co: {"Spine1": 1.0}, sink=0.85))
        elif c.z < hem_z+0.02:
            out.append(rim("Hem", loop, 0.009, mats["collar"], w, sink=0.85))
        else:
            out.append(rim("Cuff", loop, 0.011, mats["collar"], w, sink=0.85))
    return out


def build_shorts(mats, traced):
    """A joined pair of short legs with a raised crotch and two separate openings."""
    sh = traced["shorts"]
    waist = ring_at(sh, 0.54)
    cy = -0.090
    top = [(0.606, 0, 0.246, cy, 0.159, None),
           (0.548, 0, waist[2], cy, 0.166, None),
           (0.488, 0, 0.269, cy, 0.166, None),
           (0.450, 0, 0.260, cy, 0.155, None)]
    pieces = [loft("ShortsTop", top, {}, mats["shorts"], "Hips", n=64, p=2.3)]
    for s in (1, -1):
        legs = [(0.51, s * 0.143, 0.132, cy, 0.163, None),
                (0.44, s * 0.148, 0.131, cy, 0.163, None),
                (0.35, s * 0.154, 0.129, cy, 0.159, None)]
        pieces.append(loft("ShortsLeg", legs, {}, mats["shorts"], "Hips", n=64, p=2.3))
    ob = fuse("Shorts", pieces, voxel=0.006, smooth=5)
    top_z, open_z = 0.60, 0.365
    cut(ob, (0, 0, top_z), (0, 0, 1))
    cut(ob, (0, 0, open_z), (0, 0, -1))
    decimate(ob, 7000)
    ob.data.materials.clear()
    ob.data.materials.append(mats["shorts"])

    def w(co):
        t = 1 - smoothstep(open_z, 0.51, co.z)
        # Avoid opposing leg influences at the shared crotch seam.
        t *= smoothstep(0.01, 0.065, abs(co.x))
        return {"Hips": 1 - t, ("LeftUpLeg" if co.x > 0 else "RightUpLeg"): t}

    assign_weights(ob, w)
    out = [ob]
    loops = boundary_loops(ob)
    print("SHORTS OPENINGS", [(len(loop), tuple(round(x, 3) for x in sum(loop, Vector()) / len(loop))) for loop in loops])
    for loop in loops:
        c = sum(loop, Vector()) / len(loop)
        if c.z < open_z + 0.02:
            out.append(rim("LegCuff", loop, 0.009, mats["band"], w, sink=0.85))
    return out


# Sam's body: metaball elements blended into one smooth toony body.
# (type, a, b, R or scale, bone). Capsules run a -> b with surface radius R;
# ellipsoids sit at a with surface half sizes. {s} = side sign, {side} = Left/Right.
MB_K = 0.68          # surface radius / element radius at stiffness 4
BODY_INFO = {}       # filled by build_body: element segments and the weight function
BODY = [
    ("E", (0, -0.100, 0.575), None, (0.215, 0.165, 0.105), "Hips"),
    ("E", (0, -0.100, 0.685), None, (0.218, 0.170, 0.125), "Spine"),
    ("E", (0, -0.100, 0.757), None, (0.220, 0.166, 0.120), "Spine1"),
    ("E", (0, -0.100, 0.830), None, (0.228, 0.165, 0.130), "Spine1"),
    ("E", (0, -0.100, 0.940), None, (0.250, 0.140, 0.090), "Spine2"),
    ("C", (0, -0.094, 0.950), (0, -0.092, 1.170), 0.073, "Neck"),
    ("C", ("s", 0.205, -0.100, 0.930), ("s", 0.345, -0.088, 0.775), 0.054, "{side}Arm"),
    ("C", ("s", 0.345, -0.088, 0.775), ("s", 0.418, -0.100, 0.655), 0.047, "{side}ForeArm"),
    ("E", ("s", 0.446, -0.112, 0.602), None, (0.052, 0.030, 0.052), "{side}Hand"),   # palm
    ("C", ("s", 0.142, -0.088, 0.540), ("s", 0.150, -0.075, 0.270), 0.080, "{side}UpLeg"),
    ("C", ("s", 0.146, -0.075, 0.270), ("s", 0.152, -0.067, 0.100), 0.072, "{side}Leg"),
    ("E", ("s", 0.155, -0.120, 0.060), None, (0.058, 0.095, 0.048), "{side}Foot"),
]


FINGER_BONES = []    # (name, head, tail, parent), added to the rig by build_armature
HAND = dict(r=0.0140, len=0.056, spread=0.0275, fan=7.0, curl=0.010, thumb_r=0.0175, thumb_len=0.046)
PALM = (0.446, -0.112, 0.602)


def hand_frame(s):
    """Hand axes: a = along the fingers (down and a little out), n = out of the
    palm (mostly forwards, like the sketch, so the fingers read from the
    front camera), b = across the knuckles."""
    a = Vector((0.28 * s, 0.0, -1.0)).normalized()
    n = Vector((-0.35 * s, -0.94, 0.0))
    n = (n - a * n.dot(a)).normalized()
    b = a.cross(n).normalized()
    return a, n, b


def build_fingers(mats):
    """Thumb and three fingers per hand, fused into one smooth piece that sits
    in the palm. Each finger has two Mixamo-named bones."""
    out = []
    H = HAND
    for s, side in ((1, "Left"), (-1, "Right")):
        a, n, b = hand_frame(s)
        P = Vector(PALM) * 1.0
        P.x *= s
        t = 1 if b.x * s < 0 else -1                 # thumb on the body side
        chains = []
        # four fingers across the knuckles (index next to the thumb)
        for nm, k, dl in (("Index", 1.5, 0.0), ("Middle", 0.5, 0.004), ("Ring", -0.5, 0.0), ("Pinky", -1.5, -0.010)):
            fan = Quaternion(n, math.radians(H["fan"] * k * t))
            d = fan @ a
            root = P + a * (0.030 - 0.004 * abs(k)) + b * (k * t * H["spread"])
            ln = H["len"] + dl
            mid = root + d * ln * 0.55 + n * H["curl"] * 0.3
            tip = root + d * ln + n * H["curl"]
            chains.append((nm, root, mid, tip, H["r"]))
        root = P + b * t * 0.048 + n * 0.012 - a * 0.010
        d = (a * 0.70 + b * t * 0.35 + n * 0.45).normalized()
        mid = root + d * H["thumb_len"] * 0.5
        tip = root + d * H["thumb_len"]
        chains.append(("Thumb", root, mid, tip, H["thumb_r"]))
        pieces = []
        for nm, root, mid, tip, r in chains:
            pieces.append(capsule("tmp", root, mid, r, mats["skin"], "tmp"))
            pieces.append(capsule("tmp", mid, tip, r * 0.96, mats["skin"], "tmp"))
            FINGER_BONES.append((f"{side}Hand{nm}1", root, mid, f"{side}Hand"))
            FINGER_BONES.append((f"{side}Hand{nm}2", mid, tip, f"{side}Hand{nm}1"))
        ob = fuse(f"Fingers_{side}", pieces, voxel=0.0032, smooth=4)
        segs = [(f"{side}Hand{nm}1", root, mid) for nm, root, mid, _t, _r in chains] + \
               [(f"{side}Hand{nm}2", mid, tip) for nm, _r0, mid, tip, _r in chains]

        def w(co, segs=segs):
            best, bone = 1e9, segs[0][0]
            for bn, A, B in segs:
                ab = B - A
                tt = max(0.0, min(1.0, (co - A).dot(ab) / ab.length_squared))
                dd = (co - (A + ab * tt)).length
                if dd < best:
                    best, bone = dd, bn
            return {bone: 1.0}
        assign_weights(ob, w)
        for poly in ob.data.polygons:
            poly.use_smooth = True
        out.append(ob)
    return out


def build_body(mats, elems, name="Body", res=0.009, faces=26000):
    """One smooth body from metaball capsules and ellipsoids (shoulders, hips
    and hands blend instead of meeting as separate tubes)."""
    mb = bpy.data.metaballs.new(name)
    mb.resolution = mb.render_resolution = res
    mb.threshold = 0.6
    placed = []        # (a, b, bone) for skin weights
    for kind, a, b, size, bone in elems:
        for s, side in ((1, "Left"), (-1, "Right")):
            mirrored = isinstance(a, tuple) and a and a[0] == "s"
            if not mirrored and s == -1:
                continue
            A = Vector((a[1] * s, a[2], a[3])) if mirrored else Vector(a)
            B = (Vector((b[1] * s, b[2], b[3])) if mirrored else Vector(b)) if b else None
            e = mb.elements.new(type="CAPSULE" if kind == "C" else "ELLIPSOID")
            e.stiffness = 4.0
            if kind == "C":
                d = B - A
                e.co = (A + B) / 2
                e.radius = size / MB_K
                e.size_x = d.length / 2
                e.rotation = Vector((1, 0, 0)).rotation_difference(d.normalized())
            else:
                e.co = A
                e.radius = 1.0 / MB_K
                e.size_x, e.size_y, e.size_z = size
                if "Hand" in bone:          # palm: turned by the hand frame
                    a_, n_, b_ = hand_frame(s)
                    e.rotation = Matrix((b_, n_, a_)).transposed().to_quaternion()
                else:
                    e.rotation = Quaternion((1, 0, 0, 0))
            placed.append((A, B, bone.format(side=side), size))
    ob = bpy.data.objects.new(name + "MB", mb)
    bpy.context.scene.collection.objects.link(ob)
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    bpy.data.objects.remove(ob)
    bpy.data.metaballs.remove(mb)
    body = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(body)
    me.materials.clear()
    me.materials.append(mats["skin"])
    for poly in me.polygons:
        poly.use_smooth = True
    # Even mesh first (metaball output is uneven), then iron out where the
    # elements meet; volume-preserving, so arms and hands keep their thickness.
    rm = body.modifiers.new("remesh", "REMESH")
    rm.mode, rm.voxel_size, rm.use_smooth_shade = "VOXEL", 0.011, True
    apply_mod(body, rm)
    sm = body.modifiers.new("smooth", "SMOOTH")
    sm.iterations, sm.factor = 14, 0.5
    apply_mod(body, sm)
    grow = body.modifiers.new("grow", "DISPLACE")     # smoothing shrinks a little
    grow.strength, grow.mid_level, grow.direction = 0.004, 0.0, "NORMAL"
    apply_mod(body, grow)
    for poly in body.data.polygons:
        poly.use_smooth = True

    def nearest(co):
        """The body part whose surface is closest (not its centre), so the
        torso's sides count as torso even next to a hanging arm."""
        best, bone = 1e9, "Spine1"
        for A, B, bn, size in placed:
            if B is None:
                q = co - A
                k = Vector((q.x / size[0], q.y / size[1], q.z / size[2])).length
                d = (k - 1.0) * min(size)
            else:
                ab = B - A
                t = max(0.0, min(1.0, (co - A).dot(ab) / ab.length_squared))
                d = (co - (A + ab * t)).length - size
            if d < best:
                best, bone = d, bn
        return {bone: 1.0}

    assign_weights(body, nearest)
    BODY_INFO.update(placed=placed, nearest=nearest)
    if os.environ.get("FF_DIAG"):
        bvh = BVHTree.FromObject(body, bpy.context.evaluated_depsgraph_get())

        def ray(o, d):
            hit = bvh.ray_cast(Vector(o), Vector(d))[0]
            return hit
        for z in (1.05, 0.98, 0.93, 0.88, 0.82, 0.75, 0.68, 0.60, 0.52):
            hx = ray((0, -0.1, z), (1, 0, 0)); hf = ray((0, -0.1, z), (0, -1, 0)); hb = ray((0, -0.1, z), (0, 1, 0))
            print("DIAG torso z=%.2f halfx=%.3f front=%.3f back=%.3f" % (z, hx.x if hx else -1, hf.y if hf else 0, hb.y if hb else 0))
        for nm, A, B, bn in [(bn, A, B, bn) for A, B, bn, _s in placed if B is not None and bn.startswith("Left")]:
            mid = (A + B) / 2
            hx = ray(mid, (1, 0, 0))
            hy = ray(mid, (0, -1, 0))
            print("DIAG %s mid=(%.3f,%.3f) r_x=%.3f r_y=%.3f" % (nm, mid.x, mid.z, (hx.x - mid.x) if hx else -1, (mid.y - hy.y) if hy else -1))
    return body


def garment(name, body, drop_parts, cuts, offset, mat, smooth=3):
    """Cloth cut from the body's own surface: drop the faces of the `drop_parts`
    body parts, open it with plane cuts, then push it out from the skin by offset(co)."""
    nearest = BODY_INFO["nearest"]
    me = body.data.copy()
    me.name = name
    me.materials.clear()
    me.materials.append(mat)
    for poly in me.polygons:
        poly.material_index = 0
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    for vg in list(ob.vertex_groups):
        ob.vertex_groups.remove(vg)
    bm = bmesh.new()
    bm.from_mesh(me)
    drop = [v for v in bm.verts if next(iter(nearest(v.co))) in drop_parts]
    bmesh.ops.delete(bm, geom=drop, context="VERTS")
    bm.to_mesh(me)
    bm.free()
    for c in cuts:
        if c[0] == "neck":
            neck_hole(ob)
        elif len(c) == 2:
            cut(ob, *c)
        else:
            cut_near(ob, *c)
    # drop tiny islands left by the cuts
    bm = bmesh.new()
    bm.from_mesh(me)
    seen, islands = set(), []
    for f in bm.faces:
        if f in seen:
            continue
        stack, isl = [f], []
        seen.add(f)
        while stack:
            g = stack.pop()
            isl.append(g)
            for e in g.edges:
                for h in e.link_faces:
                    if h not in seen:
                        seen.add(h)
                        stack.append(h)
        islands.append(isl)
    islands.sort(key=len, reverse=True)
    small = [f for isl in islands if len(isl) < 0.05 * len(islands[0]) for f in isl]
    bmesh.ops.delete(bm, geom=small, context="FACES")
    # close small holes (where the body blends an arm into the torso); the real
    # openings (neck, sleeves, hem, legs) are much longer and stay open
    bmesh.ops.holes_fill(bm, edges=bm.edges[:], sides=40)
    bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 4])
    bm.normal_update()
    for v in bm.verts:
        v.co += v.normal * offset(v.co)
    bm.to_mesh(me)
    bm.free()
    if smooth:
        sm = ob.modifiers.new("smooth", "SMOOTH")
        sm.iterations, sm.factor = smooth, 0.5
        apply_mod(ob, sm)
    for poly in me.polygons:
        poly.use_smooth = True
    assign_weights(ob, nearest)
    return ob


def neck_hole(ob):
    """Round neck opening: an oval seen from above (wider towards the front),
    cut from the top of the shirt, with the cut edge snapped onto the oval."""
    N = SHIRT["neck"]
    cx, cy = 0.0, N["cy"]

    def k(x, y):
        ry = N["ry_front"] if y < cy else N["ry_back"]
        return math.hypot((x - cx) / N["rx"], (y - cy) / ry)
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    dead = [f for f in bm.faces if f.calc_center_median().z > N["z_min"]
            and k(f.calc_center_median().x, f.calc_center_median().y) < 1.0]
    bmesh.ops.delete(bm, geom=dead, context="FACES")
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    for v in bm.verts:
        if v.co.z > N["z_min"] and v.is_boundary:
            kk = k(v.co.x, v.co.y)
            if 0.8 < kk < 1.3:
                v.co.x = cx + (v.co.x - cx) / kk
                v.co.y = cy + (v.co.y - cy) / kk
    bm.to_mesh(ob.data)
    bm.free()


def body_clothes(mats, body):
    """T-shirt and shorts built on the body, with rims on every opening."""
    nearest = BODY_INFO["nearest"]
    arm = {}
    for A, B, bn, _size in BODY_INFO["placed"]:
        if bn in ("LeftArm", "RightArm"):
            arm[bn] = (A, B)
    out = []
    # ---- T-shirt
    hem_z = SHIRT["hem_z"]
    cuts = [((0, 0, hem_z), (0, 0, -1))]
    cuts.append(("neck",))
    sleeve_end = {}
    for bn, (A, B) in arm.items():
        d = (B - A).normalized()
        e = A + d * SHIRT["sleeve_len"]
        sleeve_end[bn] = (A, d)
        cuts.append((e, d, e, 0.10))

    def shirt_off(co):
        o = SHIRT["off"] + SHIRT["hem_flare"] * smoothstep(hem_z + 0.09, hem_z, co.z)
        for A, d in sleeve_end.values():
            t = (co - A).dot(d)
            if t > 0 and (co - A - d * t).length < 0.11:
                o += SHIRT["sleeve_flare"] * smoothstep(0.03, SHIRT["sleeve_len"], t)
        return o
    drop = {f"{sd}{p}" for sd in ("Left", "Right") for p in ("ForeArm", "Hand", "Leg", "Foot")}
    shirt = garment("Shirt", body, drop, cuts, shirt_off, mats["shirt"])
    out.append(shirt)
    if os.environ.get("FF_DIAG"):
        for loop in boundary_loops(shirt):
            c = sum(loop, Vector()) / len(loop)
            print("DIAG shirt loop n=%d centre=(%.3f, %.3f, %.3f)" % (len(loop), c.x, c.y, c.z))
    for loop in boundary_loops(shirt):
        c = sum(loop, Vector()) / len(loop)
        if c.z > 0.9 and abs(c.x) < 0.1:
            out.append(rim("Collar", loop, 0.013, mats["collar"], nearest, sink=0.8, smooth=6))
        elif c.z < hem_z + 0.03:
            out.append(rim("Hem", loop, 0.010, mats["collar"], nearest, sink=0.8, smooth=3))
        else:
            out.append(rim("Cuff", loop, 0.011, mats["collar"], nearest, sink=0.8, smooth=3))
    # ---- shorts
    top, leg = SHORTS["top_z"], SHORTS["leg_z"]

    def shorts_off(co):
        # leg openings flare outwards; the inner side stays close so the legs keep a gap
        outer = smoothstep(0.09, 0.17, abs(co.x))
        return SHORTS["off"] + SHORTS["leg_flare"] * smoothstep(top - 0.12, leg, co.z) * outer
    drop = {f"{sd}{p}" for sd in ("Left", "Right") for p in ("Arm", "ForeArm", "Hand", "Foot")}
    shorts = garment("Shorts", body, drop,
                     [((0, 0, top), (0, 0, 1)), ((0, 0, leg), (0, 0, -1))], shorts_off, mats["shorts"])
    out.append(shorts)
    for loop in boundary_loops(shorts):
        c = sum(loop, Vector()) / len(loop)
        if c.z < top - 0.03:
            out.append(rim("LegCuff", loop, 0.011, mats["band"], nearest, sink=0.8, smooth=3))
    return out


# Clothes on the metaball body. Offsets are metres out from the skin.
SHIRT = dict(hem_z=0.585, neck=dict(cy=-0.110, rx=0.140, ry_front=0.122, ry_back=0.132, z_min=0.86),
             sleeve_len=0.155, off=0.024, hem_flare=0.010, sleeve_flare=0.010)
SHORTS = dict(top_z=0.625, leg_z=0.360, off=0.018, leg_flare=0.016)


def build_bare_torso(mats):
    """Review only (FF_NO_SHIRT=1): a plain skin torso where the shirt goes, with
    rounded shoulders that cap the arm tops, so the body shape can be checked."""
    neck = [(1.035, 0.0, 0.072, -0.100, 0.066, None)]
    widths = [(1.000, 0.140), (0.975, 0.190), (0.946, 0.222), (0.920, 0.236), (0.895, 0.240),
              (0.868, 0.232), (0.842, 0.218), (0.816, 0.208), (0.790, 0.203), (0.745, 0.199),
              (0.700, 0.199), (0.640, 0.204), (0.560, 0.210)]
    profile = [(1.000, -0.215, -0.005), (0.975, -0.240, 0.030), (0.946, -0.255, 0.050),
               (0.920, -0.265, 0.062), (0.895, -0.272, 0.070), (0.842, -0.278, 0.077),
               (0.790, -0.281, 0.080), (0.700, -0.285, 0.084), (0.640, -0.289, 0.088),
               (0.560, -0.294, 0.094)]

    def side(z):
        for (z0, f0, b0), (z1, f1, b1) in zip(profile, profile[1:]):
            if z1 <= z <= z0:
                t = (z0 - z) / (z0 - z1)
                return f0 + (f1 - f0) * t, b0 + (b1 - b0) * t
        return profile[-1][1:]

    rings = list(neck)
    for z, rx in widths:
        f, b = side(z)
        rings.append((z, 0.0, rx, (f + b) / 2, (b - f) / 2, None))
    return [loft("Torso", rings, {}, mats["skin"], "Spine1", n=48, p=2.3)]


def build_sam_hair(mats, traced):
    """Sam's short, tousled cut: a scalp cap and overlapping solid locks.

    Angles run from the forehead (0) through +X (90) to the nape (180).
    All sizes are metres; the reference sheet, rather than the old traced
    hairstyle, determines the fringe and the rounded rear volume.
    """
    out = []
    centre = Vector((0.0, -0.015, 1.620))
    rx, ry, rz = 0.520, 0.570, 0.510
    back_ry = 0.490
    power = 2.55

    def signed_power(v, p):
        return math.copysign(abs(v) ** p, v)

    def shell(theta, phi):
        a, b = math.radians(theta), math.radians(phi)
        r = math.sin(b) ** (2 / 2.3)
        depth = back_ry if math.cos(a) < 0 else ry
        p = centre + Vector((rx * r * signed_power(math.sin(a), 2 / power),
                             -depth * r * signed_power(math.cos(a), 2 / power),
                             rz * signed_power(math.cos(b), 2 / 2.3)))
        p.x *= 0.64 + 0.36 * smoothstep(1.17, 1.49, p.z)
        return p

    def outward(p):
        d = p - centre
        depth = back_ry if d.y > 0 else ry
        return Vector((d.x / rx ** 2, d.y / depth ** 2, d.z / rz ** 2)).normalized()

    # A closed cap with a high forehead edge, low temples, an ear notch and
    # continuous coverage immediately behind the ears down to the nape.
    # Raycasting guards against the traced skull's flatter front and crown.
    edge = [(0, 1.960), (45, 1.925), (60, 1.740), (73, 1.445),
            (85, 1.495), (94, 1.495), (102, 1.330),
            (111, 1.250), (122, 1.235), (140, 1.20), (180, 1.165)]

    def edge_z(theta):
        theta = abs((theta + 180) % 360 - 180)
        for (a, za), (b, zb) in zip(edge, edge[1:]):
            if a <= theta <= b:
                return za + (zb - za) * smoothstep(a, b, theta)
        return edge[-1][1]

    bm = bmesh.new()
    cap_rings = []
    sectors, levels = 72, 20
    for j in range(1, levels + 1):
        ring = []
        for k in range(sectors):
            theta = k * 360 / sectors
            c = (edge_z(theta) - centre.z) / rz
            phi_end = math.degrees(math.acos(signed_power(c, 2.3 / 2)))
            p = shell(theta, phi_end * j / levels)
            direction = (p - centre).normalized()
            hit, _n, _i, _d = SURF["bvh"].ray_cast(centre + direction * 3, -direction)
            if hit is not None and (hit - centre).length + 0.025 > (p - centre).length:
                p = hit + direction * 0.025
            ring.append(bm.verts.new(p))
        cap_rings.append(ring)
    pole = bm.verts.new(shell(0, 0))
    bottom = bm.verts.new((0, 0.0, 1.62))
    for k in range(sectors):
        kn = (k + 1) % sectors
        bm.faces.new((pole, cap_rings[0][k], cap_rings[0][kn]))
        bm.faces.new((bottom, cap_rings[-1][kn], cap_rings[-1][k]))
    for a, b in zip(cap_rings, cap_rings[1:]):
        for k in range(sectors):
            kn = (k + 1) % sectors
            bm.faces.new((a[k], b[k], b[kn], a[kn]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    cap = obj_from_bmesh("SamHairCap", bm, mats["hair"])
    assign_rigid(cap, "Head")
    out.append(cap)

    def lock(name, controls, width, thick=0.045, lift=0.024, normal_hint=None):
        """Closed curved leaf with a broad shoulder and a soft pointed tip.

        The oval cross sections follow the scalp normal, so side/back locks
        have the same substantial thickness as the fringe. Roots sink into
        the cap; separate tips supply the ink lines in OutlineEffect.
        """
        points = spline(controls, 24)
        mesh = bmesh.new()
        rings = []
        for i, p in enumerate(points):
            t = i / (len(points) - 1)
            normal = Vector(normal_hint).normalized() if normal_hint else outward(p)
            tangent = (points[min(i + 1, len(points) - 1)] - points[max(0, i - 1)]).normalized()
            across = tangent.cross(normal).normalized()
            normal = across.cross(tangent).normalized()
            f = max(0.012, math.sin(math.pi * t) ** 0.72 * (1 - 0.52 * t) * 1.40)
            raised = lift * math.sin(math.pi * t) + 0.025 * smoothstep(0.65, 1.0, t)
            buried = 0.064 * (1 - smoothstep(0.08, 0.40, t))
            p = p + normal * (raised - buried)
            if not name.startswith("Tuft"):
                p.z -= 0.016 * smoothstep(0.83, 1.0, t)
            ring = []
            for k in range(12):
                a = k * math.tau / 12
                ring.append(mesh.verts.new(p + across * (width * f * math.cos(a))
                                          + normal * (thick * f ** 0.7 * math.sin(a))))
            rings.append(ring)
        for a, b in zip(rings, rings[1:]):
            for k in range(12):
                kn = (k + 1) % 12
                mesh.faces.new((a[k], b[k], b[kn], a[kn]))
        mesh.faces.new(list(reversed(rings[0])))
        mesh.faces.new(rings[-1])
        bmesh.ops.recalc_face_normals(mesh, faces=mesh.faces)
        ob = obj_from_bmesh("SamHair" + name, mesh, mats["hair"])
        assign_rigid(ob, "Head")
        out.append(ob)

    def swept(name, angles, width, thick=0.045, lift=0.024):
        controls = [shell(a, b) for a, b in angles]
        # Downward tips stay below their broad shoulders even near the nape,
        # where following the rounded cap alone would turn them back upwards.
        controls[-1].z -= 0.018 if name.startswith("Nape") else 0.040
        lock(name, controls, width, thick, lift)

    # Lower locks first; upper layers overlap and bury their narrow roots.
    for i, theta in enumerate((113, 142, 165, 188, 211, 234, 247)):
        tip = (141, 150, 146, 151, 145, 149, 137)[i]
        swept(f"Nape{i:02d}", [(theta - 9, 103), (theta - 6, 121),
                               (theta - 1, tip - 12), (theta + 5, tip)],
              0.116, 0.040, 0.024)
    for i, theta in enumerate((108, 134, 160, 186, 212, 238, 264)):
        tip = (102, 111, 105, 113, 106, 112, 101)[i]
        swept(f"BackLower{i:02d}", [(theta - 15, 68), (theta - 8, 82),
                                    (theta - 1, tip - 12), (theta + 7, tip)],
              0.137, 0.042, 0.024)
    for i, theta in enumerate((82, 111, 140, 180, 207, 232, 258, 282)):
        tip = (74, 72, 66, 84, 66, 74, 67, 78)[i]
        swept(f"Crown{i:02d}", [(theta - 24, 14), (theta - 14, 33),
                                (theta - 4, tip - 18), (theta + 5, tip)],
              0.166 if i == 3 else 0.149, 0.043, 0.026)
    for side, tag in ((1, "L"), (-1, "R")):
        swept("Temple" + tag, [(side * 44, 34), (side * 61, 61),
                               (side * 77, 85), (side * 78, 102)], 0.125, 0.043)
        swept("EarTop" + tag, [(side * 82, 44), (side * 89, 72),
                               (side * 96, 91), (side * 103, 105)], 0.120, 0.040)
        swept("Sideburn" + tag, [(side * 68, 68), (side * 75, 86),
                                 (side * 78, 99), (side * 76, 109)], 0.076, 0.032)

    def front_point(x, z):
        r = max(0.01, 1 - abs((z - centre.z) / rz) ** 2.3) ** (1 / 2.3)
        y = centre.y - ry * r * max(0.015, 1 - abs(x / (rx * r)) ** power) ** (1 / power)
        hit, _normal, _index, _distance = SURF["bvh"].ray_cast(Vector((x, -5, z)), Vector((0, 1, 0)))
        if hit is not None:
            y = min(y, hit.y - 0.026)
        return Vector((x, y - 0.014, z))

    # Asymmetric swept fringe: all forehead tips are above the brows.
    fringe = [
        ("FringeOuterR", [(-0.30, 2.06), (-0.40, 1.98), (-0.445, 1.86), (-0.445, 1.73)], 0.100),
        ("FringeR", [(-0.15, 2.115), (-0.265, 2.04), (-0.335, 1.94), (-0.36, 1.857)], 0.112),
        ("FringeSweep", [(-0.015, 2.13), (-0.12, 2.055), (-0.18, 1.95), (-0.205, 1.878)], 0.112),
        ("FringeCentre", [(0.10, 2.12), (0.025, 2.035), (-0.015, 1.925), (-0.045, 1.825)], 0.112),
        ("FringeSmall", [(0.14, 2.10), (0.17, 2.015), (0.18, 1.94), (0.155, 1.883)], 0.067),
        ("FringeL", [(0.20, 2.095), (0.30, 2.035), (0.35, 1.94), (0.355, 1.848)], 0.115),
        ("FringeOuterL", [(0.31, 2.06), (0.405, 1.97), (0.445, 1.84), (0.445, 1.71)], 0.105),
    ]
    for name, controls, width in fringe:
        lock(name, [front_point(x, z) for x, z in controls], width, 0.048, 0.023)

    # A small cowlick and two outward flicks break up the rounded crown.
    lock("TuftCentre", [(-0.01, -0.07, 2.095), (-0.06, -0.08, 2.205),
                        (-0.17, -0.065, 2.26), (-0.25, -0.05, 2.245)], 0.049, 0.032, 0.012, (0, -1, 0))
    lock("TuftL", [(0.045, 0.025, 2.095), (0.08, 0.03, 2.180),
                   (0.14, 0.04, 2.195), (0.195, 0.035, 2.18)], 0.040, 0.030, 0.01, (0, -1, 0))
    lock("TuftR", [(-0.18, 0.02, 2.075), (-0.28, 0.025, 2.15),
                   (-0.38, 0.02, 2.16), (-0.44, 0.015, 2.19)], 0.037, 0.030, 0.012, (0, -1, 0))
    triangles = sum(len(p.vertices) - 2 for ob in out for p in ob.data.polygons)
    if triangles >= 25000:
        raise RuntimeError(f"Sam's hair exceeds the 25k triangle budget: {triangles}")
    print(f"SAM HAIR: {len(out) - 1} solid locks + scalp cap, {triangles} triangles, rigid Head weights")
    return out


def sam_details(mats, traced):
    """Toony clothes as one-piece garments with real openings, and cartoon sneakers."""
    if CFG.get("body"):
        body = build_body(mats, BODY)
        out = [body] + build_fingers(mats)
        if not os.environ.get("FF_NO_CLOTHES"):
            out += body_clothes(mats, body)
    elif os.environ.get("FF_NO_SHIRT"):
        out = build_bare_torso(mats) + build_shorts(mats, traced)
    else:
        out = build_shirt(mats, traced) + build_shorts(mats, traced)
    for side, tag, flip in (("Right", "R", False), ("Left", "L", True)):
        out += sneaker(tag, side, traced, mats, flip)
    out += build_sam_hair(mats, traced)
    return out


def build_traced(mats):
    cfg = CFG
    parts = []
    vols = TRACE["volumes"]
    objs = {}
    order = ["head"] + [k for k in vols if k != "head"]   # head first: it is the face surface
    traced = {}
    for vname in order:
        v = vols[vname]
        mat_key, bone = cfg["parts"][vname]
        rows = v["rows"]
        zmin = cfg.get("min_z", {}).get(vname)
        if zmin is not None:
            rows = [r for r in rows if r[0] >= zmin]
        rings = ring_params(rows, v["sym"], smooth=cfg.get("smooth", {}).get(vname, 5))
        hold = cfg.get("hold_below", {}).get(vname)
        if hold is not None:
            # The sketch hides this part's lower end (inside a shoe): keep the
            # section at `hold` all the way down instead of the pinched trace.
            ref = ring_at(rings, hold)
            k = cfg.get("hold_scale", {}).get(vname, 1.0)
            ref = (ref[0], ref[1], ref[2] * k, ref[3], ref[4] * k, ref[5])
            rings = [r if r[0] >= hold else (r[0],) + tuple(ref[1:]) for r in rings]
        prof = cfg.get("head_profile") if vname == "head" else None
        if prof:
            def depth(z):
                t = min(abs(z - prof["zc"]) / prof["hh"], 1.0)
                return prof["depth"] / 2 * (1 - t ** prof["p"]) ** (1 / prof["p"])
            rings = [(r[0], r[1], r[2], prof["yc"], max(depth(r[0]), 0.02), r[5]) for r in rings]
        traced[vname] = rings
        if vname in cfg.get("skip", []):
            continue
        if vname in cfg.get("round_parts", []):
            # rounded blob sized from the traced outline (ears)
            zs = [r[0] for r in rings]
            x_lo = min(r[1] - r[2] for r in rings); x_hi = max(r[1] + r[2] for r in rings)
            y_lo = min(r[3] - r[4] for r in rings); y_hi = max(r[3] + r[4] for r in rings)
            sc = ((x_hi - x_lo) / 2, (y_hi - y_lo) / 2 * 0.7, (max(zs) - min(zs)) / 2)
            for side, tag, sgn in (("Right", "R", 1), ("Left", "L", -1)):
                c = (sgn * (x_lo + x_hi) / 2, (y_lo + y_hi) / 2, (max(zs) + min(zs)) / 2)
                ob = ellipsoid(f"{vname}_{tag}", sc, c, mats[mat_key], bone.format(side=side, tag=tag))
                objs[f"{vname}_{tag}"] = ob
                parts.append(ob)
            continue
        al = cfg.get("arm_line") if vname == "arm" else None
        if al:
            # The sketch's sleeve hides the upper arm and the trace ends in a
            # diagonal cut. Continue the arm up its own centre line instead.
            a, b = ring_at(rings, al["from"]), ring_at(rings, al["to"])
            dz = a[0] - b[0]
            sx, sy = (a[1] - b[1]) / dz, (a[3] - b[3]) / dz
            n = 8
            above = []
            for i in range(n, 0, -1):
                d = (al["top"] - a[0]) * i / n
                above.append((a[0] + d, a[1] + sx * d, a[2], a[3] + sy * d, a[4], a[5]))
            rings = above + [r for r in rings if r[0] <= a[0]]
        ext = cfg.get("extend", {}).get(vname)
        if ext:
            rings = extend_rings(rings, *ext)
        rings = dome(rings, *cfg.get("dome", {}).get(vname, (True, True)))
        bands = {b: mats[b] for b in ("fur", "cream") if b in mats}
        bands.setdefault("fur", mats[mat_key])
        if v["mirror"]:
            for side, tag, flip in (("Right", "R", False), ("Left", "L", True)):
                ob = loft(f"{vname}_{tag}", rings, bands, mats[mat_key], bone.format(side=side, tag=tag), flip=flip)
                objs[f"{vname}_{tag}"] = ob
                parts.append(ob)
        else:
            ob = loft(vname, rings, bands, mats[mat_key], bone.format(side="", tag=""),
                      p=cfg.get("loft_p", {}).get(vname, 2.15))
            objs[vname] = ob
            parts.append(ob)
        if vname == "head":
            set_surface(ob)

    # Decals: traced colour regions projected onto their part
    for d in TRACE.get("decals", []):
        mat = mats[cfg["decal_mats"][d["name"]]]
        target = d["on"]
        if target in objs:
            set_surface(objs[target])
            ob = decal_rows(d["name"], d["rows"], mat, cfg["parts"][target][1].format(side="", tag=""))
            if ob:
                parts.append(ob)
        else:   # mirrored part: decal traced on the character's right; copy to the left
            for tag, side, flip in (("R", "Right", False), ("L", "Left", True)):
                set_surface(objs[f"{target}_{tag}"])
                bone = cfg["parts"][target][1].format(side=side, tag=tag)
                ob = decal_rows(d["name"], d["rows"], mat, bone, flip=flip)
                if ob:
                    parts.append(ob)
    set_surface(objs["head"])

    if cfg.get("details"):
        parts += globals()[cfg["details"]](mats, traced)

    if cfg.get("tail"):
        pts = spline(cfg["tail"], 28)
        tail = obj_from_bmesh("Tail", tube_bm(pts, lambda t: 0.085 - 0.015 * t, 16), mats["skin"])
        assign_rigid(tail, "Hips")
        parts.append(tail)
        tip = ellipsoid("TailTip", (0.08, 0.075, 0.075), pts[-1], mats["cream"], "Hips")
        parts.append(tip)

    if cfg.get("whiskers"):
        for s in (1, -1):
            for dz0, dz1 in ((0.0, 0.03), (-0.035, -0.06)):
                z0 = L.mouth_z + 0.03 + dz0
                pts, last_y = [], None
                for i in range(11):
                    tt = i / 10
                    x, z = (L.mouth_half_w + 0.12 + 0.3 * tt) * s, z0 + (dz1 - dz0) * tt
                    try:
                        last_y = surf_y(x, z, 0.012)
                    except RuntimeError:
                        pass
                    pts.append(Vector((x, last_y, z)))
                wh = obj_from_bmesh("Whisker", tube_bm(pts, lambda t: 0.0055, 6), mats["whisker"])
                assign_rigid(wh, "Head")
                parts.append(wh)

    parts += build_face(mats)
    return parts


# --------------------------------------------------------------------------
# Meshes: face (shared by all characters)
# --------------------------------------------------------------------------

def surf_hit(x, z):
    """Front surface point and outward normal at (x, z) in front view."""
    hit, nrm, _i, _d = SURF["bvh"].ray_cast(Vector((x, -5.0, z)), Vector((0, 1, 0)))
    xi = x
    while hit is None and abs(xi) > 1e-3:      # off the head's edge: step inwards
        xi *= 0.97
        hit, nrm, _i, _d = SURF["bvh"].ray_cast(Vector((xi, -5.0, z)), Vector((0, 1, 0)))
    if hit is None:
        return Vector((x, -0.3, z)), Vector((0, -1, 0))
    hit = Vector((x, hit.y, z))
    if nrm.y > 0:
        nrm = -nrm
    return hit, nrm


def painted(name, xe, ze, ax, az, height, mat, bone, back=0.001, nr=10, na=48):
    """A thin lens painted onto the head: an oval in front-view coordinates
    (x, z), each point lifted off the skin along its normal by height(x, z).
    It bends round the head like Pillow's eyes, so it reads from the side too."""
    bm = bmesh.new()

    def place(x, z, h):
        pt, nrm = surf_hit(x, z)
        return pt + nrm * h

    centre = bm.verts.new(place(xe, ze, height(xe, ze)))
    rows = []
    for i in range(1, nr + 1):
        rho = math.sin(math.pi / 2 * i / nr)
        row = []
        for k in range(na):
            a = 2 * math.pi * k / na
            x, z = xe + ax * rho * math.cos(a), ze + az * rho * math.sin(a)
            row.append(bm.verts.new(place(x, z, height(x, z))))
        rows.append(row)
    rim_back = []
    for k in range(na):
        a = 2 * math.pi * k / na
        x, z = xe + ax * math.cos(a), ze + az * math.sin(a)
        rim_back.append(bm.verts.new(place(x, z, back)))
    cb = bm.verts.new(place(xe, ze, back))
    for k in range(na):
        k2 = (k + 1) % na
        bm.faces.new((centre, rows[0][k], rows[0][k2]))
        for i in range(nr - 1):
            bm.faces.new((rows[i][k], rows[i + 1][k], rows[i + 1][k2], rows[i][k2]))
        bm.faces.new((rows[-1][k], rim_back[k], rim_back[k2], rows[-1][k2]))
        bm.faces.new((cb, rim_back[k2], rim_back[k]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = obj_from_bmesh(name, bm, mat)
    assign_rigid(ob, bone)
    return ob


def lid_sheet(name, xe, x0, x1, z_lo, z_hi, lift, mat, bone, nx=28, nz=18):
    """Skin-coloured sheet over the eye, conformed to the head. z_lo / z_hi are
    functions of x. The renderer clips it to the eye white, so only the part
    over the white ever shows; sliding it is a blink or a squint."""
    bm = bmesh.new()
    grid = []
    for i in range(nx + 1):
        x = x0 + (x1 - x0) * i / nx
        lo, hi = z_lo(x), z_hi(x)
        col = []
        for j in range(nz + 1):
            z = lo + (hi - lo) * j / nz
            pt, nrm = surf_hit(x, z)
            col.append(bm.verts.new(pt + nrm * lift))
        grid.append(col)
    for i in range(nx):
        for j in range(nz):
            bm.faces.new((grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if sum(f.normal.y for f in bm.faces) > 0:
        bmesh.ops.reverse_faces(bm, faces=bm.faces)
    ob = obj_from_bmesh(name, bm, mat)
    assign_rigid(ob, bone)
    return ob


# Painted-eye lid travel, in units of the white's radius
PAINT = dict(rest=0.92, edge_w=1.06, blink=1.95, wide=0.12, squint=0.85,
             white_lift=0.004, white_dome=0.010, lid_lift=0.020, lash_r=0.0075)


def build_painted_eye(tag, s, mats):
    r = L.eye_r
    a = math.sqrt(max(r * r - L.eye_sink ** 2, 1e-6))    # same visible size as the sphere eye
    xe, ze = L.eye_x * s, L.eye_z
    ik = getattr(L, "iris_k", 1.0)
    P = PAINT

    def white_h(x, z):
        rho2 = ((x - xe) ** 2 + (z - ze) ** 2) / (a * a)
        return P["white_lift"] + P["white_dome"] * math.sqrt(max(0.0, 1 - rho2))

    parts = [
        painted(f"Eye_{tag}", xe, ze, a, a, white_h, mats["eye"], f"Eye_{tag}"),
        painted(f"Iris_{tag}", xe, ze, 0.61 * r * ik, 0.69 * r * ik,
                lambda x, z: white_h(x, z) + 0.0015, mats["iris"], f"Eye_{tag}",
                back=P["white_lift"] + 0.002),
        painted(f"Pupil_{tag}", xe, ze + 0.02 * r, 0.40 * r * ik, 0.46 * r * ik,
                lambda x, z: white_h(x, z) + 0.003, mats["pupil"], f"Eye_{tag}",
                back=P["white_lift"] + 0.003),
        painted(f"Highlight_{tag}", xe - 0.21 * r * s, ze + 0.29 * r, 0.18 * r, 0.18 * r,
                lambda x, z: white_h(x, z) + 0.0045, mats["highlight"], f"Eye_{tag}",
                back=P["white_lift"] + 0.004),
    ]
    re = P["edge_w"] * a

    def arc(x, k):
        return k * a * math.sqrt(max(0.0, 1 - ((x - xe) / re) ** 2))

    def up_edge(x):
        return ze + arc(x, P["rest"])

    x0, x1 = xe - 1.3 * a, xe + 1.3 * a
    top = ze + a * (1 + P["blink"]) + 0.03
    parts.append(lid_sheet(f"LidUp_{tag}", xe, x0, x1, up_edge, lambda x: top, P["lid_lift"],
                           mats["lid"], f"LidUp_{tag}"))
    bottom = ze - a * (1 + P["squint"]) - 0.03
    parts.append(lid_sheet(f"LidLow_{tag}", xe, x0, x1, lambda x: bottom, lambda x: ze - arc(x, P["edge_w"]),
                           P["lid_lift"], mats["lid"], f"LidLow_{tag}"))
    # Lash line along the upper lid's edge; clipped to the white like the lid.
    pts = []
    for k in range(41):
        x = xe - re + 2 * re * k / 40
        pt, nrm = surf_hit(x, up_edge(x))
        pts.append(pt + nrm * (P["lid_lift"] + 0.002))
    lash = obj_from_bmesh(f"Lash_{tag}", tube_bm(pts, lambda t: P["lash_r"], 10), mats["lash"])
    assign_rigid(lash, f"LidUp_{tag}")
    parts.append(lash)
    return parts


def build_face(mats):
    parts = []
    r = L.eye_r
    for tag, s in (("L", 1), ("R", -1)):
        ec = eye_centre(s)
        if getattr(L, "painted_eyes", False):
            parts += build_painted_eye(tag, s, mats)
            parts.append(build_brow(tag, s, mats))
            p0 = surf_point(0.04 * s, L.sneer_z, -0.03)
            bm = sphere_bm(1.0, 16, 8)
            for v in bm.verts:
                v.co = Vector((v.co.x * 0.034, v.co.y * 0.012, v.co.z * 0.009))
                v.co = Quaternion((0, 1, 0), math.radians(-25 * s)) @ v.co
                v.co += p0
            wr = obj_from_bmesh(f"Wrinkle_{tag}", bm, mats["brow"])
            assign_rigid(wr, "Sneer")
            parts.append(wr)
            continue

        bm = sphere_bm(r, 32, 16)
        transform_bm(bm, loc=ec)
        eye = obj_from_bmesh(f"Eye_{tag}", bm, mats["eye"])
        assign_rigid(eye, f"Eye_{tag}")
        parts.append(eye)

        bm = sphere_bm(1.0, 24, 12)
        ik = getattr(L, 'iris_k', 1.0)
        transform_bm(bm, scale=(0.61 * r * ik, 0.29 * r, 0.69 * r * ik), loc=ec + Vector((0, -r + 0.21 * r, 0)))
        iris = obj_from_bmesh(f"Iris_{tag}", bm, mats["iris"])
        assign_rigid(iris, f"Eye_{tag}")
        parts.append(iris)

        bm = sphere_bm(1.0, 24, 12)
        transform_bm(bm, scale=(0.40 * r * ik, 0.29 * r, 0.46 * r * ik), loc=ec + Vector((0, -r + 0.16 * r, 0.02 * r)))
        pupil = obj_from_bmesh(f"Pupil_{tag}", bm, mats["pupil"])
        assign_rigid(pupil, f"Eye_{tag}")
        parts.append(pupil)

        bm = sphere_bm(1.0, 16, 8)
        transform_bm(bm, scale=(0.18 * r, 0.1 * r, 0.18 * r),
                     loc=ec + Vector((-0.21 * r * s, -r - 0.06 * r, 0.29 * r)))
        hl = obj_from_bmesh(f"Highlight_{tag}", bm, mats["highlight"])
        assign_rigid(hl, f"Eye_{tag}")
        parts.append(hl)

        # Upper lid: top hemisphere shell, rotated so its front edge sits at
        # lid_up_rest elevation. Positive rotation about +X lowers the edge.
        bm = sphere_bm(r * 1.045, 40, 20)
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -1e-5], context="VERTS")
        transform_bm(bm, rot_x_deg=-L.lid_up_rest, loc=ec)
        lid = obj_from_bmesh(f"LidUp_{tag}", bm, mats["skin"])
        assign_rigid(lid, f"LidUp_{tag}")
        parts.append(lid)

        bm = sphere_bm(r * 1.04, 40, 20)
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z > 1e-5], context="VERTS")
        transform_bm(bm, rot_x_deg=-L.lid_low_rest, loc=ec)
        lid = obj_from_bmesh(f"LidLow_{tag}", bm, mats["skin"])
        assign_rigid(lid, f"LidLow_{tag}")
        parts.append(lid)

        parts.append(build_brow(tag, s, mats))

        # Sneer wrinkle: small bar hidden inside the face at rest
        p0 = surf_point(0.04 * s, L.sneer_z, -0.03)
        bm = sphere_bm(1.0, 16, 8)
        for v in bm.verts:
            v.co = Vector((v.co.x * 0.034, v.co.y * 0.012, v.co.z * 0.009))
            v.co = Quaternion((0, 1, 0), math.radians(-25 * s)) @ v.co
            v.co += p0
        wr = obj_from_bmesh(f"Wrinkle_{tag}", bm, mats["brow"])
        assign_rigid(wr, "Sneer")
        parts.append(wr)

    # Nose: small rounded nub, lifted by the sneer
    nx, ny, nz = L.nose_size
    p = surf_point(0, L.nose_z, -0.4 * ny)
    bm = sphere_bm(1.0, 24, 14)
    transform_bm(bm, scale=(nx, ny, nz), loc=p)
    nose = obj_from_bmesh("Nose", bm, mats["nose"])
    assign_rigid(nose, "Nose")
    parts.append(nose)

    parts.append(build_mouth(mats))
    return parts


def build_brow(tag, s, mats):
    p0, p1, p2 = (Vector(p) for p in (L.brow_in, L.brow_mid, L.brow_out))
    ctrl = 2 * p1 - 0.5 * (p0 + p2)   # quadratic bezier passing through brow_mid
    pts = []
    for i in range(25):
        t = i / 24
        a = (1 - t) ** 2 * p0 + 2 * (1 - t) * t * ctrl + t * t * p2
        pts.append(surf_point(a.x * s, a.y, L.brow_off))
    bm = tube_bm(pts, lambda t: L.brow_r * (0.8 + 0.2 * math.sin(math.pi * t) ** 0.5), 12, flat=0.6)
    ob = obj_from_bmesh(f"Brow_{tag}", bm, mats["brow"])
    x_in, x_out = L.brow_in[0], L.brow_out[0]

    def w(co):
        t = smoothstep(x_in, x_out, abs(co.x))
        return {f"BrowInner_{tag}": 1 - t, f"BrowOuter_{tag}": t}

    assign_weights(ob, w)
    return ob


def mouth_edges(u):
    z_up = L.mouth_z + L.mouth_curve * u * u
    thick = 0.016 * math.sqrt(max(1 - u * u, 0)) + 0.006
    return z_up, thick


def build_mouth(mats):
    nu, nv = 32, 5
    bm = bmesh.new()
    grid = []
    for j in range(nv + 1):
        v = j / nv
        row = []
        for i in range(nu + 1):
            u = -1 + 2 * i / nu
            z_up, thick = mouth_edges(u)
            row.append(bm.verts.new(surf_point(u * L.mouth_half_w, z_up - thick * v, MOUTH_OFF)))
        grid.append(row)
    for j in range(nv):
        for i in range(nu):
            bm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if bm.faces[0].normal.y > 0:
        bmesh.ops.reverse_faces(bm, faces=bm.faces)
    ob = obj_from_bmesh("Mouth", bm, mats["mouth"])

    def w(co):
        u = co.x / L.mouth_half_w
        wc = smoothstep(0.25, 1.0, abs(u))
        side = "L" if u >= 0 else "R"
        z_up, thick = mouth_edges(u)
        v = max(0.0, min(1.0, (z_up - co.z) / thick))
        rest = 1 - wc
        return {f"MouthCorner_{side}": wc, "LipUp": rest * (1 - v), "Jaw": rest * v}

    assign_weights(ob, w)
    return ob


# --------------------------------------------------------------------------
# Feature poses (one action per feature)
# --------------------------------------------------------------------------

def feature_poses(arm):
    bones = arm.data.bones
    kx = L.mouth_half_w / REF_MOUTH_HALF_W   # horizontal mouth moves scale with mouth width

    def slide(name, dx, dz, off):
        h = bones[name].head_local
        y1 = surf_y(h.x + dx, h.z + dz, off)
        return {"loc": (dx, y1 - h.y, dz)}

    def brow(name, dx, dz):
        return slide(name, dx, dz, L.brow_off)

    def mouth(name, dx, dz):
        return slide(name, dx * kx, dz, MOUTH_OFF)

    X = (1, 0, 0)
    f = {}
    for tag, s in (("L", 1), ("R", -1)):
        f[f"browDown_{tag}"] = {
            f"BrowInner_{tag}": brow(f"BrowInner_{tag}", -0.02 * s, -0.05),
            f"BrowOuter_{tag}": brow(f"BrowOuter_{tag}", 0, -0.012),
        }
        f[f"browOuterUp_{tag}"] = {f"BrowOuter_{tag}": brow(f"BrowOuter_{tag}", 0, 0.06)}
        if getattr(L, "painted_eyes", False):
            a = math.sqrt(max(L.eye_r ** 2 - L.eye_sink ** 2, 1e-6))
            f[f"eyeBlink_{tag}"] = {f"LidUp_{tag}": {"loc": (0, 0, -PAINT["blink"] * a)}}
            f[f"eyeWide_{tag}"] = {f"LidUp_{tag}": {"loc": (0, 0, PAINT["wide"] * a)}}
            f[f"eyeSquint_{tag}"] = {f"LidLow_{tag}": {"loc": (0, 0, PAINT["squint"] * a)}}
        else:
            f[f"eyeBlink_{tag}"] = {f"LidUp_{tag}": {"rot": (X, L.lid_up_rest + 74)}}
            f[f"eyeWide_{tag}"] = {f"LidUp_{tag}": {"rot": (X, -(90 - L.lid_up_rest) - 4)}}
            f[f"eyeSquint_{tag}"] = {f"LidLow_{tag}": {"rot": (X, -68)}}
        f[f"mouthSmile_{tag}"] = {f"MouthCorner_{tag}": mouth(f"MouthCorner_{tag}", 0.015 * s, 0.055)}
        f[f"mouthFrown_{tag}"] = {f"MouthCorner_{tag}": mouth(f"MouthCorner_{tag}", -0.005 * s, -0.05)}
        f[f"mouthStretch_{tag}"] = {f"MouthCorner_{tag}": mouth(f"MouthCorner_{tag}", 0.04 * s, -0.02)}

    f["browInnerUp"] = {
        "BrowInner_L": brow("BrowInner_L", 0, 0.07),
        "BrowInner_R": brow("BrowInner_R", 0, 0.07),
    }
    f["jawOpen"] = {
        "Jaw": mouth("Jaw", 0, -0.13),
        "LipUp": mouth("LipUp", 0, 0.012),
        "MouthCorner_L": mouth("MouthCorner_L", 0, -0.03),
        "MouthCorner_R": mouth("MouthCorner_R", 0, -0.03),
    }
    f["mouthPucker"] = {
        "MouthCorner_L": mouth("MouthCorner_L", -0.05, 0),
        "MouthCorner_R": mouth("MouthCorner_R", 0.05, 0),
        "LipUp": mouth("LipUp", 0, 0.005),
        "Jaw": mouth("Jaw", 0, -0.005),
    }
    f["mouthPress"] = {
        "MouthCorner_L": mouth("MouthCorner_L", -0.01, 0),
        "MouthCorner_R": mouth("MouthCorner_R", 0.01, 0),
        "LipUp": mouth("LipUp", 0, -0.004),
        "Jaw": mouth("Jaw", 0, 0.004),
    }
    f["mouthUpperUp"] = {
        "LipUp": mouth("LipUp", 0, 0.035),
        "MouthCorner_L": mouth("MouthCorner_L", 0, 0.006),
        "MouthCorner_R": mouth("MouthCorner_R", 0, 0.006),
    }
    f["noseSneer"] = {
        "Sneer": {"loc": (0, -0.036, 0)},
        "Nose": slide("Nose", 0, 0.016, 0.0),
        "LipUp": mouth("LipUp", 0, 0.015),
        "BrowInner_L": brow("BrowInner_L", -0.01, -0.015),
        "BrowInner_R": brow("BrowInner_R", 0.01, -0.015),
    }
    # Accent part (Pip's sprout, Miso's ears, Sam's hair tuft)
    f.update(ACCENT_POSES)
    return f


def make_actions(arm, poses):
    arm.animation_data_create()
    for pb in arm.pose.bones:
        pb.rotation_mode = "QUATERNION"
    for name, pose in poses.items():
        act = bpy.data.actions.new(name)
        act.use_fake_user = True
        arm.animation_data.action = act
        for bname, p in pose.items():
            pb = arm.pose.bones[bname]
            bone = arm.data.bones[bname]
            r3 = bone.matrix_local.to_3x3()
            rq = bone.matrix_local.to_quaternion()
            pb.location = (0, 0, 0)
            pb.rotation_quaternion = (1, 0, 0, 0)
            pb.keyframe_insert("location", frame=0)
            pb.keyframe_insert("rotation_quaternion", frame=0)
            pb.location = r3.inverted() @ Vector(p.get("loc", (0, 0, 0)))
            if "rot" in p:
                axis, deg = p["rot"]
                qa = Quaternion(Vector(axis), math.radians(deg))
                pb.rotation_quaternion = rq.inverted() @ qa @ rq
            pb.keyframe_insert("location", frame=1)
            pb.keyframe_insert("rotation_quaternion", frame=1)
            pb.location = (0, 0, 0)
            pb.rotation_quaternion = (1, 0, 0, 0)
        # LINEAR keys: CUBICSPLINE samplers broke additive rotations in three.js
        for layer in act.layers:
            for strip in layer.strips:
                for cb in strip.channelbags:
                    for fc in cb.fcurves:
                        for kp in fc.keyframe_points:
                            kp.interpolation = "LINEAR"
        arm.animation_data.action = None
    return list(poses)


# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------

def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    name = argv[0] if argv else "pip"
    cfg = CHARACTERS[name]
    CFG.clear()
    CFG.update(cfg)
    if cfg.get("traced"):
        load_trace(name)
        L.__dict__.update(traced_layout(cfg))
    else:
        L.__dict__.update(cfg["layout"])
    ACCENT_POSES.update(cfg.get("accent_poses", {}))

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps = 24

    colors = {
        "eye": "#ffffff", "iris": "#7a4a2a", "pupil": "#1d1630",
        "highlight": "#ffffff", "mouth": "#5b1f2e", **cfg["colors"],
    }
    if "skin_dark" in colors:
        colors.setdefault("stripe", colors["skin_dark"])
    if cfg.get("layout", {}).get("painted_eyes"):
        colors["lid"] = colors["skin"]
        colors["lash"] = "#2a1a1e"
    mat_names = {
        "skin": "Skin", "skin_dark": "SkinDark", "brow": "Brow", "eye": "EyeWhite",
        "iris": "Iris", "pupil": "Pupil", "highlight": "Highlight", "mouth": "Mouth",
        "leaf": "Leaf", "stem": "Stem", "shine": "Shine", "nose": "Nose",
        "cream": "Cream", "stripe": "Stripe", "ear_inner": "EarInner", "whisker": "Whisker",
        "hair": "Hair", "shirt": "Shirt", "shorts": "Shorts", "shoe": "Shoe", "pink": "EarInner",
        "collar": "Collar", "band": "Band", "sole": "Sole", "lace": "Lace",
        "lid": "Lid", "lash": "Lash",
    }
    mats = {k: material(mat_names.get(k, k.capitalize()), c) for k, c in colors.items()}

    # Meshes first (the face surface must exist before the face bones)
    parts = globals()[cfg["builder"]](mats)
    arm = build_armature()

    bpy.ops.object.select_all(action="DESELECT")
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    mesh = bpy.context.view_layer.objects.active
    mesh.name = name.capitalize()
    mesh.parent = arm
    mod = mesh.modifiers.new("Armature", "ARMATURE")
    mod.object = arm

    feats = make_actions(arm, feature_poses(arm))

    os.makedirs(OUT_GLB, exist_ok=True)
    os.makedirs(OUT_BLEND, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT_BLEND, f"{name}.blend"))

    bpy.ops.object.select_all(action="DESELECT")
    arm.select_set(True)
    mesh.select_set(True)
    out = os.path.join(OUT_GLB, f"{name}.glb")
    bpy.ops.export_scene.gltf(
        filepath=out,
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_skins=True,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_force_sampling=False,
        export_optimize_animation_size=False,
    )
    print(f"EXPORTED {out} with {len(feats)} clips: {', '.join(feats)}")


main()
