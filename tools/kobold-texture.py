# Texturen mit anderer Hautfarbe für das Goblin-Modell (docs/GDD.md, Figuren): Kobold mit roter Haut (#B5402E), vorläufiger
# Ork (ausbrecher_ork, bis es ein Ork-Modell gibt) mit grauer Haut (#A8AAA2). Die Goblin-Textur ist eine Farbtafel
# aus 3×3 Feldern zu je 100 Pixeln; die grüne Haut liegt allein im Feld oben links (Pixel 0 bis 99), das nur der Körper
# nutzt. Dieses Feld bekommt die neue Hautfarbe, der Helligkeitsverlauf bleibt. Kleidung, Augen und Waffe bleiben, wie sie sind.
# Die Farbe wird direkt als Texturfarbe gesetzt, weil sie die grüne Texturfarbe ersetzt (beide laufen gleich durchs Licht).
# Aufruf: python3 tools/kobold-texture.py   (braucht Pillow; liest assets/figures/goblin.glb, also nach npm run build:assets)
import io
import json
import struct
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets/figures/goblin.glb"
SKINS = {
    ROOT / "assets/textures/figures/kobold/kobold_texture.png": (0xB5, 0x40, 0x2E),
    ROOT / "assets/textures/figures/ork/ork_texture.png": (0xA8, 0xAA, 0xA2),
}
CELL = (0, 0, 100, 100)  # x0, y0, x1, y1


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

for OUT, SKIN in SKINS.items():
    im = glb_image(SRC)
    px = im.load()
    x0, y0, x1, y1 = CELL
    cells = [(x, y) for y in range(y0, y1) for x in range(x0, x1)]
    mean = sum(lum(*px[x, y][:3]) for x, y in cells) / len(cells)
    for x, y in cells:
        r, g, b, a = px[x, y]
        f = lum(r, g, b) / mean  # Verlauf des Felds bleibt erhalten
        px[x, y] = tuple(round(255 * min(1, to_srgb(min(1, to_lin(c / 255) * f)))) for c in SKIN) + (a,)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    im.save(OUT)
    print("geschrieben:", OUT.relative_to(ROOT))
