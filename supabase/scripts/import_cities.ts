/**
 * IMPORT DES COMMUNES DE FRANCE — Interter
 * -------------------------------------------------------------
 * Télécharge le fichier officiel (data.gouv.fr, licence ouverte,
 * 34 868 communes, millésime 2026) puis l'envoie dans Supabase.
 *
 * USAGE (depuis le dossier du projet, dans un terminal) :
 *   npx tsx supabase/scripts/import_cities.ts
 *
 * PRÉREQUIS dans .env.local :
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Le script est IDEMPOTENT : on peut le relancer sans doublons.
 */
// Charge le .env.local AVANT tout le reste (tsx ne le fait pas automatiquement,
// contrairement à npm run dev)
import { config } from "dotenv";
config({ path: ".env.local" });
config(); // fallback sur .env si présent

import { createClient } from "@supabase/supabase-js";
import { createWriteStream, existsSync } from "node:fs";
import { unlink } from "node:fs/promises";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { setTimeout as sleep } from "node:timers/promises";

// ---- Config ----
// Fichier officiel « Communes et villes de France » (data.gouv.fr, licence ouverte)
// L'URL API /datasets/r/... redirige toujours vers le dernier fichier publié.
const CSV_URL =
  "https://www.data.gouv.fr/api/1/datasets/r/c63fd0b1-7987-46f6-b779-8b3ed889090c";
const CSV_LOCAL = "communes-france-2026.csv";
const BATCH = 500; // lignes par lot envoyé à Supabase

// ---- Client Supabase avec la clé service (droits complets) ----
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error(
    "\n❌ Variables manquantes : vérifie que .env.local contient\n" +
      "   NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY\n"
  );
  process.exit(1);
}
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

// ---- Slug simple (nom sans accents + code INSEE pour l'unicité) ----
function slugify(name: string, code: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base}-${code}`;
}

// ---- Parse CSV (séparateur ',', gestion des guillemets) ----
function parseLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if ((c === "," || c === ";") && !inQuotes) {
      out.push(cur); cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

const toInt = (s: string): number | null => {
  if (!s) return null;
  const n = parseInt(s.replace(/[^\d-]/g, ""), 10);
  return Number.isNaN(n) ? null : n;
};
const toFloat = (s: string): number | null => {
  if (!s) return null;
  const n = parseFloat(s.replace(",", "."));
  return Number.isNaN(n) ? null : n;
};

async function downloadCsv(): Promise<string> {
  if (existsSync(CSV_LOCAL)) {
    console.log(`📁 Fichier déjà présent : ${CSV_LOCAL} (pas de re-téléchargement)`);
    return CSV_LOCAL;
  }
  console.log(`⬇️  Téléchargement du fichier officiel des communes...`);
  const res = await fetch(CSV_URL);
  if (!res.ok || !res.body) {
    throw new Error(`Téléchargement échoué (HTTP ${res.status}). 
Vérifie l'URL du fichier sur https://www.data.gouv.fr (jeu "Communes et villes de France", millésime 2026, CSV).`);
  }
  await pipeline(Readable.fromWeb(res.body as any), createWriteStream(CSV_LOCAL));
  console.log(`✅ Fichier téléchargé : ${CSV_LOCAL}`);
  return CSV_LOCAL;
}

async function main() {
  const file = await downloadCsv();
  const { readFile } = await import("node:fs/promises");
  const raw = await readFile(file, "utf-8"); // le CSV 2026 de data.gouv est en UTF-8, virgules
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const header = parseLine(lines[0]);
  console.log(`📄 ${lines.length - 1} lignes détectées`);

  const idx = (name: string) => header.indexOf(name);
  const iInsee = idx("code_insee");
  const iNom = idx("nom_standard");
  const iDep = idx("dep_code");
  const iDepNom = idx("dep_nom");
  const iReg = idx("reg_nom");
  const iPop = idx("population");
  const iLat = idx("latitude_centre");
  const iLon = idx("longitude_centre");
  if (iInsee < 0 || iNom < 0) {
    console.error("❌ Colonnes introuvables. En-têtes :", header.slice(0, 12));
    process.exit(1);
  }

  // Préparation des lignes
  const rows: any[] = [];
  const seen = new Set<string>();
  for (let i = 1; i < lines.length; i++) {
    const c = parseLine(lines[i]);
    const id = c[iInsee];
    if (!id || seen.has(id)) continue; // anti-doublon
    seen.add(id);
    const name = c[iNom] || id;
    rows.push({
      id,
      name,
      slug: slugify(name, id),
      department_code: c[iDep] || "",
      department_name: c[iDepNom] || "",
      region_name: c[iReg] || "",
      population: toInt(c[iPop]),
      latitude: toFloat(c[iLat]),
      longitude: toFloat(c[iLon]),
    });
  }
  console.log(`🏘️  ${rows.length} communes uniques à importer\n`);

  // Envoi par lots
  let done = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from("cities")
      .upsert(chunk, { onConflict: "id" });
    if (error) {
      console.error(`\n❌ Lot ${Math.floor(i / BATCH) + 1} : ${error.message}`);
      console.error("   L'import s'arrête. Corrige le problème puis RELANCE :");
      console.error("   le script reprendra sans créer de doublons.");
      process.exit(1);
    }
    done += chunk.length;
    process.stdout.write(`\r⏳ ${done}/${rows.length} communes importées`);
    if (i + BATCH < rows.length) await sleep(150); // respiration pour Supabase
  }
  console.log(`\n\n🎉 TERMINÉ : ${done} communes sont dans la base !`);
  console.log("   Vérification : Supabase → Table Editor → cities");
}

main().catch((e) => {
  console.error("\n❌", e.message);
  process.exit(1);
});
