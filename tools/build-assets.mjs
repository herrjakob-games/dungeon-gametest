// Baut die Modelle des Spiels aus den Rohdateien der Pakete (docs/GDD.md, Asset-Spezifikation).
// Aufruf: npm run build:assets
// Liest tools/asset-recipes.json und schreibt assets/<dir>/<id>.glb.
// - Einfache Teile: Paketdatei übernehmen und unter der id ablegen.
// - Zusammengesetzte Teile: mehrere Paketdateien mit Position, Drehung und Skalierung zu einer GLB.
// - uvShift: Farbe eines Teils über die Paletten-Textur ändern (Fahnen in Farben, die das Paket nicht hat).
// - keepTexture: eigene Paket-Textur bleibt (Schmiede: RPG Tools Bits, Resource Bits); rotation auch als [x, y, z].
// - source: anderes Paket als Dungeon Remastered; stretchY streckt nur den Schaft, uvRemap setzt die Paletten-Textur auf.
// - Eingebettete Texturen werden entfernt; das Spiel setzt die gemeinsame Paletten-Textur des Themas.
// - Figuren (figures): Paketfigur abspecken, schreibt assets/figures/<id>.glb. FBX wird vorher mit FBX2glTF
//   umgewandelt; optional Materialfarben (colors), Waffe an einem Knochen (attach) und Vereinfachen (simplify).
// - Waffen der Spielfiguren (weapons): pro Gegenstands-id eine Datei assets/weapons/<id>.glb, Griff am Ursprung, Klinge
//   nach oben, gedreht wie die Waffen der KayKit-Figuren am Knochen handslot.r. Eigene Textur bleibt (optional ersetzt
//   durch eine umgefärbte aus tools/weapon-texture.py), matt ohne Metallglanz.
// Am Ende stehen pro Datei Dreiecke und Größe da, mit Warnung über 1.500 Dreiecken oder 1 MB.
import { readFileSync, mkdirSync, statSync, mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { NodeIO, Logger, Document } from "@gltf-transform/core";
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
  if (Array.isArray(piece.rotation)) {
    // [x, y, z] in Grad, Reihenfolge XYZ wie in Three.js (etwa der liegende Hammer auf dem Amboss)
    const [x, y, z] = piece.rotation.map(d => d * Math.PI / 360);
    const [cx, cy, cz, sx, sy, sz] = [Math.cos(x), Math.cos(y), Math.cos(z), Math.sin(x), Math.sin(y), Math.sin(z)];
    parent.setRotation([sx * cy * cz + cx * sy * sz, cx * sy * cz - sx * cy * sz, cx * cy * sz + sx * sy * cz, cx * cy * cz - sx * sy * sz]);
  } else if (piece.rotation) {
    const a = (piece.rotation * Math.PI) / 180;
    parent.setRotation([0, Math.sin(a / 2), 0, Math.cos(a / 2)]);
  }
  if (piece.scale) parent.setScale(piece.scale);
  scene.listChildren().forEach(n => { scene.removeChild(n); parent.addChild(n); });
  scene.addChild(parent);
}

