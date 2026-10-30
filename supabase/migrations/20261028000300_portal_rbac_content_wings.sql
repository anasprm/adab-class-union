-- Migration: 20261028000300_portal_rbac_content_wings.sql
-- Description: Sets up 7 dedicated student wings, dynamic content key-value table,
-- single-use invitation tokens, extended student profiles, and multi-format student works.

-- 1. Ensure 7 dedicated Wings exist
-- Remove the earlier legacy wing ids so the canonical seven can be inserted cleanly.
delete from public.portal_wings
where id not in ('arts', 'sports', 'literary', 'tech', 'social', 'media', 'ethics');

insert into public.portal_wings (id, name, accent, objective, activities, icon)
values
  ('arts', 'Arts & Cultural Wing', 'Creativity', 'Celebrate visual arts, calligraphy, performances, and creative exhibitions across the class community.', array['Visual art & calligraphy workshops', 'Creative exhibitions & gallery walks', 'Inter-house stage & artistic showcase'], '🎨'),
  ('sports', 'Sports & Athletics Club', 'Teamwork', 'Encourage fitness, teamwork, and healthy competition across every house team with inclusive sporting events.', array['Inter-house football & cricket leagues', 'Annual athletics meet', 'Morning fitness & wellness sessions'], '⚽'),
  ('literary', 'Literary & Debating Society', 'Expression', 'Cultivate thoughtful reading, articulate debate, creative writing, and publish the class journal.', array['Weekly book & reading circles', 'Parliamentary debating contests', 'Class magazine editorial desk'], '📖'),
  ('tech', 'Tech & Coding Club', 'Innovation', 'Build digital literacy, develop software projects, and explore coding, AI, and modern web technologies.', array['Web development bootcamps', 'Open-source project showcases', 'Algorithmic puzzle contests'], '💻'),
  ('social', 'Social & Welfare Wing', 'Community', 'Drive student solidarity, mutual peer tutoring, charity drives, and community outreach programs.', array['Peer-to-peer study circles', 'Community outreach & charity drives', 'Student wellbeing & mentoring'], '🤝'),
  ('media', 'Media & IT Wing', 'Communication', 'Document union milestones, manage high-quality photography, and craft official announcements.', array['Milestone photography & videography', 'Poster & visual graphic design', 'Union digital archive management'], '📷'),
  ('ethics', 'Ethics & Moral Values Wing', 'Integrity', 'Promote ethical living, character development, reflective dialogue, and responsible leadership.', array['Character building seminars', 'Ethics & leadership discussion circles', 'Values & integrity dialogues'], '⚖')
on conflict (id) do update set
  name = excluded.name,
  accent = excluded.accent,
  objective = excluded.objective,
  activities = excluded.activities,
  icon = excluded.icon,
  updated_at = now();

-- Update capacity for wings to 7 (in case not set)
update public.portal_role_capacities
set max_active = 7
where role = 'wing';

