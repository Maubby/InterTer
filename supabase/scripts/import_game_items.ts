/**
 * IMPORT DES MINI-JEUX D'EXEMPLE — Interter
 * -------------------------------------------------------------
 * Envoie le contenu de supabase/seed/game_items_example.json
 * dans la table game_items (idempotent : relançable sans doublon).
 *
 * USAGE : npx tsx supabase/scripts/import_game_items.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("❌ Variables manquantes dans .env.local");
    process.exit(1);
  }
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  const raw = await readFile(
    join(process.cwd(), "supabase", "seed", "game_items_example.json"),
    "utf-8"
  );
  const items = JSON.parse(raw);
  console.log(`🎮 ${items.length} items à importer (1 par format de jeu)\n`);

  for (const item of items) {
    const { error } = await supabase.from("game_items").insert({
      game_type: item.game_type,
      payload: item.payload,
      difficulty: item.difficulty ?? 1,
    });
    if (error) {
      // 23505 = doublon exact : on ignore (le payload est identique)
      if (error.code === "23505" || error.message.includes("duplicate")) {
        console.log(`⏭️  ${item.game_type} : déjà présent, ignoré`);
        continue;
      }
      console.error(`❌ ${item.game_type} : ${error.message}`);
      process.exit(1);
    }
    console.log(`✅ ${item.game_type} importé`);
  }
  console.log(`\n🎉 Terminé ! Les mini-jeux d'exemple sont dans la base.`);
  console.log("   Vérification : Supabase → Table Editor → game_items");
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
