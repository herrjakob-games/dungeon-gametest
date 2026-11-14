// Tests für die Fahnen (docs/GDD.md, Requisitenliste, Platzierung door-sides und wall-center, Feste Regeln: Abstandsregel).
// Prüft alle Raumtypen mit Einrichtung (auch themeDecor), alle Varianten und alle 16 Türkombinationen.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { planDecor, decorFor, layoutsOf, centerFeature, isWallDecor, bannerVariant, BANNERS, BANNER_COLORS, PROPS, DOOR_SIDES, WALL_CENTER } from "../src/decor.js";
import { N, MID, DIR, tileName } from "../src/config.js";

const read = (f) => JSON.parse(readFileSync(new URL("../" + f, import.meta.url), "utf8"));
const ROOM_TYPES = read("data/room-types.json"), THEMES = read("data/themes.json"), MODELS = read("data/models.json");
const SEEDS = 12;

// Alle Einrichtungen: decor und themeDecor jedes Raumtyps
const SPECS = [];
ROOM_TYPES.forEach(rt => {
  if (rt.decor) SPECS.push({ rt, where: rt.id, spec: rt.decor });
  Object.entries(rt.themeDecor || {}).forEach(([th, spec]) => SPECS.push({ rt, where: rt.id + " (" + th + ")", spec }));
});
const along = (wall, [x, z]) => (wall === "N" ? x : z);
const onWall = (wall, [x, z]) => (wall === "N" ? z === 0 : x === 0);

test("Fahnen: nur Nord- und Westwand, nie auf einer Fackel, Türbanner paarweise, Abstandsregel, dreifache nur an Wänden ohne Tür", (t) => {
  const lost = {};
  for (const { rt, where, spec } of SPECS) {
    if (!spec.layouts) continue;
    const feature = centerFeature(rt.id, false);
    layoutsOf(spec).forEach((layout, li) => {
      for (let doors = 0; doors < 16; doors++) for (let s = 1; s <= SEEDS; s++) {
        const plan = planDecor(spec, { seed: s * 7919 + doors, doors, feature, layoutIndex: li, bannerColor: "blau" });
        const w = where + " Variante " + layout.id + ", Türen " + doors + ", Seed " + s;
        const torch = new Set(plan.torches.map(f => f.wall + f.t));
        const banners = plan.placements.filter(p => BANNERS.includes(p.prop));
        for (const b of banners) {
          assert.ok(b.wall === "N" || b.wall === "W", w + ": " + b.prop + " nicht an Nord- oder Westwand");
          assert.ok(b.tiles.every(tl => onWall(b.wall, tl)), w + ": " + b.prop + " nicht an der Wand");
          const ts = b.tiles.map(tl => along(b.wall, tl));
          assert.ok(ts.every(x => !torch.has(b.wall + x)), w + ": " + b.prop + " auf einer Fackelkachel");
          const door = !!(doors & DIR[b.wall].bit);
          if (b.prop === "fahne_dreifach") {
            assert.ok(!door, w + ": fahne_dreifach an einer Wand mit Tür");
            assert.deepEqual(ts, [MID - 1, MID, MID + 1], w + ": fahne_dreifach nicht mittig");
          } else {
            assert.ok(door, w + ": Türbanner an einer Wand ohne Tür");
            assert.ok(ts.every(x => Math.abs(x - MID) >= 2), w + ": Fahne im Türrahmen");
          }
          // Abstandsregel: eine freie Wandkachel zur nächsten Wanddeko (in beide Richtungen; Fackeln zählen nicht)
          plan.placements.filter(p => p !== b && p.wall === b.wall && isWallDecor(p.prop)).forEach(p => {
            const other = p.tiles.filter(tl => onWall(p.wall, tl)).map(tl => along(p.wall, tl));
            const d = Math.min(...ts.flatMap(a => other.map(o => Math.abs(a - o))));
            assert.ok(d >= 2, w + ": " + b.prop + " zu nah an " + p.prop + " (" + d + ")");
          });
        }
        // Türbanner paarweise: links auf 3, rechts auf 7 oder (mit Türfackel auf 7) auf 8, gezählt ab 1
        ["N", "W"].forEach(wall => {
          const mine = banners.filter(b => b.prop === "fahne" && b.wall === wall).map(b => along(wall, b.tiles[0])).sort((a, b) => a - b);
          assert.ok(mine.length === 0 || mine.length === 2, w + ": Türbanner an " + wall + " nicht als Paar");
          if (mine.length === 2) assert.deepEqual(mine, [MID - 2, torch.has(wall + (MID + 2)) ? MID + 3 : MID + 2], w + ": Türbanner falsch platziert");
        });
        // Wände ohne Tür mit mittiger Fahne: Fackeln auf 2 und 8 (gezählt ab 1)
        if (layout.props.some(p => p.place === WALL_CENTER)) plan.torches.forEach(f => {
          if (!(doors & DIR[f.wall].bit)) assert.ok(f.t === 1 || f.t === N - 2, w + ": Fackel an Wand ohne Tür auf " + (f.t + 1));
        });
        // Statistik: Plätze (Türpaare bzw. Wände ohne Tür) und wie oft die Fahne dort wegfällt
        layout.props.filter(p => BANNERS.includes(p.prop)).forEach(p => {
          ["N", "W"].forEach(wall => {
            const door = !!(doors & DIR[wall].bit);
            if ((p.place === DOOR_SIDES) !== door) return;
            const k = where + ": " + p.prop + " (" + p.place + ")";
            lost[k] = lost[k] || [0, 0];
            lost[k][0]++;
            if (plan.dropped.some(d => d.prop === p.prop && d.wall === wall)) lost[k][1]++;
          });
        });
      }
    });
  }
  t.diagnostic("Weggefallene Fahnen (alle Varianten, 16 Türkombinationen, " + SEEDS + " Seeds; Türbanner als Paar gezählt):");
  Object.entries(lost).sort().forEach(([k, [n, gone]]) => t.diagnostic("  " + k + ": " + gone + " von " + n + " weg (" + Math.round(100 * gone / n) + " %)"));
});

