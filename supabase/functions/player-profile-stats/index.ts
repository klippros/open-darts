import { createClient } from '@supabase/supabase-js'
import type { GameSession } from '@open-darts/game/types/gameSession.ts'
import { GameModeId } from '@open-darts/game/types/gameMode.ts'
import { buildProfileStats } from '@open-darts/analytics'
import {
  addStoredValueToBudget,
  isRecord,
  parseProfileStatsRequest,
  parseStoredSession,
} from './profileStatsGuards.ts'

const PRACTICE_MODES = [
  GameModeId.Bob27,
  GameModeId.NinetyNineDarts,
  GameModeId.AroundTheClock,
] as const

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

    const profileUserId = parseProfileStatsRequest(body)
    if (profileUserId === null) {
      return jsonResponse(400, { error: 'bad_request' }, origin)
    }

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

    const onlineSessions: GameSession[] = []
    let totalBytes = 0

    const latestOnlineResult = await admin
      .from('online_matches')
      .select('completed_at, online_match_players!inner(user_id)')
      .eq('online_match_players.user_id', profileUserId)
      .eq('mode', GameModeId.X01)
      .eq('status', 'completed')
      .contains('config', { startScore: 501 })
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(1)

    if (latestOnlineResult.error !== null) {
      return jsonResponse(500, { error: 'server_error' }, origin)
    }

    const latestOnlineAt = latestOnlineResult.data?.[0]?.completed_at
    if (typeof latestOnlineAt === 'string') {
      const windowStart = windowStartFromAnchor(latestOnlineAt)
      const matchesResult = await admin
        .from('online_matches')
        .select('completed_at, result_payload, online_match_players!inner(user_id)')
        .eq('online_match_players.user_id', profileUserId)
        .eq('mode', GameModeId.X01)
        .eq('status', 'completed')
        .contains('config', { startScore: 501 })
        .gte('completed_at', windowStart)
        .lte('completed_at', latestOnlineAt)
        .order('completed_at', { ascending: false })

      if (matchesResult.error !== null) {
        return jsonResponse(500, { error: 'server_error' }, origin)
      }

      for (const row of matchesResult.data ?? []) {
        if (!isRecord(row)) {
          continue
        }

        const payload = row.result_payload
        if (!isRecord(payload) || !('session' in payload)) {
          continue
        }

        const nextTotalBytes = addStoredValueToBudget(totalBytes, payload.session)
        if (nextTotalBytes === null) {
          return jsonResponse(500, { error: 'server_error' }, origin)
        }
        totalBytes = nextTotalBytes

        const session = parseStoredSession(payload.session)
        if (session !== null) {
          onlineSessions.push(session)
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

        const nextTotalBytes = addStoredValueToBudget(totalBytes, row.payload)
        if (nextTotalBytes === null) {
          return jsonResponse(500, { error: 'server_error' }, origin)
        }
        totalBytes = nextTotalBytes

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
