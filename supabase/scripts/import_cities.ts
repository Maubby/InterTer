/**
 * IMPORT DES COMMUNES DE FRANCE — Interter (v2 : avec code postal)
 * -------------------------------------------------------------
 * Télécharge le fichier officiel (data.gouv.fr, licence ouverte,
 * 34 868 communes, millésime 2026) puis l'envoie dans Supabase.
 * v2 : ajoute le code postal principal (recherche par CP).
 *
 * USAGE (depuis le dossier du projet, dans un terminal) :
 *   npx tsx supabase/scripts/import_cities.ts
 *
 * PRÉREQUIS : .env.local avec NEXT_PUBLIC_SUPABASE_URL et
 * SUPABASE_SERVICE_ROLE_KEY + migration 0005_postal_code.sql jouée.
 *
 * Idempotent : relançable sans doublons (upsert sur id).
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { createClient } from "@supabase/supabase-js";
import { createWriteStream, existsSync } from "node:fs";
import { readFile, unlink } from "node:fs/promises";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { setTimeout as sleep } from "node:timers/promises";

// ---- Config ----
const CSV_URL =
  "https://www.data.gouv.fr/api/1/datasets/r/c63fd0b1-7987-46f6-b779-8b3ed889090c";
const CSV_LOCAL = "communes-france-2026.csv";
const BATCH = 500;

// ---- Client Supabase (clé service = droits complets) ----
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
  global: {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  },
});

// ---- Slug ----
function slugify(name: string, code: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base}-${code}`;
}

// ---- Parse CSV (virgules, guillemets gérés) ----
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
    console.log(`📁 Fichier déjà présent : ${CSV_LOCAL}`);
    return CSV_LOCAL;
  }
  console.log(`⬇️  Téléchargement du fichier officiel des communes...`);
  const res = await fetch(CSV_URL);
  if (!res.ok || !res.body) {
    throw new Error(
      `Téléchargement échoué (HTTP ${res.status}). Vérifie l'URL sur data.gouv.fr.`
    );
  }
  await pipeline(Readable.fromWeb(res.body as any), createWriteStream(CSV_LOCAL));
  console.log(`✅ Fichier téléchargé : ${CSV_LOCAL}`);
  return CSV_LOCAL;
}

async function main() {
  const file = await downloadCsv();
  const raw = await readFile(file, "utf-8");
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
  const iCp = idx("code_postal");
  if (iInsee < 0 || iNom < 0) {
    console.error("❌ Colonnes introuvables. En-têtes :", header.slice(0, 12));
    process.exit(1);
  }

  const rows: any[] = [];
  const seen = new Set<string>();
  for (let i = 1; i < lines.length; i++) {
    const c = parseLine(lines[i]);
    const id = c[iInsee];
    if (!id || seen.has(id)) continue;
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
      postal_code: c[iCp] || null, // v2 : code postal principal
    });
  }
  console.log(`🏘️  ${rows.length} communes uniques à importer\n`);

  let done = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from("cities")
      .upsert(chunk, { onConflict: "id" });
    if (error) {
      console.error(`\n❌ Lot ${Math.floor(i / BATCH) + 1} : ${error.message}`);
      console.error("   Corrige le problème puis RELANCE (reprise sans doublons).");
      process.exit(1);
    }
    done += chunk.length;
    process.stdout.write(`\r⏳ ${done}/${rows.length} communes importées`);
    if (i + BATCH < rows.length) await sleep(150);
  }
  console.log(`\n\n🎉 TERMINÉ : ${done} communes importées (avec code postal) !`);
}

main().catch((e) => {
  console.error("\n❌", e.message);
  process.exit(1);
});
