// Ausführen mit: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  indexData, validateData, newRun, rollDice, doCheck, checkCondition,
  pickEvent, applyEffects, releaseIfTrapped, rollLoot, visibleOptions
} from "../src/eventLogic.js";
import { newCharacter } from "../src/character.js";
import { generate } from "../src/generator.js";

const read = (f) => JSON.parse(readFileSync(new URL("../data/" + f, import.meta.url), "utf8"));
const DATA = indexData({
  roomTypes: read("room-types.json"), events: read("events.json"), monsters: read("monsters.json"),
  items: read("items.json"), characters: read("characters.json"), texts: read("texts.json"), themes: read("themes.json")
});
const newPlayer = (volk = "zwerg") => newCharacter(DATA.characters[volk]);

// Zufallsfunktion, die der Reihe nach feste Werte liefert
const seq = (...vals) => { let i = 0; return () => vals[i++ % vals.length]; };
// Würfelwert w auf einem W-sides als rand()-Wert
const face = (w, sides) => (w - 0.5) / sides;
const ctx = (player, room) => ({
  player, run: newRun(), items: DATA.items,
  room: room || { doors: 1 | 4, locked: new Set(), back: "S" }
});

test("Daten in data/ sind gültig", () => {
  assert.deepEqual(validateData(DATA), []);
});

test("Jeder Raumtyp kommt im Generator vor und hat Events (außer Boss, Rast, Händler)", () => {
  const used = new Set();
  const world = { themes: DATA.themes, roomTypes: DATA.roomTypes };
  for (let depth = 1; depth <= 15; depth++) for (let s = 1; s <= 60; s++) Object.values(generate(s, depth, world).rooms).forEach(r => used.add(r.type));
  assert.deepEqual([...used].sort(), Object.keys(DATA.roomTypes).sort());
  for (const rt of Object.values(DATA.roomTypes)) {
    if (["boss", "rast", "haendler"].includes(rt.id)) assert.equal(rt.eventChance, 0);
    else assert.ok(rt.events.length >= 2, rt.id + ": nur " + rt.events.length + " Events");
  }
});

test("Gemischte Raumtypen: etwa 30 % feindliche Events", () => {
  const rt = DATA.roomTypes.kueche;
  let hostile = 0, n = 0;
  for (let i = 0; i < 4000; i++) {
    const id = pickEvent(rt, newRun(), Math.random, newPlayer());
    if (!id) continue;
    n++;
    if (rt.events.find(e => e.id === id).rating === "hostile") hostile++;
  }
  assert.ok(Math.abs(hostile / n - 0.3) < 0.04, (hostile / n).toFixed(2));
});

