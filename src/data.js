// Lädt die Spieldaten aus data/*.json und prüft sie gegen das Regelwerk.
import { indexData, validateData } from "./eventLogic.js";
import { TYPES } from "./roomTypes.js";

export let DATA = null;

async function load(name) {
  const res = await fetch(new URL("../data/" + name, import.meta.url));
  if (!res.ok) throw new Error(name + " konnte nicht geladen werden (" + res.status + ")");
  return res.json();
}

export async function loadData() {
  const [roomTypes, events, monsters] = await Promise.all([load("room-types.json"), load("events.json"), load("monsters.json")]);
  DATA = indexData({ roomTypes, events, monsters });
  const errors = validateData(DATA);
  if (errors.length) console.error("Fehler in data/:\n" + errors.join("\n"));
  for (const rt of roomTypes) {
    TYPES[rt.id] = Object.assign({}, rt, { torch: parseInt(rt.torch.slice(1), 16) });
  }
  return errors;
}
