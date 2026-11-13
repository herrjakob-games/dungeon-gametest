// Tests für das Kellerhandbuch (docs/GDD.md, Interface, Tutorial) und die Kamera-Zoomstufen.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const { fillText, tutorialVars, spreads, checkTutorial } = await import("../src/tutorialText.js");
const { ZOOM_MIN, ZOOM_MAX, COMBAT_ZOOM, zoomTarget } = await import("../src/zoomLogic.js");

const texts = JSON.parse(readFileSync(new URL("../data/texts.json", import.meta.url)));
const chars = JSON.parse(readFileSync(new URL("../data/characters.json", import.meta.url)));
const NAMES = { kraft: "Kraft", geschick: "Geschick", verstand: "Verstand" };

test("Handbuch in data/texts.json ist gültig", () => {
  const errors = [];
  checkTutorial(texts.tutorial, (w, t) => errors.push(w + ": " + t));
  assert.deepEqual(errors, []);
  assert.equal(spreads(texts.tutorial.pages).length, 2);
});

test("Platzhalter werden pro Volk ersetzt, nichts bleibt offen", () => {
  for (const c of Object.values(chars)) {
    const vars = tutorialVars({ name: c.name, ability: c.ability }, NAMES);
    assert.equal(vars.attribut, NAMES[c.ability.attr]);
    texts.tutorial.pages.forEach(p => p.text.forEach(s => assert.doesNotMatch(fillText(s, vars), /\{\w+\}/)));
  }
});

test("Text wird geschützt, **fett** wird <b>", () => {
  assert.equal(fillText("**{volk}** <x>", { volk: "Elf" }), "<b>Elf</b> &lt;x&gt;");
});

test("Prüfung meldet unbekannte Platzhalter und ungerade Seitenzahl", () => {
  const errors = [];
  checkTutorial({ title: "T", pages: [{ title: "A", text: ["{gold}"] }] }, (w, t) => errors.push(t));
  assert.ok(errors.some(e => e.includes("ungerade")));
  assert.ok(errors.some(e => e.includes("{gold}")));
});

test("Zoom: Start ganz herausgezoomt, im Kampf 30 % näher, nie über das Maximum", () => {
  assert.equal(ZOOM_MIN, 0.7);
  assert.equal(COMBAT_ZOOM, 1.3);
  assert.equal(zoomTarget(ZOOM_MIN, false), ZOOM_MIN);
  assert.ok(Math.abs(zoomTarget(ZOOM_MIN, true) - 0.91) < 1e-9);
  assert.equal(zoomTarget(ZOOM_MAX, true), ZOOM_MAX);
});
