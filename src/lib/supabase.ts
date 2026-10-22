import { createClient } from "@supabase/supabase-js";

// Client navigateur (protégé par les règles RLS)
export function createSupabaseBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
