// Grundkonstanten und Raster-Helfer. Werte stammen aus docs/GDD.md.

export const N = 9;       // Raumgröße 9×9 Kacheln
export const MID = 4;     // Mittelkachel (gezählt ab 0), im GDD 5|5: hier sitzen die Türen (fünfte Kachel)
export const GRID = 8;    // Dungeon-Gitter 8×8 Raumplätze
export const E = MID + 0.75; // Wandmitte außerhalb des Kachelrasters (Weltkoordinate)

// Türen als Bitmaske: Norden = 1, Osten = 2, Süden = 4, Westen = 8
export const DIR = {
  N: { bit: 1, dx: 0, dz: -1, name: "Norden", opp: "S", approach: [MID, 0] },
  E: { bit: 2, dx: 1, dz: 0, name: "Osten", opp: "W", approach: [N - 1, MID] },
  S: { bit: 4, dx: 0, dz: 1, name: "Süden", opp: "N", approach: [MID, N - 1] },
  W: { bit: 8, dx: -1, dz: 0, name: "Westen", opp: "E", approach: [0, MID] }
};
export const DIRKEYS = ["N", "E", "S", "W"];

export const key = (x, z) => x + "," + z;
export const inBounds = (x, z) => x >= 0 && z >= 0 && x < N && z < N;
export const tw = (t) => t - MID; // Kachel → Weltkoordinate
// Kachelname wie im GDD: x|y, ab 1 gezählt (x von West nach Ost, y von Nord nach Süd)
export const tileName = (x, z) => (x + 1) + "|" + (z + 1);

export const reduceMotion = typeof window !== "undefined" && window.matchMedia
  ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
  : false;
