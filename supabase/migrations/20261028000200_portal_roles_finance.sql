create table if not exists public.portal_wings (
  id text primary key,
  name text not null unique check (char_length(name) between 2 and 100),
  accent text not null default 'Community' check (char_length(accent) between 2 and 40),
  objective text not null default '' check (char_length(objective) <= 500),
  activities text[] not null default '{}',
  icon text not null default '✦' check (char_length(icon) between 1 and 8),
  updated_at timestamptz not null default now()
);

insert into public.portal_wings (id, name, accent, objective, activities, icon)
values
  ('academic-dars', 'Academic & Dars Wing', 'Learning', 'Build strong study habits and make peer learning a shared part of class life.', array['Peer-led revision circles', 'Reading and study challenges', 'Learning-resource exchange'], '✦'),
  ('cultural-literary', 'Cultural & Literary Wing', 'Expression', 'Celebrate language, culture, and thoughtful expression through creative programmes.', array['Poetry and short-story sessions', 'Stage and speaking events', 'Literary wall and class magazine'], '✍'),
  ('sports-athletics', 'Sports & Athletics Club', 'Teamwork', 'Make sport welcoming and energising, with opportunities for every level of experience.', array['Inter-house matches', 'Fitness and athletics days', 'Friendly team challenges'], '⚑'),
  ('media-it', 'Media & IT Wing', 'Communication', 'Document class life and share union information with care and creativity.', array['Event photography and reports', 'Digital design workshops', 'Union announcements and archive'], '◉')
on conflict (id) do nothing;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text not null check (char_length(display_name) between 1 and 80),
  role text not null check (role in ('developer', 'teacher', 'committee', 'treasurer', 'student', 'wing')),
  wing_id text references public.portal_wings (id) on update cascade on delete restrict,
  roll_number text check (roll_number is null or char_length(roll_number) <= 30),
  house_team text check (house_team is null or house_team in ('Red Knights', 'White Warriors', 'Crimson Falcons')),
  district text check (district is null or char_length(district) <= 60),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_wing_role_check check ((role = 'wing') = (wing_id is not null))
);

create unique index if not exists profiles_singleton_staff_role
  on public.profiles (role)
  where is_active and role in ('developer', 'teacher', 'committee', 'treasurer');

create table if not exists public.portal_role_capacities (
  role text primary key check (role in ('developer', 'teacher', 'committee', 'treasurer', 'student', 'wing')),
  max_active integer not null check (max_active > 0),
  active_count integer not null default 0 check (active_count >= 0)
);

insert into public.portal_role_capacities (role, max_active)
values
  ('developer', 1),
  ('teacher', 1),
  ('committee', 1),
  ('treasurer', 1),
  ('student', 15),
  ('wing', 7)
on conflict (role) do update
set max_active = excluded.max_active;

update public.portal_role_capacities capacity
set active_count = (
  select count(*)::integer
  from public.profiles profile
  where profile.role = capacity.role and profile.is_active
);

revoke all on public.portal_role_capacities from public, anon, authenticated;

create or replace function public.enforce_portal_role_capacity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  role_keys text[] := array[]::text[];
  role_key text;
  needs_reservation boolean := false;
begin
  if tg_op = 'UPDATE' then
    if old.is_active and (not new.is_active or old.role <> new.role) then
      role_keys := array_append(role_keys, old.role);
    end if;
    if new.is_active and (not old.is_active or old.role <> new.role) then
      role_keys := array_append(role_keys, new.role);
      needs_reservation := true;
    end if;
  elsif new.is_active then
    role_keys := array_append(role_keys, new.role);
    needs_reservation := true;
  end if;
  if cardinality(role_keys) = 0 then
    return new;
  end if;

  for role_key in
    select distinct role_name
    from unnest(role_keys) as roles(role_name)
    order by role_name
  loop
    perform pg_advisory_xact_lock(hashtextextended('adab-portal-role:' || role_key, 0));
  end loop;

  if tg_op = 'UPDATE' then
    if old.is_active and (not new.is_active or old.role <> new.role) then
      update public.portal_role_capacities
      set active_count = active_count - 1
      where role = old.role and active_count > 0;
    end if;
  end if;

  if needs_reservation then
    update public.portal_role_capacities
    set active_count = active_count + 1
    where role = new.role and active_count < max_active;
    if not found then
      raise exception 'The active account limit for role % has been reached.', new.role
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_portal_role_capacity() from public, anon, authenticated;

