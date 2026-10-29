# Skelett-Textur auf die Knetkeller-Palette (docs/GDD.md, Stilguide): Farbton und Sättigung aus der Palette,
# Helligkeitsverlauf aus dem Original, damit die Schattierung von KayKit bleibt. Gleiche Größe und Lage wie das Original.
# Aufruf: python3 tools/skeleton-texture.py   (braucht Pillow)
import colorsys
from pathlib import Path
from PIL import Image
ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets/source/kaykit-skeletons/skeleton_texture.png"
OUT = ROOT / "assets/textures/figures/skeleton/skeleton_keller.png"
src, out = SRC, OUT
hexrgb = lambda h: tuple(int(h[i:i+2], 16) for i in (1, 3, 5))
P = {"knochen": hexrgb("#E2D3B4"), "gefahr": hexrgb("#C8432F"), "schatten": hexrgb("#2A2230"), "metall": hexrgb("#5E6168"),
     "akzent": hexrgb("#E8B23A"), "holz": hexrgb("#8A5A34"), "kuehl": hexrgb("#4E6670"), "moos": hexrgb("#6B7048")}
def shade(c, l, ref):
    # Farbton und Sättigung aus der Palette, Helligkeitsverlauf aus dem Original (leicht gedeckt)
    ph, pl, ps = colorsys.rgb_to_hls(*(v / 255 for v in c))
    r, g, b = colorsys.hls_to_rgb(ph, min(0.92, l * 0.92), min(ps, 0.75))
    return (round(r * 255), round(g * 255), round(b * 255))
def recolor(r, g, b):
    h, l, s = colorsys.rgb_to_hls(r/255, g/255, b/255); d = h * 360
    if l < 0.1: return P["schatten"]
    if s < 0.15: return shade(P["metall"], l, 0.5)
    if d < 15 or d >= 330: return shade(P["gefahr"], l, 0.45)
    if d < 45: return shade(P["knochen"], l, 0.75) if l > 0.45 else shade(P["holz"], l, 0.35)
    if d < 70: return shade(P["akzent"], l, 0.55)
    if d < 170: return shade(P["moos"], l, 0.45)
    if d < 260: return shade(P["kuehl"], l, 0.45)
    return shade(P["schatten"], l, 0.3)
im = Image.open(src).convert("RGBA"); px = im.load(); cache = {}
for y in range(im.height):
    for x in range(im.width):
        r, g, b, a = px[x, y]
        if (r, g, b) not in cache: cache[(r, g, b)] = recolor(r, g, b)
        px[x, y] = cache[(r, g, b)] + (a,)
im.save(out)
