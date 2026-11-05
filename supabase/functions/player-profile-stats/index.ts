import { createClient } from '@supabase/supabase-js'
import { parseGameSession } from '@open-darts/game/game/serializeGame'
import type { GameSession } from '@open-darts/game/types/gameSession'
import { GameModeId } from '@open-darts/game/types/gameMode'
import { buildProfileStats } from '@open-darts/analytics'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu

const PRACTICE_MODES = [
  GameModeId.Bob27,
  GameModeId.NinetyNineDarts,
  GameModeId.AroundTheClock,
] as const

const MAX_SESSION_BYTES = 524_288
const MAX_TOTAL_BYTES = 8_000_000
const ACTIVE_DAYS_MS = 30 * 24 * 60 * 60 * 1000

const corsHeadersFor = (origin: string | null): HeadersInit => {
  const allowed = (Deno.env.get('PROFILE_STATS_ALLOWED_ORIGINS') ?? 'http://localhost:5173')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0)

  const allowOrigin = origin !== null && allowed.includes(origin) ? origin : (allowed[0] ?? '')

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

const jsonResponse = (
  status: number,
  body: Record<string, unknown>,
  origin: string | null,
  extraHeaders: HeadersInit = {},
): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeadersFor(origin),
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  })

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const parseStoredSession = (value: unknown): GameSession | null => {
  try {
    const encoded = typeof value === 'string' ? value : JSON.stringify(value)
    if (encoded.length > MAX_SESSION_BYTES) {
      return null
    }
    return parseGameSession(encoded)
  } catch {
    return null
  }
}

