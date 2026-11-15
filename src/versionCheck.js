// Versionsprüfung beim Start (docs/GDD.md, Technische Eckdaten): Die Daten lädt das Spiel immer frisch, die Programmdateien
// hält der Browser nach einem Update noch bis zu 10 Minuten im Zwischenspeicher. Passt der Stempel im Code (src/version.js)
// nicht zu data/version.json, holt das Spiel alle Programmdateien neu und lädt die Seite einmal neu. Ein Merker in der
// Sitzung verhindert eine Schleife: Klappt es beim zweiten Mal nicht, läuft das Spiel trotzdem weiter (Warnung in der Konsole).
import { CODE_VERSION } from "./version.js";

const KEY = "versionsprüfung";

/** Entscheidung, rein logisch: "ok", "neu laden" (einmal pro Stempel) oder "weiter" (schon versucht, Warnung). */
export function versionAction(local, remote, tried) {
  if (!remote || !remote.code || remote.code === local) return "ok";
  return tried === remote.code ? "weiter" : "neu laden";
}

/** true, wenn die Seite neu lädt (dann nicht weiter starten). */
export async function checkVersion() {
  let remote = null;
  try {
    const res = await fetch(new URL("../data/version.json", import.meta.url), { cache: "no-cache" });
    if (res.ok) remote = await res.json();
  } catch (e) { return false; } // ohne Versionsdatei (etwa offline) normal starten
  let tried = null;
  try { tried = sessionStorage.getItem(KEY); } catch (e) { /* ohne Speicher keine Schleifensperre nötig */ }
  const action = versionAction(CODE_VERSION, remote, tried);
  if (action === "ok") { try { sessionStorage.removeItem(KEY); } catch (e) { /* egal */ } return false; }
  if (action === "weiter") { console.warn("Versionsprüfung: Programm " + CODE_VERSION + ", Daten " + remote.code + " – Neuladen hat nicht geholfen"); return false; }
  try { sessionStorage.setItem(KEY, remote.code); } catch (e) { return false; }
  // Alle Programmdateien am Zwischenspeicher vorbei neu holen; danach lädt die Seite den neuen Stand
  const base = new URL("../", import.meta.url);
  await Promise.all((remote.files || []).map(f => fetch(new URL(f, base), { cache: "reload" }).catch(() => null)));
  location.reload();
  return true;
}
