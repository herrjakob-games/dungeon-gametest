// Textfenster für Events: Titel, Text, optionaler Würfelwurf, Antwortoptionen.
// Optionen lassen sich auch mit den Zahlentasten 1–9 wählen.

const el = document.getElementById("dialog");
const titleEl = document.getElementById("dlgTitle");
const textEl = document.getElementById("dlgText");
const rollEl = document.getElementById("dlgRoll");
const optsEl = document.getElementById("dlgOpts");

/**
 * @param {string} title
 * @param {string} text
 * @param {Array<{label:string, pick:()=>void}>} options
 * @param {string} [rollHtml] Ergebnis eines Würfelwurfs, z. B. "W20: 9 + 1 = 10 gegen 12 · Misslungen"
 */
export function showDialog(title, text, options, rollHtml) {
  titleEl.textContent = title;
  textEl.textContent = text;
  rollEl.hidden = !rollHtml;
  rollEl.innerHTML = rollHtml || "";
  optsEl.innerHTML = "";
  options.forEach((o, idx) => {
    const b = document.createElement("button");
    b.type = "button";
    b.id = "opt" + idx;
    b.innerHTML = '<span class="key">' + (idx + 1) + "</span>";
    b.appendChild(document.createTextNode(o.label));
    b.addEventListener("click", o.pick);
    optsEl.appendChild(b);
  });
  el.hidden = false;
  const first = optsEl.querySelector("button");
  if (first) first.focus({ preventScroll: true });
}

export function closeDialog() { el.hidden = true; }

// Solange das Textfenster offen ist, läuft ein Event (Schnellreise ist dann gesperrt)
export const isDialogOpen = () => !el.hidden;

window.addEventListener("keydown", (e) => {
  if (el.hidden) return;
  const n = parseInt(e.key, 10);
  if (n >= 1) {
    const b = optsEl.querySelectorAll("button")[n - 1];
    if (b) b.click();
  }
  if (e.key === "Escape") closeDialog();
});
