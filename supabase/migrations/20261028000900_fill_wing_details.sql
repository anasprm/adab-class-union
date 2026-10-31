-- Fill in proper names, short labels, icons, descriptions and activities for
-- every wing after the manual rename pass in the admin console.

update public.portal_wings set
  name = 'Arabic Wing',
  accent = 'Arabic',
  icon = '📜',
  objective = 'Celebrate the Arabic language through recitation, calligraphy, and spoken-word programmes that deepen understanding of its heritage.',
  activities = array[
    'Quranic recitation and tajweed circles',
    'Arabic calligraphy workshops',
    'Arabic elocution and debate sessions'
  ]
where id = 'ethics';

update public.portal_wings set
  name = 'English Wing',
  accent = 'English',
  icon = '🎭',
  objective = 'Build confidence and fluency in English through speaking, writing, and stage programmes that sharpen expression and critical thinking.',
  activities = array[
    'Public speaking and elocution contests',
    'Creative writing and essay circles',
    'English drama and debate meets'
  ]
where id = 'arts';

update public.portal_wings set
  name = 'Library Wing',
  accent = 'Library',
  icon = '📖',
  objective = 'Keep the class reading culture alive with a well-kept library, reading circles, and quiet spaces for study and reflection.',
  activities = array[
    'Weekly reading circles and book talks',
    'Library catalogue and lending desk',
    'Reading challenges and author spotlights'
  ]
where id = 'literary';

update public.portal_wings set
  name = 'Malayalam Wing',
  accent = 'Malayalam',
  icon = '🌴',
  objective = 'Honour Malayalam language and literature through poetry, storytelling, and cultural programmes rooted in our heritage.',
  activities = array[
    'Malayalam poetry recitation',
    'Storytelling and kathaprasangam evenings',
    'Malayalam quiz and literary meets'
  ]
where id = 'media';

update public.portal_wings set
  name = 'Science Wing',
  accent = 'Science',
  icon = '🔬',
  objective = 'Encourage curiosity and scientific thinking through experiments, exhibitions, and hands-on explorations of how the world works.',
  activities = array[
    'Science exhibition projects',
    'Lab experiments and demonstrations',
    'Science quiz and astronomy nights'
  ]
where id = 'tech';

update public.portal_wings set
  name = 'Sports & Athletics Club',
  accent = 'Teamwork',
  icon = '⚽',
  objective = 'Encourage fitness, teamwork, and healthy competition across every house team with inclusive sporting events.',
  activities = array[
    'Inter-house football and cricket leagues',
    'Annual athletics meet and sprint cups',
    'Morning fitness and wellness sessions'
  ]
where id = 'sports';

update public.portal_wings set
  name = 'Urdu Wing',
  accent = 'Urdu',
  icon = '✒️',
  objective = 'Promote Urdu language and literature through poetry, prose, and cultural expression that connects students to its rich tradition.',
  activities = array[
    'Urdu poetry (mushaira) evenings',
    'Urdu handwriting and calligraphy',
    'Urdu elocution and debate'
  ]
where id = 'social';

update public.portal_wings set
  name = 'PKV',
  accent = 'PKV',
  icon = '🎯',
  objective = 'Coordinate PKV programmes, peer collaboration, and class-wide participation across the union.',
  activities = array[
    'Weekly PKV sessions',
    'Inter-house PKV competitions',
    'Student-led PKV projects'
  ]
where id = 'pkv';
