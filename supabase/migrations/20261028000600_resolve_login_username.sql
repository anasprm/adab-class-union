-- Migration: 20261028000600_resolve_login_username.sql
-- Description: Lets the sign-in screen resolve a bare username to the email
-- address stored on the matching active profile. Username accounts use
-- <username>@adab.local; the developer keeps their real email address.

create or replace function public.resolve_login_email(username_input text)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select email
  from public.profiles
  where lower(username) = lower(trim(username_input))
    and is_active
  limit 1;
$$;

revoke all on function public.resolve_login_email(text) from public;
grant execute on function public.resolve_login_email(text) to anon, authenticated;
