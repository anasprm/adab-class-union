-- Add the eighth wing card (PKV) and refresh the wings section copy.
insert into public.portal_wings (id, name, accent, objective, activities, icon)
values (
  'pkv',
  'PKV',
  'PKV',
  'A dedicated wing for PKV programmes, peer collaboration, and class-wide participation.',
  array['Weekly PKV sessions', 'Inter-house PKV competitions', 'Student-led PKV projects'],
  '🎯'
)
on conflict (id) do nothing;

update public.portal_content
set value = '8 Dedicated Wings. Many ways to belong.'
where key = 'wings_title';
