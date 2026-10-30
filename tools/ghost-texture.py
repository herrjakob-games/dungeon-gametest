# Textur der Geister (docs/GDD.md, Quellen der Figuren in den Katakomben: Geist und Poltergeist aus KayKit Rogue):
# das grüne Outfit wird hellblau, alles andere bleibt. Helligkeitsverlauf bleibt, damit die Schattierung von KayKit erhalten ist.
# Aufruf: python3 tools/ghost-texture.py   (braucht Pillow)
import colorsys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets/source/kaykit-adventurers/rogue_texture.png"
OUT = ROOT / "assets/textures/figures/geist/geist_texture.png"
LIGHT_BLUE = 200 / 360  # Farbton Hellblau

im = Image.open(SRC).convert("RGBA")
px = im.load()
for y in range(im.height):
    for x in range(im.width):
        r, g, b, a = px[x, y]
        h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
        if 90 / 360 <= h <= 190 / 360 and s > 0.3:  # Grün- und Türkistöne des Outfits (auch Innenseite des Umhangs)
            r2, g2, b2 = colorsys.hls_to_rgb(LIGHT_BLUE, 0.6 + l * 0.4, min(s, 0.6))
            px[x, y] = (round(r2 * 255), round(g2 * 255), round(b2 * 255), a)
OUT.parent.mkdir(parents=True, exist_ok=True)
im.save(OUT)
print("geschrieben:", OUT.relative_to(ROOT))
