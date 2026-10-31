# Bereitet die gelieferten Sound-Rohdateien für das Spiel auf (docs/GDD.md, Abschnitt Sound).
# Liest assets/source/sounds-freepik/ (bleibt unverändert) und schreibt nach assets/sounds/:
# - Effekte: Stille am Anfang und Ende abschneiden, kurzes Ausblenden, zu leise Dateien lauter.
# - Schritte: aus einer Aufnahme mit vielen Schritten drei einzelne Schritte schneiden (_1 bis _3).
# - Loops: unverändert übernehmen (Schnittpunkte stehen in data/sounds.json).
# Aufruf: python3 tools/sound-prepare.py   (braucht ffmpeg), danach npm run sounds
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets/source/sounds-freepik"
OUT = ROOT / "assets/sounds"

# Quelle → Ziel im Spiel
EFFECTS = {
    "angriff/axt_fehl.mp3": "angriff/axt_fehl_1.mp3", "angriff/axt_treffer.mp3": "angriff/axt_treffer_1.mp3",
    "angriff/faust_fehl.mp3": "angriff/faust_fehl_1.mp3", "angriff/hammer_fehl.mp3": "angriff/hammer_fehl_1.mp3",
    "angriff/hammer_treffer.mp3": "angriff/hammer_treffer_1.mp3",
    "angriff/schwert_fehl_1.mp3": "angriff/schwert_fehl_1.mp3", "angriff/schwert_fehl_2.mp3": "angriff/schwert_fehl_2.mp3",
    "angriff/schwert_treffer_1.mp3": "angriff/schwert_treffer_1.mp3", "angriff/schwert_treffer_2.mp3": "angriff/schwert_treffer_2.mp3",
    "events/knocking_stone.mp3": "events/klopfen_stein.mp3",
    "raum/cozy_zufall_1.mp3": "raum/cozy_zufall_1.mp3", "raum/cozy_zufall_2.mp3": "raum/cozy_zufall_2.mp3",
    "spiel/gold.mp3": "spiel/gold.mp3", "spiel/gold_zahlen.mp3": "spiel/gold_zahlen.mp3", "spiel/tod.mp3": "spiel/tod.mp3",
    "spiel/truhe.mp3": "spiel/truhe.mp3", "spiel/tuer_riegel.mp3": "spiel/tuer_riegel.mp3",
    "spiel/tuer_1.mp3": "spiel/tuer_1.mp3", "spiel/tuer_2.mp3": "spiel/tuer_2.mp3", "spiel/tuer_3.mp3": "spiel/tuer_3.mp3",
    "spiel/treppe.mp3": "spiel/treppe.mp3", "spiel/tuer_verschlossen.mp3": "spiel/tuer_verschlossen.mp3",
    "spiel/tod_spieler.mp3": "spiel/tod_spieler.mp3", "zauber/trank.mp3": "zauber/trank.mp3",
    "angriff/holz_fehl_1.mp3": "angriff/holz_fehl_1.mp3", "angriff/holz_treffer_1.mp3": "angriff/holz_treffer_1.mp3",
    "angriff/holz_treffer_2.mp3": "angriff/holz_treffer_2.mp3",
    "raum/kitchen_zufall_1.mp3": "raum/kitchen_zufall_1.mp3", "raum/kitchen_zufall_2.mp3": "raum/kitchen_zufall_2.mp3",
    "raum/wet_zufall_1.mp3": "raum/wet_zufall_1.mp3",
    # Trippeln (Schritte der Ratten): je eine Aufnahme mit vielen Tapsern, gekürzt (MAXLEN)
    "schritte/trippeln_1.mp3": "schritte/trippeln_1.mp3", "schritte/trippeln_2.mp3": "schritte/trippeln_2.mp3",
    "schritte/trippeln_3.mp3": "schritte/trippeln_3.mp3",
    "angriff/faust_treffer_1.mp3": "angriff/faust_treffer_1.mp3", "angriff/faust_treffer_2.mp3": "angriff/faust_treffer_2.mp3",
    "angriff/faust_treffer_3.mp3": "angriff/faust_treffer_3.mp3",
    "raum/empty_zufall_1.mp3": "raum/empty_zufall_1.mp3", "raum/empty_zufall_2.mp3": "raum/empty_zufall_2.mp3",
    "raum/empty_zufall_3.mp3": "raum/empty_zufall_3.mp3",
    "raum/spooky_zufall_1.mp3": "raum/spooky_zufall_1.mp3", "raum/spooky_zufall_2.mp3": "raum/spooky_zufall_2.mp3",
    "raum/spooky_zufall_3.mp3": "raum/spooky_zufall_3.mp3", "raum/spooky_zufall_4.mp3": "raum/spooky_zufall_4.mp3",
    "raum/spooky_zufall_5.mp3": "raum/spooky_zufall_5.mp3", "raum/spooky_zufall_6.mp3": "raum/spooky_zufall_6.mp3",
    "zauber/eis.mp3": "zauber/eis.mp3", "zauber/feuerball.mp3": "zauber/feuerball.mp3",
    "zauber/feuerpfeil.mp3": "zauber/feuerpfeil.mp3", "zauber/schild.mp3": "zauber/schild.mp3",
    # Geist: Angriff, Treffer, Tod und Schweben (Bewegung statt Schritten, gekürzt mit MAXLEN)
    "angriff/geist_treffer_1.mp3": "angriff/geist_treffer_1.mp3", "spiel/treffer_geist.mp3": "spiel/treffer_geist.mp3",
    "spiel/tod_geist.mp3": "spiel/tod_geist.mp3", "schritte/schweben_1.mp3": "schritte/schweben_1.mp3",
    # Biss (Ratten, Mimik), Fehlschlag der Mimik, Stufenaufstieg, Tod der Skelette, Kerker und Schrein
    "angriff/biss_treffer_1.mp3": "angriff/biss_treffer_1.mp3", "angriff/biss_treffer_2.mp3": "angriff/biss_treffer_2.mp3",
    "angriff/mimik_fehl_1.mp3": "angriff/mimik_fehl_1.mp3", "angriff/mimik_fehl_2.mp3": "angriff/mimik_fehl_2.mp3",
    "spiel/stufe.mp3": "spiel/stufe.mp3", "spiel/tod_skeleton.mp3": "spiel/tod_skeleton.mp3",
    "raum/kerker_zufall_1.mp3": "raum/kerker_zufall_1.mp3", "raum/kerker_zufall_2.mp3": "raum/kerker_zufall_2.mp3",
    "raum/kerker_zufall_3.mp3": "raum/kerker_zufall_3.mp3", "raum/kerker_zufall_4.mp3": "raum/kerker_zufall_4.mp3",
    "raum/schrein_zufall_1.mp3": "raum/schrein_zufall_1.mp3", "raum/schrein_zufall_2.mp3": "raum/schrein_zufall_2.mp3",
    "raum/schrein_zufall_3.mp3": "raum/schrein_zufall_3.mp3",
}
# Zu leise Aufnahmen: Verstärkung in dB
GAIN = {"spiel/tuer_1.mp3": 20, "spiel/tuer_3.mp3": 6, "spiel/treppe.mp3": 4, "raum/cozy_zufall_2.mp3": 12,
        "raum/spooky_zufall_5.mp3": 18, "raum/spooky_zufall_6.mp3": 6, "spiel/tuer_verschlossen.mp3": 6,
        "schritte/trippeln_1.mp3": 20, "schritte/trippeln_2.mp3": 6, "schritte/trippeln_3.mp3": 14,
        "raum/kerker_zufall_4.mp3": 8, "raum/schrein_zufall_1.mp3": 16, "raum/schrein_zufall_2.mp3": 12,
        "raum/schrein_zufall_3.mp3": 14}
