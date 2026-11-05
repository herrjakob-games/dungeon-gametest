// Tests für die Icons auf der Minimap (docs/GDD.md, Bewegung und Erkundung, „Icons auf der Minimap“).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const { mapIconFor, MAP_ICON_WHEN } = await import("../src/roomTypes.js");
const raw = JSON.parse(readFileSync(new URL("../data/room-types.json", import.meta.url), "utf8"));
const TYPES = Array.isArray(raw) ? raw : raw.types;
const byId = Object.fromEntries(TYPES.map(t => [t.id, t]));

test("Jedes mapIcon hat eine Datei assets/ui/karte_<wert>.svg, mapIconWhen kennt nur bossDefeated", () => {
  for (const t of TYPES) {
    if (t.mapIcon !== undefined) {
      assert.equal(typeof t.mapIcon, "string", t.id);
      assert.ok(existsSync(new URL("../assets/ui/karte_" + t.mapIcon + ".svg", import.meta.url)), t.id + ": assets/ui/karte_" + t.mapIcon + ".svg fehlt");
    }
    if (t.mapIconWhen !== undefined) assert.ok(MAP_ICON_WHEN.includes(t.mapIconWhen), t.id + ": unbekanntes mapIconWhen " + t.mapIconWhen);
  }
  assert.deepEqual(MAP_ICON_WHEN, ["bossDefeated"]);
});

test("Icons sind weiße Outlines ohne Füllung im festen Raster", () => {
  for (const t of TYPES.filter(t => t.mapIcon)) {
    const svg = readFileSync(new URL("../assets/ui/karte_" + t.mapIcon + ".svg", import.meta.url), "utf8");
    for (const a of ['viewBox="-10 -10 20 20"', 'fill="none"', 'stroke="#FFFFFF"', 'stroke-width="1.5"', 'stroke-linecap="round"', 'stroke-linejoin="round"'])
      assert.ok(svg.includes(a), t.mapIcon + ": " + a);
  }
});

test("Zuordnung: Vorkammer, Abstieg, Bossraum nach dem Sieg, Händler, Rastplatz", () => {
  assert.equal(mapIconFor(byId.start, {}), "eingang");
  assert.equal(mapIconFor(byId.exit, {}), "abgang");
  assert.equal(mapIconFor(byId.haendler, {}), "haendler");
  assert.equal(mapIconFor(byId.rast, {}), "rastplatz");
  assert.equal(mapIconFor(byId.rast, { campfireOut: true, rested: true }), "rastplatz"); // kein eigener Zustand für das erloschene Feuer
  assert.equal(mapIconFor(byId.boss, {}), null);
  assert.equal(mapIconFor(byId.boss, undefined), null);
  assert.equal(mapIconFor(byId.boss, { bossDefeated: true }), "abgang");
  assert.equal(mapIconFor(byId.halle, {}), null);
});
