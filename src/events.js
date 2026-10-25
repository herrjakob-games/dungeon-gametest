// Event-Ablauf im Textfenster: Events aus data/events.json anzeigen, Proben würfeln, Effekte anwenden.
// Die Regeln selbst stehen in eventLogic.js, hier geht es nur um Anzeige und Ablauf.
import { DIR } from "./config.js";
import { state } from "./state.js";
import { DATA } from "./data.js";
import { TYPES } from "./roomTypes.js";
import { ATTR_NAMES, pickEvent, doCheck, applyEffects, releaseIfTrapped } from "./eventLogic.js";
import { showDialog, closeDialog } from "./dialog.js";
import { refreshLocks } from "./roomBuilder.js";
import { updateStats } from "./hud.js";

let onDeath = () => {};
export function initEvents(hooks) { onDeath = hooks.onDeath; }

const sign = (n) => (n < 0 ? "− " + Math.abs(n) : "+ " + n);
const signShort = (n) => (n < 0 ? "−" + Math.abs(n) : "+" + n);

// Würfelzeile, z. B. "Geschick-Probe · W20: 9 + 1 = 10 gegen SG 12 · Erfolg"
function rollHtml(r, against, okText, failText) {
  return ATTR_NAMES[r.attr] + "-Probe · W20: " + r.d + " " + sign(r.bonus) + " = " + r.total + " gegen " + against +
    ' · <strong class="' + (r.ok ? "ok" : "fail") + '">' + (r.ok ? okText : failText) + "</strong>";
}

function lineHtml(l) {
  switch (l.type) {
    case "damage": return '<span class="bad">−' + l.amount + " LP</span>";
    case "heal": return l.amount ? '<span class="good">+' + l.amount + " LP</span>" : "Lebenspunkte sind schon voll";
    case "loot": return '<span class="gold">+' + l.amount + " Gold</span>";
    case "gainXp": return "+" + l.amount + " Erfahrung";
    case "combat": return "Kampf gegen " + l.monster + ": " +
      rollHtml(l.roll, "Rüstung " + l.roll.dc, "Sieg", "Niederlage") +
      (l.amount ? ' · <span class="bad">−' + l.amount + " LP</span>" : "");
    case "lockDoor": return "Die Tür nach " + DIR[l.dir].name + " ist verschlossen.";
    case "unlockDoor": return "Die Tür nach " + DIR[l.dir].name + " ist wieder offen.";
  }
  return "";
}

const optionLabel = (o) => o.check
  ? o.label + " (" + ATTR_NAMES[o.check.attr] + " " + signShort(state.player.attrs[o.check.attr]) + ", SG " + o.check.dc + ")"
  : o.label;

// Türen des aktuellen Raums, wie eventLogic sie braucht
function roomCtx() {
  const rs = state.roomState[state.current];
  if (!rs.locked) rs.locked = new Set();
  return { doors: state.dungeon.rooms[state.current].doors, locked: rs.locked, back: state.backDoor };
}

// Beim ersten Betreten: gegen die Event-Chance des Raumtyps würfeln. Ergebnis: true, wenn ein Event startet.
export function startRoomEvent() {
  const type = TYPES[state.dungeon.rooms[state.current].type];
  const id = pickEvent(type, state.run, Math.random);
  if (!id) return false;
  state.run.usedOnce.add(id);
  runEvent(id);
  return true;
}

/**
 * Startet ein Event aus data/events.json.
 * onOutcome(outcome, result) wird nach jeder gewählten Option aufgerufen (z. B. für die Truhe).
 */
export function runEvent(id, onOutcome) {
  const ev = DATA.events[id];
  state.eventActive = true;
  showDialog(ev.title, ev.text, ev.options.map(o => ({ label: optionLabel(o), pick: () => choose(ev, o, onOutcome) })), { modal: true });
}

function choose(ev, option, onOutcome) {
  let outcome = option, roll = null;
  if (option.check) {
    const r = doCheck(state.player, option.check, Math.random);
    roll = rollHtml(r, "SG " + r.dc, "Erfolg", "Misslungen");
    outcome = r.ok ? option.success : option.failure;
  }
  const res = applyEffects(outcome.effects, { player: state.player, run: state.run, monsters: DATA.monsters, room: roomCtx() }, Math.random);
  refreshLocks();
  updateStats();
  if (onOutcome) onOutcome(outcome, res);
  const fx = res.lines.map(lineHtml).filter(Boolean);

  if (res.died) {
    fx.push("Deine Lebenspunkte sind auf 0. Ein neuer Zwerg beginnt einen neuen Dungeon.");
    showDialog("Das war's", outcome.text, [{ label: "Neuer Durchlauf", pick: () => { finish(true); onDeath(); } }], { roll, fx, modal: true });
    return;
  }
  const next = outcome.next ? () => runEvent(outcome.next, onOutcome) : () => finish();
  if (!outcome.text && !fx.length && !roll) { next(); return; }
  showDialog(ev.title, outcome.text, [{ label: "Weiter", pick: next }], { roll, fx, modal: true });
}

function finish(died) {
  state.eventActive = false;
  closeDialog();
  if (died) return;
  const opened = releaseIfTrapped(roomCtx());
  if (opened) {
    refreshLocks();
    showDialog("Glück gehabt", "Die Tür nach " + DIR[opened].name + " knarrt von selbst wieder auf. Eingesperrt wird hier niemand.",
      [{ label: "Weiter", pick: closeDialog }]);
  }
}

// Die Truhe im Raum: ein Event aus den Daten. Sie gilt als geöffnet, sobald sie Beute gegeben hat.
export function chestEvent() {
  const rs = state.roomState[state.current];
  if (rs.chestOpened) { runEvent("chest_empty"); return; }
  runEvent("chest", (outcome, res) => {
    if (res.lines.some(l => l.type === "loot")) { rs.chestOpened = true; state.openLid = true; }
  });
}

// Der Torbogen im Ausgangsraum (feste Interaktion, kein Event aus der Tabelle)
export function exitEvent(onDescend) {
  showDialog("Der Abstieg", "Ein Torbogen voll kaltem, blauem Schimmer. Dahinter führen Stufen nach unten. Von dort riecht es nach Bratkartoffeln.", [
    { label: "Hinabsteigen (neuer Dungeon)", pick: onDescend },
    { label: "Noch nicht", pick: closeDialog }
  ]);
}

// Hinweis, wenn eine verschlossene Tür benutzt werden soll
export function lockedDoorNote(d) {
  showDialog("Verschlossen", "Die Tür nach " + DIR[d].name + " rührt sich nicht. Irgendwer hat hier etwas gegen Durchgangsverkehr.",
    [{ label: "Weiter", pick: closeDialog }]);
}
