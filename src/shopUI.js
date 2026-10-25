// Händler im Textfenster: Kaufen und Verkaufen. Die Regeln stehen in shop.js.
import { state } from "./state.js";
import { DATA } from "./data.js";
import { PACK_SIZE } from "./character.js";
import { merchantStock, buyPrice, sellPrice, buy, sell } from "./shop.js";
import { showDialog, closeDialog } from "./dialog.js";
import { updateStats } from "./hud.js";
import { renderInventory, itemStats } from "./inventory.js";

const TITLE = "Der Händler";

// Angebot einmal pro Händler festlegen (aus dem Raum-Seed, also für gleichen Seed gleich)
function stock() {
  const rs = state.roomState[state.current];
  if (!rs.shop) rs.shop = merchantStock(DATA.items, state.theme.stage, state.dungeon.rooms[state.current].seed);
  return rs.shop;
}

const goldLine = () => "Dein Gold: " + state.player.gold;

export function openShop(note) {
  showDialog(TITLE, note || "»Willkommen! Alles frisch aus dem Dungeon. Fast alles. Die Garantie gilt bis zur Tür.«", [
    { label: "Kaufen", pick: () => buyMenu() },
    { label: "Verkaufen", pick: () => sellMenu() },
    { label: "Gehen", pick: closeDialog }
  ], { fx: [goldLine()] });
}

function buyMenu(msg) {
  const s = stock();
  const entries = s.gear.map((id, i) => ({ id, gearIndex: i })).concat(s.consumables.map(id => ({ id })));
  const opts = entries.map(e => {
    const item = DATA.items[e.id];
    return { label: item.name + " · " + buyPrice(item) + " Gold", pick: () => {
      const err = buy(state.player, item, PACK_SIZE);
      if (!err && e.gearIndex !== undefined) s.gear.splice(e.gearIndex, 1); // Ausrüstung gibt es nur einmal
      renderInventory();
      updateStats();
      buyMenu(err || item.name + " gekauft.");
    } };
  });
  opts.push({ label: "Zurück", pick: () => openShop() });
  const fx = [goldLine()].concat(entries.map(e => DATA.items[e.id].name + ": " + itemStats(DATA.items[e.id])));
  showDialog(TITLE, msg || "Was darf es sein? Ausrüstung gibt es nur einmal, Tränke und Schriftrollen so viele du willst.", opts, { fx });
}

function sellMenu(msg) {
  const p = state.player;
  const opts = p.pack.map((id, i) => {
    const item = DATA.items[id];
    return { label: item.name + " · " + sellPrice(item) + " Gold", pick: () => {
      sell(p, item, i);
      renderInventory();
      updateStats();
      sellMenu(item.name + " verkauft.");
    } };
  });
  opts.push({ label: "Zurück", pick: () => openShop() });
  const text = msg || (p.pack.length ? "Ich zahle den halben Preis. Angelegte Ausrüstung musst du erst ablegen." : "Dein Rucksack ist leer.");
  showDialog(TITLE, text, opts, { fx: [goldLine()] });
}
