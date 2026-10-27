// Rundenkampf im Textfenster: Angreifen, Verteidigen, Gegenstand nutzen, Fliehen. Danach handelt der Gegner.
// Die Regeln stehen in combat.js, hier geht es nur um Anzeige und Ablauf.
import { state } from "./state.js";
import { DATA } from "./data.js";
import { ATTR_NAMES, weaponOf, meetsReq } from "./character.js";
import {
  startCombat, playerArmor, attackRoll, hitMonster, monsterTurn, defend, useInCombat, fleeRoll, DEFEND_BONUS, FLEE_DC
} from "./combat.js";
import { showDialog } from "./dialog.js";
import { monsterHpBonus } from "./world.js";
import { updateStats } from "./hud.js";
import { renderInventory } from "./inventory.js";
import { rollHtml, maybeRescue, signShort } from "./checkUI.js";
import { hitCombatFigure } from "./roomFigures.js";

let h = null; // { onWin(lines), onFlee(), onDeath(monster) }

/**
 * Startet einen Kampf gegen ein Monster aus data/monsters.json.
 * handlers.onWin(lines): Gegner besiegt; handlers.onFlee(): Flucht geglückt; handlers.onDeath(monster): Spieler tot.
 */
export function runCombat(monsterId, handlers) {
  h = handlers;
  state.combat = startCombat(DATA.monsters[monsterId], monsterHpBonus(DATA.themes, state.depth));
  menu("Ein Kampf beginnt. Was tust du?", [], null);
}

const title = () => "Kampf: " + state.combat.monster.name;

function status() {
  const c = state.combat, p = state.player, m = c.monster;
  return '<span class="status">' + m.name + " " + m.hp + "/" + m.maxHp + " LP · Rüstung " + m.armor +
    " &nbsp;|&nbsp; Du " + p.hp + "/" + p.maxHp + " LP · Rüstung " + playerArmor(p, DATA.items, c) + "</span>";
}

// Verbrauchsgegenstände im Rucksack, die die Figur im Kampf nutzen kann
const usableItems = () => state.player.pack
  .map((id, index) => ({ id, index, item: DATA.items[id] }))
  .filter(e => e.item.type === "consumable" && meetsReq(state.player, e.item));

function menu(text, lines, roll) {
  const p = state.player, w = weaponOf(p, DATA.items);
  const opts = [
    { label: "Angreifen (" + w.name + ", " + ATTR_NAMES[w.hit] + " " + signShort(p.attrs[w.hit]) + ")", pick: attack },
    { label: "Verteidigen (Rüstung +" + DEFEND_BONUS + ")", pick: guard }
  ];
  if (usableItems().length) opts.push({ label: "Gegenstand nutzen", pick: itemMenu });
  opts.push({ label: "Fliehen (Flucht, SG " + (FLEE_DC + state.theme.dcBonus) + ")", pick: flee });
  showDialog(title(), text, opts, { roll, fx: [status()].concat(lines), modal: true });
}

function attack() {
  const c = state.combat;
  const r = attackRoll(state.player, DATA.items, c, Math.random);
  const against = "Rüstung " + c.monster.armor;
  maybeRescue(title(), r, against, () => {
    const lines = [];
    if (r.ok) {
      const n = hitMonster(state.player, DATA.items, c, Math.random);
      hitCombatFigure();
      lines.push('Treffer: <span class="good">−' + n + " LP</span> für " + c.monster.name);
    } else {
      lines.push("Daneben.");
    }
    afterPlayer(lines, rollHtml(r, against, "Treffer", "Daneben"));
  });
}

function guard() {
  defend(state.combat);
  afterPlayer(["Du gehst in Deckung: Rüstung +" + DEFEND_BONUS + " bis zur nächsten Runde."], null);
}

function itemMenu() {
  const opts = usableItems().map(e => ({ label: e.item.name, pick: () => useItem(e) }));
  opts.push({ label: "Zurück", pick: () => menu("Was tust du?", [], null) });
  showDialog(title(), "Welchen Gegenstand nutzt du? Das kostet deine Runde.", opts, { fx: [status()], modal: true });
}

function useItem(e) {
  const p = state.player;
  p.pack.splice(e.index, 1);
  const res = useInCombat(p, e.item, state.combat, Math.random);
  if (res.type === "damage") hitCombatFigure();
  renderInventory();
  updateStats();
  const lines = [e.item.name + ": " + (
    res.type === "heal" ? '<span class="good">+' + res.amount + " LP</span>" :
    res.type === "damage" ? '<span class="good">−' + res.amount + " LP</span> für " + state.combat.monster.name :
    res.type === "freeze" ? state.combat.monster.name + " ist eingefroren und setzt " + res.amount + " Runden aus" :
    "Rüstung +" + res.amount + " bis Kampfende")];
  afterPlayer(lines, null);
}

function flee() {
  const r = fleeRoll(state.player, Math.random, state.theme.dcBonus);
  maybeRescue(title(), r, null, () => {
    const roll = rollHtml(r, null, "Entkommen", "Misslungen");
    if (r.ok) {
      showDialog(title(), "Du rennst, so schnell dich deine Beine tragen. Würde ist überbewertet.",
        [{ label: "Weiter", pick: () => end(() => h.onFlee()) }], { roll, modal: true });
    } else {
      afterPlayer(["Flucht misslungen. Der Gegner steht im Weg."], roll);
    }
  });
}

// Nach der Aktion des Spielers: Gegner tot? Sonst handelt der Gegner.
function afterPlayer(lines, roll) {
  const c = state.combat;
  if (c.monster.hp <= 0) {
    const name = c.monster.name;
    end(() => h.onWin(lines.concat(['<strong class="good">' + name + " ist besiegt!</strong>"]), roll));
    return;
  }
  const p = state.player;
  const t = monsterTurn(p, DATA.items, c, Math.random);
  updateStats();
  const enemyRoll = t.frozen
    ? c.monster.name + " ist eingefroren und greift nicht an" + (t.left ? " (noch " + t.left + " Runde" + (t.left > 1 ? "n" : "") + ")" : "")
    : c.monster.name + " greift an · W20: " + t.d + " + " + t.bonus + " = " + t.total + " gegen Rüstung " + t.dc +
      " · " + (t.hit ? '<strong class="fail">Treffer</strong>' : '<strong class="ok">Verfehlt</strong>');
  const all = lines.concat([enemyRoll + (t.hit ? ' · <span class="bad">−' + t.dmg + " LP</span>" : "")]);
  if (p.hp <= 0) {
    const monster = c.monster;
    showDialog(title(), "Das war ein Treffer zu viel.", [{ label: "Weiter", pick: () => end(() => h.onDeath(monster)) }],
      { roll, fx: all, modal: true });
    return;
  }
  menu("Runde " + c.round + ". Was tust du?", all, roll);
}

function end(fn) {
  state.combat = null;
  fn();
}
