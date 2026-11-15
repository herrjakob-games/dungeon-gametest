// Tests für die Versionsprüfung beim Start (docs/GDD.md, Technische Eckdaten).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { codeHash, codeFiles } from "../tools/version.mjs";
import { CODE_VERSION } from "../src/version.js";
import { versionAction } from "../src/versionCheck.js";

const STAMP = JSON.parse(readFileSync(new URL("../data/version.json", import.meta.url), "utf8"));

test("Versionsstempel aktuell: nach Änderungen am Programm npm run stempel ausführen", () => {
  assert.equal(CODE_VERSION, codeHash(), "src/version.js veraltet: npm run stempel");
  assert.equal(STAMP.code, CODE_VERSION, "data/version.json veraltet: npm run stempel");
  assert.deepEqual(STAMP.files, codeFiles().concat(["src/version.js"]));
  STAMP.files.forEach(f => assert.ok(existsSync(new URL("../" + f, import.meta.url)), f + " fehlt"));
  assert.ok(STAMP.files.includes("src/main.js") && STAMP.files.includes("src/decor.js"));
});

test("Versionsprüfung: gleich → ok, verschieden → einmal neu laden, danach weiter", () => {
  assert.equal(versionAction("a", { code: "a" }, null), "ok");
  assert.equal(versionAction("a", null, null), "ok", "ohne Versionsdatei normal starten");
  assert.equal(versionAction("a", { code: "b" }, null), "neu laden");
  assert.equal(versionAction("a", { code: "b" }, "b"), "weiter", "keine Schleife");
  assert.equal(versionAction("a", { code: "c" }, "b"), "neu laden", "neuer Stand, neuer Versuch");
});
