import { describe, expect, it } from 'vitest'
import { createRequestGeneration } from './requestGeneration'

describe('createRequestGeneration', () => {
  it('ignores responses from earlier generations after invalidate', () => {
    const generation = createRequestGeneration()
    const first = generation.next()
    const second = generation.next()

    expect(generation.isCurrent(first)).toBe(false)
    expect(generation.isCurrent(second)).toBe(true)

    generation.invalidate()
    expect(generation.isCurrent(second)).toBe(false)
    expect(generation.isCurrent(generation.next())).toBe(true)
  })

  it('supports account switch races by invalidating the prior user load', () => {
    const generation = createRequestGeneration()
    const accountA = generation.next()
    generation.invalidate()
    const accountB = generation.next()

    expect(generation.isCurrent(accountA)).toBe(false)
    expect(generation.isCurrent(accountB)).toBe(true)
  })
})
