-- ============================================================
-- INTERTER — Les réponses ne sont plus lisibles par les joueurs
-- La policy de 0001 laissait lire game_items (réponses comprises) à
-- quiconque, dès qu'un item était actif. Les joueurs passent par la vue
-- game_items_public (sans réponses), qui lit la table avec les droits de
-- son propriétaire : elle continue de fonctionner. Seuls les admins
-- (l'atelier) lisent encore la table elle-même.
-- ============================================================
drop policy if exists game_items_select_active on public.game_items;
create policy game_items_select_admin on public.game_items
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );
