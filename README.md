# ADAB Class Union

A responsive student-union portal built with vanilla JavaScript, Vite, and Supabase.

## Run locally

1. Install Node.js 20.19+ or 22.12+.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env.local` and add your Supabase project URL and **publishable** key (the legacy anon key is also supported).
4. Run `npm run dev`.

The site can build without Supabase credentials, but account and submission features remain disabled until a project is configured.

## Connect Supabase

1. Create a Supabase project in the account that will own the student data.
2. In the Supabase SQL Editor, run the migrations in order:
   - [`supabase/migrations/20261028000100_portal_submissions.sql`](./supabase/migrations/20261028000100_portal_submissions.sql)
   - [`supabase/migrations/20261028000200_portal_roles_finance.sql`](./supabase/migrations/20261028000200_portal_roles_finance.sql)
3. In **Project Settings → API**, copy the project URL and publishable key into `.env.local`:

   ```dotenv
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   ```

4. Configure the project's Auth URL settings to include `https://adab-class-union.vercel.app/**`, `http://localhost:5173/**`, and `http://127.0.0.1:5173/**`. Password-reset emails return to the portal's `#login` route.
5. Invitation and password-reset links return to the portal's `#login` route. Account registration is restricted to developer-sent invitations.

The role migration enables Row Level Security for profiles, events, announcements, and the finance ledger. Database-enforced account limits are one teacher, one core committee account, one treasurer, 15 students, seven wing accounts, and one developer; only active portal members can read financial entries or attachments. Visitors and signed-in accounts without an assigned role cannot access finance. Only a treasurer or developer can create, edit, or remove finance entries. Creative work and suggestions can be submitted only by approved accounts; the teacher, core committee, and developer can review them. Public visitors can read only creative works and announcements that have been published. Never put a Supabase `service_role` or secret key in this frontend, a `VITE_` variable, or Git.

### Bootstrap the developer and enable invitations

The portal is invite-only. Create the first developer user in **Supabase → Authentication → Users** and send that person an invitation. After confirming the exact account email, run this once in the SQL Editor, replacing the example address with that account's email:

```sql
insert into public.profiles (id, email, display_name, role)
select
  id,
  lower(email),
  left(coalesce(nullif(raw_user_meta_data ->> 'display_name', ''), split_part(email, '@', 1)), 80),
  'developer'
from auth.users
where lower(email) = lower('developer@example.com')
on conflict (id) do update
set role = 'developer', is_active = true, updated_at = now();
```

Deploy the account invitation function from a machine authenticated with the Supabase CLI:

```powershell
supabase link --project-ref jqgcjrlhjoyjxmtzzxxg
supabase secrets set PORTAL_SITE_URL=https://adab-class-union.vercel.app
supabase functions deploy invite-user
```

Supabase supplies the function's `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` server-side. Do not copy the service-role key into Vercel or the frontend. Add the production site and local development URLs to Supabase Auth's allowed redirect URLs so invitation and password-reset links return to the portal.

The developer signs in and opens **Manage portal** to invite individual accounts and assign roles. The invitation screen allows one teacher, one core committee account, one treasurer, 15 students, and 7 wing accounts. Wing accounts can be assigned to any of the four current wings. Developer access is bootstrapped separately and cannot be granted from the invitation screen. Suspend an account from the roster to revoke its portal access.

The developer can edit wing names, descriptions, labels, icons, and activities in **Manage portal**. Those values are stored in Supabase and used across the Wings page, announcements, and wing-account assignments.

### Review student work

New creative work is private with `status = 'pending'`. The teacher, core committee, and developer can review submissions from the member account page and publish or decline them. Suggestions remain private to the submitting student and approved union reviewers.

## Deploy to Vercel

The repository is a Vite static site; Vercel builds it with `npm run build` and serves `dist`.

1. Import the GitHub repository into Vercel.
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to the Vercel project's Production and Preview environment settings.
3. Redeploy after setting or changing these values; Vite embeds public client configuration at build time.
4. Add the deployed domain to Supabase Auth's allowed redirect URLs.

The publishable/anon key is intended for browser use and is not a password. Database access is restricted by the migration's RLS policies.

## Data note

The names, events, and creative works in `js/data.js` are demonstration content. Replace or verify them before using this portal with a real class. Do not publish real student contact details without permission.
