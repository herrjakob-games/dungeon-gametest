// Händler (docs/GDD.md, Abschnitt Bosse, Gold und Händler). Reine Logik, testbar.
import { mulberry32 } from "./rng.js";

export const OFFER_SIZE = 4;

// Kaufpreis steht bei jedem Gegenstand im Feld "preis"; Verkauf bringt die Hälfte, abgerundet
export const buyPrice = (item) => item.preis;
export const sellPrice = (item) => Math.floor(item.preis / 2);

/**
 * Angebot des Händlers: 4 zufällige Ausrüstungsteile vom Rang der Stufe des Themas (ohne Doppelte; gibt es weniger,
 * alle) und alle Verbrauchsgegenstände in beliebiger Menge. Gleicher Raum-Seed ergibt das gleiche Angebot.
 */
export function merchantStock(items, stage, seed) {
  const R = mulberry32(seed);
  const pool = Object.values(items).filter(i => i.type !== "consumable" && i.rang === stage).map(i => i.id);
  const gear = [];
  while (pool.length && gear.length < OFFER_SIZE) gear.push(pool.splice(Math.floor(R() * pool.length), 1)[0]);
  const consumables = Object.values(items).filter(i => i.type === "consumable").map(i => i.id);
  return { gear, consumables };
}

// Kaufen: Gold abziehen und in den Rucksack. Ergebnis: null bei Erfolg, sonst ein Grund.
export function buy(player, item, packSize) {
  const price = buyPrice(item);
  if (player.gold < price) return "Dafür reicht dein Gold nicht.";
  if (player.pack.length >= packSize) return "Dein Rucksack ist voll.";
  player.gold -= price;
  player.pack.push(item.id);
  return null;
}

// Verkaufen aus dem Rucksack zum halben Preis
export function sell(player, item, index) {
  player.pack.splice(index, 1);
  player.gold += sellPrice(item);
}
