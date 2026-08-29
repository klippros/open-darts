# Supabase and deployment setup

Open Darts works without Supabase. When the two public Supabase environment
variables are absent, users remain anonymous and completed games stay in their
browser.

## Create a Supabase project

Create a project at [supabase.com](https://supabase.com).

## Apply the database migration

Link the Supabase cli and run `supabase db push` to apply all migrations.

## Configure authentication

In **Authentication → URL Configuration**, set the production Site URL like:

```text
https://klippros.com/tools/open-darts/
```

Add these redirect URLs:

```text
http://localhost:5173/tools/open-darts/auth/callback
https://klippros.com/tools/open-darts/auth/callback
```

For another deployment, replace the production origin and keep the
`/tools/open-darts/auth/callback` path.

### Email

Enable the Email provider. Open Darts uses `signInWithOtp`, so users receive a
magic link and never create a password.

### Google

1. Create a Web OAuth client in Google Cloud.
2. Add Supabase's callback URL as an authorized redirect URI:

   ```text
   https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
   ```

3. Put the Google client ID and secret in the Supabase Google provider settings.

Google credentials are secrets and must not be committed to this repository.

## Local development

Copy `.env.example` to `.env` and fill in the Project URL and publishable
key from **Project Settings → API**:

```text
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_KEY
```

These values are public and are included in the browser bundle.

Then run:

```bash
pnpm install
pnpm dev
```
