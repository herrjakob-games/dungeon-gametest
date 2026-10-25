// Event-Ablauf im Textfenster: Events aus data/events.json anzeigen, Proben würfeln, Effekte anwenden,
// Kämpfe starten, Fundstücke einpacken, Stufenaufstiege anbieten.
// Die Regeln selbst stehen in eventLogic.js, character.js und combat.js.
import { DIR } from "./config.js";
import { state } from "./state.js";
import { DATA } from "./data.js";
import { TYPES } from "./roomTypes.js";
import { CATEGORY_NAMES, CATEGORIES, pickEvent, doCheck, applyEffects, releaseIfTrapped, visibleOptions } from "./eventLogic.js";
import { ATTRS, ATTR_NAMES, addItem, levelUp, pendingLevelUps } from "./character.js";
import { showDialog, closeDialog } from "./dialog.js";
import { refreshLocks } from "./roomBuilder.js";
import { updateStats } from "./hud.js";
import { renderInventory } from "./inventory.js";
import { runCombat } from "./combatUI.js";
import { rollHtml, maybeRescue, signShort } from "./checkUI.js";

let hooks = { onDeath: () => {}, onRetreat: () => {}, onBossDefeated: () => {}, onRested: () => {} };
export function initEvents(h) { hooks = h; }

function lineHtml(l) {
  switch (l.type) {
    case "damage": return '<span class="bad">−' + l.amount + " LP</span>";
    case "heal": return l.amount ? '<span class="good">+' + l.amount + " LP</span>" : "Lebenspunkte sind schon voll";
    case "loot": return '<span class="gold">+' + l.amount + " Gold</span>";
    case "gainXp": return "+" + l.amount + " Erfahrung";
    case "lockDoor": return "Die Tür nach " + DIR[l.dir].name + " ist verschlossen.";
    case "unlockDoor": return "Die Tür nach " + DIR[l.dir].name + " ist wieder offen.";
  }
  return "";
}

// Proben-Zuschlag des Themas: In den Daten stehen 8, 12 oder 16, dazu kommt +0 bis +4
const dcBonus = () => state.theme.dcBonus;
const dcText = (dc) => "SG " + (dc + dcBonus()) + (dcBonus() ? " (" + dc + " +" + dcBonus() + " " + state.theme.name + ")" : "");

const optionLabel = (o) => {
  if (!o.check) return o.label;
  const attr = CATEGORIES[o.check.category];
  return o.label + " (" + CATEGORY_NAMES[o.check.category] + ", " + ATTR_NAMES[attr] + " " + signShort(state.player.attrs[attr]) + ", " + dcText(o.check.dc) + ")";
};

// Türen des aktuellen Raums, wie eventLogic sie braucht
function roomCtx() {
  const rs = state.roomState[state.current];
  if (!rs.locked) rs.locked = new Set();
  return { doors: state.dungeon.rooms[state.current].doors, locked: rs.locked, back: state.backDoor };
}
const effectCtx = () => ({ player: state.player, run: state.run, items: DATA.items, stage: state.theme.stage, room: roomCtx() });

// Beim ersten Betreten: gegen die Event-Chance des Raumtyps würfeln. Ergebnis: true, wenn ein Event startet.
export function startRoomEvent() {
  const type = TYPES[state.dungeon.rooms[state.current].type];
  const id = pickEvent(type, state.run, Math.random, state.player);
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
  const opts = visibleOptions(ev, state.run, state.player);
  showDialog(ev.title, ev.text, opts.map(o => ({ label: optionLabel(o), pick: () => choose(ev, o, onOutcome) })), { modal: true });
}

function choose(ev, option, onOutcome) {
  if (!option.check) { resolve(ev, option, null, onOutcome); return; }
  const r = doCheck(state.player, { category: option.check.category, dc: option.check.dc + dcBonus() }, Math.random);
  const against = dcText(option.check.dc);
  maybeRescue(ev.title, r, against, () => resolve(ev, r.ok ? option.success : option.failure, rollHtml(r, against), onOutcome));
}

function resolve(ev, outcome, roll, onOutcome) {
  const res = applyEffects(outcome.effects, effectCtx(), Math.random);
  show(ev, outcome, res, roll, onOutcome, []);
}

// Ergebnis anzeigen und dann weiter: Kampf, Fundstücke, Folge-Event oder Ende
function show(ev, outcome, res, roll, onOutcome, before) {
  refreshLocks();
  updateStats();
  if (onOutcome) onOutcome(outcome, res);
  const fx = before.concat(res.lines.map(lineHtml).filter(Boolean), res.items.map(id => "Gefunden: " + DATA.items[id].name));

  if (res.died) {
    showDialog(ev.title, outcome.text, [{ label: "Weiter", pick: () => die(eventCause(ev)) }], { roll, fx, modal: true });
    return;
  }
  const next = () => {
    if (res.combat) { fight(ev, outcome, res.combat, onOutcome); return; }
    pickUp(res.items.slice(), () => (outcome.next ? runEvent(outcome.next, onOutcome) : finish()));
  };
  if (res.combat) {
    showDialog(ev.title, outcome.text, [{ label: "Kämpfen", pick: next }], { roll, fx, modal: true });
  } else if (!outcome.text && !fx.length && !roll) {
    next();
  } else {
    showDialog(ev.title, outcome.text, [{ label: "Weiter", pick: next }], { roll, fx, modal: true });
  }
}

