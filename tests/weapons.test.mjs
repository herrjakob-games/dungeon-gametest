// Tests für die Waffen an den Spielfiguren und die Schriftrollen (docs/GDD.md, Asset-Spezifikation).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync } from "node:fs";
import { weaponKey, weaponFile, scrollSeal, checkWeapons } from "../src/weapons.js";

const root = new URL("../", import.meta.url);
const read = (f) => JSON.parse(readFileSync(new URL(f, root), "utf8"));
const MODELS = read("data/models.json");
const WEAPONS = MODELS.weapons, SCROLLS = MODELS.scrolls;
const ITEMS = read("data/items.json");
const RECIPES = read("tools/asset-recipes.json");
const MAX_TRIS = 1500, MAX_BYTES = 1024 * 1024;

function glb(path) {
  const b = readFileSync(path);
  assert.equal(b.toString("ascii", 0, 4), "glTF", path + " ist keine GLB-Datei");
  const j = JSON.parse(b.toString("utf8", 20, 20 + b.readUInt32LE(12)));
  const per = j.meshes.map(m => m.primitives.reduce((s, p) => s + j.accessors[p.indices].count / 3, 0));
  return { tris: j.nodes.reduce((s, n) => s + (n.mesh !== undefined ? per[n.mesh] : 0), 0), nodes: j.nodes.map(n => n.name),
    animations: (j.animations || []).map(a => a.name), images: (j.images || []).length };
}

test("Jede Waffe aus data/items.json hat einen Eintrag in weapons, jede Schriftrolle eine Siegelfarbe", () => {
  assert.deepEqual(checkWeapons(WEAPONS, SCROLLS, ITEMS), []);
  ["feuerpfeil", "schildrolle", "eisrolle", "feuerballrolle"].forEach(id => assert.ok(scrollSeal(SCROLLS, id), id));
  assert.equal(scrollSeal(SCROLLS, "heiltrank"), null);
});

test("Jede Waffen-Datei existiert, mit eigener Textur, unter 1.500 Dreiecken und 1 MB", () => {
  for (const [id, w] of Object.entries(WEAPONS)) {
    for (const file of [w.file, w.combatFile].filter(Boolean)) {
      const path = new URL(file, root);
      assert.ok(existsSync(path), id + ": " + file + " fehlt (npm run build:assets -- weapons)");
      const g = glb(path);
      assert.ok(g.tris > 0 && g.tris < MAX_TRIS, id + ": " + g.tris + " Dreiecke");
      assert.ok(statSync(path).size < MAX_BYTES, id + ": über 1 MB");
      assert.equal(g.images, 1, id + ": Waffen behalten ihre Textur");
    }
  }
  Object.keys(RECIPES.weapons).forEach(id => assert.ok(Object.values(WEAPONS).some(w => w.file === "assets/weapons/" + id + ".glb" || w.combatFile === "assets/weapons/" + id + ".glb"), id + ": gebaut, aber nicht benutzt"));
});

test("Waffenwechsel tauscht das Modell, ohne Waffe gibt es keins", () => {
  const ids = Object.keys(WEAPONS);
  const files = ids.map(id => weaponFile(WEAPONS, weaponKey(WEAPONS, id, false)));
  assert.equal(new Set(files).size, ids.length, "jede Waffe hat ihr eigenes Modell");
  assert.notEqual(weaponKey(WEAPONS, "dolch", false), weaponKey(WEAPONS, "langschwert", false));
  assert.equal(weaponKey(WEAPONS, null, false), null);
  assert.equal(weaponFile(WEAPONS, weaponKey(WEAPONS, null, true)), null);
  // Buch des Feuers: außerhalb des Kampfs zu, im Kampf offen
  assert.equal(weaponFile(WEAPONS, weaponKey(WEAPONS, "feuerbuch", false)), "assets/weapons/feuerbuch.glb");
  assert.equal(weaponFile(WEAPONS, weaponKey(WEAPONS, "feuerbuch", true)), "assets/weapons/feuerbuch_offen.glb");
  // andere Waffen bleiben im Kampf dieselben (kein Tausch bei Kampfbeginn)
  assert.equal(weaponKey(WEAPONS, "langschwert", true), weaponKey(WEAPONS, "langschwert", false));
  // unbekannte Waffe: Schlüssel bleibt, Datei fehlt (Rückfall auf Grundform)
  assert.equal(weaponFile(WEAPONS, weaponKey(WEAPONS, "gibtsnicht", false)), null);
});

test("Größen: Dolch < Eismesser < Kurzschwert < Langschwert < Rapier < Elfenklinge, Kurzschwert 0,85 des Langschwerts", () => {
  // Länge in Kacheln = Länge der Datei (Knotenlage aus dem Paket) mal size; die Weapons-Bits-Teile messen in Paket-Einheiten
  const length = (id) => {
    const b = readFileSync(new URL(WEAPONS[id].file, root));
    const j = JSON.parse(b.toString("utf8", 20, 20 + b.readUInt32LE(12)));
    const ys = j.meshes.flatMap(m => m.primitives.map(p => j.accessors[p.attributes.POSITION])).flatMap(a => [a.min[1], a.max[1]]);
    return (Math.max(...ys) - Math.min(...ys)) * WEAPONS[id].size;
  };
  const order = ["dolch", "eismesser", "kurzschwert", "langschwert", "rapier", "elfenklinge"];
  order.slice(1).forEach((id, i) => assert.ok(length(id) > length(order[i]), order[i] + " < " + id));
  assert.equal(WEAPONS.kurzschwert.size, 0.85);
  Object.entries(WEAPONS).filter(([id]) => id !== "kurzschwert").forEach(([id, w]) => assert.equal(w.size, 1, id + ": size ist ein Verhältnis zur Paketgröße"));
});

test("Die Waffe wächst mit der Figur: weaponScale pro Volk; Kriegsaxt am Zwerg nicht größer als die Axt der Dunkelzwerge", () => {
  assert.deepEqual([MODELS.zwerg.weaponScale, MODELS.elf.weaponScale, MODELS.mensch.weaponScale], [0.28, 0.49, 0.42]);
  // Länge in Kacheln: Länge der Datei mal Größe in der Hand
  const span = (file) => {
    const b = readFileSync(new URL(file, root));
    const j = JSON.parse(b.toString("utf8", 20, 20 + b.readUInt32LE(12)));
    const ys = j.meshes.flatMap(m => m.primitives.map(p => j.accessors[p.attributes.POSITION])).flatMap(a => [a.min[1], a.max[1]]);
    return Math.max(...ys) - Math.min(...ys);
  };
  const axe = MODELS.dunkelzwerg.accessories.find(a => a.model === "grossaxt");
  const kriegsaxt = span(WEAPONS.kriegsaxt.file) * WEAPONS.kriegsaxt.size * MODELS.zwerg.weaponScale;
  assert.ok(kriegsaxt <= span(MODELS.grossaxt.file) * axe.size, "Kriegsaxt " + kriegsaxt.toFixed(3) + " größer als die große Axt");
});

test("Spielfiguren ohne eingebaute Waffe, mit Handknochen; Kriegsaxt mit Zweihand-Clips", () => {
  const built = { zwerg: "1H_Sword", elf: "Knife", mensch: "1H_Wand" };
  for (const [volk, weapon] of Object.entries(built)) {
    const g = glb(new URL(MODELS[volk].file, root));
    assert.ok(!g.nodes.includes(weapon), volk + ": " + weapon + " ist noch in der Figur");
    ["handslot.r", "handslot.l"].forEach(b => assert.ok(g.nodes.includes(b), volk + ": " + b + " fehlt"));
    assert.equal(MODELS[volk].weaponWhen, "always", volk + ": hält die Waffe immer");
  }
  // Kriegsaxt nur für Zwerge (data/items.json); seine Figur hat die Zweihand-Clips
  assert.equal(ITEMS.find(i => i.id === "kriegsaxt").req.volk, "zwerg");
  const zwerg = glb(new URL(MODELS.zwerg.file, root));
  Object.values(WEAPONS.kriegsaxt.armedAnimations).forEach(c => assert.ok(zwerg.animations.includes(c), "zwerg: " + c + " fehlt"));
});
