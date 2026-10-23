/**
 * TEST D'ACCÈS — diagnostique le problème "permission denied"
 * Usage : npx tsx supabase/scripts/test_access.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

console.log("URL:", url);
console.log("Clé: commence par", serviceKey.slice(0, 12), "— longueur", serviceKey.length);
console.log("");

// Test 1 : lecture de la table cities (droit SELECT)
const r1 = await fetch(`${url}/rest/v1/cities?select=id&limit=1`, {
  headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
});
console.log("Test SELECT cities:", r1.status, r1.status === 200 ? "✅" : "❌");

// Test 2 : insertion dans cities (droit INSERT)
const r2 = await fetch(`${url}/rest/v1/cities`, {
  method: "POST",
  headers: {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
    Prefer: "return=minimal",
  },
  body: JSON.stringify({
    id: "TEST01",
    name: "Ville Test",
    slug: "ville-test-TEST01",
    department_code: "99",
    department_name: "Test",
    region_name: "Test",
  }),
});
console.log("Test INSERT cities:", r2.status, r2.status === 201 || r2.status === 200 ? "✅" : "❌");
if (r2.status >= 400) {
  console.log("Message d'erreur:", await r2.text());
}

// Test 3 : suppression de la ligne de test
const r3 = await fetch(`${url}/rest/v1/cities?id=eq.TEST01`, {
  method: "DELETE",
  headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
});
console.log("Test DELETE (nettoyage):", r3.status, r3.status === 204 ? "✅" : "❌");
console.log("");
console.log("Interprétation :");
console.log("- SELECT ❌ + INSERT ❌ → problème de CLÉ (mauvaise clé ou révoquée)");
console.log("- SELECT ✅ + INSERT ❌ → problème de DROITS sur la table (RLS/policies)");
