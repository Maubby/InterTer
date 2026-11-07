-- ============================================================
-- INTERTER — Second essai et joker 50/50 (mécaniques du lot 1)
-- QCM à deux essais : une bonne réponse au second essai vaut 5 points
-- au lieu de 10. Chaque réponse peut porter "essai": 2.
--   shortcut: l'essai est déclaré par le navigateur ; un tricheur peut
--   le taire, mais check_practice_item est déjà ouvert à tous et laisse
--   vérifier une réponse avant de l'envoyer. À durcir ensemble
--   (correction et essais enregistrés côté serveur) si la triche apparaît.
-- Joker 50/50 : joker_qcm retire deux mauvaises réponses d'un QCM.
-- Reprend play_daily_challenge (0009) et play_duel (0014) à l'identique,
-- sauf le barème du second essai.
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
      -- QCM trouvé au second essai : demi-points
      v_score := v_score + case when v_answer->>'essai' = '2' then v_points_each / 2 else v_points_each end;
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
      -- QCM trouvé au second essai : demi-points
      v_score := v_score + case when v_answer->>'essai' = '2' then 5 else 10 end;
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
-- JOKER_QCM(p_item_id) → deux indices de mauvaises réponses, au hasard
-- ============================================================
create or replace function public.joker_qcm(p_item_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_item public.game_items;
begin
  select * into v_item from public.game_items
    where id = p_item_id and is_active and game_type = 'qcm';
  if not found then
    raise exception 'Joker indisponible pour cette épreuve';
  end if;
  return (
    select coalesce(jsonb_agg(i), '[]'::jsonb) from (
      select i from generate_series(0, jsonb_array_length(v_item.payload->'choices') - 1) i
      where i::text <> v_item.payload->>'answer'
      order by random()
      limit 2
    ) s
  );
end;
$$;

grant execute on function public.play_daily_challenge(jsonb) to authenticated;
grant execute on function public.play_duel(text, jsonb) to authenticated;
grant execute on function public.joker_qcm(uuid) to anon, authenticated;
