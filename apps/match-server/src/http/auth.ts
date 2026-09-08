import { readBearerToken, verifySupabaseAccessToken } from '../auth/jwt'
import { isUuid } from '../ids'

export type AccessUserResult =
  { ok: true; userId: string } | { ok: false; error: 'missing_token' | 'invalid_token' }

export const readAccessUserId = async (
  request: Request,
  options: { jwtSecret: string; supabaseUrl: string },
): Promise<AccessUserResult> => {
  const bearer = readBearerToken(request)

  if (bearer === null) {
    return { ok: false, error: 'missing_token' }
  }

  try {
    const payload = await verifySupabaseAccessToken(bearer, options)

    if (!isUuid(payload.sub)) {
      return { ok: false, error: 'invalid_token' }
    }

    return { ok: true, userId: payload.sub }
  } catch {
    return { ok: false, error: 'invalid_token' }
  }
}
