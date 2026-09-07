import { DurableObject } from 'cloudflare:workers'

export class MatchObject extends DurableObject<Env> {}

export default {
  fetch(request: Request): Response {
    const url = new URL(request.url)

    if (url.pathname === '/health') {
      return Response.json({ ok: true })
    }

    return new Response('Not found', { status: 404 })
  },
} satisfies ExportedHandler<Env>
