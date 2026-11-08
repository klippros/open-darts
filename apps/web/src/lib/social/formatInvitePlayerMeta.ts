export const formatInvitePlayerMeta = (playCount: number, lastPlayedAt: string | null): string => {
  if (playCount <= 0 || lastPlayedAt === null) {
    return 'Not played together yet'
  }

  const playedDate = new Date(lastPlayedAt)
  if (Number.isNaN(playedDate.getTime())) {
    return `${playCount} match${playCount === 1 ? '' : 'es'} together`
  }

  const daysAgo = Math.max(
    0,
    Math.floor((Date.now() - playedDate.getTime()) / (24 * 60 * 60 * 1000)),
  )
  const when = daysAgo === 0 ? 'today' : daysAgo === 1 ? 'yesterday' : `${String(daysAgo)} days ago`

  return `${playCount} match${playCount === 1 ? '' : 'es'} · last ${when}`
}
