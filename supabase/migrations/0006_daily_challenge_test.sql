-- ============================================================
-- INTERTER — Quête du Jour : création du défi de TEST du jour
-- Utilise les items disponibles (5 pour la quête + 1 en réserve).
-- Rejouable : relancer ce fichier supprime et recrée la quête.
-- ============================================================

-- Supprime un éventuel défi du jour déjà créé aujourd'hui
delete from public.daily_challenges where challenge_date = current_date;

-- Crée la quête du jour : 5 items publiés
-- (game_type 'mixte' indique une épreuve multi-formats)
insert into public.daily_challenges (challenge_date, game_type, item_ids, is_published)
select
  current_date,
  'mixte',
  (array_agg(id order by created_at))[1:5],
  true
from public.game_items
where is_active = true;

-- Vérification
select challenge_date, game_type, item_ids, is_published
from public.daily_challenges
where challenge_date = current_date;
