-- ============================================================
-- INTERTER — Étape 1 : schéma initial (v2, auto-réparable)
-- Ce fichier repart de zéro : il nettoie, recrée le schéma public,
-- installe les extensions PUIS crée tables + RLS.
-- Il peut être rejoué tel quel à tout moment.
-- Règle absolue : le client ne doit JAMAIS écrire un score
-- directement — toute la logique de points vit dans les RPC (0002).
-- ============================================================

-- ============================================================
-- 0. NETTOYAGE + RÉINITIALISATION (idempotent)
-- ============================================================
drop schema if exists public cascade;
create schema public;
comment on schema public is 'standard public schema';
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on schema public to postgres, anon, authenticated, service_role;

-- Restore des droits par défaut de Supabase (nécessaires à l'API PostgREST)
alter default privileges in schema public
  grant select on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public
  grant all on tables to postgres;
alter default privileges in schema public
  grant usage, select on sequences to postgres, anon, authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to postgres, anon, authenticated, service_role;
alter default privileges in schema public
  grant usage on types to postgres, anon, authenticated, service_role;

-- ============================================================
-- 1. EXTENSIONS — dans le schéma dédié « extensions »
--    (jamais dans public : elles survivront aux nettoyages)
-- ============================================================
create schema if not exists extensions;
create extension if not exists "unaccent" schema extensions;
-- (gen_random_uuid() est natif depuis PostgreSQL 13 : pas besoin de uuid-ossp)
-- (pas besoin de pg_trgm : index text_pattern_ops ci-dessous)

-- Normalisation de texte : recherche et réponses sans accents
create or replace function public.norm_txt(t text)
returns text
language sql immutable
as $$
  select lower(trim(extensions.unaccent(t)));
$$;
grant execute on function public.norm_txt(text) to postgres, anon, authenticated;

-- ============================================================
-- 2. TABLES
-- ============================================================

-- ---------- cities : communes de France (import INSEE) ----------
create table public.cities (
  id               text primary key,          -- code INSEE
  name             text not null,
  slug             text not null unique,
  department_code  text not null,
  department_name  text not null,
  region_name      text not null,
  population       integer,
  longitude        double precision,
  latitude          double precision
);
-- Recherche d'autocomplétion : index sur le préfixe du nom
create index cities_name_pat_idx on public.cities (name text_pattern_ops);
create index cities_dept_idx on public.cities (department_code);

-- ---------- profiles : un joueur ----------
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  pseudo        text not null,
  avatar_url    text,
  city_id       text references public.cities (id),
  streak        integer not null default 0,
  last_play_date date,
  is_supporter  boolean not null default false,
  is_admin      boolean not null default false,
  created_at    timestamptz not null default now()
);
create unique index profiles_pseudo_norm_idx on public.profiles (public.norm_txt(pseudo));
create index profiles_city_idx on public.profiles (city_id);

-- ---------- game_items : items de mini-jeux, format-agnostique ----------
-- payload contient les réponses : jamais exposé au client directement
-- (la vue game_items_public retire les champs de réponse).
create table public.game_items (
  id              uuid primary key default gen_random_uuid(),
  game_type       text not null check (game_type in
                    ('qcm','true_false','riddle','emoji_riddle','intruder','order_dates')),
  payload         jsonb not null,
  difficulty      integer not null default 1 check (difficulty between 1 and 3),
  department_code text,                       -- non null = item d'épreuve locale
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);
create index game_items_type_idx on public.game_items (game_type) where is_active;
create index game_items_dept_idx on public.game_items (department_code) where is_active;

-- Vue publique SANS les réponses : la seule exposée aux joueurs.
create or replace view public.game_items_public as
  select id, game_type,
         payload - 'answer' - 'answers' - 'correct_order' - 'intruder' - 'solution' as payload,
         difficulty, department_code
  from public.game_items
  where is_active = true;
grant select on public.game_items_public to anon, authenticated;

-- ---------- daily_challenges : le Défi du Jour (identique pour tous) ----------
create table public.daily_challenges (
  id             uuid primary key default gen_random_uuid(),
  challenge_date date not null unique,
  game_type      text not null,
  item_ids       uuid[ ] not null,            -- les 5 items du jour
  is_published   boolean not null default false,
  created_at     timestamptz not null default now()
);

-- ---------- daily_plays : 1 participation par jour et par joueur ----------
create table public.daily_plays (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  challenge_date date not null references public.daily_challenges (challenge_date),
  answers        jsonb not null,
  score          integer not null,
  created_at     timestamptz not null default now(),
  unique (user_id, challenge_date)             -- ANTI-TRICHE : 1 défi/jour garanti
);
create index daily_plays_date_idx on public.daily_plays (challenge_date);

