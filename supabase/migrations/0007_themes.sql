-- ============================================================
-- INTERTER — Thèmes des épreuves : un personnage = un thème
-- Le format (qcm, timeline, devinette, photo...) est INDEPENDANT :
-- chaque personnage peut proposer n'importe quel format avec son
-- contenu. Ex : Yvonne la Marmitonne peut faire un QCM de fromages
-- OU une timeline de spécialités régionales.
-- ============================================================

-- 1. Colonne thème sur les items
alter table public.game_items add column if not exists theme text;
create index if not exists game_items_theme_idx on public.game_items (theme) where is_active;

-- 2. Les thèmes de la guilde (contrôle des valeurs)
alter table public.game_items drop constraint if exists game_items_theme_chk;
alter table public.game_items add constraint game_items_theme_chk check (
  theme is null or theme in (
    'quotidien',   -- Mahaut la Marchande : objets du quotidien et légendaires
    'histoire',    -- Henri le Bailli : histoire des villes
    'legendes',    -- Ameline la Conteuse : légendes locales
    'armes',       -- Garin le Forgeron : équipements, guerres, blasons
    'cuisine',     -- Yvonne la Marmitonne : spécialités culinaires
    'chroniques',  -- Étienne le Greffier : dates et chroniques
    'geographie',  -- Berthe la Cartographe : géographie (à venir)
    'fetes',       -- Jehanne la Ménestrelle : fêtes, danses, chansons (à venir)
    'nature',      -- Aldric le Fauconnier : faune et nature (à venir)
    'sciences'     -- Pons le Barbier-Chirurgien : remèdes et sciences (à venir)
  )
);

-- 3. Étiqueter les items d'exemple existants par thème
update public.game_items set theme = 'quotidien'   where game_type = 'qcm'          and theme is null;
update public.game_items set theme = 'histoire'   where game_type = 'true_false'   and theme is null;
update public.game_items set theme = 'legendes'    where game_type = 'riddle'        and theme is null;
update public.game_items set theme = 'armes'       where game_type = 'emoji_riddle' and theme is null;
update public.game_items set theme = 'cuisine'     where game_type = 'intruder'     and theme is null;
update public.game_items set theme = 'chroniques'  where game_type = 'order_dates'  and theme is null;

-- Vérification
select theme, game_type, count(*) from public.game_items group by theme, game_type;
