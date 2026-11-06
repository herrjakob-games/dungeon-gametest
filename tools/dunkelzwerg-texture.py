# Textur der Dunkelzwerge (docs/GDD.md, Stilguide, Dunkelzwerge): alle Zwerge in den Zwergenminen, Grundlage KayKit Knight wie
# beim Zwerg. Die Farbtafel hat Felder von 128 × 256 Pixeln. Umgefärbt werden nur drei Felder, der Helligkeitsverlauf bleibt:
#   Haut       Feld (0, 0)  x 0 bis 127,   y 0 bis 255    nur der Kopf (Knight_Head)        → #415158 graublau
#   Haare      Feld (1, 0)  x 128 bis 255, y 0 bis 255    Haare und Augenbrauen am Kopf     → #A0A8AB grau (wie der Bart)
#   Umhang     Feld (0, 1)  x 0 bis 127,   y 256 bis 511  Knight_Cape, dazu das Abzeichen    → #2F5FA8 blau
#              auf der Brust (Knight_Body nutzt dasselbe rote Feld; es wird mit blau)
# Der Schmied nutzt KayKit Barbarian: dort liegen Haut und Bart in denselben zwei Feldern (nur Barbarian_Head), Kleidung bleibt.
# Wie in tools/dwarf-texture.py gilt die Zielfarbe als linearer Wert und wird für die Textur nach sRGB umgerechnet, damit
# Haare und Bart (Materialfarbe) gleich aussehen. Die Spielfigur zwerg behält ihre eigene Textur.
# Aufruf: python3 tools/dunkelzwerg-texture.py   (braucht Pillow)
import io
import json
import struct
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SKIN = (0x41, 0x51, 0x58)
HAIR = (0xA0, 0xA8, 0xAB)
FACE = [((0, 0, 128, 256), SKIN), ((128, 0, 256, 256), HAIR)]  # Haut; Haare und Augenbrauen
TARGETS = [
    ("Knight.glb", "dunkelzwerg_texture.png", FACE + [((0, 256, 128, 512), (0x2F, 0x5F, 0xA8))]),  # dazu der Umhang
    ("Barbarian.glb", "dunkelschmied_texture.png", FACE),
]


def glb_image(path):
    data = path.read_bytes()
    jlen = struct.unpack_from("<I", data, 12)[0]
    j = json.loads(data[20:20 + jlen])
    bin0 = 20 + jlen + 8
    bv = j["bufferViews"][j["images"][0]["bufferView"]]
    start = bin0 + bv.get("byteOffset", 0)
    return Image.open(io.BytesIO(data[start:start + bv["byteLength"]])).convert("RGBA")


to_lin = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
to_srgb = lambda c: c * 12.92 if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055
lum = lambda r, g, b: 0.2126 * to_lin(r / 255) + 0.7152 * to_lin(g / 255) + 0.0722 * to_lin(b / 255)

for source, name, fields in TARGETS:
    im = glb_image(ROOT / "assets/source/kaykit-adventurers" / source)
    assert im.size == (1024, 1024), im.size
    px = im.load()
    for (x0, y0, x1, y1), color in fields:
        cells = [(x, y) for y in range(y0, y1) for x in range(x0, x1)]
        mean = sum(lum(*px[x, y][:3]) for x, y in cells) / len(cells)
        for x, y in cells:
            r, g, b, a = px[x, y]
            f = lum(r, g, b) / mean  # Verlauf und Kanten des Felds bleiben erhalten
            px[x, y] = tuple(round(255 * min(1, to_srgb(min(1, c / 255 * f)))) for c in color) + (a,)
    out = ROOT / "assets/textures/figures/dunkelzwerg" / name
    out.parent.mkdir(parents=True, exist_ok=True)
    im.save(out)
    print("geschrieben:", out.relative_to(ROOT))
