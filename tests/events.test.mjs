// Ausführen mit: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  indexData, validateData, newPlayer, newRun, rollDice, doCheck, checkCondition,
  pickEvent, applyEffects, releaseIfTrapped
} from "../src/eventLogic.js";
import { generate } from "../src/generator.js";

const read = (f) => JSON.parse(readFileSync(new URL("../data/" + f, import.meta.url), "utf8"));
const DATA = indexData({ roomTypes: read("room-types.json"), events: read("events.json"), monsters: read("monsters.json") });

// Zufallsfunktion, die der Reihe nach feste Werte liefert
const seq = (...vals) => { let i = 0; return () => vals[i++ % vals.length]; };
// Würfelwert w auf einem W-sides als rand()-Wert
const face = (w, sides) => (w - 0.5) / sides;
const ctx = (player, room) => ({
  player, run: newRun(), monsters: DATA.monsters,
  room: room || { doors: 1 | 4, locked: new Set(), back: "S" }
});

test("Daten in data/ sind gültig", () => {
  assert.deepEqual(validateData(DATA), []);
});

test("Raumtypen passen zum Generator und haben 2 bis 3 Events", () => {
  const used = new Set();
  for (let s = 1; s <= 300; s++) Object.values(generate(s).rooms).forEach(r => used.add(r.type));
  assert.deepEqual([...used].sort(), Object.keys(DATA.roomTypes).sort());
  for (const rt of Object.values(DATA.roomTypes)) {
    assert.ok(rt.events.length >= 2 && rt.events.length <= 3, rt.id + ": " + rt.events.length + " Events");
  }
});

test("Datenprüfung findet Fehler", () => {
  const bad = structuredClone({ roomTypes: {}, monsters: DATA.monsters, events: {} });
  bad.events.x = { id: "x", type: "quatsch", title: "X", text: "X", options: [
    { label: "A", check: { attr: "charme", dc: 10 }, success: { effects: [{ teleport: 1 }] }, failure: { next: "fehlt" } }
  ] };
  const errs = validateData(bad);
  assert.ok(errs.some(e => e.includes("unbekannter Typ")));
  assert.ok(errs.some(e => e.includes("unbekanntes Attribut")));
  assert.ok(errs.some(e => e.includes("8, 12 oder 16")));
  assert.ok(errs.some(e => e.includes("unbekannter Effekt")));
  assert.ok(errs.some(e => e.includes("Folge-Event")));
});

test("Würfel", () => {
  assert.equal(rollDice(5, Math.random), 5);
  assert.equal(rollDice("W6", () => 0), 1);
  assert.equal(rollDice("W6", () => 0.999), 6);
  assert.equal(rollDice("2W6", () => 0.999), 12);
  assert.equal(rollDice("W4+1", () => 0), 2);
  for (let i = 0; i < 500; i++) {
    const n = rollDice("4W6", Math.random);
    assert.ok(n >= 4 && n <= 24);
  }
});

test("Startwerte des Zwergs", () => {
  const p = newPlayer();
  assert.equal(p.hp, 12);
  assert.deepEqual(p.attrs, { kraft: 2, geschick: 1, verstand: -1 });
});

test("Probe: W20 + Attribut gegen Schwierigkeit", () => {
  const p = newPlayer();
  const r = doCheck(p, { attr: "verstand", dc: 12 }, () => face(13, 20));
  assert.equal(r.d, 13);
  assert.equal(r.total, 12);
  assert.equal(r.ok, true);
  assert.equal(doCheck(p, { attr: "verstand", dc: 12 }, () => face(12, 20)).ok, false);
});

test("Bedingungen", () => {
  const run = newRun();
  assert.equal(checkCondition(undefined, run), true);
  assert.equal(checkCondition("flag:kerze", run), false);
  assert.equal(checkCondition("notFlag:kerze", run), true);
  run.flags.add("kerze");
  assert.equal(checkCondition("flag:kerze", run), true);
  assert.equal(checkCondition("hasItem:fackel", run), false);
});