# Höchstlänge in Sekunden nach dem Abschneiden der Stille (ein Schritt soll kurz sein)
MAXLEN = {"schritte/trippeln_1.mp3": 0.6, "schritte/trippeln_2.mp3": 0.6, "schritte/trippeln_3.mp3": 0.6,
          "schritte/schweben_1.mp3": 1.2}
STEPS = ["wood", "hall", "mud", "gravel", "stone"]
LOOPS = ["raum/cozy_loop.mp3", "raum/kitchen_loop.mp3", "raum/spooky_loop.mp3", "raum/wet_loop.mp3", "raum/empty_loop.mp3",
         "raum/kerker_loop.mp3", "raum/schrein_loop.mp3"]
# Zu leise Loops: Verstärkung in dB (sonst unverändert übernommen)
LOOP_GAIN = {"raum/empty_loop.mp3": 12, "raum/kerker_loop.mp3": 12}


def ffmpeg(args, capture=False):
    return subprocess.run(["ffmpeg", "-hide_banner"] + args, check=not capture, capture_output=capture, text=True)


def duration(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                         capture_output=True, text=True).stdout
    return float(out)


def parts(path, below_peak):
    """Nicht stille Abschnitte [(start, ende)]; still heißt: mehr als below_peak dB unter der lautesten Stelle."""
    peak = float(re.search(r"max_volume: ([-0-9.]+) dB", ffmpeg(["-i", str(path), "-af", "volumedetect", "-f", "null", "-"], True).stderr).group(1))
    log = ffmpeg(["-i", str(path), "-af", "silencedetect=n=%.1fdB:d=0.06" % (peak - below_peak), "-f", "null", "-"], True).stderr
    marks = [(m.group(1), float(m.group(2))) for m in re.finditer(r"silence_(start|end): ([0-9.]+)", log)]
    out, t = [], 0.0
    for kind, v in marks:
        if kind == "start":
            if v - t > 0.02:
                out.append((t, v))
        else:
            t = v
    if (not marks or marks[-1][0] == "end") and duration(path) - t > 0.05:  # ein Rest unter 0,05 s am Dateiende ist kein Ton
        out.append((t, duration(path)))
    return out


