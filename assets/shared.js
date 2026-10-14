// Composants partagés entre la landing et le back-office : une seule source
(() => {
const CAT_CLASS = { "Musique": "musique", "Culture": "culture", "Sport": "sport", "Brocante": "brocante", "Fête": "fete", "Atelier": "atelier", "Bar": "bar", "Humour": "humour" };
const CAT_ICON = {"Bar": `<path d="M8 22h8"/><path d="M12 11v11"/><path d="m19 3-7 8-7-8Z"/>`, "Humour": `<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/>`, "Musique": `<path d="M9 18V5l12-2v13"/> <circle cx="6" cy="18" r="3"/> <circle cx="18" cy="16" r="3"/>`, "Culture": `<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/> <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/> <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/> <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/> <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>`, "Sport": `<path d="M14.4 14.4 9.6 9.6"/> <path d="M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829z"/> <path d="m21.5 21.5-1.4-1.4"/> <path d="M3.9 3.9 2.5 2.5"/> <path d="M6.404 12.768a2 2 0 1 1-2.829-2.829l1.768-1.767a2 2 0 1 1-2.828-2.829l2.828-2.828a2 2 0 1 1 2.829 2.828l1.767-1.768a2 2 0 1 1 2.829 2.829z"/>`, "Brocante": `<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/> <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/> <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/> <path d="M2 7h20"/> <path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/>`, "Fête": `<path d="M5.8 11.3 2 22l10.7-3.79"/> <path d="M4 3h.01"/> <path d="M22 8h.01"/> <path d="M15 2h.01"/> <path d="M22 20h.01"/> <path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10"/> <path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11c-.11.7-.72 1.22-1.43 1.22H17"/> <path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98C9.52 4.9 9 5.52 9 6.23V7"/> <path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z"/>`, "Atelier": `<path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/> <path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"/>`};
const SEAL = `<svg viewBox="0 0 24 24" aria-hidden="true">
  <circle cx="12" cy="12" r="8.6" fill="#4169E1"/>
  ${[0,30,60,90,120,150,180,210,240,270,300,330].map(a => {
    const r = a * Math.PI / 180;
    return `<circle cx="${(12 + 8.2 * Math.cos(r)).toFixed(2)}" cy="${(12 + 8.2 * Math.sin(r)).toFixed(2)}" r="3" fill="#4169E1"/>`;
  }).join("")}
  <polyline points="8.2,12.3 10.9,15 15.8,9.6" fill="none" stroke="#fafafa" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const ICON_CLOCK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/></svg>`;
const ICON_PIN = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>`;


// Adresse au format « numéro rue, code postal ville »
const fmtAddress = a => (a || "").replace(/^(.*?[^,\s])\s+(\d{5})\s+/, "$1, $2 ");

// Gabarit de la fiche d'un événement (landing et back-office)
const ecardHTML = e => `
    <div class="ecard-cover-box"><div class="ecard-cover${e.image ? "" : " g-" + (CAT_CLASS[e.cat] || "culture")}" style="${e.image ? `background:url(${e.image}) center/cover no-repeat` : ""}" aria-hidden="true"><span class="cat-tag">${CAT_ICON[e.cat] ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${CAT_ICON[e.cat].replace(/`/g, "")}</svg>` : ""}${e.cat || ""}</span></div></div>
    <div class="org"><span>${e.org.name}</span>${e.org.type === "ent" ? `<span class="seal" title="Entreprise vérifiée" aria-label="Entreprise vérifiée">${SEAL}</span>` : ""}<button class="ecard-close" type="button" aria-label="Fermer la carte"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button></div>
    <h4>${e.title}</h4>
    <div class="meta">
      <span class="line">${ICON_CLOCK}${e.hours ? `${e.date} de ${e.hours}` : e.date}</span>
      <span class="line">${ICON_PIN}${fmtAddress(e.address)}</span>
    </div>
    <div class="desc-wrap"><div class="desc">${e.desc}</div></div>
    <div class="ecard-stats"><div class="ecard-stat"><b>${e.tickets ?? "–"}</b> confirmé${e.tickets === 1 ? "" : "s"}</div><span class="ecard-stat-sep" aria-hidden="true"></span><div class="ecard-stat"><b>${e.interested ?? "–"}</b> intéressé${e.interested === 1 ? "" : "s"}</div></div></div>
    ${e.ticket ? `<a class="ticket" href="${e.ticketUrl || "#"}" target="_blank" rel="noopener">Billetterie</a>` : ""}
    `;

// Affiche la fiche dans `el`, ajustée à la hauteur de `container`, avec son bouton de fermeture
function mountEcard(el, e, { container, onClose }) {
  el.innerHTML = ecardHTML(e);
  el.style.left = "16px";
  el.style.top = "16px";
  el.querySelector(".ecard-close").addEventListener("click", ev => { ev.stopPropagation(); onClose(); });
  [...el.children].forEach((c, i) => c.style.setProperty("--i", i));
  // Le texte est rogné seulement si la fiche dépasse la hauteur de la carte
  const dsc = el.querySelector(".desc");
  const dwrap = el.querySelector(".desc-wrap");
  const fit = () => {
    const maxCard = container.clientHeight - 32;
    dsc.style.maxHeight = "none";
    dwrap.classList.remove("fade");
    const natural = el.offsetHeight;
    if (natural > maxCard) dsc.style.maxHeight = Math.max(48, dsc.offsetHeight - (natural - maxCard)) + "px";
    const updateFade = () => dwrap.classList.toggle("fade", dsc.scrollTop + dsc.clientHeight < dsc.scrollHeight - 4);
    updateFade();
    dsc.onscroll = updateFade;
  };
  fit();
  el.classList.add("show");
}


// Épingle de carte : forme de goutte, icône de la catégorie à l'intérieur, couleur selon le statut
const pinSVG = e => {
  const fill = e.status === "live" ? "#4169E1" : "#171717";
  const icon = CAT_ICON[e.cat] || "";
  return `<svg class="pin-svg" viewBox="0 0 32 40" width="32" height="40" aria-hidden="true"><path d="M16 39C16 39 3 24 3 14a13 13 0 0 1 26 0c0 10-13 25-13 25z" fill="${fill}" stroke="#fafafa" stroke-width="2"/><g transform="translate(8 6) scale(.667)" fill="none" stroke="#fafafa" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${icon}</g></svg>`;
};
window.Adeupa = { CAT_CLASS, CAT_ICON, SEAL, ICON_CLOCK, ICON_PIN, ecardHTML, mountEcard, fmtAddress, pinSVG };
})();
