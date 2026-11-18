// Dessine la carte de France des défis de géographie (public/carte/france.svg)
// d'après les communes du CSV : chaque case de la grille prend la région de la
// commune la plus proche. Les contours des régions apparaissent d'eux-mêmes.
// Usage : node scripts/carte-france.mjs  (relancer seulement si le CSV change)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { PROJECTION } from "../src/lib/projection.ts";

const { LON_MIN, LAT_MAX, ECHELLE, COS, LARGEUR, HAUTEUR } = PROJECTION;
const PAS = 2; // taille d'une case, en unités de la carte (~4,5 km)
const PORTEE = 0.09; // au-delà (en degrés), la case est la mer

// Séparation CSV qui respecte les guillemets
function champs(ligne) {
  const out = [];
  let cur = "", q = false;
  for (const c of ligne) {
    if (c === '"') q = !q;
    else if (c === "," && !q) { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

const lignes = readFileSync("communes-france-2026.csv", "utf8").split("\n");
const entete = champs(lignes[0]);
const col = (n) => entete.indexOf(n);
const [cReg, cLat, cLon] = [col("reg_code"), col("latitude_centre"), col("longitude_centre")];

// Communes de métropole (Corse comprise), rangées par case de 0,1°
const seau = new Map();
for (const l of lignes.slice(1)) {
  const f = champs(l);
  const reg = f[cReg], lat = +f[cLat], lon = +f[cLon];
  if (!reg || Number(reg) < 11 || !lat || !lon) continue;
  const k = `${Math.floor(lat * 10)},${Math.floor(lon * 10)}`;
  if (!seau.has(k)) seau.set(k, []);
  seau.get(k).push([lat, lon, reg]);
}

function regionProche(lat, lon) {
  let best = null, d0 = PORTEE * PORTEE;
  const [a, b] = [Math.floor(lat * 10), Math.floor(lon * 10)];
  for (let i = a - 1; i <= a + 1; i++)
    for (let j = b - 1; j <= b + 1; j++)
      for (const [la, lo, reg] of seau.get(`${i},${j}`) ?? []) {
        const d = (la - lat) ** 2 + ((lo - lon) * COS) ** 2;
        if (d < d0) { d0 = d; best = reg; }
      }
  return best;
}

// Grille → bandes horizontales par région
const chemins = new Map();
for (let y = 0; y < HAUTEUR; y += PAS) {
  let debut = 0, courant = null;
  for (let x = 0; x <= LARGEUR; x += PAS) {
    const lat = LAT_MAX - (y + PAS / 2) / ECHELLE;
    const lon = LON_MIN + (x + PAS / 2) / (ECHELLE * COS);
    const reg = x < LARGEUR ? regionProche(lat, lon) : null;
    if (reg !== courant) {
      if (courant) chemins.set(courant, (chemins.get(courant) ?? "") + `M${debut} ${y}h${x - debut}v${PAS}h${debut - x}z`);
      courant = reg; debut = x;
    }
  }
}

// Teintes de parchemin, une par région, voisines bien distinctes
const TEINTES = ["#f2d675", "#e8a87c", "#b8d68a", "#f0c2a0", "#d9b8e0", "#f5e3a0", "#9fd0c0", "#f1b6b0", "#c9dd8c", "#e9c46a", "#b7c9e8", "#f4cf9c", "#d8e3a4"];
let i = 0;
let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LARGEUR} ${HAUTEUR}" shape-rendering="crispEdges">`;
for (const [, d] of [...chemins].sort()) svg += `<path fill="${TEINTES[i++ % TEINTES.length]}" d="${d}"/>`;
svg += "</svg>";
mkdirSync("public/carte", { recursive: true });
writeFileSync("public/carte/france.svg", svg);
console.log(`${chemins.size} régions, ${(svg.length / 1024).toFixed(0)} Ko`);
