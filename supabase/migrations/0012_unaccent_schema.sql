-- ============================================================
-- INTERTER — Correction : les devinettes ne pouvaient pas être validées
-- La 0011 appelait unaccent() sans son schéma. L'extension vit dans
-- « extensions » (0001), hors du search_path des fonctions : chaque
-- devinette renvoyait « function unaccent(text) does not exist ».
-- Même fonction que la 0011, avec extensions.unaccent().
-- ============================================================

create or replace function public.check_answer(item public.game_items, answer jsonb)
returns boolean
language plpgsql
immutable
as $$
declare
  p jsonb := item.payload;
  v_proposee text;
  v_reference text;
  v_variante text;
begin
  if item.game_type = 'qcm' then
    return answer ? 'choice' and (answer->>'choice') = (p->>'answer');

  elsif item.game_type = 'true_false' then
    return answer ? 'value' and (answer->>'value') = (p->>'answer');

  elsif item.game_type = 'riddle' then
    if not (answer ? 'text') then
      return false;
    end if;
    -- Réponse proposée, normalisée (sans accents, minuscules, trim)
    v_proposee := lower(trim(extensions.unaccent(answer->>'text')));
    -- La réponse officielle, normalisée
    v_reference := lower(trim(extensions.unaccent(p->>'answer')));
    if v_proposee = v_reference then
      return true;
    end if;
    -- Les variantes acceptées, normalisées
    if p ? 'accepted_answers' then
      for v_variante in select jsonb_array_elements_text(p->'accepted_answers')
      loop
        if v_proposee = lower(trim(extensions.unaccent(v_variante))) then
          return true;
        end if;
      end loop;
    end if;
    return false;

  elsif item.game_type = 'emoji_riddle' then
    return answer ? 'city_id' and (answer->>'city_id') = (p->>'answer');

  elsif item.game_type = 'intruder' then
    return answer ? 'intruder_index' and (answer->>'intruder_index') = (p->>'intruder');

  elsif item.game_type = 'order_dates' then
    return answer ? 'order' and answer->'order' = p->'correct_order';

  else
    return false;
  end if;
end;
$$;
