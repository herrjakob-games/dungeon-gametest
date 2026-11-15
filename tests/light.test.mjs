// Tests für die Mindesthelligkeit von Figuren und Requisiten (docs/GDD.md, Licht).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { liftLevels, liftFor, checkLift, NO_LIFT, DEFAULT_LIFT } from "../src/lightLift.js";

const read = (f) => JSON.parse(readFileSync(new URL("../" + f, import.meta.url), "utf8"));
const MODELS = read("data/models.json"), THEMES = read("data/themes.json");
const src = (f) => readFileSync(new URL("../src/" + f, import.meta.url), "utf8");

test("Stufen: Figuren 0,45, Requisiten 0,22 (data/models.json, lift), pro Thema überschreibbar, Prüfung 0 bis 1", () => {
  assert.deepEqual(MODELS.lift, { figureLift: 0.45, propLift: 0.22 });
  assert.deepEqual(DEFAULT_LIFT, MODELS.lift);
  const errs = [];
  checkLift(MODELS.lift, THEMES, (w, m) => errs.push(w + ": " + m));
  assert.deepEqual(errs, []);
  THEMES.forEach(t => assert.deepEqual(liftLevels(MODELS.lift, t), { figure: t.figureLift ?? 0.45, prop: t.propLift ?? 0.22 }, t.id));
  assert.deepEqual(liftLevels(MODELS.lift, { propLift: 0.3 }), { figure: 0.45, prop: 0.3 }, "Thema überschreibt");
  const bad = [];
  checkLift({ figureLift: 1.5, propLift: -0.1 }, [{ id: "x", figureLift: "hell" }], (w, m) => bad.push(m));
  assert.equal(bad.length, 3, bad.join(" / "));
});

test("Kachelteile und Bodendeko ohne Eigenleuchten, Figuren und Requisiten mit der Stufe aus den Daten", () => {
  const lv = liftLevels(MODELS.lift, null);
  for (const [id, m] of Object.entries(MODELS)) {
    if (!m || !m.file) continue;
    const base = id.replace(/_(an|gruppe|gross|klein|b|c|wappen.*|gelb|blau|gruen|angenagt|flaschen|kueche|umgekippt|einzeln|sitzend)$/, "");
    const got = liftFor(base, m.file, lv);
    if (m.file.startsWith("assets/tiles/")) assert.equal(got, 0, id + ": Kachelteil leuchtet");
    else if (NO_LIFT.includes(base)) assert.equal(got, 0, id + ": Bodendeko oder Treppe leuchtet");
    else if (m.file.startsWith("assets/figures/") || m.file.startsWith("assets/weapons/")) assert.equal(got, 0.45, id);
    else if (m.file.startsWith("assets/props/")) assert.equal(got, 0.22, id);
  }
  ["sack", "moos", "pfuetze", "geroell"].forEach(id => assert.equal(liftFor(id, "assets/props/", lv), 0, id + " (Grundformen)"));
  assert.equal(liftFor("esse", "assets/props/", lv), 0.22, "Esse aus Grundformen");
  assert.equal(liftFor("boden", "assets/tiles/boden.glb", lv), 0);
  assert.equal(liftFor("wand", "assets/tiles/wand.glb", lv), 0);
});

test("Code: Modelle, Grundformen, Platzhalterfiguren und Waffen nutzen die Stufe; Hervorheben kehrt zur Grundstufe zurück", () => {
  const models = src("models.js"), room = src("roomBuilder.js"), main = src("main.js");
  assert.match(models, /liftObject\(g, liftOf\(id, entry\.file\), !!opts\.unique\)/, "makeModel");
  assert.match(models, /holdInHand\(object, "handslot\.r", liftObject\(weaponModel\(key\), currentLift\(\)\.figure\)/, "Waffe in der Hand");
  assert.match(room, /liftObject\(P\[id\]\(pl, lightCtx\(\)\), level\)/, "Requisiten aus Grundformen");
  assert.match(src("player.js"), /liftObject\(buildFigure\(volk\), currentLift\(\)\.figure\)/);
  assert.match(src("roomFigures.js"), /liftObject\(buildMonsterFigure/);
  // Hervorheben: an und aus über hoverOn/hoverOff, nie zurück auf 0
  assert.match(main, /hoverMats\.forEach\(hoverOff\)/);
  assert.match(main, /hoverMats\.forEach\(hoverOn\)/);
  assert.doesNotMatch(main, /emissiveIntensity = /, "main.js setzt keine Stärke mehr direkt");
  assert.doesNotMatch(room + src("stairs.js"), /emissiveIntensity = 0;/, "Hervorheben setzt nicht auf 0 zurück");
  // Grundlicht bleibt
  assert.match(src("scene.js"), /0\.32/);
});
