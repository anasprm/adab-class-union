-- Public class directory backed by the real student accounts.
-- The view intentionally exposes only directory-safe columns (never email or
-- authentication details) and lets signed-out visitors browse the same 15
-- classmates that exist in the portal.

create or replace view public.class_directory
with (security_invoker = false) as
select
  p.id,
  p.display_name,
  p.roll_number,
  p.house_team,
  p.district,
  p.bio
from public.profiles p
where p.role = 'student' and p.is_active = true;

comment on view public.class_directory is
  'Public, read-only directory of active student accounts for the Members page.';

grant select on public.class_directory to anon, authenticated;