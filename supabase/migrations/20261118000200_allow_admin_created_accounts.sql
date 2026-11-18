create or replace function public.il_mundo_create_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.invited_at is null
     and new.raw_app_meta_data ->> 'il_mundo_admin_created' is distinct from 'true' then
    raise exception 'Las cuentas solo pueden crearse desde el panel de administración.';
  end if;
  insert into public.il_mundo_profiles (user_id, display_name, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)),
    'worker'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;