test("Datenprüfung findet Fehler", () => {
  const bad = structuredClone({ roomTypes: {}, monsters: DATA.monsters, events: {}, items: DATA.items, characters: DATA.characters });
  bad.events.x = { id: "x", type: "quatsch", title: "X", text: "X", options: [
    { label: "A", check: { category: "charme", dc: 10 }, success: { effects: [{ teleport: 1 }] }, failure: { next: "fehlt" } },
    { label: "B", condition: "volk:ork" }
  ] };
  const errs = validateData(bad);
  assert.ok(errs.some(e => e.includes("unbekannter Typ")));
  assert.ok(errs.some(e => e.includes("unbekannte Kategorie")));
  assert.ok(errs.some(e => e.includes("unbekanntes Volk")));
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

test("Jede Probe in den Events nennt eine Kategorie", () => {
  for (const ev of Object.values(DATA.events)) for (const o of ev.options) {
    if (o.check) assert.ok(o.check.category && !o.check.attr, ev.id + ": " + o.label);
  }
});

test("Probe: W20 + Attribut der Kategorie gegen Schwierigkeit", () => {
  const p = newPlayer();
  const r = doCheck(p, { category: "diplomatie", dc: 12 }, () => face(13, 20));
  assert.equal(r.attr, "verstand");
  assert.equal(r.d, 13);
  assert.equal(r.total, 12);
  assert.equal(r.ok, true);
  assert.equal(doCheck(p, { category: "wissen", dc: 12 }, () => face(12, 20)).ok, false);
  assert.equal(doCheck(p, { category: "kraftakt", dc: 12 }, () => face(10, 20)).ok, true);
});

test("Bedingungen", () => {
  const run = newRun();
  assert.equal(checkCondition(undefined, run), true);
  assert.equal(checkCondition("flag:kerze", run), false);
  assert.equal(checkCondition("notFlag:kerze", run), true);
  run.flags.add("kerze");
  assert.equal(checkCondition("flag:kerze", run), true);
  const zwerg = newPlayer("zwerg"), elf = newPlayer("elf");
  assert.equal(checkCondition("volk:zwerg", run, zwerg), true);
  assert.equal(checkCondition("volk:zwerg", run, elf), false);
  assert.equal(checkCondition("hasItem:langschwert", run, zwerg), true);
  assert.equal(checkCondition("hasItem:langschwert", run, elf), false);
  assert.equal(checkCondition("hasItem:heiltrank", run, elf), true);
});

test("Volks-Optionen sieht nur das passende Volk", () => {
  const ev = DATA.events.gruft_sarkophag;
  const labels = (v) => visibleOptions(ev, newRun(), newPlayer(v)).map(o => o.label);
  assert.ok(labels("zwerg").includes("Die Steinmetzarbeit begutachten"));
  assert.ok(!labels("elf").includes("Die Steinmetzarbeit begutachten"));
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
  const p = newPlayer(); // Zwerg, 14 LP
  const c = ctx(p);
  let res = applyEffects([{ damage: 5 }, { heal: 2 }, { loot: "tier1" }, { gainXp: 3 }, { setFlag: "k" }], c, () => 0.999);
  assert.equal(p.hp, 11);
  assert.equal(p.gold, 12); // 2W6 mit zwei Sechsen
  assert.deepEqual(res.items, [], "kein Gegenstand bei einem Wurf über 1/3");
  assert.equal(p.xp, 3);
  assert.ok(c.run.flags.has("k"));
  res = applyEffects([{ heal: 10 }], c, Math.random);
  assert.equal(p.hp, 14, "Heilung nur bis zum Maximum");
  assert.equal(res.lines[0].amount, 3);
  res = applyEffects([{ damage: 20 }, { loot: "tier2" }], c, Math.random);
  assert.equal(p.hp, 0, "LP fallen nicht unter 0");
  assert.equal(res.died, true);
  assert.equal(p.gold, 12, "nach dem Tod keine weiteren Effekte");
});

test("Kampf unterbricht die Effekte, der Rest gilt erst nach dem Sieg", () => {
  const p = newPlayer();
  const res = applyEffects([{ gainXp: 2 }, { combat: "skeleton" }, { loot: "tier1" }], ctx(p), Math.random);
  assert.equal(p.xp, 2);
  assert.equal(res.combat.monster, "skeleton");
  assert.deepEqual(res.combat.rest, [{ loot: "tier1" }]);
  assert.equal(p.gold, 0);
});

test("Beute: Gold mal Themenstufe, Gegenstand der Themenstufe (tier2 eine höher)", () => {
  // tier1: Gegenstand nur, wenn der dritte Wurf unter 1/3 liegt
  let l = rollLoot("tier1", DATA.items, seq(0, 0, 0.1, 0), 1);
  assert.equal(l.gold, 2);
  l = rollLoot("tier1", DATA.items, seq(0, 0, 0.5), 3);
  assert.equal(l.gold, 6, "2W6 = 2, mal Stufe 3");
  assert.equal(l.item, null);
  // Gegenstände vom Rang der Themenstufe (tier2 einen Rang höher), Verbrauchsgegenstände eingeschlossen.
  // Rang 6 ist noch leer (Content-Projekt), daher hier nur bis Themenstufe 4.
  for (const stage of [1, 2, 3, 4]) for (let i = 0; i < 200; i++) {
    const t1 = rollLoot("tier1", DATA.items, Math.random, stage);
    assert.ok(t1.gold >= 2 * stage && t1.gold <= 12 * stage);
    if (t1.item) assert.equal(DATA.items[t1.item].rang, stage);
    const t2 = rollLoot("tier2", DATA.items, Math.random, stage);
    assert.ok(t2.item, "tier2 gibt immer einen Gegenstand");
    assert.equal(DATA.items[t2.item].rang, stage + 1);
  }
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

test("Effekte gold, item und loseGold", () => {
  const p = newPlayer();
  const c = Object.assign(ctx(p), { stage: 2 });
  // gold: nur Gold, mal Stufe des Themas
  let res = applyEffects([{ gold: "2W6" }], c, () => 0.999);
  assert.equal(p.gold, 24);
  assert.deepEqual(res.items, []);
  // item: sicher ein Gegenstand, kein Gold
  res = applyEffects([{ item: "tier1" }], c, () => 0);
  assert.equal(p.gold, 24);
  assert.equal(res.items.length, 1);
  const it = DATA.items[res.items[0]];
  assert.equal(it.rang, 2);
  // loseGold: fester Betrag, nie unter 0
  applyEffects([{ loseGold: 2 }], c, Math.random);
  assert.equal(p.gold, 22);
  p.gold = 1;
  res = applyEffects([{ loseGold: 2 }], c, Math.random);
  assert.deepEqual([p.gold, res.lines[0].amount], [0, 1]);
});
