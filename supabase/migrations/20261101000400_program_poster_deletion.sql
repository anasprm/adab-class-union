grant delete on public.program_posters to authenticated;

drop policy if exists "Developers can delete program posters" on public.program_posters;
create policy "Developers can delete program posters"
  on public.program_posters for delete to authenticated
  using (
    (select public.is_portal_member())
    and (select public.has_portal_role(array['developer']))
  );

drop policy if exists "Developers can remove any program media" on storage.objects;
create policy "Developers can remove any program media"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'program-posters'
    and (select public.is_portal_member())
    and (select public.has_portal_role(array['developer']))
  );
