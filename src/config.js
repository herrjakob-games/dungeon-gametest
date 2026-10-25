// Grundkonstanten und Raster-Helfer. Werte stammen aus docs/GDD.md.

export const N = 11;      // Raumgröße 11×11 Kacheln
export const MID = 5;     // Mittelkachel: hier sitzen die Türen
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

export const reduceMotion = typeof window !== "undefined" && window.matchMedia
  ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
  : false;
