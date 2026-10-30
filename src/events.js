// Event-Ablauf im Textfenster: Events aus data/events.json anzeigen, Proben würfeln, Effekte anwenden,
// Kämpfe starten, Fundstücke einpacken, Stufenaufstiege anbieten.
// Die Regeln selbst stehen in eventLogic.js, character.js und combat.js.
import { DIR, reduceMotion } from "./config.js";
import { state } from "./state.js";
import { DATA } from "./data.js";
import { TYPES } from "./roomTypes.js";
import { CATEGORY_NAMES, CATEGORIES, pickEvent, bossEventTable, inTheme, pickEncounter, doCheck, applyEffects, releaseIfTrapped, visibleOptions } from "./eventLogic.js";
import { ATTR_NAMES, addItem, levelUp, raisableAttrs, pendingLevelUps } from "./character.js";
import { showDialog, closeDialog } from "./dialog.js";
import { refreshLocks, chestState, removeChest } from "./roomBuilder.js";
import { updateStats } from "./hud.js";
import { renderInventory } from "./inventory.js";
import { runCombat } from "./combatUI.js";
import { rollHtml, maybeRescue, signShort } from "./checkUI.js";
import { showEventFigures, endEventFigures, combatFigure, killCombatFigure, spawnFigure } from "./roomFigures.js";
import { play, playFirst } from "./sound.js";
import { deathSounds, playerDeathSounds } from "./soundLogic.js";

const FIGURE_DELAY = 700; // ms zwischen dem Erscheinen der Figuren und dem Event-Fenster

let hooks = { onDeath: () => {}, onRetreat: () => {}, onBossDefeated: () => {}, onRested: () => {} };
export function initEvents(h) { hooks = h; }