-- 2. Dynamic Copy & Content Table (Key-Value)
create table if not exists public.portal_content (
  key text primary key check (char_length(key) between 1 and 100),
  value text not null,
  section text not null default 'general' check (char_length(section) between 1 and 60),
  label text not null default '' check (char_length(label) <= 120),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

alter table public.portal_content enable row level security;
revoke all on public.portal_content from anon, authenticated;
grant select on public.portal_content to anon, authenticated;
grant insert, update, delete on public.portal_content to authenticated;

drop policy if exists "Anyone can read portal content" on public.portal_content;
create policy "Anyone can read portal content"
  on public.portal_content for select
  to anon, authenticated
  using (true);

drop policy if exists "Developers can modify portal content" on public.portal_content;
create policy "Developers can modify portal content"
  on public.portal_content for all
  to authenticated
  using ((select public.has_portal_role(array['developer'])))
  with check ((select public.has_portal_role(array['developer'])));

-- Seed default dynamic UI strings
insert into public.portal_content (key, value, section, label)
values
  ('hero_banner_text', 'ADAB Senior Secondary Class Union · Academic Session 2026', 'hero', 'Announcement Banner'),
  ('hero_eyebrow', 'Plus One · Kerala, India', 'hero', 'Hero Eyebrow'),
  ('hero_title', 'A class with a voice.\nA union with a purpose.', 'hero', 'Hero Main Title'),
  ('hero_lead', 'Welcome to the digital home of ADAB Class Union — where we learn together, make things together, and build an inclusive community that empowers every student.', 'hero', 'Hero Description Lead'),
  ('hero_cta_primary', 'Explore What’s On →', 'hero', 'Hero Primary Button Text'),
  ('hero_cta_secondary', 'Meet the Union', 'hero', 'Hero Secondary Button Text'),
  ('about_eyebrow', 'Who We Are', 'about', 'About Eyebrow'),
  ('about_title', 'A union shaped by its students.', 'about', 'About Main Title'),
  ('about_lead', 'ADAB Class Union brings our Plus One class together around academic excellence, artistic expression, digital innovation, and shared solidarity.', 'about', 'About Lead'),
  ('about_section_title', 'More than a calendar of events', 'about', 'About Section Heading'),
  ('about_body_1', 'Our union is a student-led space to share ideas, learn from one another, and make class life richer for everyone. Whether you love the stage, the sports ground, a good book, coding, or working behind the scenes, there is a place to contribute.', 'about', 'About Body Paragraph 1'),
  ('about_body_2', 'We believe a strong class is built through curiosity, respect, and the confidence to try something new. The ADAB portal is where we keep those shared moments and opportunities close at hand.', 'about', 'About Body Paragraph 2'),
  ('about_promise_title', 'Our promise', 'about', 'Promise Box Title'),
  ('about_promise_text', 'Make room for every voice. Learn with humility. Celebrate effort as much as achievement. Leave the class community better than we found it.', 'about', 'Promise Box Text'),
  ('events_eyebrow', 'Save the Date', 'events', 'Events Eyebrow'),
  ('events_title', 'Time well spent, together.', 'events', 'Events Title'),
  ('events_lead', 'See upcoming union gatherings, house competitions, and look back at milestones our class has already shared.', 'events', 'Events Lead'),
  ('wings_eyebrow', 'Find Your Way In', 'wings', 'Wings Eyebrow'),
  ('wings_title', '7 Dedicated Wings. Many ways to belong.', 'wings', 'Wings Title'),
  ('wings_lead', 'Our student wings turn shared passions into practical, welcoming activities. Pick a domain and lead with your perspective.', 'wings', 'Wings Lead'),
  ('works_eyebrow', 'Created in Our Class', 'works', 'Works Eyebrow'),
  ('works_title', 'Ideas deserve a little space.', 'works', 'Works Title'),
  ('works_lead', 'Explore student writing, digital art, coding projects, and creative expressions published by our community.', 'works', 'Works Lead'),
  ('finance_eyebrow', 'Confidential · Verified Members Only', 'finance', 'Finance Eyebrow'),
  ('finance_title', 'Class Union Treasury & Ledger.', 'finance', 'Finance Main Title'),
  ('finance_lead', 'A fully transparent record of collected class funds, operational expenses, budget allocations, and verified invoices.', 'finance', 'Finance Lead'),
  ('footer_tagline', 'A digital home for ideas, friendships, and the next generation of thoughtful leaders.', 'footer', 'Footer Brand Tagline'),
  ('footer_location_title', 'Our Campus', 'footer', 'Footer Location Heading'),
  ('footer_location_body', 'Kerala, India\nRooted in learning. Growing together.', 'footer', 'Footer Location Body'),
  ('footer_copyright', 'ADAB Senior Secondary Class Union. Crafted with care by the student community.', 'footer', 'Footer Copyright Line')
on conflict (key) do nothing;

-- 3. Extend Profiles for Rich Student Profiles
alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists bio text check (bio is null or char_length(bio) <= 600),
  add column if not exists social_links jsonb not null default '{}'::jsonb,
  add column if not exists contact_preferences jsonb not null default '{"show_email": false}'::jsonb;

-- Allow members to update their profile extensions
drop policy if exists "Members can update their own profile" on public.profiles;
create policy "Members can update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()) and is_active)
  with check (id = (select auth.uid()) and is_active);

grant update (display_name, roll_number, house_team, district, avatar_url, bio, social_links, contact_preferences, updated_at)
  on public.profiles to authenticated;

-- 4. Extend Creative Submissions for Art, Projects, and Code
alter table public.creative_submissions
  drop constraint if exists creative_submissions_work_type_check;

alter table public.creative_submissions
  add constraint creative_submissions_work_type_check
  check (work_type in ('Article', 'Poetry', 'Calligraphy', 'Magazine', 'Art', 'Project', 'Code'));

alter table public.creative_submissions
  add column if not exists project_url text check (project_url is null or char_length(project_url) <= 500),
  add column if not exists code_language text check (code_language is null or char_length(code_language) <= 40);

-- 5. Dedicated Single-Use Account Invitations Table (`portal_invites`)
create table if not exists public.portal_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null check (role in ('teacher', 'committee', 'treasurer', 'student', 'wing')),
  wing_id text references public.portal_wings (id) on update cascade on delete set null,
  display_name text not null default '',
  token text not null unique check (char_length(token) between 16 and 128),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked'))
);

