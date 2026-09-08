# Optional backends

Open Darts works without Supabase or Cloudflare. Local games stay in the
browser. Online matches are available only when **both** Supabase and the
match Worker are configured.

| Setup                         | What you get                                    |
| ----------------------------- | ----------------------------------------------- |
| Web only                      | Anonymous play, local history in `localStorage` |
| Web + Supabase                | Optional sign-in, sync completed local games    |
| Web + Supabase + match Worker | Online two-player matches (plus sync)           |

## Web only

Copy `.env.example` to `.env` and leave every value empty, then run:

```bash
pnpm install
pnpm dev
```

The app is at `http://localhost:5173/tools/open-darts/`. Users stay anonymous
and completed games stay in `localStorage`. Online play UI stays hidden.

## Supabase (optional sign-in and local-game sync)

When the two public Supabase environment variables are absent, users remain
anonymous and completed games stay in their browser.

### Create a Supabase project

Create a project at [supabase.com](https://supabase.com).

### Apply the database migration

Link the Supabase CLI and run `supabase db push` to apply all migrations.

### Configure authentication

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

#### Email

Enable the Email provider. Open Darts uses `signInWithOtp`, so users receive a
magic link and never create a password.

#### Google

1. Create a Web OAuth client in Google Cloud.
2. Add Supabase's callback URL as an authorized redirect URI:

   ```text
   https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
   ```

3. Put the Google client ID and secret in the Supabase Google provider settings.

Google credentials are secrets and must not be committed to this repository.

### Local development

In the repository-root `.env`, fill in the Project URL and publishable key
from **Project Settings → API**:

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

Online matches stay disabled until `VITE_MATCH_SERVER_URL` is set as well.

## Cloudflare match Worker (optional online matches)

Online matches need **both** backends: Supabase (auth + match index) and a
Cloudflare Worker with Durable Objects (live match state). Leave
`VITE_MATCH_SERVER_URL` empty to keep online play disabled. The web app still
runs with `pnpm dev` and does not require a Cloudflare account.

### Local development

1. Copy `apps/match-server/.dev.vars.example` to `apps/match-server/.dev.vars`.
2. Fill in the **server** secrets (never `VITE_` prefixes; never the web bundle):

   ```text
   SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   SUPABASE_JWT_SECRET=YOUR_JWT_SECRET
   SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
   ```

   The JWT secret and service role key are in Supabase **Project Settings → API**.
   The service role key bypasses Row Level Security and must stay on the Worker.
   Access tokens may be **HS256** (legacy shared secret) or **ES256/RS256**
   (asymmetric signing keys). The Worker verifies HS256 with
   `SUPABASE_JWT_SECRET` and fetches public keys from
   `${SUPABASE_URL}/auth/v1/.well-known/jwks.json` for asymmetric tokens.
   Local Supabase CLI stacks often issue ES256 by default.

3. Set the public Worker URL in the repository-root `.env` (together with the
   Supabase `VITE_*` values above):

   ```text
   VITE_MATCH_SERVER_URL=http://localhost:8787
   ```

4. Run the Worker alongside the web app:

   ```bash
   pnpm dev:match
   pnpm dev
   ```

`pnpm dev:match` uses local Durable Object storage. It does not deploy anything.

### Deploy the Worker

From `apps/match-server`, after `wrangler login`:

```bash
pnpm exec wrangler secret put SUPABASE_URL
pnpm exec wrangler secret put SUPABASE_JWT_SECRET
pnpm exec wrangler secret put SUPABASE_SERVICE_ROLE_KEY
pnpm exec wrangler deploy
```

Put the deployed Worker origin in the web app build as `VITE_MATCH_SERVER_URL`
(for example `https://open-darts-match-server.<account>.workers.dev`).

Rebuild and redeploy the web app so the browser picks up the new URL.

### CORS and WebSocket origins

Browser clients call the Worker over HTTPS and open WebSockets to the same
origin (for example `wss://…workers.dev/…` after minting a short-lived ticket).

The Worker reflects the request `Origin` on CORS responses so local Vite
(`http://localhost:5173`) and your production Pages origin both work. Serve the
web app and the Worker on HTTPS in production; mixed-content or blocked
cross-origin WebSockets will prevent online play even when REST create/join
succeeds.

If you put the Worker behind a custom domain, point `VITE_MATCH_SERVER_URL` at
that origin and keep Supabase auth redirect URLs aligned with the web app host.
