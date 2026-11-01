alter table public.program_posters
  add column if not exists is_highlight boolean not null default false;
