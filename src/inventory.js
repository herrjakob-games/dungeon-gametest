// Inventar-Feld: angelegte Waffe und Rüstung, sechs Rucksackplätze.
// Außerhalb von Events öffnet ein Klick auf einen Gegenstand ein Fenster zum Anlegen, Trinken oder Wegwerfen.
import { state } from "./state.js";
import { DATA } from "./data.js";
import { ATTR_NAMES, PACK_SIZE, meetsReq, reqText, equip, unequip, removeFromPack } from "./character.js";
import { rollDice } from "./eventLogic.js";
import { showDialog, closeDialog, isDialogModal } from "./dialog.js";
import { updateStats } from "./hud.js";

const el = document.getElementById("inv");

// Kurzbeschreibung der Werte eines Gegenstands
export function itemStats(item) {
  const parts = [];
  if (item.type === "weapon") parts.push("Schaden " + item.damage, "trifft mit " + ATTR_NAMES[item.hit]);
  if (item.type === "armor") parts.push("Rüstung +" + item.armor);
  if (item.type === "consumable") {
    const [t, v] = Object.entries(item.use)[0];
    parts.push(t === "heal" ? "heilt " + v : t === "damage" ? v + " Schaden, trifft immer" : "Rüstung +" + v + " bis Kampfende");
    if (item.combatOnly) parts.push("nur im Kampf");
  }
  if (item.req) parts.push("braucht " + reqText(item));
  return parts.join(" · ");
}

function slot(label, id, onClick, extraClass) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "slot" + (id ? "" : " empty") + (extraClass ? " " + extraClass : "");
  const item = id ? DATA.items[id] : null;
  b.innerHTML = '<span class="slot-label">' + label + "</span>" + '<span class="slot-name">' + (item ? item.name : "–") + "</span>";
  if (item) {
    b.title = item.name + ": " + itemStats(item);
    if (!meetsReq(state.player, item)) b.classList.add("unusable");
    b.addEventListener("click", onClick);
  } else {
    b.disabled = true;
  }
  return b;
}

export function renderInventory() {
  const p = state.player;
  if (!p) return;
  el.innerHTML = '<span class="label">Ausrüstung</span>';
  const worn = document.createElement("div");
  worn.className = "worn";
  worn.append(slot("Waffe", p.weapon, () => openWorn("weapon")), slot("Rüstung", p.armor, () => openWorn("armor")));
  el.appendChild(worn);
  const lab = document.createElement("span");
  lab.className = "label";
  lab.textContent = "Rucksack " + p.pack.length + " / " + PACK_SIZE;
  el.appendChild(lab);
  const grid = document.createElement("div");
  grid.className = "pack";
  for (let i = 0; i < PACK_SIZE; i++) grid.appendChild(slot(i + 1, p.pack[i], () => openPack(i)));
  el.appendChild(grid);
}

// Während Events und Kämpfen ist das Inventar nur über das Kampfmenü nutzbar
const locked = () => state.eventActive || state.transitioning || isDialogModal();
function done(msg) {
  renderInventory();
  updateStats();
  if (msg) showDialog("Ausrüstung", msg, [{ label: "Weiter", pick: closeDialog }]);
  else closeDialog();
}

function openWorn(slotName) {
  if (locked()) return;
  const p = state.player, item = DATA.items[p[slotName]];
  showDialog(item.name, item.text, [
    { label: "Ablegen", pick: () => done(unequip(p, slotName) ? null : "Der Rucksack ist voll. Wirf erst etwas weg.") },
    { label: "Zurück", pick: closeDialog }
  ], { fx: [itemStats(item)] });
}

function openPack(i) {
  if (locked()) return;
  const p = state.player, id = p.pack[i], item = DATA.items[id];
  const opts = [];
  if (item.type === "weapon" || item.type === "armor") {
    opts.push({ label: "Anlegen", pick: () => { const err = equip(p, DATA.items, i); done(err); } });
  }
  if (item.type === "consumable" && !item.combatOnly) {
    opts.push({ label: "Benutzen", pick: () => {
      if (!meetsReq(p, item)) { done("Dafür brauchst du " + reqText(item) + "."); return; }
      const [t, v] = Object.entries(item.use)[0];
      let msg = "";
      if (t === "heal") {
        const n = Math.min(p.maxHp - p.hp, rollDice(v, Math.random));
        p.hp += n;
        msg = n ? item.name + ": +" + n + " LP." : "Du fühlst dich schon kerngesund. Der Trank war trotzdem lecker.";
      }
      removeFromPack(p, i);
      done(msg);
    } });
  }
  opts.push({ label: "Wegwerfen", pick: () => { removeFromPack(p, i); done(item.name + " bleibt hier liegen. Irgendein Goblin freut sich."); } });
  opts.push({ label: "Zurück", pick: closeDialog });
  const fx = [itemStats(item)];
  if (!meetsReq(p, item)) fx.push('<span class="bad">Dafür brauchst du ' + reqText(item) + ".</span>");
  showDialog(item.name, item.text, opts, { fx });
}
