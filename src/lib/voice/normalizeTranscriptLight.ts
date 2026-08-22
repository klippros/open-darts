/**
 * Light normalization for voice commands: case, unicode, punctuation → spaces.
 */
export const normalizeTranscriptLight = (raw: string): string[] => {
  const lowered = raw.normalize('NFKC').toLowerCase()
  const withoutApostrophes = lowered.replace(/['’]/gu, '')
  const spaced = withoutApostrophes.replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
  const collapsed = spaced.replace(/\s+/gu, ' ')

  if (collapsed.length === 0) {
    return []
  }

  return collapsed
    .split(/\s+/u)
    .filter((token) => token.length > 0)
    .map((token) => ASR_TOKEN_FIXUPS[token] ?? token)
}

/** Common Web Speech misfires for short number words used in practice grammars. */
const ASR_TOKEN_FIXUPS: Record<string, string> = {
  tow: 'two',
  too: 'two',
  to: 'two',
  tree: 'three',
  free: 'three',
  for: 'four',
  fore: 'four',
  ate: 'eight',
  won: 'one',
  sex: 'six',
  sick: 'six',
  tin: 'ten',
  tent: 'ten',
  mist: 'miss',
  mis: 'miss',
  misse: 'missed',
}
