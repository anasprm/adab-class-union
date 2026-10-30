-- Migration: 20261028000500_fix_permissions_usernames.sql
-- Description: Allows anonymous visitors to evaluate the public read policies
-- without a permission error, restores service-role access for server
-- functions, and adds human-friendly usernames for portal accounts.

-- 1. Public read policies call is_portal_member(). Anonymous visitors must be
--    able to execute it; it only ever returns true for an authenticated,
--    active member, so published content stays public and private data stays
--    protected.
grant execute on function public.is_portal_member() to anon;
grant execute on function public.has_portal_role(text[]) to anon;
grant execute on function public.current_portal_wing() to anon;

-- 2. Server-side functions (invite/create account) use the service role.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all routines in schema public to service_role;

-- 3. Username login. Accounts can be created with a username instead of an
--    email address. Bare usernames resolve to <username>@adab.local.
alter table public.profiles
  add column if not exists username text
  check (username is null or username ~ '^[a-z0-9][a-z0-9._-]{2,29}$');

create unique index if not exists profiles_username_key
  on public.profiles (lower(username))
  where username is not null;

-- Existing rows created before usernames can sign in with their email address.