async function build(id, recipe) {
  const pieces = recipe.pieces || [{ file: recipe.file }];
  const source = recipe.source || recipes.source;
  const doc = await io.read(ROOT + source + pieces[0].file);
  doc.setLogger(new Logger(Logger.Verbosity.WARN));
  const root = doc.getRoot();
  const main = root.getDefaultScene() || root.listScenes()[0];
  wrap(doc, main, pieces[0].file, pieces[0]);
  for (const piece of pieces.slice(1)) {
    const other = await io.read(ROOT + source + piece.file);
    const map = mergeDocuments(doc, other);
    const otherScene = other.getRoot().getDefaultScene() || other.getRoot().listScenes()[0];
    const merged = map.get(otherScene);
    wrap(doc, merged, piece.file, piece);
    merged.listChildren().forEach(n => { merged.removeChild(n); main.addChild(n); });
    merged.dispose();
  }
  // Teile entfernen (remove: Knotennamen, etwa das Türblatt des Torbogens)
  const names = new Set(root.listNodes().map(n => n.getName()));
  (recipe.remove || []).forEach(name => { if (!names.has(name)) throw new Error(id + ": Teil " + name + " fehlt"); });
  root.listNodes().filter(n => (recipe.remove || []).includes(n.getName())).forEach(n => n.dispose());
  // Nur den Schaft strecken (stretchY): Ecken über split wandern nach oben, bis das Teil height hoch ist; Fuß und Kopf
  // behalten ihre Höhe (etwa der Pfeiler der Zwergenminen auf Raumhöhe)
  if (recipe.stretchY) {
    const { split, height } = recipe.stretchY;
    const seen = new Set();
    root.listMeshes().forEach(m => m.listPrimitives().forEach(p => {
      const pos = p.getAttribute("POSITION");
      if (seen.has(pos)) return;
      seen.add(pos);
      const top = pos.getMax([])[1], a = [0, 0, 0];
      for (let i = 0; i < pos.getCount(); i++) { pos.getElement(i, a); if (a[1] > split) pos.setElement(i, [a[0], a[1] + height - top, a[2]]); }
    }));
  }
  // Texturkoordinaten neu setzen (uvRemap): Teile aus einem Paket mit anderer Textur bekommen eine Fläche der Paletten-Textur,
  // u fest, v von unten (v[0]) nach oben (v[1]) wie der Verlauf der Wand
  if (recipe.uvRemap) {
    const { u, v } = recipe.uvRemap;
    root.listMeshes().forEach(m => m.listPrimitives().forEach(p => {
      const pos = p.getAttribute("POSITION"), uv = p.getAttribute("TEXCOORD_0");
      const top = pos.getMax([])[1], a = [0, 0, 0];
      for (let i = 0; i < pos.getCount(); i++) { pos.getElement(i, a); uv.setElement(i, [u, v[0] + (v[1] - v[0]) * a[1] / top]); }
    }));
    root.listMaterials().forEach(m => { m.setMetallicFactor(0); m.setRoughnessFactor(0.9); });
  }
  // Farbe über die Paletten-Textur ändern (uvShift): Texturkoordinaten im Bereich area [u0, v0, u1, v1] wandern um u
  // (etwa der rote Stoff einer Fahne auf das Farbfeld Grün). So unterscheiden sich auch die Paketfarben voneinander.
  if (recipe.uvShift) {
    const [u0, v0, u1, v1] = recipe.uvShift.area;
    let moved = 0;
    const seen = new Set();
    root.listMeshes().forEach(m => m.listPrimitives().forEach(p => {
      const uv = p.getAttribute("TEXCOORD_0");
      if (!uv || seen.has(uv)) return;
      seen.add(uv);
      const a = [0, 0];
      for (let i = 0; i < uv.getCount(); i++) {
        uv.getElement(i, a);
        if (a[0] >= u0 && a[0] <= u1 && a[1] >= v0 && a[1] <= v1) { uv.setElement(i, [a[0] + recipe.uvShift.u, a[1]]); moved++; }
      }
    }));
    if (!moved) throw new Error(id + ": uvShift trifft keine Texturkoordinaten");
  }
  // Texturen entfernen: der Lader setzt die Paletten-Textur des Themas. keepTexture: eigene Textur des Pakets bleibt
  // (RPG Tools Bits, Resource Bits), matt ohne Metallglanz
  if (recipe.keepTexture) root.listMaterials().forEach(m => { m.setMetallicFactor(0); m.setRoughnessFactor(1); });
  else {
    root.listMaterials().forEach(m => m.setBaseColorTexture(null));
    root.listTextures().forEach(t => t.dispose());
  }
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
  const doc = await extractDoc(id, recipe);
  const root = doc.getRoot();
  if (recipe.texture) {
    // eigene Textur statt der Paket-Textur (Kellerhandbuch, tools/weapon-texture.py)
    if (!existsSync(ROOT + recipe.texture)) throw new Error(id + ": " + recipe.texture + " fehlt (python3 tools/weapon-texture.py)");
    const textures = root.listTextures();
    if (textures.length !== 1) throw new Error(id + ": erwartet genau eine Textur, gefunden " + textures.length);
    textures[0].setImage(new Uint8Array(readFileSync(ROOT + recipe.texture))).setMimeType("image/png");
  }
  if (recipe.simplify) {
    await MeshoptSimplifier.ready;
    await doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: recipe.simplify, error: 0.02 }));
  }
  const out = ROOT + "assets/" + recipe.dir + "/" + id + ".glb";
  mkdirSync(ROOT + "assets/" + recipe.dir, { recursive: true });
  await io.write(out, doc);
  let tris = 0;
  root.listNodes().forEach(n => { const m = n.getMesh(); if (m) m.listPrimitives().forEach(p => { tris += p.getIndices().getCount() / 3; }); });
  const bytes = statSync(out).size;
  console.log((recipe.dir + "/" + id).padEnd(26) + String(tris).padStart(6) + " Dreiecke " + String(Math.round(bytes / 1024)).padStart(5) + " KB" +
    (tris > MAX_TRIS ? "  WARNUNG: über " + MAX_TRIS + " Dreiecke" : ""));
}

