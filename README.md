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
2. In the Supabase SQL Editor, run [`supabase/migrations/20261028000100_portal_submissions.sql`](./supabase/migrations/20261028000100_portal_submissions.sql).
3. In **Project Settings → API**, copy the project URL and publishable key into `.env.local`:

   ```dotenv
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   ```

4. Configure the project's Auth URL settings to include `https://adab-class-union.vercel.app/**`, `http://localhost:5173/**`, and `http://127.0.0.1:5173/**`. Password-reset emails return to the portal's `#login` route.
5. Enable email confirmation in Auth if desired. The app handles the confirmation-email flow.

The migration enables Row Level Security on both submission tables. Students can only submit rows tied to their own authenticated user ID and can only read their own private suggestions/submissions. Public visitors can read only creative works the council has explicitly published. Never put a Supabase `service_role` or secret key in this frontend, a `VITE_` variable, or Git.

### Review student work

New creative work is private with `status = 'pending'`. A council member can review submissions in the Supabase table editor. To publish an approved item, update its status to `published`; published pieces then appear in the public Works page. Suggestions are private to the submitting student and the council's authenticated Supabase dashboard users.

## Deploy to Vercel

The repository is a Vite static site; Vercel builds it with `npm run build` and serves `dist`.

1. Import the GitHub repository into Vercel.
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to the Vercel project's Production and Preview environment settings.
3. Redeploy after setting or changing these values; Vite embeds public client configuration at build time.
4. Add the deployed domain to Supabase Auth's allowed redirect URLs.

The publishable/anon key is intended for browser use and is not a password. Database access is restricted by the migration's RLS policies.

## Data note

The names, events, and creative works in `js/data.js` are demonstration content. Replace or verify them before using this portal with a real class. Do not publish real student contact details without permission.
