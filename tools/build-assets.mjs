// Baut die Modelle des Spiels aus den Rohdateien der Pakete (docs/GDD.md, Asset-Spezifikation).
// Aufruf: npm run build:assets
// Liest tools/asset-recipes.json und schreibt assets/<dir>/<id>.glb.
// - Einfache Teile: Paketdatei übernehmen und unter der id ablegen.
// - Zusammengesetzte Teile: mehrere Paketdateien mit Position, Drehung und Skalierung zu einer GLB.
// - Eingebettete Texturen werden entfernt; das Spiel setzt die gemeinsame Paletten-Textur des Themas.
// Am Ende stehen pro Datei Dreiecke und Größe da, mit Warnung über 1.500 Dreiecken oder 1 MB.
import { readFileSync, mkdirSync, statSync } from "node:fs";
import { NodeIO, Logger } from "@gltf-transform/core";
import { mergeDocuments, prune, dedup, unpartition } from "@gltf-transform/functions";

const ROOT = new URL("../", import.meta.url).pathname;
const recipes = JSON.parse(readFileSync(ROOT + "tools/asset-recipes.json", "utf8"));
const io = new NodeIO();
const MAX_TRIS = 1500, MAX_BYTES = 1024 * 1024;

// Alle Wurzelknoten der Szene unter einen neuen Knoten mit Position, Drehung und Skalierung hängen
function wrap(doc, scene, name, piece) {
  const parent = doc.createNode(name);
  if (piece.position) parent.setTranslation(piece.position);
  if (piece.rotation) {
    const a = (piece.rotation * Math.PI) / 180;
    parent.setRotation([0, Math.sin(a / 2), 0, Math.cos(a / 2)]);
  }
  if (piece.scale) parent.setScale(piece.scale);
  scene.listChildren().forEach(n => { scene.removeChild(n); parent.addChild(n); });
  scene.addChild(parent);
}

async function build(id, recipe) {
  const pieces = recipe.pieces || [{ file: recipe.file }];
  const doc = await io.read(ROOT + recipes.source + pieces[0].file);
  doc.setLogger(new Logger(Logger.Verbosity.WARN));
  const root = doc.getRoot();
  const main = root.getDefaultScene() || root.listScenes()[0];
  wrap(doc, main, pieces[0].file, pieces[0]);
  for (const piece of pieces.slice(1)) {
    const other = await io.read(ROOT + recipes.source + piece.file);
    const map = mergeDocuments(doc, other);
    const otherScene = other.getRoot().getDefaultScene() || other.getRoot().listScenes()[0];
    const merged = map.get(otherScene);
    wrap(doc, merged, piece.file, piece);
    merged.listChildren().forEach(n => { merged.removeChild(n); main.addChild(n); });
    merged.dispose();
  }
  // Texturen entfernen: der Lader setzt die Paletten-Textur des Themas
  root.listMaterials().forEach(m => m.setBaseColorTexture(null));
  root.listTextures().forEach(t => t.dispose());
  root.setDefaultScene(main);
  root.listScenes().filter(s => s !== main).forEach(s => s.dispose());
  // keepAttributes: die Texturkoordinaten bleiben, obwohl die eingebettete Textur entfernt ist (Paletten-Textur nutzt sie)
  await doc.transform(unpartition(), dedup(), prune({ keepAttributes: true }));
  const out = ROOT + "assets/" + recipe.dir + "/" + id + ".glb";
  mkdirSync(ROOT + "assets/" + recipe.dir, { recursive: true });
  await io.write(out, doc);
  let tris = 0;
  root.listMeshes().forEach(m => m.listPrimitives().forEach(p => {
    const idx = p.getIndices();
    tris += idx ? idx.getCount() / 3 : p.getAttribute("POSITION").getCount() / 3;
  }));
  // Mehrfach benutzte Meshes (zweimal dieselbe Flasche) zählen mehrfach
  const uses = new Map();
  root.listNodes().forEach(n => { const m = n.getMesh(); if (m) uses.set(m, (uses.get(m) || 0) + 1); });
  tris = 0;
  uses.forEach((count, m) => m.listPrimitives().forEach(p => {
    const idx = p.getIndices();
    tris += count * (idx ? idx.getCount() / 3 : p.getAttribute("POSITION").getCount() / 3);
  }));
  const bytes = statSync(out).size;
  const warn = [];
  if (tris > MAX_TRIS) warn.push("über " + MAX_TRIS + " Dreiecke");
  if (bytes > MAX_BYTES) warn.push("über 1 MB");
  console.log((recipe.dir + "/" + id).padEnd(26) + String(tris).padStart(6) + " Dreiecke " + String(Math.round(bytes / 1024)).padStart(5) + " KB" +
    (warn.length ? "  WARNUNG: " + warn.join(", ") : ""));
}

for (const [id, recipe] of Object.entries(recipes.parts)) await build(id, recipe);
