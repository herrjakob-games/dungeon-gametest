// Fest eingebaute Test-Events (Truhe, Abstieg).
// Meilenstein 4 ersetzt das durch das datengetriebene Event-System aus data/*.json.
import { roll } from "./rng.js";
import { state } from "./state.js";
import { showDialog, closeDialog } from "./dialog.js";
import { updateGold } from "./hud.js";

// Probe nach GDD: W20 + Attribut gegen Schwierigkeit
function check(bonus, dc) {
  const d = roll(20);
  const total = d + bonus;
  const ok = total >= dc;
  const html = "W20: " + d + " + " + bonus + " = " + total + " gegen " + dc +
    ' · <strong class="' + (ok ? "ok" : "fail") + '">' + (ok ? "Erfolg" : "Misslungen") + "</strong>";
  return { ok, html };
}

export function chestEvent() {
  if (state.roomState[state.current].chestOpened) {
    showDialog("Die Truhe", "Leer. Bis auf einen Zettel: »Hier war schon jemand. Gezeichnet: jemand.«",
      [{ label: "Weiter", pick: closeDialog }]);
    return;
  }
  showDialog("Die Truhe", "Eine Truhe mit auffällig vielen Kratzspuren am Schloss. Offenbar haben es schon andere versucht.", [
    { label: "Schloss knacken (Geschick +1, SG 12)", pick: pickLock },
    { label: "Liegen lassen", pick: closeDialog }
  ]);
}

function pickLock() {
  const { ok, html } = check(1, 12);
  if (ok) {
    state.roomState[state.current].chestOpened = true;
    state.openLid = true;
    const found = 8 + Math.floor(Math.random() * 10);
    state.gold += found;
    updateGold();
    showDialog("Die Truhe", "Klick. Darin liegen " + found + " Goldmünzen und eine einzelne Socke. Nur eine.",
      [{ label: "Einstecken", pick: closeDialog }], html);
  } else {
    showDialog("Die Truhe", "Der Dietrich verbiegt sich. Die Truhe wirkt jetzt irgendwie selbstzufrieden.", [
      { label: "Nochmal versuchen", pick: pickLock },
      { label: "Liegen lassen", pick: closeDialog }
    ], html);
  }
}

export function exitEvent(onDescend) {
  showDialog("Der Abstieg", "Ein Torbogen voll kaltem, blauem Schimmer. Dahinter führen Stufen nach unten. Von dort riecht es nach Bratkartoffeln.", [
    { label: "Hinabsteigen (neuer Dungeon)", pick: onDescend },
    { label: "Noch nicht", pick: closeDialog }
  ]);
}
