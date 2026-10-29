# Textur des Zwergs (docs/GDD.md, Quellen der Figuren: Zwerg KayKit Knight): Haare und Augenbrauen bekommen die Farbe des
# Barts (#4A3020). Sie liegen im Feld (1,0) der Farbtafel (Pixel 128 bis 255, Zeile 0 bis 255), das nur der Kopf nutzt.
# Der Helligkeitsverlauf bleibt. Das Spiel gibt Texturen dunkler aus als Materialfarben (Textur sRGB, Ausgabe linear),
# deshalb wird die Bartfarbe als linearer Wert genommen und für die Textur nach sRGB umgerechnet.
# Aufruf: python3 tools/dwarf-texture.py   (braucht Pillow)
import io
import json
import struct
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets/source/kaykit-adventurers/Knight.glb"
OUT = ROOT / "assets/textures/figures/zwerg/zwerg_texture.png"
BEARD = (0x4A, 0x30, 0x20)
CELL = (128, 0, 256, 256)  # x0, y0, x1, y1


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

im = glb_image(SRC)
px = im.load()
x0, y0, x1, y1 = CELL
cells = [(x, y) for y in range(y0, y1) for x in range(x0, x1)]
mean = sum(lum(*px[x, y][:3]) for x, y in cells) / len(cells)
for x, y in cells:
    r, g, b, a = px[x, y]
    f = lum(r, g, b) / mean  # Verlauf und Kanten des Felds bleiben erhalten
    px[x, y] = tuple(round(255 * min(1, to_srgb(min(1, c / 255 * f)))) for c in BEARD) + (a,)
OUT.parent.mkdir(parents=True, exist_ok=True)
im.save(OUT)
print("geschrieben:", OUT.relative_to(ROOT))