test("Fahnen pro Raumtyp laut GDD: door-sides und wall-center, keine festen Farben", () => {
  const want = {
    wache: [["fahne", DOOR_SIDES, "wappen"]],
    speisesaal: [["fahne", DOOR_SIDES, undefined], ["fahne_dreifach", WALL_CENTER, undefined]],
    halle: [["fahne", DOOR_SIDES, "wappen"], ["fahne_dreifach", WALL_CENTER, undefined]],
    schatz: [["fahne_dreifach", WALL_CENTER, undefined]],
    exit: [["fahne", DOOR_SIDES, "wappen"], ["fahne_dreifach", WALL_CENTER, undefined]],
    boss: [["fahne", DOOR_SIDES, "wappen"], ["fahne_dreifach", WALL_CENTER, undefined]]
  };
  for (const { rt, where, spec } of SPECS) for (const layout of layoutsOf(spec)) {
    const got = layout.props.filter(p => BANNERS.includes(p.prop)).map(p => [p.prop, p.place, p.variant]);
    assert.deepEqual(got, want[rt.id] || [], where + " Variante " + layout.id);
  }
});

test("Fahnenfarbe pro Thema: jedes Thema hat bannerColor, jede Variante hat ein Modell", () => {
  const colors = { keller: "gelb", katakomben: "gelb", zwergenminen: "blau", goblinhoehlen: "gruen", orklager: "gruen" };
  THEMES.forEach(th => assert.equal(th.bannerColor, colors[th.id], th.id));
  BANNER_COLORS.forEach(c => {
    assert.ok(MODELS["fahne_" + bannerVariant("fahne", undefined, c)], "fahne_" + c + " fehlt in data/models.json");
    assert.ok(MODELS["fahne_" + bannerVariant("fahne", "wappen", c)], "fahne_wappen_" + c + " fehlt in data/models.json");
    assert.ok(MODELS["fahne_dreifach_" + bannerVariant("fahne_dreifach", undefined, c)], "fahne_dreifach_" + c + " fehlt in data/models.json");
  });
  assert.equal(bannerVariant("tisch", "kueche", "blau"), "kueche", "andere Requisiten behalten ihre Variante");
  assert.equal(PROPS.fahne_dreifach.w, 2);
  // Ohne Theme-Farbe (Tests) bleibt die Variante der Daten
  assert.equal(bannerVariant("fahne", "wappen", undefined), "wappen");
});

test("Fahnen im Spiel tragen die Farbe des Themas", () => {
  const spec = decorFor(ROOM_TYPES.find(r => r.id === "halle"), "zwergenminen");
  const plan = planDecor(spec, { seed: 11, doors: DIR.N.bit, bannerColor: "blau" });
  const vs = plan.placements.filter(p => BANNERS.includes(p.prop)).map(p => p.prop + ":" + p.variant);
  assert.ok(vs.length > 0);
  assert.ok(vs.every(v => v === "fahne:wappen_blau" || v === "fahne_dreifach:blau"), vs.join(", "));
  assert.equal(tileName(MID, 0), "5|1");
});
