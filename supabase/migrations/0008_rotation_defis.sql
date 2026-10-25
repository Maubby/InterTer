-- ============================================================
-- INTERTER — Rotation des défis de la Quête du Jour
-- Règle produit :
--   1. Chaque jour, la Quête tire 5 items JAMAIS servis avant
--   2. Les items servis sont marqués (last_served_date)
--   3. Ils rejoignent ensuite la banque générale (essai, épreuves
--      locales) — ils ne servent PLUS jamais en Quête du Jour
-- ============================================================

-- 1. Date de dernier service (null = jamais servi)
alter table public.game_items add column if not exists last_served_date date;
create index if not exists game_items_unserved_idx
  on public.game_items (game_type) where is_active and last_served_date is null;

-- 2. Fonction : composer la Quête du Jour automatiquement
--    - 5 items actifs jamais servis, tirés au sort
--    - les marque comme servis (aujourd'hui)
--    - crée la ligne daily_challenges publiée
--    - idempotent : si la quête du jour existe déjà, ne fait rien
create or replace function public.compose_daily_challenge()
returns public.daily_challenges
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ids uuid[];
  v_challenge public.daily_challenges;
begin
  -- Déjà composée aujourd'hui ? On ne refait pas le tirage
  select * into v_challenge from public.daily_challenges
    where challenge_date = current_date;
  if found then
    return v_challenge;
  end if;

  -- 5 items jamais servis (5 thèmes différents si possible)
  with tirage as (
    select id from public.game_items
    where is_active = true and last_served_date is null
    order by random()
    limit 5
  )
  select array_agg(id) into v_ids from tirage;

  if v_ids is null or array_length(v_ids, 1) < 5 then
    raise exception
      'Banque insuffisante : % items non servis seulement',
      coalesce(array_length(v_ids, 1), 0);
  end if;

  -- Marque les items comme servis
  update public.game_items
  set last_served_date = current_date
  where id = any (v_ids);

  -- Crée et publie la quête
  insert into public.daily_challenges (challenge_date, game_type, item_ids, is_published)
  values (current_date, 'mixte', v_ids, true)
  returning * into v_challenge;

  return v_challenge;
end;
$$;

grant execute on function public.compose_daily_challenge() to postgres, service_role;
