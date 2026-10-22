-- ============================================================
-- INTERTER — Étape 1 : RPC sécurisées (anti-triche)
-- play_daily_challenge : valide les réponses, calcule le score,
--   met à jour streak + city_scores. Points COMPTENT DOUBLE.
-- record_practice_answer : épreuves locales, quota 2/jour gratuit.
-- security definer : s'exécute avec droits serveur, en imposant
-- ses propres règles — le client ne fournit QUE ses réponses.
-- ============================================================

-- ---------- Validation d'une réponse selon le format ----------
create or replace function public.check_answer(item public.game_items, answer jsonb)
returns boolean
language plpgsql immutable
as $$
declare
  p jsonb := item.payload;
begin
  case item.game_type
    when 'qcm' then
      return answer ? 'choice' and (answer->>'choice')::int = (p->>'answer')::int;

    when 'true_false' then
      return answer ? 'value' and (answer->>'value')::boolean is (p->>'answer')::boolean;

    when 'riddle' then
      -- réponse libre : comparaison normalisée sans accents/casse
      return answer ? 'text'
        and public.norm_txt(answer->>'text') = public.norm_txt(p->>'answer');

    when 'emoji_riddle' then
      return answer ? 'city_id' and (answer->>'city_id')::int::text = (p->>'answer');

    when 'intruder' then
      return answer ? 'intruder_index' and (answer->>'intruder_index')::int = (p->>'intruder')::int;

    when 'order_dates' then
      -- answer->'order' = tableau d'indices 0-3, comparé à correct_order
      return answer ? 'order'
        and answer->'order' = p->'correct_order';

    else return false;
  end case;
end;
$$;

-- ============================================================
-- PLAY_DAILY_CHALLENGE(user_id, challenge_date, answers)
-- answers = tableau JSON : [{item_id, answer}, ...] dans l'ordre
-- Retourne : {score, total, correct_count, streak}
-- ============================================================
create or replace function public.play_daily_challenge(
  p_user_id        uuid,
  p_challenge_date date,
  p_answers        jsonb
)
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
  v_multiplier  integer := 2;          -- Défi du Jour : points comptent double
  v_streak      integer;
  v_city        text;
  v_today       date := current_date;
  v_answer      jsonb;
  v_max_items   integer := 5;
begin
  -- ANTI-TRICHE 1 : le joueur ne peut jouer que pour lui-même
  if p_user_id is distinct from auth.uid() then
    raise exception 'Utilisateur non autorisé';
  end if;

  -- ANTI-TRICHE 2 : défi publié et daté du jour (pas de rattrapage/anticipation)
  if p_challenge_date is distinct from v_today then
    raise exception 'Ce défi n''est pas celui du jour';
  end if;

  select * into v_challenge
    from public.daily_challenges
    where challenge_date = p_challenge_date and is_published = true;
  if not found then
    raise exception 'Défi introuvable ou non publié';
  end if;

  -- ANTI-TRICHE 3 : format d'entrée strict (5 réponses, une par item du jour)
  if jsonb_typeof(p_answers) is distinct from 'array'
     or jsonb_array_length(p_answers) <> v_max_items then
    raise exception 'Format de réponses invalide';
  end if;

  -- ANTI-TRICHE 4 : 1 participation par jour — la contrainte unique
  -- (user_id, challenge_date) lève une exception si déjà joué.
  begin
    insert into public.daily_plays (user_id, challenge_date, answers, score)
    values (p_user_id, p_challenge_date, p_answers, 0);
  exception when unique_violation then
    raise exception 'Tu as déjà joué le Défi du Jour !';
  end;

  -- Validation réponse par réponse, côté serveur uniquement
  for i in 0..v_max_items - 1 loop
    v_answer := p_answers->i;
    select * into v_item from public.game_items
      where id = (v_answer->>'item_id')::uuid
        and id = any (v_challenge.item_ids)     -- l'item appartient bien au défi du jour
        and is_active = true;
    if found and public.check_answer(v_item, v_answer->'answer') then
      v_correct := v_correct + 1;
      v_score := v_score + v_points_each;
    end if;
  end loop;

  update public.daily_plays
    set score = v_score
    where user_id = p_user_id and challenge_date = p_challenge_date;

  -- Streak quotidien
  select streak, coalesce(last_play_date, v_today - 2), city_id
    into v_streak, v_city, v_city from public.profiles where id = p_user_id;
  if v_city is null then
    raise exception 'Aucune ville choisie — le score ne peut pas compter';
  end if;
  update public.profiles
    set streak = case when last_play_date = v_today - 1 then v_streak + 1 else 1 end,
        last_play_date = v_today
    where id = p_user_id;

  -- city_scores : incrément atomique, points ×2 (défi du jour)
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
    'streak', case when (select last_play_date from public.profiles where id = p_user_id) = v_today - 1
                   then v_streak + 1 else 1 end
  );
end;
$$;

grant execute on function public.play_daily_challenge(uuid, date, jsonb) to authenticated;

-- ============================================================
-- RECORD_PRACTICE_ANSWER(item_id, answer)
-- Épreuves locales : 2/jour gratuit, illimité si Supporter.
-- Retourne : {is_correct, remaining_today, points}
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
  v_quota    integer;
  v_correct  boolean;
  v_points   integer := 10;      -- points normaux (pas de double)
begin
  select * into v_user from public.profiles where id = auth.uid();
  if not found then
    raise exception 'Profil introuvable';
  end if;

  select * into v_item from public.game_items
    where id = p_item_id and is_active = true;
  if not found then
    raise exception 'Item introuvable';
  end if;

  -- ANTI-TRICHE : l'item doit être du département du joueur (épreuve locale)
  if v_item.department_code is null
     or v_item.department_code is distinct from (
       select department_code from public.cities where id = v_user.city_id)
  then
    raise exception 'Cet item n''est pas une épreuve de ton département';
  end if;

  -- Quota : 2 gratuites par jour, illimité si Supporter
  select count(*) into v_played
    from public.practice_plays
    where user_id = v_user.id and played_date = v_today;
  v_quota := case when v_user.is_supporter then null else 2 end;

  if v_quota is not null and v_played >= v_quota then
    raise exception 'Quota du jour atteint — deviens Supporter pour jouer sans limite';
  end if;

  v_correct := public.check_answer(v_item, p_answer);

  insert into public.practice_plays (user_id, item_id, played_date, is_correct)
    values (v_user.id, p_item.id, v_today, v_correct);

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
