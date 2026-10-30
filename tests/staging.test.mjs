// Tests für die Inszenierung der Event-Figuren (docs/GDD.md, „Inszenierung der Figuren“, data/staging.json).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FakeThree } from "./fakeThree.mjs";

globalThis.window = { THREE: FakeThree };
const { planFigures } = await import("../src/figurePlan.js");
const { eventFigures, combatMonsterOf, checkStaging, CODE_PROPS, UNKNOWN_COUNT } = await import("../src/staging.js");
const { PROPS, planDecor, decorFor, centerFeature, doorTiles, STAIRS_TILES } = await import("../src/decor.js");
const { indexData } = await import("../src/eventLogic.js");
const { key, inBounds } = await import("../src/config.js");

const read = (f) => JSON.parse(readFileSync(new URL("../data/" + f, import.meta.url), "utf8"));
const DATA = indexData({
  roomTypes: read("room-types.json"), events: read("events.json"), monsters: read("monsters.json"),
  items: read("items.json"), characters: read("characters.json"), texts: read("texts.json"), themes: read("themes.json")
});
const STAGING = read("staging.json");
const PROP_IDS = Object.keys(PROPS).concat(CODE_PROPS);

// Räume (Raumtyp und Thema), in denen ein Event vorkommt
function roomsFor(id) {
  const out = [];
  for (const rt of Object.values(DATA.roomTypes)) {
    if (rt.events.some(e => e.id === id)) {
      DATA.themes.filter(t => t.roomTypes.includes(rt.id) || t.startNeighbor === rt.id || ["start", "exit", "schatz", "rast", "haendler"].includes(rt.id))
        .forEach(t => out.push([rt, t.id]));
    }
    Object.entries(rt.themeEvents || {}).forEach(([th, table]) => { if (table.some(e => e.id === id)) out.push([rt, th]); });
  }
  return out;
}

test("data/staging.json ist gültig: Anker verweisen auf bestehende Requisiten, Events und Figuren gibt es", () => {
  const errors = [];
  checkStaging(STAGING, DATA, PROP_IDS, (w, t) => errors.push(w + ": " + t));
  assert.deepEqual(errors, []);
  for (const [id, a] of Object.entries(STAGING.anchors)) a.props.forEach(p => assert.ok(PROP_IDS.includes(p), id + ": " + p));
});

test("Jedes Figuren-Event hat eine gültige Inszenierung oder fällt auf den Standard zurück", () => {
  const figureEvents = Object.values(DATA.events).filter(e => e.figures || combatMonsterOf(e));
  assert.ok(figureEvents.length >= 20);
  for (const ev of figureEvents) {
    const list = eventFigures(ev, STAGING, 12345);
    assert.ok(list.length, ev.id + ": keine Figuren");
    list.forEach(f => assert.ok(!f.anchor || STAGING.anchors[f.anchor], ev.id + ": Anker " + f.anchor));
    if (!STAGING.events[ev.id] && !ev.figures) {
      // unbekannte Anzahl: 1 bis 3 nach Raum-Seed, gleich bei gleichem Seed
      const n = list.reduce((s, f) => s + (f.count || 1), 0);
      assert.ok(n >= UNKNOWN_COUNT[0] && n <= UNKNOWN_COUNT[1], ev.id + ": " + n + " Figuren");
      assert.deepEqual(eventFigures(ev, STAGING, 12345), list);
    }
  }
  // Kröte und Händler bleiben stehen, Skelette bekommen eine Modell-Variante
  assert.equal(eventFigures(DATA.events.brunnen_kroete, STAGING, 1)[0].stay, true);
  for (let seed = 1; seed <= 8; seed++) assert.equal(eventFigures(DATA.events.gruft_sarkophag, STAGING, seed)[0].variant, "minion");
  assert.equal(eventFigures(DATA.events.exit_tuersteher, STAGING, 1)[0].variant, "warrior");
  assert.deepEqual(eventFigures(DATA.events.wache_wuerfel, STAGING, 7).map(f => f.variant), ["warrior"]);
  assert.equal(eventFigures(DATA.events.gruft_ruecken, STAGING, 7)[0].variant, "minion");
  // Gastgeber und schlafender Goblin bleiben nach dem Event
  assert.equal(eventFigures(DATA.events.speisesaal_gastgeber, STAGING, 1)[0].stay, true);
  assert.equal(eventFigures(DATA.events.wache_goblin, STAGING, 1)[0].stay, true);
});