drop trigger if exists profiles_enforce_role_capacity on public.profiles;
create trigger profiles_enforce_role_capacity
  before insert or update on public.profiles
  for each row execute function public.enforce_portal_role_capacity();

alter table public.portal_wings enable row level security;
alter table public.profiles enable row level security;

create or replace function public.is_portal_member()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and is_active
  );
$$;

create or replace function public.has_portal_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and is_active
      and role = any (allowed_roles)
  );
$$;

create or replace function public.current_portal_wing()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select wing_id from public.profiles
  where id = (select auth.uid()) and is_active and role = 'wing'
  limit 1;
$$;

revoke all on function public.is_portal_member() from public, anon;
revoke all on function public.has_portal_role(text[]) from public, anon;
revoke all on function public.current_portal_wing() from public, anon;
grant execute on function public.is_portal_member() to authenticated;
grant execute on function public.has_portal_role(text[]) to authenticated;
grant execute on function public.current_portal_wing() to authenticated;

revoke all on public.portal_wings, public.profiles from anon, authenticated;
grant select on public.portal_wings to anon, authenticated;
grant update (name, accent, objective, activities, icon, updated_at) on public.portal_wings to authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, roll_number, house_team, district, updated_at) on public.profiles to authenticated;

drop policy if exists "Anyone can view portal wings" on public.portal_wings;
create policy "Anyone can view portal wings"
  on public.portal_wings for select to anon, authenticated using (true);

drop policy if exists "Developers can edit portal wings" on public.portal_wings;
create policy "Developers can edit portal wings"
  on public.portal_wings for update to authenticated
  using ((select public.has_portal_role(array['developer'])))
  with check ((select public.has_portal_role(array['developer'])));

drop policy if exists "Members can view their own profile and developers can view all" on public.profiles;
create policy "Members can view their own profile and developers can view all"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.has_portal_role(array['developer'])));

drop policy if exists "Members can update their own profile" on public.profiles;
create policy "Members can update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()) and is_active)
  with check (id = (select auth.uid()) and is_active);

create or replace view public.member_directory
with (security_barrier = true)
as
select id, display_name, roll_number, house_team, district
from public.profiles
where is_active
  and role = 'student'
  and (select public.is_portal_member());

revoke all on public.member_directory from public, anon, authenticated;
grant select on public.member_directory to authenticated;

create table if not exists public.portal_events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  category text not null check (char_length(category) between 1 and 60),
  starts_at timestamptz not null,
  time_label text not null check (char_length(time_label) between 1 and 80),
  venue text not null check (char_length(venue) between 1 and 120),
  description text not null check (char_length(description) between 1 and 1000),
  status text not null default 'Upcoming' check (status in ('Upcoming', 'Completed')),
  is_published boolean not null default true,
  wing_id text references public.portal_wings (id) on update cascade on delete set null,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.portal_events enable row level security;
revoke all on public.portal_events from anon, authenticated;
grant select on public.portal_events to anon, authenticated;
grant insert, update, delete on public.portal_events to authenticated;

drop policy if exists "Visitors can view published events" on public.portal_events;
create policy "Visitors can view published events"
  on public.portal_events for select to anon, authenticated
  using (is_published or (select public.is_portal_member()));

drop policy if exists "Union leaders and wing accounts can create events" on public.portal_events;
create policy "Union leaders and wing accounts can create events"
  on public.portal_events for insert to authenticated
  with check (
    (select public.is_portal_member())
    and created_by = (select auth.uid())
    and (
      (wing_id is null and (select public.has_portal_role(array['developer', 'teacher', 'committee'])))
      or (
        wing_id is not null
        and (select public.has_portal_role(array['developer', 'teacher', 'committee', 'wing']))
        and (
          (select public.has_portal_role(array['developer', 'teacher', 'committee']))
          or wing_id = (select public.current_portal_wing())
        )
      )
    )
  );

drop policy if exists "Union leaders and wing accounts can update events" on public.portal_events;
create policy "Union leaders and wing accounts can update events"
  on public.portal_events for update to authenticated
  using (
    (select public.has_portal_role(array['developer', 'teacher', 'committee']))
    or (
      (select public.has_portal_role(array['wing']))
      and wing_id = (select public.current_portal_wing())
    )
  )
  with check (
    (select public.has_portal_role(array['developer', 'teacher', 'committee']))
    or (
      (select public.has_portal_role(array['wing']))
      and wing_id = (select public.current_portal_wing())
    )
  );

