-- ============================================================
-- INTERTER — Explications pédagogiques après réponse
-- La vue publique expose désormais le champ "explanation"
-- (texte affiché seulement APRÈS la réponse, dans le feedback).
-- ============================================================

-- La vue publique garde les réponses cachées mais expose l'explication
create or replace view public.game_items_public as
  select id, game_type,
         payload - 'answer' - 'answers' - 'correct_order' - 'intruder' - 'solution'
           as payload,
         difficulty, department_code
  from public.game_items
  where is_active = true;
grant select on public.game_items_public to anon, authenticated;

-- Mise à jour des items d'exemple avec leur explication
update public.game_items
set payload = payload || '{"explanation": "Toulouse doit son surnom de « ville rose » aux briques de terre cuite, fabriquées dans la Garonne, qui donnent à ses façades cette couleur chaude."}'::jsonb
where game_type = 'qcm' and payload->>'question' like '%ville rose%';

update public.game_items
set payload = payload || '{"explanation": "Lille fut une place forte majeure, et son beffroi est l''un des symboles de la capitale des Flandres."}'::jsonb
where game_type = 'riddle' and payload->>'riddle' like '%citadelle du Nord%';

update public.game_items
set payload = payload || '{"explanation": "Le cheddar est le seul fromage anglais de la liste ! Camembert (Normandie), Comté (Jura), Roquefort (Aveygon)… tout le reste vient de France."}'::jsonb
where game_type = 'intruder' and payload->>'items' like '%Cheddar%';
