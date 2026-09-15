import { readAccessUserId } from './auth'
import { httpStatusForCommand } from './commandStatus'
import { jsonResponse } from './json'
import { parseCreateMatchRequest } from './parseCreateMatch'
import { IndexPublishError, IndexPublishErrorCode, publishMatchIndex } from '../match/indexSync'
import { MatchCommandName } from '../match/types'

const readJson = async (request: Request): Promise<unknown> => {
  try {
    return await request.json()
  } catch {
    return null
  }
}

export const createMatch = async (request: Request, env: Env): Promise<Response> => {
  const access = await readAccessUserId(request, {
    jwtSecret: env.SUPABASE_JWT_SECRET,
    supabaseUrl: env.SUPABASE_URL,
  })

  if (!access.ok) {
    return jsonResponse(request, { error: access.error }, 401)
  }

  const parsed = parseCreateMatchRequest(await readJson(request))

  if (parsed === null) {
    return jsonResponse(request, { error: 'invalid_setup' }, 400)
  }

  const matchId = crypto.randomUUID()
  const inviteToken = crypto.randomUUID()
  const stub = env.MATCH.getByName(matchId)
  const created = await stub.init({
    matchId,
    inviteToken,
    creatorUserId: access.userId,
    mode: parsed.mode,
    config: parsed.config,
    legsToWin: parsed.legsToWin,
    startingPlayerSlot: parsed.startingPlayerSlot,
  })

  if (!created.ok || created.state === null) {
    return jsonResponse(
      request,
      { error: created.code, message: created.message },
      httpStatusForCommand(created),
    )
  }

  try {
    await publishMatchIndex(env, created.state)
  } catch (error) {
    await stub.applyCommand(access.userId, { name: MatchCommandName.CancelWaiting })

    if (error instanceof IndexPublishError && error.code === IndexPublishErrorCode.Conflict) {
      return jsonResponse(request, { error: 'conflict', message: error.message }, 409)
    }

    return jsonResponse(request, { error: 'index_unavailable' }, 503)
  }

  return jsonResponse(
    request,
    {
      matchId,
      inviteToken,
      state: created.state,
    },
    201,
  )
}
