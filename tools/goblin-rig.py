# Goblin auf das KayKit-Rig setzen (docs/GDD.md, Quellen der Figuren im Keller: Goblin mit KayKit-Animationen).
# Liest assets/source/goblin-lowpoly/Basic_Goblin.glb (eigenes Skelett, ohne Animationen) und das Rig_Medium aus
# assets/source/kaykit-character-animations/ (dasselbe Rig wie KayKit Adventurers und Skeletons) und schreibt
# assets/source/goblin-lowpoly/Goblin_KayKit.glb: die Goblin-Meshes an Rig_Medium, mit den Animationen unten.
# Ablauf: 1. Arme und Beine des Goblins in die Grundhaltung des Rigs drehen (T-Pose, Arme waagerecht).
#         2. Gelenke des Rigs auf die Gelenke des Goblins schieben (Richtung und Drehung der Knochen bleiben,
#            damit die Animationen passen); das Rig wird auf die Größe des Goblins verkleinert.
#         3. Die Gewichte des Goblins auf die Knochen des Rigs übertragen (Zuordnung MAP).
# Aufruf: python3 tools/goblin-rig.py   (braucht Blender als Python-Modul: pip install bpy), danach npm run build:assets
import os
import sys
import bpy
from mathutils import Matrix

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GOBLIN = os.path.join(ROOT, "assets/source/goblin-lowpoly/Basic_Goblin.glb")
ANIM = os.path.join(ROOT, "assets/source/kaykit-character-animations")
OUT = os.path.join(ROOT, "assets/source/goblin-lowpoly/Goblin_KayKit.glb")
FILES = ["Rig_Medium_General.glb", "Rig_Medium_MovementBasic.glb", "Rig_Medium_CombatMelee.glb", "Rig_Medium_Simulation.glb"]
CLIPS = ["Idle_A", "Walking_A", "Melee_1H_Attack_Stab", "Hit_A", "Death_A", "Interact",
         "Sit_Chair_Idle", "Sit_Floor_Idle", "Lie_Idle"]

# Knochen des Goblins → Knochen des Rigs (Gewichte werden zusammengezählt)
MAP = {"spine": "hips", "pelvis.L": "hips", "pelvis.R": "hips", "spine.001": "spine", "spine.002": "spine",
       "spine.003": "chest", "spine.004": "chest", "spine.005": "head", "spine.006": "head"}
for s, t in (("L", "l"), ("R", "r")):
    MAP.update({"shoulder." + s: "chest", "upper_arm." + s: "upperarm." + t, "forearm." + s: "lowerarm." + t,
                "hand." + s: "hand." + t, "thigh." + s: "upperleg." + t, "shin." + s: "lowerleg." + t,
                "foot." + s: "foot." + t, "heel.02." + s: "foot." + t, "toe." + s: "toes." + t})
# Goblin-Knochen, die in die Richtung des Rig-Knochens gedreht werden (Grundhaltung angleichen)
ALIGN = [(g + "." + s, k + "." + t) for s, t in (("L", "l"), ("R", "r"))
         for g, k in (("upper_arm", "upperarm"), ("forearm", "lowerarm"), ("hand", "wrist"), ("thigh", "upperleg"), ("shin", "lowerleg"))]
# Gelenk des Rigs ← Gelenk (Kopf) des Goblin-Knochens
JOINTS = {"hips": "spine", "spine": "spine.001", "chest": "spine.003", "head": "spine.005"}
for s, t in (("L", "l"), ("R", "r")):
    JOINTS.update({"upperarm." + t: "upper_arm." + s, "lowerarm." + t: "forearm." + s, "wrist." + t: "hand." + s,
                   "upperleg." + t: "thigh." + s, "lowerleg." + t: "shin." + s, "foot." + t: "foot." + s, "toes." + t: "toe." + s})


def imported(path):
    before = set(bpy.data.objects), set(bpy.data.actions)
    bpy.ops.import_scene.gltf(filepath=path)
    return [o for o in bpy.data.objects if o not in before[0]], [a for a in bpy.data.actions if a not in before[1]]


def remove(objs):
    for o in objs:
        bpy.data.objects.remove(o, do_unlink=True)


bpy.ops.wm.read_factory_settings(use_empty=True)

# Rig und Animationen
rig, actions = None, {}
for i, f in enumerate(FILES):
    objs, acts = imported(os.path.join(ANIM, f))
    arm = next(o for o in objs if o.type == "ARMATURE")
    for a in acts:
        name = a.name.split("_Rig_Medium")[0] if "_Rig_Medium" in a.name else a.name.split(".")[0]
        if name in CLIPS and name not in actions:
            actions[name] = a
            a.use_fake_user = True
    if i == 0:
        rig = arm
        remove([o for o in objs if o is not arm])
    else:
        remove(objs)
