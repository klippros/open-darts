import type { GameSession } from '../../types/gameSession'

export const getLatestSessionStartedAt = (sessions: readonly GameSession[]): string | null => {
  const [firstSession] = sessions

  if (firstSession === undefined) {
    return null
  }

  return sessions.reduce(
    (latest, session) => (session.startedAt > latest ? session.startedAt : latest),
    firstSession.startedAt,
  )
}

export const pickLastPlayedVariant = <T>(
  variants: readonly T[],
  getLastPlayedAt: (variant: T) => string | null,
): T | undefined => {
  if (variants.length === 0) {
    return undefined
  }

  let best: T | undefined
  let bestAt: string | null = null

  for (const variant of variants) {
    const at = getLastPlayedAt(variant)

    if (at === null) {
      continue
    }

    if (bestAt === null || at > bestAt) {
      best = variant
      bestAt = at
    }
  }

  return best ?? variants[0]
}
