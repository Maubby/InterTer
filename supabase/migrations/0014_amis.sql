-- ============================================================
-- INTERTER — Amis et défis adressés
-- « Mes amis » : une liste avec un bouton Défier à côté de chaque nom.
-- On devient amis de deux façons :
--   - automatiquement, en jouant le duel de quelqu'un (dans les deux sens) ;
--   - à la main, en cherchant un pseudo.
-- Défier un ami lui adresse un duel : il le voit à sa prochaine visite
-- (« Jim34 te défie ! » sur l'accueil et dans ses duels).
-- Comme les duels : aucun accès direct aux tables, tout passe par des
-- fonctions security definer.
-- ============================================================

-- Une amitié = deux lignes (a → b et b → a) : la liste se lit d'un seul côté
create table public.friendships (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  friend_id  uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);

-- Duel adressé à un ami précis
create table public.duel_invites (
  duel_id    uuid not null references public.duels (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (duel_id, user_id)
);
create index duel_invites_user_idx on public.duel_invites (user_id);

alter table public.friendships  enable row level security;
alter table public.duel_invites enable row level security;
revoke all on public.friendships, public.duel_invites from anon, authenticated;

-- Lier deux joueurs (sans effet s'ils le sont déjà)
create or replace function public.lier_amis(a uuid, b uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.friendships (user_id, friend_id)
  select x, y from (values (a, b), (b, a)) as v(x, y)
  where a is not null and b is not null and a <> b
  on conflict do nothing;
$$;
revoke execute on function public.lier_amis(uuid, uuid) from public, anon, authenticated;

-- ============================================================
-- PLAY_DUEL : même règle que la 0013, et le joueur devient ami du
-- créateur du duel
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

  for i in 0..v_nb - 1 loop
    v_answer := p_answers->i;
    select * into v_item from public.game_items
      where id = (v_answer->>'item_id')::uuid
        and id = any (v_duel.item_ids);
    if found and public.check_answer(v_item, coalesce(v_answer->'answer', '{}'::jsonb)) then
      v_correct := v_correct + 1;
      v_score := v_score + 10;
    end if;
  end loop;

  begin
    insert into public.duel_plays (duel_id, user_id, answers, score, correct_count)
    values (v_duel.id, v_user, p_answers, v_score, v_correct);
  exception when unique_violation then
    raise exception 'Tu as déjà joué ce duel !';
  end;

  -- Jouer le duel de quelqu'un, c'est devenir son ami
  perform public.lier_amis(v_user, v_duel.created_by);

  return jsonb_build_object('score', v_score, 'correct_count', v_correct, 'total', v_nb * 10);
end;
$$;

-- ============================================================
-- LIST_FRIENDS() → mes amis, par ordre alphabétique
-- ============================================================
create or replace function public.list_friends()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(
           jsonb_build_object('id', p.id, 'pseudo', p.pseudo, 'ville', c.name)
           order by lower(p.pseudo)), '[]'::jsonb)
  from public.friendships f
  join public.profiles p on p.id = f.friend_id
  left join public.cities c on c.id = p.city_id
  where f.user_id = auth.uid();
$$;

-- ============================================================
-- SEARCH_PLAYERS(p_query) → 10 joueurs dont le pseudo commence ainsi
-- ============================================================
create or replace function public.search_players(p_query text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_q    text := public.norm_txt(coalesce(p_query, ''));
begin
  if v_user is null or length(v_q) < 2 then
    return '[]'::jsonb;
  end if;
  return (
    select coalesce(jsonb_agg(ligne), '[]'::jsonb) from (
      select jsonb_build_object(
               'id', p.id,
               'pseudo', p.pseudo,
               'ville', c.name,
               'deja_ami', exists (select 1 from public.friendships f
                                   where f.user_id = v_user and f.friend_id = p.id)
             ) as ligne
        from public.profiles p
        left join public.cities c on c.id = p.city_id
        where p.id <> v_user
          and public.norm_txt(p.pseudo) like v_q || '%'
        order by lower(p.pseudo)
        limit 10
    ) s
  );
end;
$$;

-- ============================================================
-- ADD_FRIEND / REMOVE_FRIEND
-- ============================================================
create or replace function public.add_friend(p_friend uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Connexion requise';
  end if;
  if not exists (select 1 from public.profiles where id = p_friend) then
    raise exception 'Joueur introuvable';
  end if;
  perform public.lier_amis(auth.uid(), p_friend);
end;
$$;

create or replace function public.remove_friend(p_friend uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.friendships
  where (user_id = auth.uid() and friend_id = p_friend)
     or (user_id = p_friend and friend_id = auth.uid());
$$;

-- ============================================================
-- CHALLENGE_FRIEND(p_friend) → code d'un nouveau duel adressé à cet ami
-- ============================================================
create or replace function public.challenge_friend(p_friend uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  if not exists (select 1 from public.friendships
                 where user_id = auth.uid() and friend_id = p_friend) then
    raise exception 'Tu ne peux défier que tes amis';
  end if;
  v_code := public.create_duel();
  insert into public.duel_invites (duel_id, user_id)
    select id, p_friend from public.duels where code = v_code;
  return v_code;
end;
$$;

-- ============================================================
-- LIST_MY_DUELS : comme la 0013, plus les duels qu'on m'a adressés
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
               'meilleur_adverse', case when mp.user_id is not null then
                 (select max(x.score) from public.duel_plays x
                    where x.duel_id = d.id and x.user_id <> v_user) end,
               -- pseudos des amis à qui ce duel est adressé
               'adresse_a', (select jsonb_agg(pi.pseudo) from public.duel_invites di
                               join public.profiles pi on pi.id = di.user_id
                               where di.duel_id = d.id)
             ) as ligne
        from public.duels d
        join public.profiles pc on pc.id = d.created_by
        left join public.duel_plays mp on mp.duel_id = d.id and mp.user_id = v_user
        where d.created_by = v_user
           or mp.user_id is not null
           or exists (select 1 from public.duel_invites di
                      where di.duel_id = d.id and di.user_id = v_user)
        order by d.created_at desc
        limit 20
    ) s
  );
end;
$$;

grant execute on function public.list_friends() to authenticated;
grant execute on function public.search_players(text) to authenticated;
grant execute on function public.add_friend(uuid) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
grant execute on function public.challenge_friend(uuid) to authenticated;
grant execute on function public.list_my_duels() to authenticated;
