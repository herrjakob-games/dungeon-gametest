# Textur der Geister (docs/GDD.md, Quellen der Figuren in den Katakomben: Geist und Poltergeist aus KayKit Rogue):
# das grüne Outfit wird hellblau, die Haut weiß (Feld 1|1 der Textur), die Haare grau (Feld 2|1), die Handschuhe
# (Feld 6|3, nur an den Armen) werden zu Händen in Hautfarbe, alles andere bleibt. Helligkeitsverlauf bleibt, damit die Schattierung von KayKit erhalten ist.
# Aufruf: python3 tools/ghost-texture.py   (braucht Pillow)
import colorsys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets/source/kaykit-adventurers/rogue_texture.png"
OUT = ROOT / "assets/textures/figures/geist/geist_texture.png"
LIGHT_BLUE = 200 / 360  # Farbton Hellblau
CELL_W, CELL_H = 128, 256  # Farbfelder der KayKit-Textur (8 × 4)

im = Image.open(SRC).convert("RGBA")
px = im.load()
for y in range(im.height):
    for x in range(im.width):
        r, g, b, a = px[x, y]
        h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
        cell = (x // CELL_W, y // CELL_H)
        if cell in ((0, 0), (5, 2)):  # Haut und Handschuhe: weiß, Schattierung bleibt
            v = round(255 * (0.82 + l * 0.18))
            px[x, y] = (v, v, v, a)
        elif cell == (1, 0):  # Haare: grau
            v = round(255 * (0.5 + l * 0.4))
            px[x, y] = (v, v, v, a)
        elif 90 / 360 <= h <= 190 / 360 and s > 0.3:  # Grün- und Türkistöne des Outfits (auch Innenseite des Umhangs)
            r2, g2, b2 = colorsys.hls_to_rgb(LIGHT_BLUE, 0.6 + l * 0.4, min(s, 0.6))
            px[x, y] = (round(r2 * 255), round(g2 * 255), round(b2 * 255), a)
OUT.parent.mkdir(parents=True, exist_ok=True)
im.save(OUT)
print("geschrieben:", OUT.relative_to(ROOT))
