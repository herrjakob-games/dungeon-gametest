// Gemeinsamer Spielzustand. Alle Module lesen und schreiben hier, statt eigene Kopien zu halten.
import { MID, key, inBounds } from "./config.js";

export const state = {
  // Dungeon
  dungeon: null,       // Ergebnis von generate()
  current: null,       // Schlüssel "x,z" des aktuellen Raums
  visited: new Set(),  // besuchte Räume
  roomState: {},       // Zustand pro Raum, z. B. { chestOpened: true }

  // Spieler
  pTile: [MID, MID],
  gold: 0,

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