alter table public.portal_invites enable row level security;
revoke all on public.portal_invites from anon, authenticated;
grant select, insert, update on public.portal_invites to authenticated;

drop policy if exists "Developers have full control of portal invites" on public.portal_invites;
create policy "Developers have full control of portal invites"
  on public.portal_invites for all to authenticated
  using ((select public.has_portal_role(array['developer'])))
  with check ((select public.has_portal_role(array['developer'])));

-- Safe public invite verification function for the onboarding screen
create or replace function public.verify_portal_invite(token_input text)
returns table (
  is_valid boolean,
  email text,
  role text,
  wing_id text,
  wing_name text,
  display_name text,
  error_message text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  invite_row public.portal_invites%rowtype;
  wing_title text;
begin
  select * into invite_row
  from public.portal_invites
  where token = token_input
  limit 1;

  if not found then
    return query select false, ''::text, ''::text, ''::text, ''::text, ''::text, 'Invalid or non-existent invitation token.'::text;
    return;
  end if;

  if invite_row.status = 'revoked' then
    return query select false, invite_row.email, invite_row.role, invite_row.wing_id, ''::text, invite_row.display_name, 'This invitation has been revoked by the administrator.'::text;
    return;
  end if;

  if invite_row.status = 'accepted' or invite_row.used_at is not null then
    return query select false, invite_row.email, invite_row.role, invite_row.wing_id, ''::text, invite_row.display_name, 'This invitation link has already been used.'::text;
    return;
  end if;

  if invite_row.expires_at < now() then
    return query select false, invite_row.email, invite_row.role, invite_row.wing_id, ''::text, invite_row.display_name, 'This invitation token has expired.'::text;
    return;
  end if;

  if invite_row.wing_id is not null then
    select name into wing_title from public.portal_wings where id = invite_row.wing_id;
  end if;

  return query select true, invite_row.email, invite_row.role, invite_row.wing_id, coalesce(wing_title, '')::text, invite_row.display_name, ''::text;
end;
$$;

revoke all on function public.verify_portal_invite(text) from public;
grant execute on function public.verify_portal_invite(text) to anon, authenticated;

-- 6. Budget Allocations Table for Treasury
create table if not exists public.budget_allocations (
  id uuid primary key default gen_random_uuid(),
  category text not null unique check (char_length(category) between 1 and 80),
  allocated_amount numeric(12, 2) not null check (allocated_amount >= 0),
  description text not null default '' check (char_length(description) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.budget_allocations enable row level security;
revoke all on public.budget_allocations from anon, authenticated;
grant select on public.budget_allocations to authenticated;
grant insert, update, delete on public.budget_allocations to authenticated;

drop policy if exists "Approved members can view budget allocations" on public.budget_allocations;
create policy "Approved members can view budget allocations"
  on public.budget_allocations for select to authenticated
  using ((select public.is_portal_member()));

drop policy if exists "Treasurers and developers can manage budget allocations" on public.budget_allocations;
create policy "Treasurers and developers can manage budget allocations"
  on public.budget_allocations for all to authenticated
  using ((select public.has_portal_role(array['developer', 'treasurer'])))
  with check ((select public.has_portal_role(array['developer', 'treasurer'])));

-- Seed default initial budgets
insert into public.budget_allocations (category, allocated_amount, description)
values
  ('Events & Festivities', 25000.00, 'Flagship Union Fest, stage setup, audio, lighting, and guest honorariums'),
  ('Sports Equipment & Meets', 15000.00, 'Football, cricket, athletics gear, field marking, and match prizes'),
  ('Arts & Creative Showcase', 10000.00, 'Art supplies, calligraphy materials, exhibition boards, and framing'),
  ('Literary & Class Magazine', 12000.00, 'Printing of ADAB Journal Issue 01, debate trophies, and library books'),
  ('Tech & Digital Infrastructure', 8000.00, 'Web hosting, digital certificates, domain registration, and workshop kits'),
  ('Refreshments & Hospitality', 10000.00, 'Snacks and beverages for union meetings and student assemblies')
on conflict (category) do nothing;