async function extractDoc(id, recipe) {
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
    const inner = doc.createNode(piece.node).setMesh(mesh);
    if (!piece.keepTransform) inner.setTranslation([-(min[0] + max[0]) / 2, -min[1], -(min[2] + max[2]) / 2]);
    const r = (piece.rotation || [0, 0, 0]).map(d => d * Math.PI / 360);
    const [cx, cy, cz, sx, sy, sz] = [...r.map(Math.cos), ...r.map(Math.sin)];
    const outer = doc.createNode(piece.node + "_lage").setTranslation(piece.position || [0, 0, 0])
      .setRotation([sx * cy * cz - cx * sy * sz, cx * sy * cz + sx * cy * sz, cx * cy * sz - sx * sy * cz, cx * cy * cz + sx * sy * sz]);
    if (piece.keepTransform) outer.setTranslation(src.getTranslation()).setRotation(src.getRotation()); // Griff bleibt am Ursprung
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
  if (!recipe.keepTexture) {
    root.listMaterials().forEach(m => m.setBaseColorTexture(null));
    root.listTextures().forEach(t => t.dispose());
  }
  await doc.transform(prune({ keepAttributes: true }), dedup());
  return doc;
}

// Waffe einer Spielfigur (docs/GDD.md, Asset-Spezifikation, Waffen an den Spielfiguren). Zwei Quellen:
// - file aus KayKit Fantasy Weapons Bits (glTF): Griff liegt schon am Ursprung, Klinge nach +y; das Teil wird wie die
//   Waffen der KayKit-Figuren um 180 Grad um y gedreht, damit es in handslot.r gleich sitzt.
// - node aus einer KayKit-Figur (Langschwert, Buch des Feuers): Teil mit seiner Lage am Handknochen aus dem Paket.
// texture: umgefärbte Textur (tools/weapon-texture.py) statt der Paket-Textur.
async function buildWeapon(id, recipe) {
  const source = recipe.source || recipes.weaponSource;
  let doc;
  if (recipe.node) {
    doc = await extractDoc(id, { source, file: recipe.file, keepTexture: true, pieces: [{ node: recipe.node, keepTransform: true }] });
  } else {
    doc = await io.read(ROOT + source + recipe.file);
    doc.setLogger(new Logger(Logger.Verbosity.WARN));
    const scene = doc.getRoot().getDefaultScene() || doc.getRoot().listScenes()[0];
    const holder = doc.createNode(id).setRotation([0, 1, 0, 0]);
    scene.listChildren().forEach(n => { scene.removeChild(n); holder.addChild(n); });
    scene.addChild(holder);
  }
  const root = doc.getRoot();
  // Stilguide: matt wie Knete, kein Metallglanz
  root.listMaterials().forEach(m => { m.setMetallicFactor(0); m.setRoughnessFactor(0.9); m.setMetallicRoughnessTexture(null); });
  if (recipe.texture) {
    if (!existsSync(ROOT + recipe.texture)) throw new Error(id + ": " + recipe.texture + " fehlt (python3 tools/weapon-texture.py)");
    const textures = root.listTextures();
    if (textures.length !== 1) throw new Error(id + ": erwartet genau eine Textur, gefunden " + textures.length);
    textures[0].setImage(new Uint8Array(readFileSync(ROOT + recipe.texture))).setMimeType("image/png");
  }
  await doc.transform(prune({ keepAttributes: true }), dedup());
  const out = ROOT + "assets/weapons/" + id + ".glb";
  mkdirSync(ROOT + "assets/weapons", { recursive: true });
  await io.write(out, doc);
  let tris = 0;
  root.listNodes().forEach(n => { const m = n.getMesh(); if (m) m.listPrimitives().forEach(p => { tris += p.getIndices().getCount() / 3; }); });
  const bytes = statSync(out).size;
  const warn = [];
  if (tris > MAX_TRIS) warn.push("über " + MAX_TRIS + " Dreiecke");
  if (bytes > MAX_BYTES) warn.push("über 1 MB");
  console.log(("weapons/" + id).padEnd(26) + String(tris).padStart(6) + " Dreiecke " + String(Math.round(bytes / 1024)).padStart(5) + " KB" +
    (warn.length ? "  WARNUNG: " + warn.join(", ") : ""));
}

