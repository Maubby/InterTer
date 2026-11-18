-- ============================================================
-- INTERTER — Défis de géographie : placer sur la carte de France
-- Nouveau format « carte » (Berthe la Cartographe, thème geographie).
-- Le joueur clique sur la carte ; le navigateur envoie {lat, lon}.
--   cible « ville »  : juste si le clic tombe à moins de tolerance_km
--                      (60 par défaut) de la commune (answer = code INSEE)
--   cible « region » : juste si la commune la plus proche du clic est
--                      dans la région (answer = region_name)
-- La réponse (answer) reste cachée par la vue game_items_public.
-- ============================================================

alter table public.game_items drop constraint if exists game_items_game_type_check;
alter table public.game_items add constraint game_items_game_type_check check (game_type in
  ('qcm','true_false','riddle','emoji_riddle','intruder','order_dates','carte'));

-- Même fonction que la 0012, plus le format carte. Elle lit désormais la
-- table cities : stable, et non plus immutable.
create or replace function public.check_answer(item public.game_items, answer jsonb)
returns boolean
language plpgsql
stable
as $$
declare
  p jsonb := item.payload;
  v_proposee text;
  v_reference text;
  v_variante text;
  v_lat double precision;
  v_lon double precision;
  v_ville public.cities;
begin
  if item.game_type = 'qcm' then
    return answer ? 'choice' and (answer->>'choice') = (p->>'answer');

  elsif item.game_type = 'true_false' then
    return answer ? 'value' and (answer->>'value') = (p->>'answer');

  elsif item.game_type = 'riddle' then
    if not (answer ? 'text') then
      return false;
    end if;
    v_proposee := lower(trim(extensions.unaccent(answer->>'text')));
    v_reference := lower(trim(extensions.unaccent(p->>'answer')));
    if v_proposee = v_reference then
      return true;
    end if;
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

  elsif item.game_type = 'carte' then
    if jsonb_typeof(answer->'lat') <> 'number' or jsonb_typeof(answer->'lon') <> 'number' then
      return false;
    end if;
    v_lat := (answer->>'lat')::double precision;
    v_lon := (answer->>'lon')::double precision;

    if p->>'cible' = 'ville' then
      select * into v_ville from public.cities where id = p->>'answer';
      if not found then
        return false;
      end if;
      -- Distance en km (approximation plane, assez juste à l'échelle de la France)
      return 111.2 * sqrt(power(v_ville.latitude - v_lat, 2)
             + power((v_ville.longitude - v_lon) * cos(radians(v_lat)), 2))
             <= coalesce((p->>'tolerance_km')::double precision, 60);

    elsif p->>'cible' = 'region' then
      select * into v_ville from public.cities
      where latitude between v_lat - 0.3 and v_lat + 0.3
        and longitude between v_lon - 0.4 and v_lon + 0.4
      order by power(latitude - v_lat, 2) + power((longitude - v_lon) * 0.69, 2)
      limit 1;
      return found and v_ville.region_name = p->>'answer';
    end if;
    return false;

  else
    return false;
  end if;
end;
$$;

-- Premières questions : dix villes, cinq régions
insert into public.game_items (game_type, theme, difficulty, payload) values
  ('carte','geographie',1,'{"cible":"ville","question":"Place Strasbourg sur la carte.","ville":"Strasbourg","answer":"67482","explanation":"Strasbourg borde le Rhin, face à l''Allemagne : la capitale de l''Alsace."}'),
  ('carte','geographie',1,'{"cible":"ville","question":"Place Brest sur la carte.","ville":"Brest","answer":"29019","explanation":"Brest, au bout du Finistère, garde la rade où mouille la flotte de l''Atlantique."}'),
  ('carte','geographie',1,'{"cible":"ville","question":"Place Marseille sur la carte.","ville":"Marseille","answer":"13055","explanation":"Marseille, fondée par les Grecs de Phocée, ouvre la France sur la Méditerranée."}'),
  ('carte','geographie',2,'{"cible":"ville","question":"Place Carcassonne sur la carte.","ville":"Carcassonne","answer":"11069","explanation":"La cité de Carcassonne veille sur l''Aude, entre Toulouse et la Méditerranée."}'),
  ('carte','geographie',2,'{"cible":"ville","question":"Place Annecy sur la carte.","ville":"Annecy","answer":"74010","explanation":"Annecy, la « Venise des Alpes », au bord de son lac en Haute-Savoie."}'),
  ('carte','geographie',2,'{"cible":"ville","question":"Place Reims sur la carte.","ville":"Reims","answer":"51454","explanation":"Reims, cité des sacres des rois de France, au cœur de la Champagne."}'),
  ('carte','geographie',2,'{"cible":"ville","question":"Place Clermont-Ferrand sur la carte.","ville":"Clermont-Ferrand","answer":"63113","explanation":"Clermont-Ferrand, au pied de la chaîne des Puys, en plein Massif central."}'),
  ('carte','geographie',2,'{"cible":"ville","question":"Place Limoges sur la carte.","ville":"Limoges","answer":"87085","explanation":"Limoges, capitale de la porcelaine, au cœur du Limousin."}'),
  ('carte','geographie',3,'{"cible":"ville","question":"Place Saint-Malo sur la carte.","ville":"Saint-Malo","answer":"35288","tolerance_km":40,"explanation":"Saint-Malo, la cité corsaire, face à la Manche sur la côte d''Émeraude."}'),
  ('carte','geographie',3,'{"cible":"ville","question":"Place Biarritz sur la carte.","ville":"Biarritz","answer":"64122","tolerance_km":40,"explanation":"Biarritz, sur la côte basque, à deux pas de l''Espagne."}'),
  ('carte','geographie',1,'{"cible":"region","question":"Touche la Bretagne.","answer":"Bretagne","explanation":"La Bretagne, la pointe ouest de la France, entre Manche et Atlantique."}'),
  ('carte','geographie',1,'{"cible":"region","question":"Touche la Corse.","answer":"Corse","explanation":"La Corse, l''île de Beauté, en pleine Méditerranée."}'),
  ('carte','geographie',2,'{"cible":"region","question":"Touche la Normandie.","answer":"Normandie","explanation":"La Normandie, des falaises d''Étretat au Mont-Saint-Michel."}'),
  ('carte','geographie',2,'{"cible":"region","question":"Touche la région Centre-Val de Loire.","answer":"Centre-Val de Loire","explanation":"Le Centre-Val de Loire, terre des châteaux, d''Orléans à Tours."}'),
  ('carte','geographie',3,'{"cible":"region","question":"Touche la Bourgogne-Franche-Comté.","answer":"Bourgogne-Franche-Comté","explanation":"La Bourgogne-Franche-Comté, de Dijon au Jura, jusqu''à la frontière suisse."}');

-- Les duels tirent aussi des questions de carte : on ajoute le format à la
-- liste de create_duel (0013), sans réécrire le reste de la fonction.
do $do$
declare v_def text;
begin
  select pg_get_functiondef('public.create_duel()'::regprocedure) into v_def;
  execute replace(v_def, $s$'intruder', 'order_dates')$s$, $s$'intruder', 'order_dates', 'carte')$s$);
end;
$do$;
