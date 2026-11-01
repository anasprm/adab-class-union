-- Students submit outreach programmes for private evidence review and publication on acceptance.
create table if not exists public.outreach_program_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  program_date date not null,
  venue text not null check (char_length(venue) between 1 and 120),
  description text not null check (char_length(description) between 1 and 1000),
  evidence_path text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null
);

create index if not exists outreach_program_requests_user_idx
  on public.outreach_program_requests (user_id, created_at desc);
create index if not exists outreach_program_requests_pending_idx
  on public.outreach_program_requests (created_at)
  where status = 'pending';

alter table public.outreach_program_requests enable row level security;
revoke all on public.outreach_program_requests from anon, authenticated;
grant select, insert on public.outreach_program_requests to authenticated;
grant update (status, reviewed_at, reviewed_by) on public.outreach_program_requests to authenticated;

drop policy if exists "Students can submit their own outreach programme requests" on public.outreach_program_requests;
create policy "Students can submit their own outreach programme requests"
  on public.outreach_program_requests for insert to authenticated
  with check (
    (select public.has_portal_role(array['student']))
    and user_id = (select auth.uid())
    and status = 'pending'
    and reviewed_at is null
    and reviewed_by is null
    and (
      evidence_path is null
      or (storage.foldername(evidence_path))[1] = (select auth.uid())::text
    )
  );

drop policy if exists "Students and developers can view outreach programme requests" on public.outreach_program_requests;
create policy "Students and developers can view outreach programme requests"
  on public.outreach_program_requests for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.has_portal_role(array['developer']))
  );

drop policy if exists "Developers can review outreach programme requests" on public.outreach_program_requests;
create policy "Developers can review outreach programme requests"
  on public.outreach_program_requests for update to authenticated
  using (
    status = 'pending'
    and (select public.has_portal_role(array['developer']))
  )
  with check (
    status in ('accepted', 'rejected')
    and reviewed_at is not null
    and reviewed_by = (select auth.uid())
    and (select public.has_portal_role(array['developer']))
  );

create or replace view public.accepted_outreach_programs
with (security_barrier = true)
as
  select id, title, program_date, venue, description, created_at
  from public.outreach_program_requests
  where status = 'accepted';

grant select on public.accepted_outreach_programs to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'outreach-evidence',
  'outreach-evidence',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Students can upload their own outreach evidence" on storage.objects;
create policy "Students can upload their own outreach evidence"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'outreach-evidence'
    and (select public.has_portal_role(array['student']))
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Students and developers can read linked outreach evidence" on storage.objects;
create policy "Students and developers can read linked outreach evidence"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'outreach-evidence'
    and exists (
      select 1 from public.outreach_program_requests request
      where request.evidence_path = name
        and (
          request.user_id = (select auth.uid())
          or (select public.has_portal_role(array['developer']))
        )
    )
  );

drop policy if exists "Students can remove unused outreach evidence" on storage.objects;
create policy "Students can remove unused outreach evidence"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'outreach-evidence'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not exists (
      select 1 from public.outreach_program_requests request
      where request.evidence_path = name
    )
  );

drop policy if exists "Developers can remove outreach evidence" on storage.objects;
create policy "Developers can remove outreach evidence"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'outreach-evidence'
    and (select public.has_portal_role(array['developer']))
  );

comment on table public.outreach_program_requests is
  'Student outreach programme submissions awaiting developer acceptance or rejection.';
