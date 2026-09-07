import { normalizeTranscriptLight } from './normalizeTranscriptLight'

/**
 * True when `next` looks like a refined visit score that should replace `pending`
 * still waiting in isolation (e.g. ASR streamed "4" then "411").
 */
export const shouldSupersedePendingVisitScore = (pending: string, next: string): boolean => {
  const pendingTokens = normalizeTranscriptLight(pending)
  const nextTokens = normalizeTranscriptLight(next)

  if (pendingTokens.length === 0 || nextTokens.length === 0) {
    return false
  }

  const pendingJoined = pendingTokens.join(' ')
  const nextJoined = nextTokens.join(' ')

  if (pendingJoined === nextJoined) {
    return false
  }

  const pendingCompact = pendingTokens.join('')
  const nextCompact = nextTokens.join('')

  // Digit growth: "4" → "41" → "411"
  if (/^\d+$/u.test(pendingCompact) && /^\d+$/u.test(nextCompact)) {
    return nextCompact.startsWith(pendingCompact) && nextCompact.length > pendingCompact.length
  }

  // Spoken growth: "forty" → "forty one"
  if (
    nextTokens.length > pendingTokens.length &&
    pendingTokens.every((token, index) => token === nextTokens[index])
  ) {
    return true
  }

  return false
}
