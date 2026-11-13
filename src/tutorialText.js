// Kellerhandbuch (docs/GDD.md, Interface, Tutorial): Text aus data/texts.json (Feld tutorial) mit Platzhaltern
// {volk}, {faehigkeit} und {attribut}; **Wort** wird fett. Rein logisch.

export const TUTORIAL_VARS = ["volk", "faehigkeit", "attribut"];

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Werte der Platzhalter für die gewählte Figur
export function tutorialVars(player, attrNames) {
  return {
    volk: player.name,
    faehigkeit: player.ability.name,
    attribut: attrNames[player.ability.attr] || player.ability.attr
  };
}

// Absatz als HTML: Text geschützt, Platzhalter ersetzt, **fett**
export function fillText(text, vars) {
  return esc(text)
    .replace(/\{(\w+)\}/g, (m, k) => (k in vars ? esc(vars[k]) : m))
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
}

// Seiten paarweise als Doppelseiten
export function spreads(pages) {
  const out = [];
  for (let i = 0; i < pages.length; i += 2) out.push([pages[i], pages[i + 1] || null]);
  return out;
}

// Datenprüfung: Titel, Seiten mit Titel und Absätzen, gerade Seitenzahl, nur bekannte Platzhalter
export function checkTutorial(t, report) {
  if (!t) { report("texts.tutorial", "fehlt"); return; }
  if (!t.title) report("texts.tutorial", "title fehlt");
  if (!Array.isArray(t.pages) || !t.pages.length) { report("texts.tutorial", "pages fehlt"); return; }
  if (t.pages.length % 2) report("texts.tutorial", "ungerade Seitenzahl (das Buch zeigt Doppelseiten)");
  t.pages.forEach((p, i) => {
    const w = "texts.tutorial.pages[" + i + "]";
    if (!p.title) report(w, "title fehlt");
    if (!Array.isArray(p.text) || !p.text.length) report(w, "text fehlt");
    (p.text || []).concat(p.sign || []).forEach(s => {
      for (const m of String(s).matchAll(/\{(\w+)\}/g)) if (!TUTORIAL_VARS.includes(m[1])) report(w, "unbekannter Platzhalter {" + m[1] + "}");
    });
  });
}
