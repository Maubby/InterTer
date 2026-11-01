-- ============================================================
-- INTERTER — Duels entre amis, chacun à son rythme
-- Un joueur lance un duel : 5 questions tirées au sort, un code court.
-- Il envoie le lien /duel/CODE à ses amis ; chacun joue les mêmes
-- questions quand il veut (une seule fois), puis les scores se comparent.
-- Un duel est amical : il ne compte pas pour le classement des villes.
--
-- Tout passe par des fonctions security definer : les tables n'ont
-- aucune politique RLS, donc aucun accès direct depuis le navigateur.
-- Le score est calculé côté serveur (check_answer), comme la Quête.
-- ============================================================

create table public.duels (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,               -- 6 caractères, dans le lien
  created_by  uuid not null references public.profiles (id) on delete cascade,
  item_ids    uuid[] not null,                    -- les 5 questions du duel
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '7 days'
);
create index duels_created_by_idx on public.duels (created_by);

create table public.duel_plays (
  duel_id        uuid not null references public.duels (id) on delete cascade,
  user_id        uuid not null references public.profiles (id) on delete cascade,
  answers        jsonb not null,
  score          integer not null,
  correct_count  integer not null,
  played_at      timestamptz not null default now(),
  primary key (duel_id, user_id)                  -- ANTI-TRICHE : une manche par joueur
);
create index duel_plays_user_idx on public.duel_plays (user_id);

alter table public.duels      enable row level security;
alter table public.duel_plays enable row level security;
revoke all on public.duels, public.duel_plays from anon, authenticated;

-- ============================================================
-- CREATE_DUEL() → code du duel
-- 5 questions de thèmes différents (donc 5 personnages différents),
-- hors épreuves locales et hors devinettes à émojis.
-- ============================================================
create or replace function public.create_duel()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user   uuid := auth.uid();
  v_items  uuid[];
  v_code   text;
  v_alpha  text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  -- sans 0/O ni 1/I
begin
  if v_user is null then
    raise exception 'Connexion requise';
  end if;
  if not exists (select 1 from public.profiles where id = v_user and city_id is not null) then
    raise exception 'Choisis d''abord ta ville pour lancer un duel !';
  end if;
  -- Anti-abus : 20 duels lancés par jour au plus
  if (select count(*) from public.duels
        where created_by = v_user and created_at > now() - interval '1 day') >= 20 then
    raise exception 'Tu as lancé beaucoup de duels aujourd''hui — reviens demain !';
  end if;

  -- Une question par thème, puis 5 thèmes au hasard
  select array_agg(id) into v_items from (
    select id from (
      select distinct on (coalesce(theme, game_type)) id
        from public.game_items
        where is_active and department_code is null
          and game_type in ('qcm', 'true_false', 'riddle', 'intruder', 'order_dates')
        order by coalesce(theme, game_type), random()
    ) un_par_theme
    order by random()
    limit 5
  ) tirage;
  -- Moins de 5 thèmes disponibles : 5 questions au hasard
  if coalesce(array_length(v_items, 1), 0) < 5 then
    select array_agg(id) into v_items from (
      select id from public.game_items
        where is_active and department_code is null
          and game_type in ('qcm', 'true_false', 'riddle', 'intruder', 'order_dates')
        order by random()
        limit 5
    ) tirage;
  end if;
  if coalesce(array_length(v_items, 1), 0) < 5 then
    raise exception 'Pas assez de questions pour un duel';
  end if;

  -- Code court et unique
  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_alpha, 1 + floor(random() * length(v_alpha))::int, 1);
    end loop;
    begin
      insert into public.duels (code, created_by, item_ids) values (v_code, v_user, v_items);
      exit;
    exception when unique_violation then
      -- code déjà pris : on en tire un autre
    end;
  end loop;

  return v_code;
end;
$$;

