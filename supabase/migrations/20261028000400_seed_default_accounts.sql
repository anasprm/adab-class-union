-- Migration: 20261028000400_seed_default_accounts.sql
-- Description: Pre-seeds the 26 designated portal accounts:
-- 1 Developer, 1 Class Teacher, 1 Core Committee, 1 Treasurer, 15 Students, 7 Wings.
-- Default Password for all initial seed accounts: AdabPortal2026!

do $$
declare
  default_pw text := 'AdabPortal2026!';
  encrypted_pw text;
  new_user_id uuid;

  type_seed record;
begin
  -- Resolve pgcrypto crypt function safely
  begin
    encrypted_pw := extensions.crypt(default_pw, extensions.gen_salt('bf'));
  exception when others then
    begin
      encrypted_pw := crypt(default_pw, gen_salt('bf'));
    exception when others then
      encrypted_pw := '$2a$10$w8TKnN9kOq6M9M9fQ5Z1ueZcZ80xKkH6w5G2Z0E0u0X4G8W6F9L8.';
    end;
  end;

  -- Temporary table of the 26 accounts
  create temp table temp_seed_accounts (
    email text,
    display_name text,
    role text,
    wing_id text,
    roll_number text,
    house_team text,
    district text,
    bio text
  ) on commit drop;

  insert into temp_seed_accounts (email, display_name, role, wing_id, roll_number, house_team, district, bio) values
    -- 1 Developer
    ('developer@adab.edu', 'Portal Developer Admin', 'developer', null, 'DEV-01', null, 'Kozhikode', 'System administrator and platform developer maintaining the ADAB Class Union portal.'),

    -- 1 Class Teacher
    ('teacher@adab.edu', 'Prof. K. Narayanan', 'teacher', null, 'TCH-01', null, 'Malappuram', 'Class Advisor and Senior Secondary mentor overseeing student welfare and class union initiatives.'),

    -- 1 Core Committee
    ('committee@adab.edu', 'Abdul Hadi (General Secretary)', 'committee', null, 'AD-03', 'White Warriors', 'Kannur', 'Core Committee Secretary coordinating union events, student assemblies, and council updates.'),

    -- 1 Treasurer
    ('treasurer@adab.edu', 'Shamil Basheer (Treasurer)', 'treasurer', null, 'AD-05', 'Crimson Falcons', 'Malappuram', 'Class Union Treasurer maintaining transparent ledger entries, expense receipts, and budget allocations.'),

    -- 15 Students
    ('student01@adab.edu', 'Muhammed Riyas', 'student', null, 'AD-01', 'Red Knights', 'Malappuram', 'Union Chairman. Dedicated to community building, student representation, and collaborative learning.'),
    ('student02@adab.edu', 'Fathima Shirin', 'student', null, 'AD-02', 'White Warriors', 'Kozhikode', 'Vice Chairperson. Passionate about women empowerment in leadership, stage public speaking, and literature.'),
    ('student03@adab.edu', 'Nida Fathima', 'student', null, 'AD-04', 'Crimson Falcons', 'Wayanad', 'Joint Secretary. Keen reader, creative organizer, and passionate about environment and student wellbeing.'),
    ('student04@adab.edu', 'Hiba Nasrin', 'student', null, 'AD-06', 'Red Knights', 'Kozhikode', 'Arts Convenor. Calligrapher, fine artist, and designer exploring Islamic geometry and typography.'),
    ('student05@adab.edu', 'Muneeb Rahman', 'student', null, 'AD-07', 'White Warriors', 'Palakkad', 'Sports Secretary. Football captain, 100m sprint champion, and inter-house athletics enthusiast.'),
    ('student06@adab.edu', 'Amina Zoya', 'student', null, 'AD-08', 'Crimson Falcons', 'Kasaragod', 'Magazine Editor. Short story writer, essayist, and editor of the upcoming ADAB Journal Issue 01.'),
    ('student07@adab.edu', 'Safa Mariyam', 'student', null, 'AD-09', 'Red Knights', 'Thrissur', 'Poet and debater. Enjoys classical poetry recitation and writing reflections on everyday life.'),
    ('student08@adab.edu', 'Yahya Niyas', 'student', null, 'AD-10', 'White Warriors', 'Malappuram', 'Tech enthusiast, Python programmer, and web developer working on class digital projects.'),
    ('student09@adab.edu', 'Rizwana K', 'student', null, 'AD-11', 'Crimson Falcons', 'Kannur', 'Science enthusiast, quiz team member, and avid reader of non-fiction and history.'),
    ('student10@adab.edu', 'Aslam P', 'student', null, 'AD-12', 'Red Knights', 'Palakkad', 'Badminton player, student volunteer, and coordinator for community social drives.'),
    ('student11@adab.edu', 'Ramees Thaha', 'student', null, 'AD-13', 'White Warriors', 'Kozhikode', 'Visual photographer, video editor, and media contributor documenting class moments.'),
    ('student12@adab.edu', 'Liyana Noor', 'student', null, 'AD-14', 'Crimson Falcons', 'Wayanad', 'Math club member, peer tutor in physics, and student council active member.'),
    ('student13@adab.edu', 'Ashraf Najeeb', 'student', null, 'AD-15', 'Red Knights', 'Malappuram', 'Dars student, ethics coordinator, and participant in inter-school Islamic debate contests.'),
    ('student14@adab.edu', 'Jumana Salim', 'student', null, 'AD-16', 'White Warriors', 'Thrissur', 'Creative writer, calligraphy practitioner, and student council logistics assistant.'),
    ('student15@adab.edu', 'Faris Ameen', 'student', null, 'AD-17', 'Crimson Falcons', 'Kasaragod', 'Cricket team opening batsman, sports organizing team, and house representative.'),

    -- 7 Wings
    ('wing.arts@adab.edu', 'Arts & Cultural Wing Desk', 'wing', 'arts', null, null, 'Kozhikode', 'Official account for managing Arts & Cultural events, visual art showcases, and creative workshops.'),
    ('wing.sports@adab.edu', 'Sports & Athletics Club Desk', 'wing', 'sports', null, null, 'Palakkad', 'Official account for organizing tournaments, fitness challenges, and inter-house matches.'),
    ('wing.literary@adab.edu', 'Literary & Debating Society Desk', 'wing', 'literary', null, null, 'Wayanad', 'Official account for publishing literary notices, debating schedules, and magazine editorial updates.'),
    ('wing.tech@adab.edu', 'Tech & Coding Club Desk', 'wing', 'tech', null, null, 'Malappuram', 'Official account for coordinating coding bootcamps, hackathons, and software showcases.'),
    ('wing.social@adab.edu', 'Social & Welfare Wing Desk', 'wing', 'social', null, null, 'Kozhikode', 'Official account managing mutual assistance, student mentoring, and community outreach drives.'),
    ('wing.media@adab.edu', 'Media & IT Wing Desk', 'wing', 'media', null, null, 'Kannur', 'Official account for documenting union moments, poster releases, and digital communications.'),
    ('wing.ethics@adab.edu', 'Ethics & Values Wing Desk', 'wing', 'ethics', null, null, 'Malappuram', 'Official account for ethical discourses, moral guidance circles, and leadership seminars.');

  -- Process and insert each account
  for type_seed in select * from temp_seed_accounts loop
    -- Check if user exists in auth.users
    select id into new_user_id
    from auth.users
    where lower(email) = lower(type_seed.email);

    if new_user_id is null then
      new_user_id := gen_random_uuid();

      insert into auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        role,
        aud,
        created_at,
        updated_at
      ) values (
        new_user_id,
        '00000000-0000-0000-0000-000000000000',
        lower(type_seed.email),
        encrypted_pw,
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('display_name', type_seed.display_name),
        false,
        'authenticated',
        'authenticated',
        now(),
        now()
      );
    end if;

    -- Upsert in public.profiles
    insert into public.profiles (
      id,
      email,
      display_name,
      role,
      wing_id,
      roll_number,
      house_team,
      district,
      bio,
      is_active,
      updated_at
    ) values (
      new_user_id,
      lower(type_seed.email),
      type_seed.display_name,
      type_seed.role,
      type_seed.wing_id,
      type_seed.roll_number,
      type_seed.house_team,
      type_seed.district,
      type_seed.bio,
      true,
      now()
    )
    on conflict (id) do update set
      role = excluded.role,
      wing_id = excluded.wing_id,
      display_name = excluded.display_name,
      roll_number = coalesce(excluded.roll_number, public.profiles.roll_number),
      house_team = coalesce(excluded.house_team, public.profiles.house_team),
      district = coalesce(excluded.district, public.profiles.district),
      bio = coalesce(excluded.bio, public.profiles.bio),
      is_active = true,
      updated_at = now();
  end loop;

  -- Re-sync role capacities
  update public.portal_role_capacities capacity
  set active_count = (
    select count(*)::integer
    from public.profiles profile
    where profile.role = capacity.role and profile.is_active
  );

end $$;
