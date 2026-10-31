-- Magazines & newspapers submitted by the class.
-- Members submit issues; the union council reviews and publishes them so the
-- whole class (including signed-out visitors) can browse the archive.

create table if not exists public.press_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  submitter_name text not null default 'ADAB member' check (char_length(submitter_name) between 1 and 80),
  title text not null check (char_length(title) between 1 and 120),
  publication_type text not null check (publication_type in ('Magazine', 'Newspaper')),
  edition text not null default '' check (char_length(edition) <= 80),
  published_on date,
  summary text not null check (char_length(summary) between 1 and 300),
  content text check (char_length(content) <= 20000),
  external_url text check (external_url is null or external_url ~ '^https?://'),
  cover_path text,
  document_path text,
  status text not null default 'pending' check (status in ('pending', 'published', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null
);

create index if not exists press_submissions_status_idx
  on public.press_submissions (status, published_on desc nulls last, created_at desc);
create index if not exists press_submissions_user_idx
  on public.press_submissions (user_id);

alter table public.press_submissions enable row level security;

revoke all on table public.press_submissions from anon, authenticated;
grant insert, select on table public.press_submissions to authenticated;
grant select on table public.press_submissions to anon;
grant update on table public.press_submissions to authenticated;
grant delete on table public.press_submissions to authenticated;

drop policy if exists "Members can submit magazines and newspapers" on public.press_submissions;
create policy "Members can submit magazines and newspapers"
  on public.press_submissions
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and status = 'pending'
  );

drop policy if exists "Members can read published press and their own submissions" on public.press_submissions;
create policy "Members can read published press and their own submissions"
  on public.press_submissions
  for select
  to authenticated
  using (
    status = 'published'
    or user_id = (select auth.uid())
    or (select public.has_portal_role(array['developer', 'teacher', 'committee']))
  );

drop policy if exists "Visitors can read published press" on public.press_submissions;
create policy "Visitors can read published press"
  on public.press_submissions
  for select
  to anon
  using (status = 'published');

drop policy if exists "Council can moderate press submissions" on public.press_submissions;
create policy "Council can moderate press submissions"
  on public.press_submissions
  for update
  to authenticated
  using ((select public.has_portal_role(array['developer', 'teacher', 'committee'])))
  with check ((select public.has_portal_role(array['developer', 'teacher', 'committee'])));

drop policy if exists "Developers can remove press submissions" on public.press_submissions;
create policy "Developers can remove press submissions"
  on public.press_submissions
  for delete
  to authenticated
  using ((select public.has_portal_role(array['developer'])));

-- Cover images and issue PDFs live in a private bucket. Signed links are
-- created on demand for published issues and for a member's own submissions.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'press-private',
  'press-private',
  false,
  15728640,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 15728640,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Members can upload press files" on storage.objects;
create policy "Members can upload press files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'press-private'
    and (select public.is_portal_member())
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Members can read published press files and their own" on storage.objects;
create policy "Members can read published press files and their own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'press-private'
    and (select public.is_portal_member())
    and exists (
      select 1 from public.press_submissions press
      where (press.cover_path = name or press.document_path = name)
        and (
          press.user_id = (select auth.uid())
          or press.status = 'published'
          or (select public.has_portal_role(array['developer', 'teacher', 'committee']))
        )
    )
  );

drop policy if exists "Visitors can read published press files" on storage.objects;
create policy "Visitors can read published press files"
  on storage.objects for select to anon
  using (
    bucket_id = 'press-private'
    and exists (
      select 1 from public.press_submissions press
      where (press.cover_path = name or press.document_path = name)
        and press.status = 'published'
    )
  );

drop policy if exists "Members can remove their own unused press files" on storage.objects;
create policy "Members can remove their own unused press files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'press-private'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not exists (
      select 1 from public.press_submissions press
      where press.cover_path = name or press.document_path = name
    )
  );

drop policy if exists "Developers can remove press files" on storage.objects;
create policy "Developers can remove press files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'press-private'
    and (select public.has_portal_role(array['developer']))
  );

comment on table public.press_submissions is
  'Magazine and newspaper issues submitted by ADAB members for union review.';