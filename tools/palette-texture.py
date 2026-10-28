# Erste Fassung der Paletten-Textur (docs/GDD.md, Stilguide „Knetkeller“): färbt die KayKit-Farbfläche
# auf die Keller-Palette um. Gleiche Größe und Lage wie das Original, damit die UV-Koordinaten passen.
# Aufruf: python3 tools/palette-texture.py   (braucht Pillow)
# Danach justiert Christian die Datei assets/textures/keller/dungeon_texture.png in Photoshop nach.
import colorsys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets/source/kaykit-dungeon-remastered/texture/dungeon_texture.png"
OUT = ROOT / "assets/textures/keller/dungeon_texture.png"

def hexrgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))

P = {  # Keller-Palette aus dem Stilguide
    "boden": hexrgb("#5B4A3C"), "wand": hexrgb("#7A6552"), "holz": hexrgb("#8A5A34"), "metall": hexrgb("#5E6168"),
    "moos": hexrgb("#6B7048"), "kuehl": hexrgb("#4E6670"), "schatten": hexrgb("#2A2230"), "licht": hexrgb("#FF9A3C"),
    "akzent": hexrgb("#E8B23A"), "gold": hexrgb("#F2C14E"), "gefahr": hexrgb("#C8432F"),
}

def mix(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))

def shade(c, l):
    # Helligkeitsverlauf der Farbfläche behalten: dunkle Stellen dunkler, helle heller, gedeckt
    f = 0.45 + 1.1 * l
    return tuple(max(0, min(255, round(v * f))) for v in c)

def recolor(r, g, b):
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    deg = h * 360
    if l > 0.9:   # fast Weiß (Papier, Lichter): warmes Creme
        return mix((236, 226, 204), (255, 246, 228), (l - 0.9) * 10)
    if l < 0.08:  # fast Schwarz: Schattenfarbe, nie reines Schwarz
        return P["schatten"]
    if s < 0.18:
        # Graue Flächen sind bei KayKit Stein (Wände, Böden); nur sehr dunkle Grautöne werden Metall
        base = P["metall"] if l < 0.3 else mix(P["boden"], P["wand"], min(1, l * 1.4))
        return shade(base, l)
    if deg < 12 or deg >= 330:
        base = P["gefahr"] if s > 0.55 and l > 0.35 else P["holz"]
    elif deg < 42:
        base = P["licht"] if s > 0.8 and l > 0.5 else P["holz"]
    elif deg < 66:
        base = P["gold"]
    elif deg < 170:
        base = P["moos"]
    elif deg < 260:
        base = P["kuehl"]
    else:
        base = mix(P["schatten"], P["wand"], 0.5)
    return shade(base, l)

im = Image.open(SRC).convert("RGBA")
px = im.load()
cache = {}
for y in range(im.height):
    for x in range(im.width):
        r, g, b, a = px[x, y]
        key = (r, g, b)
        if key not in cache:
            cache[key] = recolor(r, g, b)
        px[x, y] = cache[key] + (a,)
OUT.parent.mkdir(parents=True, exist_ok=True)
im.save(OUT)
print("geschrieben:", OUT.relative_to(ROOT), im.size)
