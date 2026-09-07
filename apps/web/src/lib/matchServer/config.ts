import { isSupabaseConfigured } from '../supabase/client'
import { readEnvironmentVariable } from '../env'

export const matchServerUrl = readEnvironmentVariable(import.meta.env.VITE_MATCH_SERVER_URL)

export const isMatchServerConfigured = matchServerUrl !== undefined

export const resolveOnlineMatchesEnabled = (
  supabaseConfigured: boolean,
  matchServerConfigured: boolean,
): boolean => supabaseConfigured && matchServerConfigured

export const isOnlineMatchesEnabled = resolveOnlineMatchesEnabled(
  isSupabaseConfigured,
  isMatchServerConfigured,
)
