alter table public.program_posters
  alter column poster_path drop not null,
  add column video_path text unique,
  add constraint program_posters_one_media_check
    check (num_nonnulls(poster_path, video_path) = 1);

update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array[
      'image/jpeg',
      'image/png',
      'image/webp',
      'video/mp4',
      'video/webm'
    ]
where id = 'program-posters';
