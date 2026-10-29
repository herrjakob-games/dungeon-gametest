// Baut die Modelle des Spiels aus den Rohdateien der Pakete (docs/GDD.md, Asset-Spezifikation).
// Aufruf: npm run build:assets
// Liest tools/asset-recipes.json und schreibt assets/<dir>/<id>.glb.
// - Einfache Teile: Paketdatei übernehmen und unter der id ablegen.
// - Zusammengesetzte Teile: mehrere Paketdateien mit Position, Drehung und Skalierung zu einer GLB.
// - Eingebettete Texturen werden entfernt; das Spiel setzt die gemeinsame Paletten-Textur des Themas.
// - Figuren (figures): Paketfigur abspecken, schreibt assets/figures/<id>.glb. FBX wird vorher mit FBX2glTF
//   umgewandelt; optional Materialfarben (colors), Waffe an einem Knochen (attach) und Vereinfachen (simplify).
// Am Ende stehen pro Datei Dreiecke und Größe da, mit Warnung über 1.500 Dreiecken oder 1 MB.
import { readFileSync, mkdirSync, statSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { NodeIO, Logger } from "@gltf-transform/core";
import { mergeDocuments, prune, dedup, unpartition, weld, simplify } from "@gltf-transform/functions";
import { MeshoptSimplifier } from "meshoptimizer";

const ROOT = new URL("../", import.meta.url).pathname;
const recipes = JSON.parse(readFileSync(ROOT + "tools/asset-recipes.json", "utf8"));
const io = new NodeIO();
const MAX_TRIS = 1500, MAX_FIGURE_TRIS = 3000, MAX_BYTES = 1024 * 1024;

// FBX mit dem Werkzeug aus dem npm-Paket fbx2gltf in eine GLB umwandeln (in einen Zwischenordner)
function readFbx(path) {
  const require = createRequire(import.meta.url);
  const tool = require("fbx2gltf/package.json") && ROOT + "node_modules/fbx2gltf/bin/" + process.platform.replace("linux", "Linux").replace("darwin", "Darwin").replace("win32", "Windows_NT") +
    "/FBX2glTF" + (process.platform === "win32" ? ".exe" : "");
  const dir = mkdtempSync(tmpdir() + "/fbx-");
  execFileSync(tool, ["--binary", "--input", path, "--output", dir + "/out"], { stdio: "ignore" });
  return io.read(dir + "/out.glb").finally(() => rmSync(dir, { recursive: true, force: true }));
}

const hexColor = (h) => [1, 3, 5].map(i => Math.pow(parseInt(h.slice(i, i + 2), 16) / 255, 2.2)); // sRGB → linear

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

// Figuren abspecken: Zubehörteile, die das Volk nicht trägt, und nicht benötigte Animationen fallen weg.
// Die eigene Textur der Figur bleibt (die Paletten-Textur passt nicht auf ihre Texturkoordinaten).
async function buildFigure(id, recipe) {
  const src = ROOT + (recipe.source || recipes.figureSource) + recipe.file;
  const doc = recipe.file.endsWith(".fbx") ? await readFbx(src) : await io.read(src);
  doc.setLogger(new Logger(Logger.Verbosity.WARN));
  const root = doc.getRoot();
  const names = new Set(root.listNodes().map(n => n.getName()));
  (recipe.remove || []).forEach(name => { if (!names.has(name)) throw new Error(id + ": Teil " + name + " fehlt in " + recipe.file); });
  recipe.animations.forEach(name => { if (!root.listAnimations().some(a => a.getName() === name)) throw new Error(id + ": Animation " + name + " fehlt"); });
  root.listNodes().filter(n => (recipe.remove || []).includes(n.getName())).forEach(n => n.dispose());
  // Zeit- und Wertelisten der entfernten Animationen ausdrücklich löschen (prune allein lässt sie stehen)
  const accessorsOf = (list) => new Set(list.flatMap(a => a.listSamplers().flatMap(sm => [sm.getInput(), sm.getOutput()])));
  const drop = root.listAnimations().filter(a => !recipe.animations.includes(a.getName()));
  const keep = accessorsOf(root.listAnimations().filter(a => recipe.animations.includes(a.getName())));
  const unused = [...accessorsOf(drop)].filter(a => a && !keep.has(a));
  drop.forEach(a => a.dispose());
  unused.forEach(a => a.dispose());
  // Materialfarben an die Palette angleichen (Pakete ohne Textur)
  Object.entries(recipe.colors || {}).forEach(([name, hex]) => {
    const m = root.listMaterials().find(x => x.getName() === name);
    if (!m) throw new Error(id + ": Material " + name + " fehlt");
    m.setBaseColorFactor([...hexColor(hex), 1]);
  });
  // Stilguide: matt wie Knete, kein Metallglanz (FBX2glTF setzt sonst 0,4 Metall, das macht die Figuren fast schwarz)
  if (recipe.colors) root.listMaterials().forEach(m => { m.setMetallicFactor(0); m.setRoughnessFactor(0.9); });
  // Waffe an einen Knochen hängen
  for (const a of recipe.attach || []) {
    const bone = root.listNodes().find(n => n.getName() === a.bone);
    if (!bone) throw new Error(id + ": Knochen " + a.bone + " fehlt");
    const other = await io.read(ROOT + (recipe.source || recipes.figureSource) + a.file);
    const map = mergeDocuments(doc, other);
    const scene = map.get(other.getRoot().listScenes()[0]);
    const holder = doc.createNode(a.file);
    if (a.position) holder.setTranslation(a.position);
    if (a.rotation) {
      const r = a.rotation.map(d => d * Math.PI / 360);
      const [cx, cy, cz, sx, sy, sz] = [...r.map(Math.cos), ...r.map(Math.sin)];
      holder.setRotation([sx * cy * cz - cx * sy * sz, cx * sy * cz + sx * cy * sz, cx * cy * sz - sx * sy * cz, cx * cy * cz + sx * sy * sz]);
    }
    if (a.scale) holder.setScale([a.scale, a.scale, a.scale]);
    scene.listChildren().forEach(n => { scene.removeChild(n); holder.addChild(n); });
    bone.addChild(holder);
    root.listScenes().filter(x => x !== root.listScenes()[0]).forEach(x => x.dispose());
  }
  // Eigene Textur entfernen, wenn data/models.json eine angepasste Textur setzt (texture)
  if (recipe.stripTexture) {
    root.listMaterials().forEach(m => m.setBaseColorTexture(null));
    root.listTextures().forEach(t => t.dispose());
  }
  await doc.transform(unpartition(), dedup(), prune({ keepAttributes: true }));
  if (recipe.simplify) {
    await MeshoptSimplifier.ready;
    // flat: Flach schattierte Pakete haben pro Fläche eigene Ecken; ohne Normalen lassen sie sich verschmelzen und
    // vereinfachen. Der GLTFLoader schattiert Meshes ohne Normalen wieder flach.
    if (recipe.flat) root.listMeshes().forEach(m => m.listPrimitives().forEach(p => { const n = p.getAttribute("NORMAL"); if (n) { p.setAttribute("NORMAL", null); n.dispose(); } }));
    await doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: recipe.simplify, error: 0.02 }), unpartition());
  }
  const out = ROOT + "assets/figures/" + id + ".glb";
  mkdirSync(ROOT + "assets/figures", { recursive: true });
  await io.write(out, doc);
  let tris = 0;
  root.listNodes().forEach(n => { const m = n.getMesh(); if (m) m.listPrimitives().forEach(p => { tris += p.getIndices().getCount() / 3; }); });
  const bytes = statSync(out).size;
  const warn = [];
  const limit = recipe.maxTris || MAX_FIGURE_TRIS; // KayKit-Figuren dürfen laut GDD bis 4.000
  if (tris > limit) warn.push("über " + limit + " Dreiecke");
  if (bytes > MAX_BYTES) warn.push("über 1 MB");
  console.log(("figures/" + id).padEnd(26) + String(tris).padStart(6) + " Dreiecke " + String(Math.round(bytes / 1024)).padStart(5) + " KB" +
    (warn.length ? "  WARNUNG: " + warn.join(", ") : ""));
}

