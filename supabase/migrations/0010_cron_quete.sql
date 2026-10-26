-- ============================================================
-- INTERTER — Quête du Jour : composition automatique à minuit
-- (heure de Paris) via pg_cron, avec rattrapage de sécurité.
--
-- - compose_daily_challenge : date "aujourd'hui" en Europe/Paris
-- - Tâche principale : 23h00 UTC (≈ minuit Paris, en avance)
-- - Rattrapage : 4h00 UTC au cas où (idempotent — ne re-tire pas)
-- ============================================================

-- 1. La fonction compose avec la date FRANÇAISE (Europe/Paris),
--    pas la date UTC — sinon décalage pour les soirées tardives.
create or replace function public.compose_daily_challenge()
returns public.daily_challenges
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'Europe/Paris')::date;
  v_ids uuid[];
  v_challenge public.daily_challenges;
begin
  -- Déjà composée aujourd'hui (heure française) ? On ne refait pas le tirage
  select * into v_challenge from public.daily_challenges
    where challenge_date = v_today;
  if found then
    return v_challenge;
  end if;

  -- 5 items jamais servis (tirage au sort)
  with tirage as (
    select id from public.game_items
    where is_active = true and last_served_date is null
    order by random()
    limit 5
  )
  select array_agg(id) into v_ids from tirage;

  if v_ids is null or array_length(v_ids, 1) < 5 then
    raise exception
      'Banque insuffisante : % items non servis seulement — il faut régénérer du contenu !',
      coalesce(array_length(v_ids, 1), 0);
  end if;

  -- Marque les items comme servis
  update public.game_items
  set last_served_date = v_today
  where id = any (v_ids);

  -- Crée et publie la quête du jour (heure française)
  insert into public.daily_challenges (challenge_date, game_type, item_ids, is_published)
  values (v_today, 'mixte', v_ids, true)
  returning * into v_challenge;

  return v_challenge;
end;
$$;

grant execute on function public.compose_daily_challenge() to postgres, service_role;

-- 2. Le planificateur : pg_cron
create extension if not exists pg_cron;

-- Tâche principale : 23h00 UTC = juste avant minuit Paris
select cron.schedule(
  'quete-du-jour-composition',
  '0 23 * * *',
  $$select public.compose_daily_challenge();$$
);

-- Rattrapage de sécurité : 4h00 UTC = 5h/6h Paris (avant le réveil)
select cron.schedule(
  'quete-du-jour-rattrapage',
  '0 4 * * *',
  $$select public.compose_daily_challenge();$$
);