test("Event-Auswahl: Chance, Gewichte, once und Bedingungen", () => {
  const rt = { eventChance: 0.5, events: [{ id: "a", weight: 1 }, { id: "b", weight: 3, once: true }, { id: "c", weight: 5, condition: "flag:x" }] };
  const run = newRun();
  assert.equal(pickEvent(rt, run, () => 0.6), null); // Chance verfehlt
  assert.equal(pickEvent(rt, run, seq(0, 0.1)), "a");
  assert.equal(pickEvent(rt, run, seq(0, 0.9)), "b");
  run.usedOnce.add("b");
  assert.equal(pickEvent(rt, run, seq(0, 0.9)), "a");
  run.flags.add("x");
  assert.equal(pickEvent(rt, run, seq(0, 0.9)), "c");
  assert.equal(pickEvent({ eventChance: 0, events: rt.events }, run, () => 0), null);
  assert.equal(pickEvent({ eventChance: 1, events: rt.events }, run, () => 0.9999) !== null, true);
});

test("Startraum hat immer ein Event", () => {
  for (let i = 0; i < 200; i++) assert.ok(pickEvent(DATA.roomTypes.start, newRun(), Math.random));
});

test("Schaden, Heilung, Gold, Erfahrung", () => {
  const p = newPlayer();
  const c = ctx(p);
  let res = applyEffects([{ damage: 5 }, { heal: 2 }, { loot: "tier1" }, { gainXp: 3 }, { setFlag: "k" }], c, () => 0.999);
  assert.equal(p.hp, 9);
  assert.equal(p.gold, 12); // 2W6 mit zwei Sechsen
  assert.equal(p.xp, 3);
  assert.ok(c.run.flags.has("k"));
  res = applyEffects([{ heal: 10 }], c, Math.random);
  assert.equal(p.hp, 12, "Heilung nur bis zum Maximum");
  assert.equal(res.lines[0].amount, 3);
  res = applyEffects([{ damage: 20 }, { loot: "tier2" }], c, Math.random);
  assert.equal(p.hp, 0, "LP fallen nicht unter 0");
  assert.equal(res.died, true);
  assert.equal(p.gold, 12, "nach dem Tod keine weiteren Effekte");
});

test("Ersatz-Kampf: Kraft-Probe gegen Rüstung", () => {
  // Skelett: Rüstung 12, Schaden W6. W20 10 + Kraft 2 = 12 → Sieg
  let p = newPlayer();
  let res = applyEffects([{ combat: "skeleton" }, { loot: "tier1" }], ctx(p), seq(face(10, 20), 0.999, 0.999));
  assert.equal(res.lines[0].roll.ok, true);
  assert.equal(p.hp, 12);
  assert.equal(p.gold, 12);
  // W20 9 + 2 = 11 → Niederlage, W6 = 4 Schaden, danach keine Beute
  p = newPlayer();
  res = applyEffects([{ combat: "skeleton" }, { loot: "tier1" }], ctx(p), seq(face(9, 20), face(4, 6)));
  assert.equal(res.lines[0].roll.ok, false);
  assert.equal(p.hp, 8);
  assert.equal(p.gold, 0);
  assert.equal(res.lines.length, 1);
});

test("Türen verschließen und öffnen", () => {
  const room = { doors: 1 | 4, locked: new Set(), back: "S" };
  const p = newPlayer();
  applyEffects([{ lockDoor: "back" }, { lockDoor: "E" }], ctx(p, room), Math.random);
  assert.deepEqual([...room.locked], ["S"], "Tür ohne Durchgang wird ignoriert");
  applyEffects([{ lockDoor: "N" }, { unlockDoor: "back" }], ctx(p, room), Math.random);
  assert.deepEqual([...room.locked], ["N"]);
});

test("Sicherung gegen Einsperren öffnet die Rück-Tür", () => {
  const room = { doors: 1 | 4, locked: new Set(["N"]), back: "S" };
  assert.equal(releaseIfTrapped(room), null);
  room.locked.add("S");
  assert.equal(releaseIfTrapped(room), "S");
  assert.deepEqual([...room.locked], ["N"]);
  const deadEnd = { doors: 8, locked: new Set(["W"]), back: null };
  assert.equal(releaseIfTrapped(deadEnd), "W");
});
