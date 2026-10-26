-- ============================================================
-- INTERTER — Variantes de réponses acceptées (devinettes)
-- Une devinette peut avoir plusieurs formulations valides :
-- "gevaudan", "la bête du Gévaudan", "Gévaudan"...
-- Le payload porte un tableau accepted_answers optionnel.
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
    v_proposee := lower(trim(unaccent(answer->>'text')));
    -- La réponse officielle, normalisée
    v_reference := lower(trim(unaccent(p->>'answer')));
    if v_proposee = v_reference then
      return true;
    end if;
    -- Les variantes acceptées, normalisées
    if p ? 'accepted_answers' then
      for v_variante in select jsonb_array_elements_text(p->'accepted_answers')
      loop
        if v_proposee = lower(trim(unaccent(v_variante))) then
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

-- Corriger l'énigme emojis floue (réponse improvable) :
-- remplacée par une devinette claire avec variantes.
update public.game_items
set payload = payload || jsonb_build_object(
  'riddle', 'Je suis un écran géant au bord de la Manche, où la croisade des stats s''affiche en direct. Quelle ville ?',
  'answer', 'Calais',
  'accepted_answers', jsonb_build_array('calais'),
  'explanation', 'Les grand écrans de Calais, face à la Manche, affichent en direct la croisade de statistiques du port — un hommage au "Border Control" britannique.'
)
where game_type = 'emoji_riddle' and payload->>'emojis' like '%波%';

-- L'énigme Gévaudan : variantes acceptées
update public.game_items
set payload = payload || jsonb_build_object(
  'accepted_answers', jsonb_build_array(
    'gevaudan', 'la bete du gevaudan', 'la bête du gévaudan',
    'le gevaudan', 'bête du gévaudan', 'bete du gevaudan', 'la bête du gevaudan'
  )
)
where game_type = 'riddle' and payload->>'answer' like '%évaudan%';