// ---------- Statuen aus Paketfiguren (statues, etwa die Steinstatue im Schrein der Zwergenminen) ----------
// Pose einer Animation (erster Frame) einfrieren: Ecken der Figur mit den Knochen der Pose verrechnen, Skelett und
// Animationen entfernen, starre Teile (Schwert, Schild, Helm) an ihre Stelle in der Welt setzen. Dann alles einfarbig
// (Stein), Normalen und Texturkoordinaten weg (der GLTFLoader schattiert flach), auf maxTris vereinfachen, auf height
// Kacheln skalieren und auf ein gefastes Podest stellen (pedestal: Breite, Höhe, Fase, Farbe). Ergebnis in Kacheln (Maßstab 1).
const m4 = {
  mul(a, b) { const o = new Array(16).fill(0); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k]; return o; },
  point(m, [x, y, z]) { return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]]; },
  add(a, b, w) { return a.map((v, i) => v + b[i] * w); }
};

function sampleAt(sampler, t) {
  // erster Frame: Wert am ersten Zeitpunkt (Interpolation unnötig)
  const out = sampler.getOutput(), n = out.getElementSize(), v = [];
  out.getElement(0, v);
  return v.slice(0, n);
}

async function buildStatue(id, recipe) {
  const src = ROOT + recipe.source + recipe.file;
  const doc = await io.read(src);
  doc.setLogger(new Logger(Logger.Verbosity.WARN));
  const root = doc.getRoot();
  const scene = root.getDefaultScene() || root.listScenes()[0];
  const names = new Set(root.listNodes().map(n => n.getName()));
  (recipe.remove || []).concat(recipe.keep || []).forEach(n => { if (!names.has(n)) throw new Error(id + ": Teil " + n + " fehlt"); });
  // 1. Pose: erster Frame der Animation auf die Knoten
  const anim = root.listAnimations().find(a => a.getName() === recipe.pose);
  if (!anim) throw new Error(id + ": Animation " + recipe.pose + " fehlt");
  anim.listChannels().forEach(ch => {
    const node = ch.getTargetNode(), path = ch.getTargetPath(), v = sampleAt(ch.getSampler(), 0);
    if (path === "translation") node.setTranslation(v); else if (path === "rotation") node.setRotation(v); else if (path === "scale") node.setScale(v);
  });
  // 2. Ecken in die Welt rechnen
  const parts = []; // { pos: [[x,y,z]...], idx: [...] }
  const removeSet = new Set(recipe.remove || []);
  const skippedByParent = (n) => { for (let p = n; p; p = p.getParentNode()) if (removeSet.has(p.getName())) return true; return false; };
  for (const node of root.listNodes()) {
    const mesh = node.getMesh();
    if (!mesh || skippedByParent(node)) continue;
    const skin = node.getSkin();
    let joints = null;
    if (skin) {
      const ibm = skin.getInverseBindMatrices();
      joints = skin.listJoints().map((j, i) => { const b = []; ibm.getElement(i, b); return m4.mul(j.getWorldMatrix(), b); });
    }
    const world = node.getWorldMatrix();
    for (const prim of mesh.listPrimitives()) {
      const P = prim.getAttribute("POSITION"), J = prim.getAttribute("JOINTS_0"), W = prim.getAttribute("WEIGHTS_0");
      const pos = [];
      for (let i = 0; i < P.getCount(); i++) {
        const p = []; P.getElement(i, p);
        if (joints && J && W) {
          const ji = [], wi = []; J.getElement(i, ji); W.getElement(i, wi);
          let o = [0, 0, 0];
          for (let k = 0; k < 4; k++) if (wi[k]) o = m4.add(o, m4.point(joints[ji[k]], p), wi[k]);
          pos.push(o);
        } else pos.push(m4.point(world, p));
      }
      const I = prim.getIndices(), idx = [];
      for (let i = 0; i < I.getCount(); i++) idx.push(I.getScalar(i));
      parts.push({ pos, idx, body: !!skin });
    }
  }
  // 3. Neues Dokument: Figur in Kacheln, mittig über dem Podest
  const all = parts.flatMap(p => p.pos), body = parts.filter(p => p.body).flatMap(p => p.pos);
  const minY = Math.min(...all.map(p => p[1])), maxY = Math.max(...all.map(p => p[1]));
  const k = recipe.height / (maxY - minY);
  const cx = (Math.min(...body.map(p => p[0])) + Math.max(...body.map(p => p[0]))) / 2;
  const cz = (Math.min(...body.map(p => p[2])) + Math.max(...body.map(p => p[2]))) / 2;
  const ped = recipe.pedestal;
  const out = new Document();
  out.setLogger(new Logger(Logger.Verbosity.WARN));
  const buf = out.createBuffer();
  const outScene = out.createScene(id);
  const color = (hex, name) => out.createMaterial(name).setBaseColorFactor([...hexColor(hex), 1]).setMetallicFactor(0).setRoughnessFactor(0.95);
  const stone = color(recipe.color, "stein"), pedMat = color(ped.color, "podest");
  const addMesh = (name, positions, indices, material) => {
    const prim = out.createPrimitive()
      .setAttribute("POSITION", out.createAccessor().setType("VEC3").setArray(new Float32Array(positions)).setBuffer(buf))
      .setIndices(out.createAccessor().setType("SCALAR").setArray(new Uint32Array(indices)).setBuffer(buf))
      .setMaterial(material);
    outScene.addChild(out.createNode(name).setMesh(out.createMesh(name).addPrimitive(prim)));
  };
  // Figur: alle Teile in ein Mesh
  const fp = [], fi = [];
  parts.forEach(p => {
    const base = fp.length / 3;
    p.pos.forEach(([x, y, z]) => fp.push((x - cx) * k, (y - minY) * k + ped.height, (z - cz) * k));
    p.idx.forEach(i => fi.push(base + i));
  });
  addMesh("statue", fp, fi, stone);
  // Podest: Achteck aus einem Quadrat mit gefasten Kanten (Fase c), oben und unten mit flacher Kante
  const h = ped.width / 2, c = ped.chamfer, H = ped.height;
  const ring = [[h - c, h], [h, h - c], [h, -(h - c)], [h - c, -h], [-(h - c), -h], [-h, -(h - c)], [-h, h - c], [-(h - c), h]];
  const pp = [], pi = [];
  const quad = (a, b, cc, d) => { const n = pp.length / 3; pp.push(...a, ...b, ...cc, ...d); pi.push(n, n + 1, n + 2, n, n + 2, n + 3); };
  ring.forEach((p, i) => { const q = ring[(i + 1) % 8]; quad([p[0], 0, p[1]], [q[0], 0, q[1]], [q[0], H, q[1]], [p[0], H, p[1]]); });
  const fan = (y, up) => { const n = pp.length / 3; ring.forEach(p => pp.push(p[0], y, p[1])); for (let i = 1; i < 7; i++) pi.push(...(up ? [n, n + i + 1, n + i] : [n, n + i, n + i + 1])); };
  fan(H, false); fan(0, true); // Ring läuft von oben gesehen im Uhrzeigersinn: oben umgekehrt verbinden
  addMesh("podest", pp, pi, pedMat);
  out.getRoot().setDefaultScene(outScene);
  await MeshoptSimplifier.ready;
  await out.transform(weld());
  let ratio = 1, tris = 0;
  const count = () => { let t = 0; out.getRoot().listMeshes().forEach(m => m.listPrimitives().forEach(p => { t += p.getIndices().getCount() / 3; })); return t; };
  tris = count();
  // Nur die Figur vereinfachen, bis alles unter maxTris liegt
  const statueDoc = out;
  for (let step = 0; tris > recipe.maxTris && step < 12; step++) {
    ratio *= Math.max(0.5, (recipe.maxTris / tris) * 0.97);
    const stMesh = statueDoc.getRoot().listMeshes().find(m => m.getName() === "statue");
    const prim = stMesh.listPrimitives()[0];
    await statueDoc.transform(simplify({ simplifier: MeshoptSimplifier, ratio: Math.min(1, recipe.maxTris / tris * 0.97), error: 0.05 + step * 0.02 }));
    tris = count();
  }
  await out.transform(prune(), dedup());
  const file = ROOT + "assets/" + recipe.dir + "/" + id + ".glb";
  await io.write(file, out);
  const bytes = statSync(file).size;
  console.log((recipe.dir + "/" + id).padEnd(26) + String(tris).padStart(6) + " Dreiecke " + String(Math.round(bytes / 1024)).padStart(5) + " KB" +
    (tris > MAX_TRIS ? "  WARNUNG: über " + MAX_TRIS + " Dreiecke" : "") + "  (Figur aus " + parts.reduce((s, p) => s + p.idx.length / 3, 0) + " Dreiecken vereinfacht)");
}

// Nur einzelne Gruppen bauen: npm run build:assets -- weapons figures (ohne Angabe alle)
const only = process.argv.slice(2);
const want = (group) => !only.length || only.includes(group);
if (want("parts")) for (const [id, recipe] of Object.entries(recipes.parts)) await build(id, recipe);
if (want("figures")) for (const [id, recipe] of Object.entries(recipes.figures || {})) await buildFigure(id, recipe);
if (want("extracts")) for (const [id, recipe] of Object.entries(recipes.extracts || {})) await buildExtract(id, recipe);
if (want("weapons")) for (const [id, recipe] of Object.entries(recipes.weapons || {})) await buildWeapon(id, recipe);
if (want("statues")) for (const [id, recipe] of Object.entries(recipes.statues || {})) await buildStatue(id, recipe);

