// Tests für Sounds (docs/GDD.md, Abschnitt Sound): Zuordnung in data/sounds.json, Verweise aus den Daten, Dateien.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { indexData } from "../src/eventLogic.js";
import { ATTACK_SOUNDS, MOODS, FLOORS, attackSound, monsterAttackSound, roomSound, stepKind, referencedSounds, checkSounds, playerDeathSounds } from "../src/soundLogic.js";
import { listSounds } from "../tools/sound-index.mjs";

const read = (f) => JSON.parse(readFileSync(new URL("../data/" + f, import.meta.url), "utf8"));
const DATA = indexData({
  roomTypes: read("room-types.json"), events: read("events.json"), monsters: read("monsters.json"),
  items: read("items.json"), characters: read("characters.json"), texts: read("texts.json"), themes: read("themes.json")
});
DATA.staging = read("staging.json");
const SOUNDS = read("sounds.json");

test("Jede Sound-id aus items, monsters, events, room-types und staging existiert in data/sounds.json", () => {
  const errors = [];
  checkSounds(DATA, SOUNDS, (w, t) => errors.push(w + ": " + t));
  assert.deepEqual(errors, []);
  assert.ok(referencedSounds(DATA).length > 30);
});

test("Jeder Angriffsklang hat _treffer und _fehl, jede mood und jeder floor ihre Einträge", () => {
  const klaenge = new Set(ATTACK_SOUNDS);
  Object.values(DATA.items).filter(i => i.type === "weapon").forEach(i => { assert.ok(i.sound, i.id + ": Waffe ohne sound"); klaenge.add(i.sound); });
  Object.values(DATA.monsters).filter(m => m.sound).forEach(m => klaenge.add(m.sound));
  klaenge.forEach(k => ["treffer", "fehl"].forEach(r => assert.ok(SOUNDS["angriff_" + k + "_" + r], "angriff_" + k + "_" + r + " fehlt")));
  MOODS.forEach(m => ["loop", "zufall"].forEach(r => assert.ok(SOUNDS["raum_" + m + "_" + r], "raum_" + m + "_" + r + " fehlt")));
  FLOORS.forEach(f => assert.ok(SOUNDS["schritt_" + f], "schritt_" + f + " fehlt"));
  Object.values(DATA.items).filter(i => i.type === "consumable").forEach(i => assert.ok(i.sound && SOUNDS[i.sound], i.id + ": Verbrauchsgegenstand ohne Sound"));
});

test("Regeln: ohne Waffe faust, Monster ohne Klang still, themeSound vor sound, eigene Schritte", () => {
  assert.equal(attackSound(undefined, true), "angriff_faust_treffer");
  assert.equal(attackSound("axt", false), "angriff_axt_fehl");
  assert.equal(monsterAttackSound(DATA.monsters.rat, true), "angriff_biss_treffer");
  assert.equal(monsterAttackSound({ id: "x" }, true), null);
  const rt = { sound: { mood: "cozy", floor: "wood" }, themeSound: { katakomben: { mood: "spooky", floor: "gravel" } } };
  assert.deepEqual(roomSound(rt, "keller"), { mood: "cozy", floor: "wood" });
  assert.deepEqual(roomSound(rt, "katakomben"), { mood: "spooky", floor: "gravel" });
  assert.equal(roomSound({}, "keller"), null);
  assert.equal(stepKind("rat", DATA.staging, "hall"), "trippeln");
  assert.equal(stepKind("skeleton", DATA.staging, "hall"), "hall");
  assert.equal(stepKind("rat", DATA.staging, null), null, "Räume ohne Sound bleiben auch ohne Schritte");
  assert.deepEqual(playerDeathSounds("zwerg"), ["tod_zwerg", "tod_spieler", "tod"], "Spielfigur: eigener Tod vor dem allgemeinen");
  // Alle Keller-Räume haben mood und floor
  const keller = DATA.themes.find(t => t.id === "keller");
  keller.roomTypes.concat(["start", "exit", "boss", "schatz", "rast", "haendler"]).forEach(id => assert.ok(roomSound(DATA.roomTypes[id], "keller"), id + ": ohne sound"));
});

test("MP3-Dateien: fehlende sind kein Fehler, werden aber aufgelistet; files.json passt zu den Dateien", (t) => {
  const files = [...new Set(Object.entries(SOUNDS).filter(([k]) => k !== "_info").flatMap(([, d]) => d.files))].sort();
  const root = new URL("../assets/sounds/", import.meta.url);
  const missing = files.filter(f => !existsSync(new URL(f, root)));
  t.diagnostic("MP3-Dateien: " + (files.length - missing.length) + " von " + files.length + " vorhanden");
  missing.forEach(f => t.diagnostic("  fehlt: assets/sounds/" + f));
  const index = JSON.parse(readFileSync(new URL("files.json", root), "utf8"));
  assert.deepEqual(index, listSounds(), "assets/sounds/files.json ist veraltet: npm run sounds ausführen");
});