test("Figuren stehen nie auf blockierten Kacheln, in Türen oder auf der Spielfigur (außer Sitz und auf dem Requisit)", () => {
  const events = Object.values(DATA.events).filter(e => e.figures || combatMonsterOf(e));
  let seated = 0, anchored = 0;
  for (const ev of events) {
    for (const [rt, theme] of roomsFor(ev.id)) {
      const spec = decorFor(rt, theme);
      for (const doors of [1, 5, 10, 15]) for (let seed = 1; seed <= 6; seed++) for (const canPose of [true, false]) {
        const feature = centerFeature(rt.id, false);
        const plan = spec ? planDecor(spec, { seed: seed * 101, doors, feature }) : { placements: [], blocked: new Set() };
        const blocked = new Set(plan.blocked);
        if (rt.id === "boss") STAIRS_TILES.forEach(t => blocked.delete(key(...t)));
        const player = doorTiles(doors)[0];
        const doorSet = new Set(doorTiles(doors).map(t => key(...t)));
        const list = eventFigures(ev, STAGING, seed * 101);
        const figs = planFigures(list, { placements: plan.placements, blocked, doors, player, rand: () => (seed * 0.137) % 1,
          anchors: STAGING.anchors, canPose: () => canPose, stairsDown: feature === "down" || feature === "arena" });
        const where = ev.id + " in " + rt.id + "/" + theme + " Türen " + doors + " Seed " + seed + (canPose ? "" : " ohne Animation");
        assert.ok(figs.length >= 1, where + ": keine Figur");
        const seen = new Set();
        figs.forEach(f => {
          if (f.onProp) { assert.equal(f.tiles.length, 0, where); anchored++; return; }
          if (f.seat) { seated++; assert.ok(canPose, where + ": sitzt ohne Sitz-Animation"); }
          if (!canPose) assert.ok(["idle", "flat"].includes(f.anim), where + ": Animation ohne Modell");
          f.tiles.forEach(t => {
            assert.ok(inBounds(...t), where + ": außerhalb des Raums");
            if (!f.seat) assert.ok(!blocked.has(key(...t)), where + ": " + f.figure + " steht auf einem Requisit");
            assert.ok(!doorSet.has(key(...t)), where + ": " + f.figure + " steht in einer Tür");
            assert.notDeepEqual(t, player, where + ": " + f.figure + " steht auf der Spielfigur");
            assert.ok(!seen.has(key(...t)), where + ": zwei Figuren auf einer Kachel");
            seen.add(key(...t));
          });
        });
      }
    }
  }
  assert.ok(seated > 0, "keine Figur sitzt");
  assert.ok(anchored > 0, "keine Figur auf einem Requisit");
});

test("Sitz-Anker: mit Sitz-Animation auf dem Hocker, ohne daneben stehend", () => {
  const placements = [
    { prop: "tisch", tiles: [[4, 3], [4, 4], [4, 5]], cx: 4, cz: 4, rot: Math.PI / 2 },
    { prop: "hocker", tiles: [[3, 5]], cx: 3, cz: 5, rot: 0, target: "tisch" }
  ];
  const blocked = new Set(["4,3", "4,4", "4,5", "3,5"]);
  const ctx = { placements, blocked, doors: 15, player: [4, 8], rand: () => 0.3, anchors: STAGING.anchors };
  const sit = planFigures([{ figure: "skeleton", anchor: "am_tisch_sitzend" }], Object.assign({ canPose: () => true }, ctx))[0];
  assert.deepEqual([sit.tiles, sit.seat, sit.anim], [[[3, 5]], true, "sit"]);
  assert.ok(Math.abs(sit.rot - Math.atan2(4 - 3, 4 - 5)) < 1e-9, "Blick zum Tisch");
  const stand = planFigures([{ figure: "goblin", anchor: "am_tisch_sitzend" }], Object.assign({ canPose: () => false }, ctx))[0];
  assert.equal(stand.seat, false);
  assert.equal(stand.anim, "idle");
  assert.ok(!blocked.has(key(...stand.tiles[0])));
  // Fehlt die Requisite, steht die Figur auf einer freien Kachel
  const free = planFigures([{ figure: "skeleton", anchor: "am_herd" }], Object.assign({ canPose: () => true }, ctx))[0];
  assert.ok(free && !blocked.has(key(...free.tiles[0])));
});

test("Prozession: Rundweg vor den Wänden, um Säulen herum, ohne gesperrte Kachel", async () => {
  const { processionRoute } = await import("../src/figurePlan.js");
  const free = processionRoute(new Set(), new Set());
  assert.ok(free && free.length >= 20, "Rundweg im leeren Raum");
  const pillars = new Set(["1,1", "3,1", "7,7", "4,7"]);
  const route = processionRoute(pillars, new Set());
  assert.ok(route, "Rundweg um Säulen herum");
  route.forEach(t => assert.ok(!pillars.has(t.join()), "Rundweg über eine Säule"));
  for (let i = 0; i < route.length; i++) {
    const [a, b] = [route[i], route[(i + 1) % route.length]];
    assert.ok(Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1])) === 1, "Schritte von Kachel zu Kachel");
  }
  assert.equal(STAGING.events.halle_prozession.procession, true);
});
