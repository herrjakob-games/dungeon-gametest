// Tests für Lebenspunkte und Zahlen im Kampf (docs/GDD.md, „Inszenierung der Figuren“).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const { hpText, hpDelta, deltaLabel, floatPose, freeSlot, RISE, LIFE } = await import("../src/combatNumbers.js");

test("Lebenspunkte als aktuell/maximal, nie unter 0", () => {
  assert.equal(hpText(8, 14), "8/14");
  assert.equal(hpText(-3, 14), "0/14");
});

test("Zahl nennt den tatsächlich verlorenen oder geheilten Wert", () => {
  assert.equal(hpDelta(10, 6, 14), -4);
  assert.equal(hpDelta(3, -5, 14), -3);   // Schaden unter 0 zählt nicht mit
  assert.equal(hpDelta(12, 19, 14), 2);   // Heilung über das Maximum zählt nicht mit
  assert.equal(hpDelta(14, 14, 14), 0);
  assert.deepEqual(deltaLabel(-4), { text: "−4", kind: "bad" });
  assert.deepEqual(deltaLabel(5), { text: "+5", kind: "good" });
  assert.equal(deltaLabel(0), null);       // Fehlschlag, Schild, Einfrieren: keine Zahl
});

test("Zahl steigt etwa 0,5 Kacheln auf und blendet in etwa 1 Sekunde aus", () => {
  assert.equal(RISE, 0.5);
  assert.equal(LIFE, 1);
  assert.deepEqual(floatPose(0), { rise: 0, opacity: 1 });
  const mid = floatPose(0.6);
  assert.ok(mid.rise > 0 && mid.rise < RISE && mid.opacity > 0 && mid.opacity < 1);
  assert.ok(floatPose(0.99).rise <= RISE && floatPose(0.99).opacity < 0.05);
  assert.equal(floatPose(1), null);
});

test("Zahlen kurz nacheinander überdecken sich nicht", () => {
  assert.equal(freeSlot([], 0), 0);
  assert.equal(freeSlot([{ slot: 0, born: 0 }], 0.2), 1);
  assert.equal(freeSlot([{ slot: 0, born: 0 }, { slot: 1, born: 0.1 }], 0.3), 2);
  assert.equal(freeSlot([{ slot: 0, born: 0 }, { slot: 1, born: 0.5 }], 1.2), 0); // die erste ist schon weg
});

test("Farben und Schrift der Zahlen sind dieselben CSS-Variablen wie im Textfenster", () => {
  const css = readFileSync(new URL("../css/style.css", import.meta.url), "utf8");
  assert.match(css, /\.fx \.bad[^{]*\{ color: var\(--bad\)/);
  assert.match(css, /\.fx \.good \{ color: var\(--good\)/);
  assert.match(css, /\.hp-number\.bad \{ color: var\(--bad\); \}/);
  assert.match(css, /\.hp-number\.good \{ color: var\(--good\); \}/);
  assert.match(css, /\.hp-label, \.hp-number \{[^}]*font-family: var\(--body\)/);
  // HTML über der Szene, unter dem Textfenster: #combatHud steht direkt nach #stage, vor Abblende, Infotafeln und Textfenster
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const at = (s) => html.indexOf(s);
  assert.ok(at('id="stage"') < at('id="combatHud"') && at('id="combatHud"') < at('id="fade"') && at('id="combatHud"') < at('id="dialog"'));
});
