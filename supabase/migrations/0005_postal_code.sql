-- ============================================================
-- INTERTER — Code postal des communes
-- Permet la recherche de ville par code postal (usage naturel
-- pour beaucoup de joueurs, surtout 40-70 ans).
-- ============================================================

alter table public.cities add column if not exists postal_code text;
create index if not exists cities_postal_idx on public.cities (postal_code);

-- L'import (script import_cities.ts relancé) remplit la colonne.
