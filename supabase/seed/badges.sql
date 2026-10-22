-- Badges initiaux d'Interter
insert into public.badges (code, label, description, icon) values
  ('first_play',    'Premier Tour',      'Tu as joué ton tout premier Défi du Jour.', 'etoile'),
  ('streak_7',      'Semaine au Feu',    '7 jours de Défi du Jour d''affilée.',      'flamme'),
  ('streak_30',     'Mois en Armure',    '30 jours de Défi du Jour d''affilée.',     'bouclier'),
  ('city_top_10',   'Étendard levé',     'Ta ville entre dans le top 10 national.',   'trophee'),
  ('supporter',     'Supporter',         'Tu soutiens Interter à 4,99 €.',            'eclair'),
  ('perfect_day',   'Sans Faute',        '5/5 au Défi du Jour.',                     'etoile')
on conflict (code) do nothing;
