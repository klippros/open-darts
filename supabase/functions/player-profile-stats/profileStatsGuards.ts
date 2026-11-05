import { parseGameSession } from '@open-darts/game/game/serializeGame.ts'
import type { GameSession } from '@open-darts/game/types/gameSession.ts'

export const MAX_SESSION_BYTES = 524_288
export const MAX_TOTAL_BYTES = 8_000_000

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu
const textEncoder = new TextEncoder()

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const parseProfileStatsRequest = (value: unknown): string | null => {
  if (
    !isRecord(value) ||
    Object.keys(value).length !== 1 ||
    typeof value.userId !== 'string' ||
    !UUID_PATTERN.test(value.userId)
  ) {
    return null
  }

  return value.userId
}

const encodeStoredValue = (value: unknown): string | null => {
  try {
    return typeof value === 'string' ? value : JSON.stringify(value)
  } catch {
    return null
  }
}

export const storedValueByteLength = (value: unknown): number | null => {
  const encoded = encodeStoredValue(value)
  return encoded === null ? null : textEncoder.encode(encoded).byteLength
}

export const addStoredValueToBudget = (
  bytesUsed: number,
  value: unknown,
  maximum: number = MAX_TOTAL_BYTES,
): number | null => {
  const valueBytes = storedValueByteLength(value)
  if (valueBytes === null || valueBytes > MAX_SESSION_BYTES || bytesUsed + valueBytes > maximum) {
    return null
  }

  return bytesUsed + valueBytes
}

export const parseStoredSession = (value: unknown): GameSession | null => {
  const encoded = encodeStoredValue(value)
  if (encoded === null || textEncoder.encode(encoded).byteLength > MAX_SESSION_BYTES) {
    return null
  }

  try {
    return parseGameSession(encoded)
  } catch {
    return null
  }
}