const windowStartFromAnchor = (anchorIso: string): string =>
  new Date(new Date(anchorIso).getTime() - ACTIVE_DAYS_MS).toISOString()

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('Origin')

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeadersFor(origin) })
  }

  if (req.method !== 'POST') {
    return jsonResponse(400, { error: 'bad_request' }, origin)
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (authHeader === null || !authHeader.startsWith('Bearer ')) {
      return jsonResponse(401, { error: 'unauthorized' }, origin)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (supabaseUrl === undefined || anonKey === undefined || serviceRoleKey === undefined) {
      return jsonResponse(500, { error: 'server_error' }, origin)
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const token = authHeader.slice('Bearer '.length)
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser(token)

    if (userError !== null || user === null) {
      return jsonResponse(401, { error: 'unauthorized' }, origin)
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return jsonResponse(400, { error: 'bad_request' }, origin)
    }

    if (!isRecord(body) || typeof body.userId !== 'string' || !UUID_PATTERN.test(body.userId)) {
      return jsonResponse(400, { error: 'bad_request' }, origin)
    }

    const profileUserId = body.userId
    const admin = createClient(supabaseUrl, serviceRoleKey)

    // Rate-limit by caller JWT so auth.uid() is the viewer.
    const callerRate = await userClient.rpc('consume_profile_stats_rate_limit')
    if (callerRate.error !== null || callerRate.data !== true) {
      return jsonResponse(429, { error: 'rate_limited' }, origin, {
        'Retry-After': '60',
      })
    }

    const profileResult = await admin
      .from('profiles')
      .select('display_name')
      .eq('user_id', profileUserId)
      .maybeSingle()

    if (profileResult.error !== null) {
      return jsonResponse(500, { error: 'server_error' }, origin)
    }

    if (profileResult.data === null) {
      return jsonResponse(404, { error: 'not_found' }, origin)
    }

    const displayName =
      typeof profileResult.data.display_name === 'string'
        ? profileResult.data.display_name
        : 'Player'

    const membership = await admin
      .from('online_match_players')
      .select('match_id')
      .eq('user_id', profileUserId)

    if (membership.error !== null) {
      return jsonResponse(500, { error: 'server_error' }, origin)
    }

    const matchIds = (membership.data ?? [])
      .map((row) => (isRecord(row) && typeof row.match_id === 'string' ? row.match_id : null))
      .filter((id): id is string => id !== null)

    const onlineSessions: GameSession[] = []
    let totalBytes = 0

    if (matchIds.length > 0) {
      const matchesResult = await admin
        .from('online_matches')
        .select('id, mode, config, status, ending_kind, completed_at, created_at, result_payload')
        .in('id', matchIds)
        .eq('mode', GameModeId.X01)
        .in('status', ['completed', 'cancelled'])

      if (matchesResult.error !== null) {
        return jsonResponse(500, { error: 'server_error' }, origin)
      }

      const fiveOhOneCandidates: { completedAt: string; session: GameSession }[] = []

      for (const row of matchesResult.data ?? []) {
        if (!isRecord(row)) {
          continue
        }

        const status = row.status
        const endingKind = row.ending_kind
        const isHistory =
          status === 'completed' ||
          (status === 'cancelled' &&
            (endingKind === 'mutual_cancel' || endingKind === 'idle_timeout'))

        if (!isHistory) {
          continue
        }

        const config = row.config
        if (
          !isRecord(config) ||
          typeof config.startScore !== 'number' ||
          config.startScore !== 501
        ) {
          continue
        }

        const payload = row.result_payload
        if (!isRecord(payload) || !('session' in payload)) {
          continue
        }

        const encoded = JSON.stringify(payload.session)
        totalBytes += encoded.length
        if (totalBytes > MAX_TOTAL_BYTES) {
          break
        }

        const session = parseStoredSession(payload.session)
        if (session === null) {
          continue
        }

        const completedAt =
          typeof row.completed_at === 'string'
            ? row.completed_at
            : typeof row.created_at === 'string'
              ? row.created_at
              : (session.completedAt ?? session.startedAt)

        fiveOhOneCandidates.push({ completedAt, session })
      }

      fiveOhOneCandidates.sort((left, right) => right.completedAt.localeCompare(left.completedAt))
      const latest = fiveOhOneCandidates[0]?.completedAt
      if (latest !== undefined) {
        const start = windowStartFromAnchor(latest)
        for (const candidate of fiveOhOneCandidates) {
          if (candidate.completedAt >= start && candidate.completedAt <= latest) {
            onlineSessions.push(candidate.session)
          }
        }
      }
    }

    const practiceSessions: GameSession[] = []
    for (const mode of PRACTICE_MODES) {
      const latestResult = await admin
        .from('game_sessions')
        .select('completed_at')
        .eq('user_id', profileUserId)
        .eq('mode', mode)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)

      if (latestResult.error !== null) {
        return jsonResponse(500, { error: 'server_error' }, origin)
      }

      const latestAt = latestResult.data?.[0]?.completed_at
      if (typeof latestAt !== 'string') {
        continue
      }

      const windowStart = windowStartFromAnchor(latestAt)
      const sessionsResult = await admin
        .from('game_sessions')
        .select('payload, completed_at')
        .eq('user_id', profileUserId)
        .eq('mode', mode)
        .eq('status', 'completed')
        .gte('completed_at', windowStart)
        .lte('completed_at', latestAt)

      if (sessionsResult.error !== null) {
        return jsonResponse(500, { error: 'server_error' }, origin)
      }

      for (const row of sessionsResult.data ?? []) {
        if (!isRecord(row)) {
          continue
        }

        const encoded = JSON.stringify(row.payload)
        totalBytes += encoded.length
        if (totalBytes > MAX_TOTAL_BYTES) {
          break
        }

        const session = parseStoredSession(row.payload)
        if (session !== null) {
          practiceSessions.push(session)
        }
      }
    }

    const stats = buildProfileStats({
      displayName,
      profileUserId,
      onlineSessions,
      practiceSessions,
    })

    return jsonResponse(200, stats as unknown as Record<string, unknown>, origin)
  } catch {
    return jsonResponse(500, { error: 'server_error' }, origin)
  }
})
