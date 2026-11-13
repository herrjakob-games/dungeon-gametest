// Infokästen (docs/GDD.md, Interface): Karte, Entwicklung, Charakter, Ausrüstung. Ein Klick auf die Titelleiste oder
// die Taste (K, E, C, I) klappt einen Kasten auf und zu. Der Zustand bleibt beim Wechsel der Räume und Ebenen erhalten,
// aber nicht über ein Neuladen der Seite (Start: alle offen). Im Kampf sind alle Kästen zu und gesperrt; danach
// gehen sie wieder so auf wie vorher.
const boxes = Array.from(document.querySelectorAll(".box[data-key]"));
let locked = false;

function render(box) {
  const open = box.dataset.open !== "0";
  box.classList.toggle("open", open && !locked);
  const head = box.querySelector(".box-head");
  head.setAttribute("aria-expanded", String(open && !locked));
  head.disabled = locked;
}

export function togglePanel(box) {
  if (locked) return;
  box.dataset.open = box.dataset.open === "0" ? "1" : "0";
  render(box);
}

// Kampf: alle Kästen zu und gesperrt (on), danach wie vorher
export function lockPanels(on) {
  if (locked === on) return;
  locked = on;
  document.body.classList.toggle("panels-locked", on);
  boxes.forEach(render);
}

/**
 * Tastenkürzel anmelden. blocked(): true, solange die Tasten nicht gelten (Eingabefeld, Volkswahl, Handbuch)
 */
export function initPanels(blocked) {
  boxes.forEach(box => {
    box.dataset.open = "1";
    box.querySelector(".box-head").addEventListener("click", () => togglePanel(box));
    render(box);
  });
  window.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    const t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
    if (blocked()) return;
    const box = boxes.find(b => b.dataset.key === e.key.toLowerCase());
    if (box) togglePanel(box);
  });
}
