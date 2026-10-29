// Schreibt assets/sounds/files.json: alle vorhandenen MP3-Dateien unter assets/sounds/ (docs/GDD.md, Sound).
// Das Spiel lädt nur Dateien aus dieser Liste; fehlende Sounds bleiben so still, ohne Ladefehler in der Konsole.
// Aufruf nach dem Hinzufügen oder Entfernen von MP3s: npm run sounds
import { readdirSync, statSync, writeFileSync } from "node:fs";

const ROOT = new URL("../assets/sounds/", import.meta.url).pathname;
export function listSounds(dir = ROOT, prefix = "") {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const full = dir + name;
    if (statSync(full).isDirectory()) out.push(...listSounds(full + "/", prefix + name + "/"));
    else if (name.toLowerCase().endsWith(".mp3")) out.push(prefix + name);
  }
  return out;
}

if (import.meta.url === "file://" + process.argv[1]) {
  const files = listSounds();
  writeFileSync(ROOT + "files.json", JSON.stringify(files, null, 2) + "\n");
  console.log("assets/sounds/files.json: " + files.length + " Dateien");
}