// Requisit aus Teilen einer Paketfigur (etwa Knochen und Schädel der Skelette): Skelett-Bindung entfernen, jedes Teil mit
// seiner Unterseite auf den Ursprung setzen und mit Position, Drehung (Grad [x, y, z]) und Höhe neu anordnen.
async function buildExtract(id, recipe) {
  const doc = await io.read(ROOT + recipe.source + recipe.file);
  doc.setLogger(new Logger(Logger.Verbosity.WARN));
  const root = doc.getRoot();
  const scene = root.getDefaultScene() || root.listScenes()[0];
  const keep = new Set();
  for (const piece of recipe.pieces) {
    const src = root.listNodes().find(n => n.getName() === piece.node);
    if (!src || !src.getMesh()) throw new Error(id + ": Teil " + piece.node + " fehlt in " + recipe.file);
    const mesh = src.getMesh().clone();
    mesh.listPrimitives().forEach(p => ["JOINTS_0", "WEIGHTS_0"].forEach(a => p.setAttribute(a, null)));
    const pos = mesh.listPrimitives()[0].getAttribute("POSITION");
    const min = pos.getMin([]), max = pos.getMax([]);
    const inner = doc.createNode(piece.node).setMesh(mesh).setTranslation([-(min[0] + max[0]) / 2, -min[1], -(min[2] + max[2]) / 2]);
    const r = (piece.rotation || [0, 0, 0]).map(d => d * Math.PI / 360);
    const [cx, cy, cz, sx, sy, sz] = [...r.map(Math.cos), ...r.map(Math.sin)];
    const outer = doc.createNode(piece.node + "_lage").setTranslation(piece.position || [0, 0, 0])
      .setRotation([sx * cy * cz - cx * sy * sz, cx * sy * cz + sx * cy * sz, cx * cy * sz - sx * sy * cz, cx * cy * cz + sx * sy * sz]);
    outer.addChild(inner);
    keep.add(outer);
  }
  // Alles andere (Rig, Skelett-Bindung, Animationen, eigene Textur) fällt weg
  const mine = new Set([...keep].flatMap(n => [n, ...n.listChildren()]));
  root.listNodes().filter(n => !mine.has(n)).forEach(n => n.dispose());
  keep.forEach(n => scene.addChild(n));
  root.listAnimations().forEach(a => {
    a.listSamplers().forEach(sm => [sm.getInput(), sm.getOutput()].forEach(x => { if (x && !x.isDisposed()) x.dispose(); }));
    a.dispose();
  });
  root.listSkins().forEach(s => { const m = s.getInverseBindMatrices(); if (m) m.dispose(); s.dispose(); });
  root.listMaterials().forEach(m => m.setBaseColorTexture(null));
  root.listTextures().forEach(t => t.dispose());
  await doc.transform(prune({ keepAttributes: true }), dedup());
  if (recipe.simplify) {
    await MeshoptSimplifier.ready;
    await doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: recipe.simplify, error: 0.02 }));
  }
  const out = ROOT + "assets/" + recipe.dir + "/" + id + ".glb";
  await io.write(out, doc);
  let tris = 0;
  root.listNodes().forEach(n => { const m = n.getMesh(); if (m) m.listPrimitives().forEach(p => { tris += p.getIndices().getCount() / 3; }); });
  const bytes = statSync(out).size;
  console.log((recipe.dir + "/" + id).padEnd(26) + String(tris).padStart(6) + " Dreiecke " + String(Math.round(bytes / 1024)).padStart(5) + " KB" +
    (tris > MAX_TRIS ? "  WARNUNG: über " + MAX_TRIS + " Dreiecke" : ""));
}

for (const [id, recipe] of Object.entries(recipes.parts)) await build(id, recipe);
for (const [id, recipe] of Object.entries(recipes.figures || {})) await buildFigure(id, recipe);
for (const [id, recipe] of Object.entries(recipes.extracts || {})) await buildExtract(id, recipe);
