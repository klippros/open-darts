import { handleRequest } from './http/handleRequest'
import { MatchObject } from './match/MatchObject'

export { MatchObject }

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env)
  },
} satisfies ExportedHandler<Env>
