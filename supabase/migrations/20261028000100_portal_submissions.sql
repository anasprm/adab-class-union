create table if not exists public.suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  message text not null check (char_length(message) between 5 and 2000),
  created_at timestamptz not null default now()
);

alter table public.suggestions enable row level security;

revoke all on table public.suggestions from anon, authenticated;
grant insert, select on table public.suggestions to authenticated;

create policy "Students can submit their own suggestions"
  on public.suggestions
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Students can view their own suggestions"
  on public.suggestions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create table if not exists public.creative_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  author_name text not null check (char_length(author_name) between 1 and 80),
  work_type text not null check (work_type in ('Article', 'Poetry', 'Calligraphy', 'Magazine')),
  excerpt text not null check (char_length(excerpt) between 1 and 180),
  content text not null check (char_length(content) between 1 and 5000),
  status text not null default 'pending' check (status in ('pending', 'published', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.creative_submissions enable row level security;

revoke all on table public.creative_submissions from anon, authenticated;
grant insert, select on table public.creative_submissions to authenticated;

create policy "Students can submit their own creative work"
  on public.creative_submissions
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and status = 'pending'
  );

create policy "Students can view published work and their own submissions"
  on public.creative_submissions
  for select
  to authenticated
  using (
    status = 'published'
    or (select auth.uid()) = user_id
  );

grant select on table public.creative_submissions to anon;

create policy "Visitors can view published creative work"
  on public.creative_submissions
  for select
  to anon
  using (status = 'published');