-- ---------- practice_plays : épreuves locales ----------
create table public.practice_plays (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  item_id     uuid not null references public.game_items (id),
  played_date date not null default current_date,
  is_correct  boolean not null,
  created_at  timestamptz not null default now()
);
create index practice_plays_quota_idx on public.practice_plays (user_id, played_date);

-- ---------- city_scores : LE score agrégé (jamais écrit par le client) ----------
create table public.city_scores (
  city_id      text primary key references public.cities (id) on delete cascade,
  total_points bigint not null default 0,
  play_count   bigint not null default 0,
  updated_at   timestamptz not null default now()
);
create index city_scores_points_idx on public.city_scores (total_points desc);

-- ---------- badges ----------
create table public.badges (
  code        text primary key,
  label       text not null,
  description text not null,
  icon        text not null
);

create table public.user_badges (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  badge_code text not null references public.badges (code),
  earned_at  timestamptz not null default now(),
  primary key (user_id, badge_code)
);

-- ---------- referrals ----------
create table public.referrals (
  id           uuid primary key default gen_random_uuid(),
  referrer_id  uuid not null references public.profiles (id) on delete cascade,
  referred_id uuid not null unique references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now()
);

-- ---------- purchases : achats Stripe (Supporter 4,99 €) ----------
create table public.purchases (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles (id) on delete cascade,
  stripe_session_id  text not null unique,
  amount_cents       integer not null,
  status             text not null default 'pending'
                       check (status in ('pending','paid','refunded')),
  created_at         timestamptz not null default now()
);

-- ---------- newsletter_subscribers : consentement RGPD explicite ----------
create table public.newsletter_subscribers (
  email         text primary key,
  consent_given boolean not null,
  user_id       uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- 3. ROW LEVEL SECURITY — activée sur TOUTES les tables
-- ============================================================
alter table public.cities                 enable row level security;
alter table public.profiles               enable row level security;
alter table public.game_items             enable row level security;
alter table public.daily_challenges       enable row level security;
alter table public.daily_plays            enable row level security;
alter table public.practice_plays        enable row level security;
alter table public.city_scores            enable row level security;
alter table public.badges                 enable row level security;
alter table public.user_badges            enable row level security;
alter table public.referrals             enable row level security;
alter table public.purchases             enable row level security;
alter table public.newsletter_subscribers enable row level security;

-- ---------- policies ----------
create policy cities_select on public.cities for select using (true);

create policy profiles_select on public.profiles for select using (true);
create policy profiles_insert_own on public.profiles
  for insert with check (
    auth.uid() = id
    and is_admin = false and is_supporter = false and streak = 0
  );
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id)
  with check (
    auth.uid() = id
    -- ANTI-ÉLÉVATION : impossible de s'auto-promouvoir
    and is_admin       = (select p.is_admin       from public.profiles p where p.id = auth.uid())
    and is_supporter   = (select p.is_supporter   from public.profiles p where p.id = auth.uid())
    and streak         = (select p.streak         from public.profiles p where p.id = auth.uid())
    and last_play_date = (select p.last_play_date from public.profiles p where p.id = auth.uid())
  );

create policy game_items_select_active on public.game_items
  for select using (
    is_active = true
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );
create policy game_items_admin_write on public.game_items
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

create policy daily_challenges_select_published on public.daily_challenges
  for select using (
    is_published = true
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );
create policy daily_challenges_admin_write on public.daily_challenges
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- Écriture de scores : UNIQUEMENT via les RPC (aucune policy insert)
create policy daily_plays_select_own on public.daily_plays
  for select using (auth.uid() = user_id);
create policy practice_plays_select_own on public.practice_plays
  for select using (auth.uid() = user_id);
create policy city_scores_select on public.city_scores for select using (true);

create policy badges_select on public.badges for select using (true);
create policy user_badges_select_own on public.user_badges for select using (true);
create policy user_badges_admin_write on public.user_badges
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

create policy referrals_own on public.referrals
  for select using (auth.uid() = referrer_id or auth.uid() = referred_id);

create policy purchases_select_own on public.purchases
  for select using (auth.uid() = user_id);

create policy newsletter_insert on public.newsletter_subscribers
  for insert with check (consent_given = true);

-- ---------- Le client ne peut RIEN écrire directement dans les scores ----------
revoke insert, update, delete on public.daily_plays      from anon, authenticated;
revoke insert, update, delete on public.practice_plays   from anon, authenticated;
revoke insert, update, delete on public.city_scores      from anon, authenticated;
revoke insert, update, delete on public.user_badges      from anon, authenticated;
revoke insert, update, delete on public.purchases        from anon, authenticated;
