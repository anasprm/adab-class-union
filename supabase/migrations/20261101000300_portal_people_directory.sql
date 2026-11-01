create or replace view public.portal_people_directory
with (security_invoker = false) as
select
  p.id,
  p.display_name,
  p.role,
  p.roll_number,
  p.house_team,
  p.district,
  case when p.role = 'student' then p.bio end as bio
from public.profiles p
where p.is_active = true;

comment on view public.portal_people_directory is
  'Public display names and directory-safe details for active portal accounts.';

revoke all on public.portal_people_directory from public, anon, authenticated;
grant select on public.portal_people_directory to anon, authenticated;
