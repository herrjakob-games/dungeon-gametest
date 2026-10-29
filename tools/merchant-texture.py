# Textur des Händlers (docs/GDD.md, Quellen der Figuren: Händler KayKit Rogue umgefärbt): das grüne Outfit wird
# dunkelblau, alles andere bleibt. Helligkeitsverlauf bleibt, damit die Schattierung von KayKit erhalten ist.
# Aufruf: python3 tools/merchant-texture.py   (braucht Pillow)
import colorsys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets/source/kaykit-adventurers/rogue_texture.png"
OUT = ROOT / "assets/textures/figures/haendler/haendler_texture.png"
BLUE = 222 / 360  # Farbton Dunkelblau

im = Image.open(SRC).convert("RGBA")
px = im.load()
for y in range(im.height):
    for x in range(im.width):
        r, g, b, a = px[x, y]
        h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
        if 90 / 360 <= h <= 175 / 360 and s > 0.3:  # Grüntöne des Outfits
            r2, g2, b2 = colorsys.hls_to_rgb(BLUE, l * 0.95, min(s, 0.6))
            px[x, y] = (round(r2 * 255), round(g2 * 255), round(b2 * 255), a)
im.save(OUT)
print("geschrieben:", OUT.relative_to(ROOT))