drop policy if exists "Union leaders and wing accounts can delete events" on public.portal_events;
create policy "Union leaders and wing accounts can delete events"
  on public.portal_events for delete to authenticated
  using (
    (select public.has_portal_role(array['developer', 'teacher', 'committee']))
    or (
      (select public.has_portal_role(array['wing']))
      and wing_id = (select public.current_portal_wing())
    )
  );

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  message text not null check (char_length(message) between 1 and 1500),
  is_published boolean not null default true,
  wing_id text references public.portal_wings (id) on update cascade on delete set null,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.announcements enable row level security;
revoke all on public.announcements from anon, authenticated;
grant select on public.announcements to anon, authenticated;
grant insert, update, delete on public.announcements to authenticated;

drop policy if exists "Visitors can view published announcements" on public.announcements;
create policy "Visitors can view published announcements"
  on public.announcements for select to anon, authenticated
  using (is_published or (select public.is_portal_member()));

drop policy if exists "Union leaders and wing accounts can create announcements" on public.announcements;
create policy "Union leaders and wing accounts can create announcements"
  on public.announcements for insert to authenticated
  with check (
    (select public.is_portal_member())
    and created_by = (select auth.uid())
    and (
      (wing_id is null and (select public.has_portal_role(array['developer', 'teacher', 'committee'])))
      or (
        wing_id is not null
        and (select public.has_portal_role(array['developer', 'teacher', 'committee', 'wing']))
        and (
          (select public.has_portal_role(array['developer', 'teacher', 'committee']))
          or wing_id = (select public.current_portal_wing())
        )
      )
    )
  );

drop policy if exists "Union leaders and wing accounts can update announcements" on public.announcements;
create policy "Union leaders and wing accounts can update announcements"
  on public.announcements for update to authenticated
  using (
    (select public.has_portal_role(array['developer', 'teacher', 'committee']))
    or (
      (select public.has_portal_role(array['wing']))
      and wing_id = (select public.current_portal_wing())
    )
  )
  with check (
    (select public.has_portal_role(array['developer', 'teacher', 'committee']))
    or (
      (select public.has_portal_role(array['wing']))
      and wing_id = (select public.current_portal_wing())
    )
  );

drop policy if exists "Union leaders and wing accounts can delete announcements" on public.announcements;
create policy "Union leaders and wing accounts can delete announcements"
  on public.announcements for delete to authenticated
  using (
    (select public.has_portal_role(array['developer', 'teacher', 'committee']))
    or (
      (select public.has_portal_role(array['wing']))
      and wing_id = (select public.current_portal_wing())
    )
  );

create table if not exists public.finance_entries (
  id uuid primary key default gen_random_uuid(),
  entry_type text not null check (entry_type in ('income', 'expense')),
  amount numeric(12, 2) not null check (amount > 0),
  category text not null check (char_length(category) between 1 and 80),
  description text not null check (char_length(description) between 1 and 500),
  occurred_on date not null,
  attachment_path text,
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.finance_entries enable row level security;
revoke all on public.finance_entries from anon, authenticated;
grant select on public.finance_entries to authenticated;
grant insert on public.finance_entries to authenticated;
grant update (entry_type, amount, category, description, occurred_on, attachment_path, updated_by, updated_at)
  on public.finance_entries to authenticated;
grant delete on public.finance_entries to authenticated;

drop policy if exists "Approved members can view the finance ledger" on public.finance_entries;
create policy "Approved members can view the finance ledger"
  on public.finance_entries for select to authenticated
  using ((select public.is_portal_member()));

drop policy if exists "Treasurers and developers can add finance entries" on public.finance_entries;
create policy "Treasurers and developers can add finance entries"
  on public.finance_entries for insert to authenticated
  with check (
    (select public.has_portal_role(array['developer', 'treasurer']))
    and created_by = (select auth.uid())
  );

drop policy if exists "Treasurers and developers can update finance entries" on public.finance_entries;
create policy "Treasurers and developers can update finance entries"
  on public.finance_entries for update to authenticated
  using ((select public.has_portal_role(array['developer', 'treasurer'])))
  with check (
    (select public.has_portal_role(array['developer', 'treasurer']))
    and updated_by = (select auth.uid())
  );

drop policy if exists "Treasurers and developers can delete finance entries" on public.finance_entries;
create policy "Treasurers and developers can delete finance entries"
  on public.finance_entries for delete to authenticated
  using ((select public.has_portal_role(array['developer', 'treasurer'])));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'finance-private',
  'finance-private',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.creative_submissions
  add column if not exists attachment_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'student-works-private',
  'student-works-private',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Approved members can upload their own work attachments" on storage.objects;
create policy "Approved members can upload their own work attachments"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'student-works-private'
    and (select public.is_portal_member())
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Members can read published or permitted work attachments" on storage.objects;
create policy "Members can read published or permitted work attachments"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'student-works-private'
    and (select public.is_portal_member())
    and exists (
      select 1 from public.creative_submissions work
      where work.attachment_path = name
        and (
          work.user_id = (select auth.uid())
          or work.status = 'published'
          or (select public.has_portal_role(array['developer', 'teacher', 'committee']))
        )
    )
  );

