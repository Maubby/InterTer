-- ============================================================
-- INTERTER — Quiz d'essai (sans compte) : RPC de validation
-- Les points ne comptent PAS (pas de ville, pas de classement) :
-- on valide la réponse pour le feedback vert/rouge, sans enjeu.
-- ============================================================

create or replace function public.check_practice_item(p_item_id uuid, p_answer jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.game_items;
begin
  select * into v_item from public.game_items
    where id = p_item_id and is_active = true;
  if not found then
    raise exception 'Item introuvable';
  end if;

  return jsonb_build_object(
    'is_correct', public.check_answer(v_item, coalesce(p_answer, '{}'::jsonb))
  );
end;
$$;

grant execute on function public.check_practice_item(uuid, jsonb) to anon, authenticated;
