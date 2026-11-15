// Tests für die Golems der Zwergenminen (docs/GDD.md, Figurenliste und Asset-Spezifikation: Steingolem, Eisengolem).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";

const read = (f) => JSON.parse(readFileSync(new URL("../" + f, import.meta.url), "utf8"));
const MODELS = read("data/models.json"), THEMES = read("data/themes.json"), ROOM_TYPES = read("data/room-types.json");
const EVENTS = read("data/events.json"), RECIPES = read("tools/asset-recipes.json");

// JSON-Teil einer GLB-Datei
function glb(file) {
  const b = readFileSync(new URL("../" + file, import.meta.url));
  return JSON.parse(b.toString("utf8", 20, 20 + b.readUInt32LE(12)));
}
const tris = (j) => (j.nodes || []).filter(n => n.mesh !== undefined).reduce((s, n) => s + j.meshes[n.mesh].primitives.reduce((t, p) => t + j.accessors[p.indices].count / 3, 0), 0);

test("Golems: Datei vorhanden, sechs Animationen, höchstens 3.000 Dreiecke, unter 1 MB, Skelett erhalten", () => {
  for (const id of ["steingolem", "eisengolem"]) {
    const m = MODELS[id];
    assert.ok(m, id + " fehlt in data/models.json");
    assert.equal(m.file, "assets/figures/" + id + ".glb");
    assert.equal(m.palette, false);
    const j = glb(m.file);
    assert.deepEqual(j.animations.map(a => a.name).sort(), ["Attack", "Death", "Hit", "Idle", "Interact", "Walk"], id);
    assert.deepEqual(Object.values(m.animations).sort(), ["Attack", "Death", "Hit", "Idle", "Interact", "Walk"], id + ": Zuordnung in data/models.json");
    const n = tris(j);
    assert.ok(n <= 3000, id + ": " + n + " Dreiecke");
    assert.ok(n <= RECIPES.golems[id].maxTris + 50, id + ": nicht wie die Statue vereinfacht (" + n + ")");
    assert.ok(statSync(new URL("../" + m.file, import.meta.url)).size < 1024 * 1024, id + ": über 1 MB");
    assert.equal(j.skins.length, 1, id + ": Skelett fehlt");
    // Kopf auf 45 %, keine Skalierungsspur des Kopfknochens
    const head = j.nodes.findIndex(x => x.name === "head");
    assert.deepEqual(j.nodes[head].scale, [0.45, 0.45, 0.45]);
    j.animations.forEach(a => assert.ok(!a.channels.some(c => c.target.node === head && c.target.path === "scale"), id + ": " + a.name + " skaliert den Kopf"));
    // Augen am Kopfknochen, leuchtend, ohne Punktlicht; Ausrüstung entfernt
    const eyes = (j.nodes[head].children || []).map(i => j.nodes[i]).filter(x => /^auge/.test(x.name));
    assert.equal(eyes.length, 2, id + ": Augen");
    const eyeMat = j.materials[j.meshes[eyes[0].mesh].primitives[0].material];
    assert.ok(eyeMat.emissiveFactor && eyeMat.emissiveFactor.some(v => v > 0), id + ": Augen leuchten nicht");
    assert.ok(!(j.extensionsUsed || []).includes("KHR_lights_punctual"), id + ": Punktlicht");
    ["1H_Sword", "2H_Sword", "Badge_Shield", "Round_Shield", "Knight_Cape", "Knight_Helmet"].forEach(x => assert.ok(!j.nodes.some(nd => nd.name === x), id + ": " + x + " noch da"));
    // Körper einfarbig, flach schattiert (ohne Normalen und Texturkoordinaten)
    assert.ok(!j.textures || !j.textures.length, id + ": Textur");
    j.meshes.forEach(me => me.primitives.forEach(p => { assert.ok(!("NORMAL" in p.attributes) && !("TEXCOORD_0" in p.attributes), id + ": Normalen oder UV"); }));
    // breiter Körper: x 1,15 und z 1,09 gegenüber der Höhe
    const [sx, sy, sz] = m.scale;
    assert.ok(Math.abs(sx / sy - 1.15) < 0.002 && Math.abs(sz / sy - 1.09) < 0.002, id + ": Maßstab " + m.scale);
  }
  const col = (id, k) => RECIPES.golems[id][k];
  assert.deepEqual([col("steingolem", "color"), col("steingolem", "eyeColor"), col("steingolem", "height")], ["#8A847D", "#FFB347", 1.4]);
  assert.deepEqual([col("eisengolem", "color"), col("eisengolem", "eyeColor"), col("eisengolem", "height")], ["#5E6168", "#FF6A2A", 1.8]);
});

test("Jede Monster-id der Zwergenminen hat eine Figur in data/models.json, auch der Boss", () => {
  const th = THEMES.find(x => x.id === "zwergenminen");
  const ids = new Set(th.monsters.concat((th.encounters ? th.encounters.monsters : []).map(m => m.monster)));
  const byId = Object.fromEntries(EVENTS.map(e => [e.id, e]));
  const combats = (o) => (Array.isArray(o) ? o.flatMap(combats) : o && typeof o === "object"
    ? Object.entries(o).flatMap(([k, v]) => (k === "combat" && typeof v === "string" ? [v] : combats(v))) : []);
  ROOM_TYPES.forEach(rt => ((rt.themeEvents || {}).zwergenminen || []).forEach(e => { if (byId[e.id]) combats(byId[e.id]).forEach(m => ids.add(m)); }));
  const missing = [...ids].filter(id => !MODELS[id]);
  assert.deepEqual(missing, [], "ohne Figur: " + missing.join(", "));
  assert.ok(MODELS[th.boss], "Boss " + th.boss + " ohne Figur");
});
