// Versionsstempel für die Versionsprüfung beim Start (docs/GDD.md, Technische Eckdaten): Prüfsumme über alle
// Programmdateien. Schreibt src/version.js (Stempel im Code) und data/version.json (Stempel und Dateiliste, wird immer
// frisch geladen). Passen beide beim Start nicht zusammen, hat der Browser noch alten Code und lädt ihn neu.
// Aufruf: npm run stempel   (npm test prüft, dass der Stempel aktuell ist)
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";

const ROOT = new URL("../", import.meta.url).pathname;
export function codeFiles() {
  const list = (dir) => readdirSync(ROOT + dir).filter(f => f.endsWith(".js")).sort().map(f => dir + f);
  return list("src/").filter(f => f !== "src/version.js").concat(list("vendor/three/"));
}
export function codeHash() {
  const h = createHash("sha256");
  codeFiles().forEach(f => { h.update(f + "\n"); h.update(readFileSync(ROOT + f)); });
  return h.digest("hex").slice(0, 12);
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  const code = codeHash();
  writeFileSync(ROOT + "src/version.js", "// Versionsstempel des Programms, erzeugt mit npm run stempel (tools/version.mjs). Nicht von Hand ändern.\nexport const CODE_VERSION = \"" + code + "\";\n");
  writeFileSync(ROOT + "data/version.json", JSON.stringify({ code, files: codeFiles().concat(["src/version.js"]) }, null, 2) + "\n");
  console.log("Versionsstempel " + code + " (" + codeFiles().length + " Programmdateien)");
}
