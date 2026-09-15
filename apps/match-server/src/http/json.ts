import { withCors } from './cors'

export const jsonResponse = (request: Request, body: unknown, status = 200): Response =>
  withCors(
    request,
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
