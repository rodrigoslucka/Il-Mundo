create table if not exists public.il_mundo_admin_user_creation_tokens (
  token text primary key,
  email text not null,
  created_at timestamptz not null default now()
);

create index if not exists il_mundo_admin_user_creation_tokens_created_at_idx
  on public.il_mundo_admin_user_creation_tokens (created_at);

alter table public.il_mundo_admin_user_creation_tokens enable row level security;
revoke all on public.il_mundo_admin_user_creation_tokens from public, anon, authenticated;
grant select, insert, delete on public.il_mundo_admin_user_creation_tokens to service_role;

create or replace function public.il_mundo_create_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_creation_token text := new.raw_user_meta_data ->> 'il_mundo_admin_creation_token';
  v_authorized_admin_creation boolean := false;
begin
  if new.invited_at is null then
    if v_creation_token is not null then
      select exists (
        select 1
        from public.il_mundo_admin_user_creation_tokens
        where token = v_creation_token
          and email = lower(coalesce(new.email, ''))
          and created_at > now() - interval '15 minutes'
      )
      into v_authorized_admin_creation;

      if not v_authorized_admin_creation then
        raise exception 'La autorización para crear la cuenta no es válida.';
      end if;

      delete from public.il_mundo_admin_user_creation_tokens
      where token = v_creation_token;

      update auth.users
      set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
        - 'il_mundo_admin_creation_token'
      where id = new.id;
    elsif new.raw_app_meta_data ->> 'il_mundo_admin_created' is distinct from 'true' then
      raise exception 'Las cuentas solo pueden crearse desde el panel de administración.';
    end if;
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
