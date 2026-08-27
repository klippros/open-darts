# Supabase and deployment setup

Open Darts works without Supabase. When the two public Supabase environment
variables are absent, users remain anonymous and completed games stay in their
browser.

## Create a Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Choose a region near your users.
3. Generate a strong database password and store it in a password manager. The
   browser application never uses this password.
4. Keep **Enable Data API** and **Enable automatic RLS** enabled.
5. Disable **Automatically expose new tables**. The migration grants only the
   required permissions.

Connecting the Supabase project to GitHub is optional. Database schema and
authorization policies are versioned in `supabase/migrations`.

## Apply the database migration

Run `supabase/migrations/0001_profiles_and_sessions.sql` in the Supabase SQL
Editor. Alternatively, link the Supabase CLI and run `supabase db push`.

The migration creates:

- `profiles`, keyed by the Supabase Auth user ID.
- `game_sessions`, containing completed game-session documents.
- Row Level Security policies that restrict every operation to `auth.uid()`.
- A trigger that creates a profile from trusted Auth metadata.

Both tables have RLS enabled. Anonymous users have no table privileges.
Authenticated users can read and update only their own profile and can read,
insert, update, or delete only their own game sessions. The browser supplies its
session token; Supabase verifies it and `auth.uid()` enforces ownership. Session
upserts call a security-invoker database function that derives `user_id` from
`auth.uid()` rather than accepting it from the browser.

## Configure authentication

In **Authentication → URL Configuration**, set the production Site URL:

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
(`anon`) key from **Project Settings → API**:

```text
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_KEY
```

These values are public and are included in the browser bundle. RLS protects the
data. Never put the `service_role` key, database password, JWT secret, or Google
secret in a Vite variable.

Then run:

```bash
pnpm install
pnpm dev
```

## Cloudflare deployment

Keep the existing Cloudflare build-and-publish flow. Configure
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as build environment variables
for the Worker that builds `master`. Vite inlines them during `pnpm build`; they
are not runtime Worker secrets.

The application does not use a service-role key or a backend API. It talks
directly to Supabase using the publishable key, with RLS as the authorization
boundary.

## Sync behavior

- In-progress games remain in local storage and never leave the device.
- Completed games are always saved locally.
- When signed in, completed games are also saved to the authenticated account.
- Signing in merges existing local completed games with cloud history.
- Signing out removes synced completed games from this device and returns you to anonymous mode.
  In-progress games stay local. Sign back in to download your cloud history again.
- Failed uploads remain queued locally and retry later.

For future multiplayer, a Cloudflare Worker should verify the Supabase access
token and derive the user ID before passing that trusted identity to a Durable
Object. It must never trust a client-provided user ID.