drop policy if exists "Visitors can read published work attachments" on storage.objects;
create policy "Visitors can read published work attachments"
  on storage.objects for select to anon
  using (
    bucket_id = 'student-works-private'
    and exists (
      select 1 from public.creative_submissions work
      where work.attachment_path = name and work.status = 'published'
    )
  );

drop policy if exists "Members can remove their own work attachments" on storage.objects;
create policy "Members can remove their own work attachments"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'student-works-private'
    and (select public.is_portal_member())
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not exists (
      select 1 from public.creative_submissions work where work.attachment_path = name
    )
  );

drop policy if exists "Approved members can read finance attachments" on storage.objects;
create policy "Approved members can read finance attachments"
  on storage.objects for select to authenticated
  using (bucket_id = 'finance-private' and (select public.is_portal_member()));

drop policy if exists "Treasurers and developers can upload finance attachments" on storage.objects;
create policy "Treasurers and developers can upload finance attachments"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'finance-private'
    and (select public.has_portal_role(array['developer', 'treasurer']))
  );

drop policy if exists "Treasurers and developers can update finance attachments" on storage.objects;
create policy "Treasurers and developers can update finance attachments"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'finance-private'
    and (select public.has_portal_role(array['developer', 'treasurer']))
  )
  with check (
    bucket_id = 'finance-private'
    and (select public.has_portal_role(array['developer', 'treasurer']))
  );

drop policy if exists "Treasurers and developers can delete finance attachments" on storage.objects;
create policy "Treasurers and developers can delete finance attachments"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'finance-private'
    and (select public.has_portal_role(array['developer', 'treasurer']))
  );

drop policy if exists "Students can submit their own suggestions" on public.suggestions;
create policy "Approved members can submit their own suggestions"
  on public.suggestions for insert to authenticated
  with check ((select public.is_portal_member()) and (select auth.uid()) = user_id);

drop policy if exists "Students can view their own suggestions" on public.suggestions;
create policy "Members and union leaders can view suggestions"
  on public.suggestions for select to authenticated
  using (
    (select auth.uid()) = user_id
    or (select public.has_portal_role(array['developer', 'teacher', 'committee']))
  );

drop policy if exists "Students can submit their own creative work" on public.creative_submissions;
create policy "Approved members can submit their own creative work"
  on public.creative_submissions for insert to authenticated
  with check (
    (select public.is_portal_member())
    and (select auth.uid()) = user_id
    and status = 'pending'
    and (
      attachment_path is null
      or (storage.foldername(attachment_path))[1] = (select auth.uid())::text
    )
  );

drop policy if exists "Students can view published work and their own submissions" on public.creative_submissions;
create policy "Members and reviewers can view creative submissions"
  on public.creative_submissions for select to authenticated
  using (
    status = 'published'
    or (select auth.uid()) = user_id
    or (select public.has_portal_role(array['developer', 'teacher', 'committee']))
  );

grant update (status) on public.creative_submissions to authenticated;

drop policy if exists "Reviewers can moderate creative submissions" on public.creative_submissions;
create policy "Reviewers can moderate creative submissions"
  on public.creative_submissions for update to authenticated
  using ((select public.has_portal_role(array['developer', 'teacher', 'committee'])))
  with check ((select public.has_portal_role(array['developer', 'teacher', 'committee'])));
