/**
 * Import des communes de France dans Supabase (table cities).
 * Source : CSV INSEE « Communes » (https://www.insee.fr).
 * Usage : npx tsx supabase/scripts/import_cities.ts
 * Prérequis : CSV converti en JSON : [{code, name, department_code, department_name,
 * region_name, population, latitude, longitude}, ...]
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, key);

const rows: any[] = JSON.parse(readFileSync(process.argv[2], "utf8"));

function slugify(name: string, code: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") + "-" + code
  );
}

async function main() {
  const batch: any[] = [];
  for (const r of rows) {
    batch.push({
      id: r.code,
      name: r.name,
      slug: slugify(r.name, r.code),
      department_code: r.department_code,
      department_name: r.department_name,
      region_name: r.region_name,
      population: r.population ?? null,
      longitude: r.longitude ?? null,
      latitude: r.latitude ?? null,
    });
  }
  // Insertion par lots de 1000 (limite Supabase)
  for (let i = 0; i < batch.length; i += 1000) {
    const chunk = batch.slice(i, i + 1000);
    const { error } = await supabase.from("cities").upsert(chunk, { onConflict: "id" });
    if (error) {
      console.error(`Lot ${i / 1000} : ${error.message}`);
      process.exit(1);
    }
    console.log(`Lot ${i / 1000 + 1} importé (${chunk.length} communes)`);
  }
  console.log(`Terminé : ${batch.length} communes importées.`);
}

main();
