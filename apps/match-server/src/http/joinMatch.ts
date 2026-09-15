import { isRecord } from '../json'
import { isUuid } from '../ids'
import { IndexPublishError, IndexPublishErrorCode, publishMatchIndex } from '../match/indexSync'
import { MatchCommandName } from '../match/types'
import { readAccessUserId } from './auth'
import { httpStatusForCommand } from './commandStatus'
import { jsonResponse } from './json'

const readJson = async (request: Request): Promise<unknown> => {
  try {
    return await request.json()
  } catch {
    return null
  }
}

const readInviteToken = (value: unknown): string | null => {
  if (!isRecord(value) || typeof value.inviteToken !== 'string' || !isUuid(value.inviteToken)) {
    return null
  }

  return value.inviteToken
}

export const joinMatch = async (request: Request, env: Env, matchId: string): Promise<Response> => {
  const access = await readAccessUserId(request, {
    jwtSecret: env.SUPABASE_JWT_SECRET,
    supabaseUrl: env.SUPABASE_URL,
  })

  if (!access.ok) {
    return jsonResponse(request, { error: access.error }, 401)
  }

  const inviteToken = readInviteToken(await readJson(request))

  if (inviteToken === null) {
    return jsonResponse(request, { error: 'invalid_invite' }, 400)
  }

  const stub = env.MATCH.getByName(matchId)
  const joined = await stub.join({ userId: access.userId, inviteToken })

  if (!joined.ok || joined.state === null) {
    return jsonResponse(
      request,
      { error: joined.code, message: joined.message },
      httpStatusForCommand(joined),
    )
  }

  try {
    await publishMatchIndex(env, joined.state)
  } catch (error) {
    if (access.userId !== joined.state.creatorUserId) {
      await stub.applyCommand(access.userId, { name: MatchCommandName.LeaveWaiting })
    }

    if (error instanceof IndexPublishError && error.code === IndexPublishErrorCode.Conflict) {
      return jsonResponse(request, { error: 'conflict', message: error.message }, 409)
    }

    return jsonResponse(request, { error: 'index_unavailable' }, 503)
  }

  return jsonResponse(request, { matchId, state: joined.state })
}
