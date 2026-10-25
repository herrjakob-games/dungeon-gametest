// Anzeige von Proben und Angebot der Volks-Fähigkeit. Gemeinsam genutzt von Events und Kampf.
import { state } from "./state.js";
import { ATTR_NAMES, canUseAbility } from "./character.js";
import { CATEGORY_NAMES } from "./eventLogic.js";
import { showDialog } from "./dialog.js";
import { updateStats } from "./hud.js";

export const sign = (n) => (n < 0 ? "− " + Math.abs(n) : "+ " + n);
export const signShort = (n) => (n < 0 ? "−" + Math.abs(n) : "+" + n);

// Würfelzeile, z. B. "Fingerfertigkeit (Geschick) · W20: 9 + 1 = 10 gegen SG 12 · Erfolg"
export function rollHtml(r, against, okText = "Erfolg", failText = "Misslungen") {
  const label = (r.category ? CATEGORY_NAMES[r.category] + " (" + ATTR_NAMES[r.attr] + ")" : ATTR_NAMES[r.attr]);
  const result = r.rescued
    ? '<strong class="ok">' + okText + " durch " + state.player.ability.name + "</strong>"
    : '<strong class="' + (r.ok ? "ok" : "fail") + '">' + (r.ok ? okText : failText) + "</strong>";
  return label + " · W20: " + r.d + " " + sign(r.bonus) + " = " + r.total + " gegen " + (against || "SG " + r.dc) + " · " + result;
}

/**
 * Nach einer misslungenen Probe: Darf die Fähigkeit des Volks sie retten? Dann fragen.
 * decide() wird immer aufgerufen, r.ok ist danach eventuell true (r.rescued markiert das).
 */
export function maybeRescue(title, r, against, decide) {
  if (r.ok || !canUseAbility(state.player, r.attr)) { decide(); return; }
  const a = state.player.ability;
  showDialog(title, "Misslungen! " + a.name + " kann das retten: Die Probe gilt dann als bestanden. Das geht nur einmal pro Dungeon.", [
    { label: a.name + " einsetzen", pick: () => { r.ok = true; r.rescued = true; state.player.abilityUsed = true; updateStats(); decide(); } },
    { label: "Nicht einsetzen", pick: decide }
  ], { roll: rollHtml(r, against), modal: true });
}
