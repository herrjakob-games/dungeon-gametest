# Texturen der umgefärbten Waffen (docs/GDD.md, Asset-Spezifikation, Tabelle der Waffen). npm run build:assets setzt sie
# statt der Paket-Textur in die Waffen-Datei (Feld texture in tools/asset-recipes.json).
#   Eismesser:       Weapons-Bits-Textur, alle kühlen Metallflächen (blaugrau) werden eisblau #8CC8F0; Griff und Holz bleiben
#   Buch des Feuers: Textur des Mage (KayKit Adventurers), das Magenta des Einbands wird feuerrot #C8461E; Riemen und
#                    Beschläge bleiben
# Die Helligkeit jedes Pixels bleibt im Verhältnis erhalten (Verlauf und Kanten), wie bei den Figuren-Texturen.
# Aufruf: python3 tools/weapon-texture.py   (braucht Pillow)
import colorsys
import io
import json
import struct
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets/textures/weapons"

to_lin = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
to_srgb = lambda c: c * 12.92 if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055
lum = lambda r, g, b: 0.2126 * to_lin(r / 255) + 0.7152 * to_lin(g / 255) + 0.0722 * to_lin(b / 255)


def glb_image(path):
    data = path.read_bytes()
    jlen = struct.unpack_from("<I", data, 12)[0]
    j = json.loads(data[20:20 + jlen])
    bin0 = 20 + jlen + 8
    bv = j["bufferViews"][j["images"][0]["bufferView"]]
    start = bin0 + bv.get("byteOffset", 0)
    return Image.open(io.BytesIO(data[start:start + bv["byteLength"]])).convert("RGBA")


def recolor(im, match, hex_color):
    """Pixel, auf die match(r, g, b) passt, bekommen die Zielfarbe; die Helligkeit relativ zum Mittel der Treffer bleibt."""
    target = tuple(int(hex_color[i:i + 2], 16) / 255 for i in (1, 3, 5))
    px = im.load()
    hits = [(x, y) for y in range(im.height) for x in range(im.width) if match(*px[x, y][:3])]
    mean = sum(lum(*px[x, y][:3]) for x, y in hits) / len(hits)
    for x, y in hits:
        r, g, b, a = px[x, y]
        f = lum(r, g, b) / mean
        px[x, y] = tuple(round(255 * min(1, to_srgb(min(1, to_lin(c) * f)))) for c in target) + (a,)
    return len(hits)


def cool_metal(r, g, b):  # blaugraues Metall der Weapons Bits; Holz, Leder und Gold sind warm
    return b > r + 12 and b >= g


def magenta(r, g, b):  # Einband des Zauberbuchs
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    return s > 0.45 and v > 0.25 and (h > 0.85 or h < 0.0)


OUT.mkdir(parents=True, exist_ok=True)
jobs = [
    ("eismesser_texture.png", Image.open(ROOT / "assets/source/kaykit-weapons-bits/weapons_bits_texture.png").convert("RGBA"), cool_metal, "#8CC8F0"),
    ("feuerbuch_texture.png", glb_image(ROOT / "assets/source/kaykit-adventurers/Mage.glb"), magenta, "#C8461E"),
]
for name, im, match, color in jobs:
    n = recolor(im, match, color)
    im.save(OUT / name)
    print("geschrieben:", (OUT / name).relative_to(ROOT), "(" + str(n) + " Pixel umgefärbt)")
