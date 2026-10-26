-- ============================================================
-- INTERTER — Multiplicateur Quête du Jour : ×5 (au lieu de ×2)
-- La Quête du Jour est LA récompense du rendez-vous quotidien :
-- elle doit dominer nettement l'entraînement libre (×1).
-- ============================================================

create or replace function public.play_daily_challenge(p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_challenge   public.daily_challenges;
  v_item        public.game_items;
  v_score       integer := 0;
  v_correct     integer := 0;
  v_points_each integer := 10;
  v_multiplier  integer := 5;          -- Quête du Jour : points ×5
  v_streak      integer := 1;
  v_prev_streak integer;
  v_last_play   date;
  v_city        text;
  v_today       date := current_date;
  v_answer      jsonb;
  v_max_items   integer := 5;
  v_user_id     uuid := auth.uid();
begin
  -- ANTI-TRICHE 1 : utilisateur connecté requis
  if v_user_id is null then
    raise exception 'Connexion requise';
  end if;

  -- ANTI-TRICHE 2 : défi publié et daté du jour (pas de rattrapage)
  select * into v_challenge
    from public.daily_challenges
    where challenge_date = v_today and is_published = true;
  if not found then
    raise exception 'La Quête du Jour n''est pas encore publiée — reviens plus tard !';
  end if;

  -- ANTI-TRICHE 3 : format d'entrée strict (5 réponses, une par item du jour)
  if jsonb_typeof(p_answers) is distinct from 'array'
     or jsonb_array_length(p_answers) <> v_max_items then
    raise exception 'Format de réponses invalide';
  end if;

  -- Ville obligatoire : sans ville, le score ne peut pas compter
  select p.streak, p.last_play_date, p.city_id
    into v_prev_streak, v_last_play, v_city
    from public.profiles p where p.id = v_user_id;
  if v_city is null then
    raise exception 'Choisis d''abord ta ville pour que ton score compte !';
  end if;

  -- ANTI-TRICHE 4 : 1 participation par jour — la contrainte unique
  -- (user_id, challenge_date) lève une exception si déjà joué.
  begin
    insert into public.daily_plays (user_id, challenge_date, answers, score)
    values (v_user_id, v_today, p_answers, 0);
  exception when unique_violation then
    raise exception 'Tu as déjà joué la Quête du Jour — reviens demain !';
  end;

  -- Validation réponse par réponse, côté serveur uniquement
  for i in 0..v_max_items - 1 loop
    v_answer := p_answers->i;
    select * into v_item from public.game_items
      where id = (v_answer->>'item_id')::uuid
        and id = any (v_challenge.item_ids)
        and is_active = true;
    if found and public.check_answer(v_item, coalesce(v_answer->'answer', '{}'::jsonb)) then
      v_correct := v_correct + 1;
      v_score := v_score + v_points_each;
    end if;
  end loop;

  update public.daily_plays
    set score = v_score
    where user_id = v_user_id and challenge_date = v_today;

  -- Streak quotidien : +1 si joué hier, sinon on repart à 1
  if v_last_play = v_today - 1 then
    v_streak := v_prev_streak + 1;
  else
    v_streak := 1;
  end if;
  update public.profiles
    set streak = v_streak,
        last_play_date = v_today
    where id = v_user_id;

  -- city_scores : incrément atomique, points ×5 (Quête du Jour)
  insert into public.city_scores (city_id, total_points, play_count)
    values (v_city, v_score * v_multiplier, 1)
  on conflict (city_id)
    do update set total_points = city_scores.total_points + excluded.total_points,
                  play_count   = city_scores.play_count + 1,
                  updated_at   = now();

  return jsonb_build_object(
    'score', v_score,
    'total', v_max_items * v_points_each,
    'correct_count', v_correct,
    'streak', v_streak
  );
end;
$$;

grant execute on function public.play_daily_challenge(jsonb) to authenticated;

-- ============================================================
-- ÉNERGIE : compteur d'entraînement libre (15 défis/jour gratuit)
-- Un Supporter joue sans limite. Les défis joués sont déjà
-- comptés dans practice_plays (user_id, played_date) — on
-- peut calculer le quota côté serveur sans nouvelle colonne.
-- ============================================================

create or replace function public.record_practice_answer(
  p_item_id uuid,
  p_answer  jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user     public.profiles;
  v_item     public.game_items;
  v_today    date := current_date;
  v_played   integer;
  v_quota    integer;        -- null = illimité (Supporter)
  v_correct  boolean;
  v_points    integer := 10;      -- points normaux (pas de multiplicateur)
begin
  select * into v_user from public.profiles where id = auth.uid();
  if not found then
    raise exception 'Profil introuvable — connecte-toi d''abord';
  end if;

  select * into v_item from public.game_items
    where id = p_item_id and is_active = true;
  if not found then
    raise exception 'Item introuvable';
  end if;

  -- Quota gratuit : 15 défis libres par jour, illimité si Supporter
  select count(*) into v_played
    from public.practice_plays
    where user_id = v_user.id and played_date = v_today;
  v_quota := case when v_user.is_supporter then null else 15 end;

  if v_quota is not null and v_played >= v_quota then
    raise exception
      'Tu as joué tes % défis d''entraînement aujourd''hui ! La Quête du Jour reste ouverte — ou deviens Supporter pour jouer sans limite.',
      v_quota;
  end if;

  v_correct := public.check_answer(v_item, coalesce(p_answer, '{}'::jsonb));

  insert into public.practice_plays (user_id, item_id, played_date, is_correct)
    values (v_user.id, v_item.id, v_today, v_correct);

  -- Points normaux (×1) pour la ville — l'entraînement pèse moins
  -- que la Quête (×5), c''est voulu.
  if v_correct and v_user.city_id is not null then
    insert into public.city_scores (city_id, total_points, play_count)
      values (v_user.city_id, v_points, 1)
    on conflict (city_id)
      do update set total_points = city_scores.total_points + excluded.total_points,
                    play_count   = city_scores.play_count + 1,
                    updated_at   = now();
  end if;

  return jsonb_build_object(
    'is_correct', v_correct,
    'remaining_today', case when v_quota is null then null else v_quota - v_played - 1 end,
    'points', case when v_correct then v_points else 0 end
  );
end;
$$;

grant execute on function public.record_practice_answer(uuid, jsonb) to authenticated;
