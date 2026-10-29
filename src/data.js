// Lädt die Spieldaten aus data/*.json und prüft sie gegen das Regelwerk.
import { indexData, validateData } from "./eventLogic.js";
import { TYPES } from "./roomTypes.js";
import { checkStaging, CODE_PROPS } from "./staging.js";
import { PROPS } from "./decor.js";

export let DATA = null;

async function load(name) {
  const res = await fetch(new URL("../data/" + name, import.meta.url));
  if (!res.ok) throw new Error(name + " konnte nicht geladen werden (" + res.status + ")");
  return res.json();
}

export async function loadData() {
  const names = ["room-types", "events", "monsters", "items", "characters", "texts", "themes", "staging"];
  const [roomTypes, events, monsters, items, characters, texts, themes, staging] = await Promise.all(names.map(n => load(n + ".json")));
  DATA = indexData({ roomTypes, events, monsters, items, characters, texts, themes });
  DATA.staging = staging; // Inszenierung der Event-Figuren
  const errors = validateData(DATA);
  checkStaging(staging, DATA, Object.keys(PROPS).concat(CODE_PROPS), (w, t) => errors.push(w + ": " + t));
  if (errors.length) console.error("Fehler in data/:\n" + errors.join("\n"));
  for (const rt of roomTypes) {
    TYPES[rt.id] = Object.assign({}, rt, { torch: parseInt(rt.torch.slice(1), 16) });
  }
  return errors;
}
