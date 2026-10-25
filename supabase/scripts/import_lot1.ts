/**
 * IMPORT DU LOT 1 DE DÉFIS (60 items) — Interter
 * -------------------------------------------------------------
 * Envoie supabase/seed/game_items_lot1.json dans game_items,
 * avec le thème (personnage) de chaque item.
 *
 * USAGE : npx tsx supabase/scripts/import_lot1.ts
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
    join(process.cwd(), "supabase", "seed", "game_items_lot1.json"),
    "utf-8"
  );
  const items = JSON.parse(raw);
  console.log(`📜 ${items.length} défis à importer (lot 1)\n`);

  let ok = 0;
  let ignore = 0;
  for (const item of items) {
    const { error } = await supabase.from("game_items").insert({
      game_type: item.game_type,
      theme: item.theme,
      payload: item.payload,
      difficulty: item.difficulty ?? 1,
    });
    if (error) {
      if (error.code === "23505" || error.message.includes("duplicate")) {
        ignore++;
        continue;
      }
      console.error(`❌ ${item.theme}/${item.game_type} : ${error.message}`);
      process.exit(1);
    }
    ok++;
  }
  console.log(`\n🎉 Terminé : ${ok} défis importés, ${ignore} ignorés (doublons).`);
  console.log("   La réserve Quête du Jour est alimentée !");
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
