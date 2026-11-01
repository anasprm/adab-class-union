create table if not exists public.program_posters (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  category text not null check (char_length(category) between 1 and 60),
  starts_at timestamptz not null,
  time_label text not null check (char_length(time_label) between 1 and 80),
  venue text not null check (char_length(venue) between 1 and 120),
  description text not null check (char_length(description) between 1 and 1000),
  wing_id text references public.portal_wings (id) on update cascade on delete set null,
  poster_path text not null unique,
  first_prize text not null check (char_length(first_prize) between 1 and 120),
  second_prize text not null check (char_length(second_prize) between 1 and 120),
  third_prize text not null check (char_length(third_prize) between 1 and 120),
  is_published boolean not null default true check (is_published),
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now()
);

alter table public.program_posters enable row level security;
revoke all on public.program_posters from public, anon, authenticated;
grant select on public.program_posters to anon, authenticated;
grant insert on public.program_posters to authenticated;

create policy "Visitors can view published program posters"
  on public.program_posters for select to anon, authenticated
  using (is_published);

create policy "Developer committee and wing accounts can publish posters"
  on public.program_posters for insert to authenticated
  with check (
    is_published
    and created_by = (select auth.uid())
    and (select public.is_portal_member())
    and (
      (select public.has_portal_role(array['developer', 'committee']))
      or (
        (select public.has_portal_role(array['wing']))
        and wing_id = (select public.current_portal_wing())
      )
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'program-posters',
  'program-posters',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Program publishers can upload their posters" on storage.objects;
create policy "Program publishers can upload their posters"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'program-posters'
    and (select public.is_portal_member())
    and (select public.has_portal_role(array['developer', 'committee', 'wing']))
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Program publishers can remove their own posters" on storage.objects;
create policy "Program publishers can remove their own posters"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'program-posters'
    and (select public.is_portal_member())
    and (select public.has_portal_role(array['developer', 'committee', 'wing']))
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
