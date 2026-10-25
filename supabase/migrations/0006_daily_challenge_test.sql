-- ============================================================
-- INTERTER — Défi du Jour : création du défi de TEST du jour
-- Utilise les 6 items existants (5 pour le défi + 1 en réserve).
-- À terme, une fonction planifiée choisira 5 items du format du
-- jour ; pour les tests, on publie les items disponibles.
-- ============================================================

-- Supprime un éventuel défi du jour déjà créé aujourd'hui (rejouable)
delete from public.daily_challenges where challenge_date = current_date;

-- Crée le défi du jour avec 5 items (les 6 formats importés)
insert into public.daily_challenges (challenge_date, game_type, item_ids, is_published)
select
  current_date,
  'mixte',
  (array_agg(id))[1:5]
from public.game_items
where is_active = true;

-- Publie
update public.daily_challenges
set is_published = true
where challenge_date = current_date;

-- Vérification
select challenge_date, game_type, item_ids, is_published
from public.daily_challenges
where challenge_date = current_date;