-- ============================================================
-- GET_DUEL(p_code) → le duel vu par celui qui le regarde
-- Visiteur non connecté : qui le défie, sans les questions.
-- Joueur qui n'a pas encore joué : les questions (sans réponses), et qui
--   a déjà joué, SANS les scores (pas de pression, pas d'indice).
-- Joueur qui a joué : le tableau des scores complet.
-- ============================================================
create or replace function public.get_duel(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user     uuid := auth.uid();
  v_duel     public.duels;
  v_createur text;
  v_mon_jeu  public.duel_plays;
  v_a_joue   boolean := false;
  v_items    jsonb;
  v_joueurs  jsonb;
begin
  select * into v_duel from public.duels where code = upper(trim(p_code));
  if not found then
    return null;
  end if;
  select pseudo into v_createur from public.profiles where id = v_duel.created_by;

  if v_user is not null then
    select * into v_mon_jeu from public.duel_plays
      where duel_id = v_duel.id and user_id = v_user;
    v_a_joue := found;
  end if;

  -- Questions sans réponses, dans l'ordre du duel (seulement si on doit jouer)
  if v_user is not null and not v_a_joue then
    select jsonb_agg(
             jsonb_build_object(
               'id', g.id,
               'game_type', g.game_type,
               'theme', g.theme,
               'payload', g.payload - 'answer' - 'answers' - 'correct_order'
                                    - 'intruder' - 'solution' - 'accepted_answers'
             )
             order by array_position(v_duel.item_ids, g.id))
      into v_items
      from public.game_items g
      where g.id = any (v_duel.item_ids);
  end if;

  select coalesce(jsonb_agg(
           jsonb_build_object(
             'pseudo', p.pseudo,
             'ville', c.name,
             'score', case when v_a_joue then dp.score end,
             'correct_count', case when v_a_joue then dp.correct_count end,
             'moi', dp.user_id = v_user,
             'createur', dp.user_id = v_duel.created_by
           )
           order by dp.score desc, dp.played_at), '[]'::jsonb)
    into v_joueurs
    from public.duel_plays dp
    join public.profiles p on p.id = dp.user_id
    left join public.cities c on c.id = p.city_id
    where dp.duel_id = v_duel.id;

  return jsonb_build_object(
    'code', v_duel.code,
    'createur', v_createur,
    'je_suis_createur', v_duel.created_by = v_user,
    'expire_le', v_duel.expires_at,
    'expire', v_duel.expires_at < now(),
    'a_joue', v_a_joue,
    'mon_score', v_mon_jeu.score,
    'total', coalesce(array_length(v_duel.item_ids, 1), 0) * 10,
    'items', v_items,
    'joueurs', v_joueurs
  );
end;
$$;

-- ============================================================
-- PLAY_DUEL(p_code, p_answers) → {score, correct_count, total}
-- answers = [{item_id, answer}, ...] : une réponse par question du duel
-- ============================================================
create or replace function public.play_duel(p_code text, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user     uuid := auth.uid();
  v_duel     public.duels;
  v_item     public.game_items;
  v_answer   jsonb;
  v_nb       integer;
  v_score    integer := 0;
  v_correct  integer := 0;
begin
  if v_user is null then
    raise exception 'Connexion requise';
  end if;
  if not exists (select 1 from public.profiles where id = v_user) then
    raise exception 'Choisis d''abord ta ville pour jouer ce duel !';
  end if;

  select * into v_duel from public.duels where code = upper(trim(p_code));
  if not found then
    raise exception 'Ce duel n''existe pas';
  end if;
  if v_duel.expires_at < now() then
    raise exception 'Ce duel est terminé : il durait 7 jours';
  end if;

  v_nb := array_length(v_duel.item_ids, 1);
  if jsonb_typeof(p_answers) is distinct from 'array'
     or jsonb_array_length(p_answers) <> v_nb then
    raise exception 'Format de réponses invalide';
  end if;

  -- Validation côté serveur, question par question
  for i in 0..v_nb - 1 loop
    v_answer := p_answers->i;
    select * into v_item from public.game_items
      where id = (v_answer->>'item_id')::uuid
        and id = any (v_duel.item_ids);         -- la question appartient bien au duel
    if found and public.check_answer(v_item, coalesce(v_answer->'answer', '{}'::jsonb)) then
      v_correct := v_correct + 1;
      v_score := v_score + 10;
    end if;
  end loop;

  -- Une seule manche par joueur (clé primaire duel_id, user_id)
  begin
    insert into public.duel_plays (duel_id, user_id, answers, score, correct_count)
    values (v_duel.id, v_user, p_answers, v_score, v_correct);
  exception when unique_violation then
    raise exception 'Tu as déjà joué ce duel !';
  end;

  return jsonb_build_object('score', v_score, 'correct_count', v_correct, 'total', v_nb * 10);
end;
$$;

-- ============================================================
-- LIST_MY_DUELS() → les 20 derniers duels lancés ou joués
-- ============================================================
create or replace function public.list_my_duels()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    return '[]'::jsonb;
  end if;
  return (
    select coalesce(jsonb_agg(ligne order by cree desc), '[]'::jsonb)
    from (
      select d.created_at as cree,
             jsonb_build_object(
               'code', d.code,
               'createur', pc.pseudo,
               'je_suis_createur', d.created_by = v_user,
               'cree_le', d.created_at,
               'expire', d.expires_at < now(),
               'nb_joueurs', (select count(*) from public.duel_plays x where x.duel_id = d.id),
               'mon_score', mp.score,
               -- meilleur score des autres, visible seulement si j'ai joué
               'meilleur_adverse', case when mp.user_id is not null then
                 (select max(x.score) from public.duel_plays x
                    where x.duel_id = d.id and x.user_id <> v_user) end
             ) as ligne
        from public.duels d
        join public.profiles pc on pc.id = d.created_by
        left join public.duel_plays mp on mp.duel_id = d.id and mp.user_id = v_user
        where d.created_by = v_user or mp.user_id is not null
        order by d.created_at desc
        limit 20
    ) s
  );
end;
$$;

grant execute on function public.create_duel() to authenticated;
grant execute on function public.get_duel(text) to anon, authenticated;
grant execute on function public.play_duel(text, jsonb) to authenticated;
grant execute on function public.list_my_duels() to authenticated;
