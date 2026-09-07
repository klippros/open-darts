# Open Darts

An open source darts scoring app that is easy to get started with.
No login required, lives in the browsers local storage by default.
When Supabase is configured, finished games can be synced between
devices too, when the user signs up. When both Supabase and a Cloudflare
match Worker are configured, signed-in players can also play online.

Pick from many fun game modes for practice and play, from classic
501 to Bob's 27 and Around the Clock.

Open Darts tracks every dart you throw so you can analyze your progress over time.

**Live (coming soon):** [klippros.com/tools/open-darts](https://klippros.com/tools/open-darts)

## Development

Prerequisites: Node.js, pnpm 10+.

```bash
pnpm install
pnpm dev        # http://localhost:5173/tools/open-darts/
pnpm dev:match  # optional match Worker at http://localhost:8787
pnpm test
pnpm build
pnpm preview
```

## Contributing

See [AGENTS.md](AGENTS.md) for project conventions.

## Hosting

The example deployment uses Cloudflare Pages and optional Supabase.
Online matches also need the optional match Worker. Follow
[optional backends](docs/self-hosting.md) to run web only, web + Supabase,
or web + Supabase + the match Worker.

---

© 2026 Klippros Studios AB · [GitHub](https://github.com/klippros/open-darts)
