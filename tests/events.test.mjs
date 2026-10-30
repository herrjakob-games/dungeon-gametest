// Ausführen mit: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  indexData, validateData, newRun, rollDice, doCheck, checkCondition,
  pickEvent, applyEffects, releaseIfTrapped, rollLoot, visibleOptions, bossEventTable, inTheme, ratingFor, eventTable, pickEncounter
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
    if (rt.id === "boss") assert.ok(rt.themeEvents.keller.length >= 2, "Bossraum: Events nur über themeEvents");
    else if (["rast", "haendler"].includes(rt.id)) assert.equal(rt.eventChance, 0);
    else {
      // Events in events oder in einer Tabelle pro Thema (themeEvents)
      const most = Math.max(rt.events.length, ...Object.values(rt.themeEvents || {}).map(l => l.length));
      assert.ok(most >= 2, rt.id + ": nur " + most + " Events");
    }
  }
});

test("Gemischte Raumtypen: etwa 30 % feindliche Events", () => {
  const rt = inTheme(DATA.roomTypes.kueche, "keller");
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
  for (const stage of [1, 2, 3, 4]) for (let i = 0; i < 200; i++) {
    const t1 = rollLoot("tier1", DATA.items, Math.random, stage);
    assert.ok(t1.gold >= 2 * stage && t1.gold <= 12 * stage);
    if (t1.item) assert.equal(DATA.items[t1.item].rang, stage);
    const t2 = rollLoot("tier2", DATA.items, Math.random, stage);
    assert.ok(t2.item, "tier2 gibt immer einen Gegenstand");
    assert.equal(DATA.items[t2.item].rang, stage + 1);
  }
  // Rang 6 ist noch leer (Content-Projekt): Im Ork-Lager (Stufe 5) bringt tier2 dann Gegenstände vom Rang 5
  for (let i = 0; i < 50; i++) {
    const t2 = rollLoot("tier2", DATA.items, Math.random, 5);
    assert.equal(DATA.items[t2.item].rang, 5);
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

test("Bossraum: Event-Tabelle pro Thema, bei jedem Betreten neu gewürfelt, bis der Boss besiegt ist", () => {
  const boss = DATA.roomTypes.boss;
  assert.equal(boss.eventChance, 1);
  assert.equal(DATA.themes.find(t => t.id === "keller").boss, "monsterratte");
  const run = newRun(), z = newCharacter(DATA.characters.zwerg);
  // Erstes Betreten: Begegnung, beim nächsten Betreten (Flag gesetzt) der zweite Gang
  const keller = bossEventTable(boss, "keller");
  for (let i = 0; i < 20; i++) assert.equal(pickEvent(keller, run, Math.random, z), "boss_monsterratte");
  const res = applyEffects(DATA.events.boss_monsterratte.options[0].effects, { player: z, run, items: DATA.items, stage: 1 }, Math.random);
  assert.equal(res.combat.monster, "monsterratte", "das Event startet den Bosskampf");
  assert.deepEqual(res.combat.rest, [], "die Siegbeute vergibt der Code, nicht das Event");
  for (let i = 0; i < 20; i++) assert.equal(pickEvent(keller, run, Math.random, z), "boss_monsterratte_zurueck");
  // Andere Themen haben noch keine Boss-Events: dort startet der Kampf direkt
  assert.equal(pickEvent(bossEventTable(boss, "katakomben"), newRun(), Math.random, z), null);
  // Eigene Todessätze für die Boss-Events
  assert.ok(DATA.texts.death.events.boss_monsterratte && DATA.texts.death.events.boss_monsterratte_zurueck);
});

test("Tabellen und Bewertung pro Thema: themeEvents ersetzt events, themeRating ändert die Bewertung", () => {
  const gruft = DATA.roomTypes.gruft;
  assert.deepEqual(gruft.events, [], "Keller-Events liegen in themeEvents.keller");
  assert.ok(eventTable(gruft, "keller").length >= 2);
  assert.deepEqual(eventTable(gruft, "katakomben"), [], "ohne Tabelle im Thema gilt events");
  assert.deepEqual(eventTable(DATA.roomTypes.start, "orklager"), DATA.roomTypes.start.events);
  const rt = { id: "x", rating: "hostile", themeRating: { katakomben: "mixed" } };
  assert.equal(ratingFor(rt, "keller"), "hostile");
  assert.equal(ratingFor(rt, "katakomben"), "mixed");
  // Boss nutzt denselben Weg: Keller mit Tabelle, Katakomben ohne (dann intro und direkt Kampf)
  assert.ok(bossEventTable(DATA.roomTypes.boss, "keller").events.length >= 2);
  assert.equal(bossEventTable(DATA.roomTypes.boss, "katakomben").eventChance, 0);
});

test("Markierungspflicht pro Thema: gemischt im Thema heißt hostile und rating an jedem Eintrag", () => {
  const data = structuredClone({ roomTypes: DATA.roomTypes, monsters: DATA.monsters, events: DATA.events, items: DATA.items,
    characters: DATA.characters, texts: DATA.texts, themes: DATA.themes });
  // Feindlicher Raumtyp, in den Katakomben gemischt: seine Tabelle dort braucht beide Markierungen
  const kerker = data.roomTypes.kerker;
  kerker.themeRating = { katakomben: "mixed" };
  kerker.themeEvents = { katakomben: [{ id: kerker.events[0].id, weight: 3 }, { id: kerker.events[1].id, weight: 2, rating: "neutral" }] };
  let errs = validateData(data);
  assert.ok(errs.some(e => e.includes("kerker (katakomben)") && e.includes("rating")), errs.join("\n"));
  assert.ok(errs.some(e => e.includes("kerker (katakomben)") && e.includes("hostile true oder false")));
  // Ohne eigene Tabelle gilt events auch im gemischten Thema und braucht dann die Markierung
  delete kerker.themeEvents;
  errs = validateData(data);
  assert.ok(errs.some(e => e.includes("kerker (katakomben)")), "events im gemischten Thema ohne Markierung");
  // Feste Bewertungen bleiben: Vorkammer neutral, Bossraum feindlich
  data.roomTypes.start.themeRating = { katakomben: "hostile" };
  assert.ok(validateData(data).some(e => e.includes("start") && e.includes("in jedem Thema neutral")));
});

test("Begegnungen: Monster existieren, nur feindliche und gemischte Räume, gleicher Seed gleiche Begegnung", () => {
  DATA.themes.filter(t => t.encounters).forEach(t => t.encounters.monsters.forEach(m => assert.ok(DATA.monsters[m.monster], t.id + ": " + m.monster)));
  assert.ok(!DATA.themes.find(t => t.id === "keller").encounters, "im Keller gibt es keine Begegnungen");
  const theme = { id: "katakomben", encounters: { chance: 0.5, monsters: [{ monster: "skeleton", weight: 3 }, { monster: "rat", weight: 1 }], reward: [{ loot: "tier1" }, { gainXp: 3 }] } };
  ["start", "exit", "rast", "haendler", "schatz", "boss"].forEach(id => {
    for (let s = 1; s < 200; s++) assert.equal(pickEncounter(theme, DATA.roomTypes[id], s), null, id);
  });
  for (let s = 1; s < 200; s++) assert.equal(pickEncounter(theme, { id: "x", rating: "neutral" }, s), null);
  let hits = 0;
  for (let s = 1; s <= 2000; s++) {
    const m = pickEncounter(theme, DATA.roomTypes.kerker, s);
    assert.equal(m, pickEncounter(theme, DATA.roomTypes.kerker, s), "gleicher Seed, gleiche Begegnung");
    if (m) hits++;
  }
  assert.ok(Math.abs(hits / 2000 - 0.5) < 0.05, "Chance " + hits / 2000);
  // Ein im Thema neutraler Raumtyp hat keine Begegnung
  for (let s = 1; s < 200; s++) assert.equal(pickEncounter(theme, { id: "kerker", rating: "hostile", themeRating: { katakomben: "neutral" } }, s), null);
  // Datenprüfung: unbekanntes Monster in encounters
  const data = structuredClone({ roomTypes: DATA.roomTypes, monsters: DATA.monsters, events: DATA.events, items: DATA.items,
    characters: DATA.characters, texts: DATA.texts, themes: DATA.themes });
  data.themes.find(t => t.id === "katakomben").encounters = { chance: 0.15, monsters: [{ monster: "geist_gibts_nicht", weight: 2 }], reward: [{ loot: "tier1" }] };
  assert.ok(validateData(data).some(e => e.includes("encounters: unbekanntes Monster geist_gibts_nicht")));
});
