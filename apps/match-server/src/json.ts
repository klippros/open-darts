export type JsonObject = Record<string, string | number | boolean | null>

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isJsonScalar = (value: unknown): value is string | number | boolean | null =>
  value === null ||
  typeof value === 'string' ||
  typeof value === 'number' ||
  typeof value === 'boolean'

export const isJsonObject = (value: unknown): value is JsonObject => {
  if (!isRecord(value)) {
    return false
  }

  return Object.values(value).every((entry) => isJsonScalar(entry))
}
