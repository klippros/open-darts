import { describe, expect, it } from 'vitest'
import { readEnvironmentVariable } from './env'

describe('readEnvironmentVariable', () => {
  it('returns undefined for non-strings', () => {
    expect(readEnvironmentVariable(undefined)).toBeUndefined()
    expect(readEnvironmentVariable(null)).toBeUndefined()
    expect(readEnvironmentVariable(1)).toBeUndefined()
  })

  it('returns undefined for blank strings', () => {
    expect(readEnvironmentVariable('')).toBeUndefined()
    expect(readEnvironmentVariable('   ')).toBeUndefined()
  })

  it('returns trimmed values', () => {
    expect(readEnvironmentVariable(' https://example.test ')).toBe('https://example.test')
  })
})
