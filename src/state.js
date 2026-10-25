// Gemeinsamer Spielzustand. Alle Module lesen und schreiben hier, statt eigene Kopien zu halten.
import { MID, key, inBounds } from "./config.js";
import { newPlayer, newRun } from "./eventLogic.js";

export const state = {
  // Dungeon
  dungeon: null,       // Ergebnis von generate()
  current: null,       // Schlüssel "x,z" des aktuellen Raums
  visited: new Set(),  // besuchte Räume
  roomState: {},       // Zustand pro Raum, z. B. { chestOpened: true, locked: Set("N") }
  run: newRun(),       // Flags und einmalige Events, gelten pro Dungeon
  backDoor: null,      // Tür, durch die der aktuelle Raum betreten wurde

  // Spieler
  pTile: [MID, MID],
  player: newPlayer(), // LP, Erfahrung, Gold, Attribute
  eventActive: false,  // während eines Events: kein Laufen, Fenster nicht wegklickbar

  // Aktueller Raum (wird von buildRoom neu gesetzt)
  blocked: new Set(),  // belegte Kacheln "x,z"
  interactables: [],   // anklickbare Objekte (Türen, Truhe, Torbogen)
  torches: [],
  lidPivot: null,
  openLid: false,

  // Ablauf
  path: [],            // verbleibende Kacheln der Laufbewegung
  onArrive: null,      // Aktion nach Ankunft
  transitioning: false,
  hovered: null
};

export const walkable = (x, z) => inBounds(x, z) && !state.blocked.has(key(x, z));