missing = [c for c in CLIPS if c not in actions]
if missing:
    sys.exit("Animationen fehlen: " + ", ".join(missing))

# Goblin
objs, _ = imported(GOBLIN)
meta = next(o for o in objs if o.type == "ARMATURE")
meshes = [o for o in objs if o.type == "MESH" and o.vertex_groups]
remove([o for o in objs if o.type == "MESH" and not o.vertex_groups])
bpy.context.view_layer.update()

# 1. Grundhaltung angleichen: Goblin-Knochen in die Richtung der Rig-Knochen drehen
rig_dir = {b.name: (rig.matrix_world.to_3x3() @ (b.tail_local - b.head_local)).normalized() for b in rig.data.bones}
for gname, kname in ALIGN:
    pb = meta.pose.bones[gname]
    bpy.context.view_layer.update()
    cur = (meta.matrix_world.to_3x3() @ (pb.tail - pb.head)).normalized()
    q = cur.rotation_difference(rig_dir[kname])
    head = pb.head.copy()
    pb.matrix = Matrix.Translation(head) @ q.to_matrix().to_4x4() @ Matrix.Translation(-head) @ pb.matrix
bpy.context.view_layer.update()
for m in meshes:
    bpy.context.view_layer.objects.active = m
    mod = next(x for x in m.modifiers if x.type == "ARMATURE")
    bpy.ops.object.modifier_apply(modifier=mod.name)
joint = {b.name: meta.matrix_world @ b.head for b in meta.pose.bones}
height = max(max((m.matrix_world @ v.co).z for v in m.data.vertices) for m in meshes)

# 2. Rig auf die Größe des Goblins, Gelenke auf die Gelenke des Goblins (Richtung und Drehung bleiben)
rig_height = max(b.head_local.z for b in rig.data.bones if b.name == "head") / 0.563  # Kopfgelenk liegt bei 56,3 % der Höhe
s = height / rig_height
rig.scale = (s, s, s)
bpy.context.view_layer.update()
inv = rig.matrix_world.inverted()
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode="EDIT")
eb = rig.data.edit_bones
orig = {b.name: (b.head.copy(), b.tail.copy(), b.roll) for b in eb}
for b in eb:
    b.use_connect = False
for kname, gname in JOINTS.items():
    h, t, roll = orig[kname]
    new = inv @ joint[gname]
    eb[kname].head, eb[kname].tail, eb[kname].roll = new, new + (t - h), roll
# Hand und Waffenplatz folgen dem Handgelenk mit dem verkleinerten Abstand des Rigs
for t in ("l", "r"):
    k = (eb["wrist." + t].head - eb["lowerarm." + t].head).length / (orig["wrist." + t][0] - orig["lowerarm." + t][0]).length
    for name, parent in (("hand." + t, "wrist." + t), ("handslot." + t, "hand." + t)):
        h, tl, roll = orig[name]
        new = eb[parent].head + (h - orig[parent][0]) * k
        eb[name].head, eb[name].tail, eb[name].roll = new, new + (tl - h), roll
bpy.ops.object.mode_set(mode="OBJECT")

# 3. Gewichte übertragen und an das Rig binden
for m in meshes:
    old = {g.index: g.name for g in m.vertex_groups}
    acc = {}
    for v in m.data.vertices:
        for g in v.groups:
            target = MAP.get(old[g.group])
            if target:
                acc.setdefault(target, {}).setdefault(v.index, 0.0)
                acc[target][v.index] += g.weight
    for g in list(m.vertex_groups):
        m.vertex_groups.remove(g)
    for target, weights in acc.items():
        vg = m.vertex_groups.new(name=target)
        for i, w in weights.items():
            vg.add([i], min(1.0, w), "REPLACE")
    world = m.matrix_world.copy()
    m.parent = rig
    m.matrix_world = world
    mod = m.modifiers.new("Armature", "ARMATURE")
    mod.object = rig
remove([meta])

# Animationen als NLA-Spuren (je Clip eine Animation in der GLB)
rig.animation_data_create()
for tr in list(rig.animation_data.nla_tracks):  # Spuren, die der Import angelegt hat
    rig.animation_data.nla_tracks.remove(tr)
for name in CLIPS:
    tr = rig.animation_data.nla_tracks.new()
    tr.name = name
    strip = tr.strips.new(name, 0, actions[name])
    tr.mute = True
rig.animation_data.action = None

bpy.ops.object.select_all(action="DESELECT")
rig.select_set(True)
for m in meshes:
    m.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", use_selection=True, export_animation_mode="NLA_TRACKS",
                          export_yup=True, export_apply=False)
print("geschrieben:", os.path.relpath(OUT, ROOT), "Maßstab des Rigs", round(s, 4))