function lineHtml(l) {
  switch (l.type) {
    case "damage": return '<span class="bad">−' + l.amount + " LP</span>";
    case "heal": return l.amount ? '<span class="good">+' + l.amount + " LP</span>" : "Lebenspunkte sind schon voll";
    case "loot": return '<span class="gold">+' + l.amount + " Gold</span>";
    case "loseGold": return '<span class="bad">−' + l.amount + " Gold</span>";
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

// Beim ersten Betreten: zuerst eine Begegnung prüfen (Raum-Seed), sonst gegen die Event-Chance würfeln und aus der
// Tabelle des aktuellen Themas wählen (themeEvents, sonst events). Ergebnis: true, wenn ein Event oder Kampf startet.
export function startRoomEvent() {
  const room = state.dungeon.rooms[state.current];
  const type = TYPES[room.type];
  const monster = pickEncounter(state.theme, type, room.seed);
  if (monster) { startEncounter(monster); return true; }
  const id = pickEvent(inTheme(type, state.theme ? state.theme.id : null), state.run, Math.random, state.player);
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
  // Figuren nach der Inszenierung (data/staging.json) stehen schon da, bevor das Fenster aufgeht
  const shown = showEventFigures(ev);
  const opts = visibleOptions(ev, state.run, state.player);
  const open = () => {
    if (ev.sound) play(ev.sound); // Event-Sound beim Öffnen des Textfensters (auch bei next und Boss-Events)
    showDialog(ev.title, ev.text, opts.map(o => ({ label: optionLabel(o), pick: () => choose(ev, o, onOutcome) })), { modal: true });
  };
  if (shown && !reduceMotion) setTimeout(open, FIGURE_DELAY); else open();
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
  effectSounds(res.lines);
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

// Spielgeräusche zu Effekten: Gold, Goldverlust, Türriegel
function effectSounds(lines) {
  const types = new Set(lines.filter(l => l.amount !== 0).map(l => l.type));
  if (types.has("loot")) play("gold");
  if (types.has("loseGold")) play("gold_zahlen");
  if (types.has("lockDoor") || types.has("unlockDoor")) play("tuer_riegel");
}

function fight(ev, outcome, combat, onOutcome) {
  // Kampf gegen den Boss der Ebene im Bossraum: Die Siegbeute vergibt der Code, nicht das Event
  const rs = state.roomState[state.current];
  const isBoss = state.dungeon.rooms[state.current].type === "boss" && combat.monster === state.dungeon.boss;
  combatFigure(combat.monster); // der Gegner steht neben der Spielfigur, im Bossraum in der Mitte
  runCombat(combat.monster, {
    onWin: (lines, roll) => {
      playFirst(deathSounds(combat.monster)); // bei einer Gruppe einmal
      killCombatFigure();
      const res = applyEffects(isBoss ? combat.rest.concat(BOSS_REWARD) : combat.rest, effectCtx(), Math.random);
      let text = outcome.winText || "Der Kampf ist vorbei.";
      if (isBoss) {
        rs.bossDefeated = true;
        hooks.onBossDefeated();
        text = DATA.monsters[combat.monster].name + " ist besiegt. In der Ecke öffnet sich das Gitter, eine Treppe führt nach unten.";
      }
      show(ev, { text, next: outcome.next }, res, roll, onOutcome, lines);
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
  endEventFigures();
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
  // Attribute steigen höchstens bis +10; sind alle dort, gibt es nur die Lebenspunkte
  const choices = raisableAttrs(p);
  const opts = choices.length
    ? choices.map(a => ({ label: ATTR_NAMES[a] + " " + signShort(p.attrs[a]) + " → " + signShort(p.attrs[a] + 1), pick: () => apply(a) }))
    : [{ label: "Weiter", pick: () => apply(null) }];
  const text = "Du erreichst Stufe " + (p.level + 1) + ". Du bekommst +" + p.levelHp + " Lebenspunkte. " +
    (choices.length ? "Welches Attribut steigt um 1?" : "Alle Attribute sind schon auf +10.");
  play("stufe");
  showDialog("Stufenaufstieg!", text, opts, { modal: true });
}

function eventCause(ev) {
  // Eigener Satz für dieses Event (texts.json: death.events), sonst ein allgemeiner
  const own = DATA.texts.death && DATA.texts.death.events && DATA.texts.death.events[ev.id];
  if (own) return own;
  const list = DATA.texts.deathByEvent || ["»{title}« war dein Ende."];
  return list[Math.floor(Math.random() * list.length)].replace("{title}", ev.title);
}

function die(cause) {
  playFirst(playerDeathSounds(state.player.volk));
  state.eventActive = false;
  closeDialog();
  hooks.onDeath(cause);
}

// Bossraum: Jedes Betreten startet den Bosskampf, bis der Boss besiegt ist. Flucht ist erlaubt.
// Hat das Thema eine Boss-Event-Tabelle (room-types.json, Bossraum, themeEvents), wird bei jedem Betreten
// daraus neu gewürfelt; sonst startet der Kampf direkt.
// Sieg: Beute tier2 und 10 Erfahrung (vergibt fight()), danach wechselt die Nordwest-Ecke vom Gitter zu Loch und Treppe nach unten.
export const BOSS_REWARD = [{ loot: "tier2" }, { gainXp: 10 }];

export function startBoss() {
  const rs = state.roomState[state.current];
  if (rs.bossDefeated || state.eventActive) return;
  const id = pickEvent(bossEventTable(TYPES.boss, state.theme.id), state.run, Math.random, state.player);
  if (id) { runEvent(id); return; }
  const boss = DATA.monsters[state.dungeon.boss];
  state.eventActive = true;
  showDialog(boss.name, boss.intro, [{
    label: "Kämpfen",
    pick: () => fight({ title: boss.name }, {}, { monster: boss.id, rest: [] })
  }], { modal: true });
}

// Begegnung (docs/GDD.md, Begegnungen): Die Figuren stehen schon im Raum, mindestens drei Kacheln von der Eingangstür,
// und laufen zum Kampf an; kein Event-Fenster. Sieg: reward des Themas; Flucht: durch die Rück-Tür; Tod: deathText.
export function startEncounter(monsterId) {
  const enc = state.theme.encounters;
  const ev = { id: "begegnung_" + monsterId, title: DATA.monsters[monsterId].name, options: [{ effects: [{ combat: monsterId }] }] };
  state.eventActive = true;
  const door = state.backDoor ? DIR[state.backDoor].approach : state.pTile;
  const shown = showEventFigures(ev, { awayFrom: door, dist: 3 });
  const go = () => fight(ev, {}, { monster: monsterId, rest: (enc.reward || []).slice() });
  if (shown && !reduceMotion) setTimeout(go, FIGURE_DELAY); else go();
}

// Testmodus (?fight=<monster-id>): Kampf ohne Event, etwa in der Vorkammer
export function startFight(monsterId) {
  state.eventActive = true;
  fight({ title: DATA.monsters[monsterId].name }, {}, { monster: monsterId, rest: [] });
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

// Eine Truhe im Raum (obj): ein Event aus den Daten. Sie gilt als geöffnet, sobald sie Beute gegeben hat.
// Ist sie eine Mimik (Schatzkammer), erwacht sie: an ihrer Stelle steht die Figur, und das Mimik-Event beginnt.
export function chestEvent(obj) {
  const rs = state.roomState[state.current];
  const tile = obj.userData.tile, k = tile[0] + "," + tile[1];
  rs.chests = rs.chests || {};
  if (obj.userData.mimic) {
    rs.chests[k] = "gone";
    removeChest(obj);
    spawnFigure("mimic", tile, MIMIC_EVENT);
    runEvent(MIMIC_EVENT);
    return;
  }
  if (chestState(rs, tile) === "open") { runEvent("chest_empty"); return; }
  runEvent("chest", (outcome, res) => {
    if (res.lines.some(l => l.type === "loot")) { rs.chests[k] = "open"; state.lidPivot = obj.userData.lid; state.openLid = true; play("truhe"); }
  });
}
const MIMIC_EVENT = "schatz_mimik";

// Hinweis, wenn eine verschlossene Tür benutzt werden soll
export function lockedDoorNote(d) {
  play("tuer_verschlossen");
  showDialog("Verschlossen", "Die Tür nach " + DIR[d].name + " rührt sich nicht. Irgendwer hat hier etwas gegen Durchgangsverkehr.",
    [{ label: "Weiter", pick: closeDialog }]);
}