def cut(src, dst, a, b, gain=0):
    dst.parent.mkdir(parents=True, exist_ok=True)
    fade = min(0.04, (b - a) / 4)
    af = "atrim=%.3f:%.3f,asetpts=PTS-STARTPTS,afade=t=in:d=0.005,afade=t=out:st=%.3f:d=%.3f" % (a, b, b - a - fade, fade)
    if gain:
        af += ",volume=%ddB" % gain
    ffmpeg(["-loglevel", "error", "-y", "-i", str(src), "-af", af, "-ac", "1", "-b:a", "96k", str(dst)])


for s, d in EFFECTS.items():
    p = parts(SRC / s, 40)
    a, b = max(0, p[0][0] - 0.01), p[-1][1] + 0.05
    if s in MAXLEN:
        b = min(b, a + MAXLEN[s])
    cut(SRC / s, OUT / d, a, min(b, duration(SRC / s)), GAIN.get(s, 0))
    print("%-34s %.2f bis %.2f s" % (d, a, b))

for f in STEPS:
    src = SRC / ("schritte/%s.mp3" % f)
    # Schwelle schrittweise senken, bis drei Schritte gefunden sind (leise Aufnahmen)
    for below in (25, 30, 35, 40, 45):
        steps = [(a, min(b, a + 0.45)) for a, b in parts(src, below) if b - a >= 0.08][:3]
        if len(steps) == 3:
            break
    for i, (a, b) in enumerate(steps, 1):
        cut(src, OUT / ("schritte/%s_%d.mp3" % (f, i)), max(0, a - 0.01), b)
    print("schritte/%-25s %d Schritte: %s" % (f, len(steps), ", ".join("%.2f bis %.2f" % s for s in steps)))

for s in LOOPS:
    (OUT / s).parent.mkdir(parents=True, exist_ok=True)
    if s in LOOP_GAIN:
        ffmpeg(["-loglevel", "error", "-y", "-i", str(SRC / s), "-af", "volume=%ddB" % LOOP_GAIN[s], "-b:a", "128k", str(OUT / s)])
    else:
        ffmpeg(["-loglevel", "error", "-y", "-i", str(SRC / s), "-c", "copy", str(OUT / s)])
    print("%-34s Loop übernommen" % s)