function fight(ev, outcome, combat, onOutcome) {
  runCombat(combat.monster, {
    onWin: (lines, roll) => {
      const res = applyEffects(combat.rest, effectCtx(), Math.random);
      show(ev, { text: outcome.winText || "Der Kampf ist vorbei.", next: outcome.next }, res, roll, onOutcome, lines);
    },
    onFlee: () => {
      state.eventActive = false;
      closeDialog();
      hooks.onRetreat();
    },
    onDeath: (monster) => die(monster.deathText)
  });
}

// Fundstücke in den Rucksack. Ist er voll, entscheidet der Spieler, was liegen bleibt.
function pickUp(list, done) {
  if (!list.length) { done(); return; }
  const id = list.shift();
  const p = state.player;
  if (addItem(p, id)) { renderInventory(); pickUp(list, done); return; }
  const item = DATA.items[id];
  const opts = p.pack.map((old, i) => ({
    label: DATA.items[old].name + " liegen lassen",
    pick: () => { p.pack[i] = id; renderInventory(); pickUp(list, done); }
  }));
  opts.push({ label: item.name + " liegen lassen", pick: () => pickUp(list, done) });
  showDialog("Rucksack voll", "Für " + item.name + " ist kein Platz mehr. Was bleibt hier liegen?", opts, { modal: true });
}

function finish() {
  state.eventActive = false;
  closeDialog();
  const opened = releaseIfTrapped(roomCtx());
  if (opened) refreshLocks();
  levelUps(() => {
    if (opened) {
      showDialog("Glück gehabt", "Die Tür nach " + DIR[opened].name + " knarrt von selbst wieder auf. Eingesperrt wird hier niemand.",
        [{ label: "Weiter", pick: closeDialog }]);
    }
  });
}

// Stufenaufstieg: für jede erreichte Stufe ein Attribut wählen (+1, ohne Obergrenze), dazu Lebenspunkte je nach Volk
function levelUps(done) {
  const p = state.player;
  if (pendingLevelUps(p) <= 0) { done(); return; }
  const apply = (attr) => { levelUp(p, attr); updateStats(); renderInventory(); closeDialog(); levelUps(done); };
  const opts = ATTRS.map(a => ({ label: ATTR_NAMES[a] + " " + signShort(p.attrs[a]) + " → " + signShort(p.attrs[a] + 1), pick: () => apply(a) }));
  showDialog("Stufenaufstieg!", "Du erreichst Stufe " + (p.level + 1) + ". Du bekommst +" + p.levelHp + " Lebenspunkte. Welches Attribut steigt um 1?", opts, { modal: true });
}

function eventCause(ev) {
  const list = DATA.texts.deathByEvent || ["»{title}« war dein Ende."];
  return list[Math.floor(Math.random() * list.length)].replace("{title}", ev.title);
}

function die(cause) {
  state.eventActive = false;
  closeDialog();
  hooks.onDeath(cause);
}

// Bossraum: Betreten startet den Kampf. Flucht ist erlaubt, beim nächsten Betreten wartet der Boss wieder.
// Sieg: Beute tier2 und 10 Erfahrung, danach erscheint der Torbogen zum Abstieg.
export const BOSS_REWARD = [{ loot: "tier2" }, { gainXp: 10 }];

export function startBoss() {
  const rs = state.roomState[state.current];
  if (rs.bossDefeated || state.eventActive) return;
  const boss = DATA.monsters[state.dungeon.boss];
  const ev = { title: boss.name };
  state.eventActive = true;
  showDialog(boss.name, boss.intro, [{
    label: "Kämpfen",
    pick: () => fight(ev, { winText: boss.name + " ist besiegt. In der Mitte des Raums öffnet sich der Torbogen zum Abstieg." },
      { monster: boss.id, rest: BOSS_REWARD }, () => { rs.bossDefeated = true; hooks.onBossDefeated(); })
  }], { modal: true });
}

// Rastplatz: Das Lagerfeuer heilt einmal auf volle Lebenspunkte
export function restEvent() {
  const rs = state.roomState[state.current];
  const p = state.player;
  if (rs.rested) {
    showDialog("Das Lagerfeuer", "Nur noch kalte Asche. Irgendwer hat sogar die Marshmallows mitgenommen.", [{ label: "Weiter", pick: closeDialog }]);
    return;
  }
  const n = p.maxHp - p.hp;
  rs.rested = true;
  p.hp = p.maxHp;
  updateStats();
  hooks.onRested();
  showDialog("Das Lagerfeuer", "Du wärmst dir die Füße, isst etwas Brot und schläfst eine Runde. Niemand stört dich. Unheimlich.",
    [{ label: "Weiter", pick: closeDialog }], { fx: [n ? '<span class="good">+' + n + " LP</span> · Lebenspunkte voll" : "Lebenspunkte waren schon voll"] });
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
    { label: "Hinabsteigen (Ebene " + (state.depth + 1) + ")", pick: onDescend },
    { label: "Noch nicht", pick: closeDialog }
  ]);
}

// Hinweis, wenn eine verschlossene Tür benutzt werden soll
export function lockedDoorNote(d) {
  showDialog("Verschlossen", "Die Tür nach " + DIR[d].name + " rührt sich nicht. Irgendwer hat hier etwas gegen Durchgangsverkehr.",
    [{ label: "Weiter", pick: closeDialog }]);
}
