import { describe, expect, it } from 'vitest'
import { parseVisitScoreCommand } from './visitScoreGrammar'

describe('parseVisitScoreCommand', () => {
  it.each([
    [['0'], 0],
    [['zero'], 0],
    [['nil'], 0],
    [['no', 'score'], 0],
    [['noscore'], 0],
    [['26'], 26],
    [['180'], 180],
    [['one'], 1],
    [['twelve'], 12],
    [['twenty'], 20],
    [['twenty', 'six'], 26],
    [['sixty'], 60],
    [['one', 'hundred'], 100],
    [['a', 'hundred'], 100],
    [['hundred'], 100],
    [['one', 'hundred', 'and', 'forty'], 140],
    [['one', 'hundred', 'eighty'], 180],
    [['one', 'eighty'], 180],
  ] as const)('parses %j as %s', (tokens, expected) => {
    expect(parseVisitScoreCommand([...tokens])).toBe(expected)
  })

  it('rejects invalid totals', () => {
    expect(parseVisitScoreCommand(['181'])).toBeNull()
    expect(parseVisitScoreCommand(['two', 'hundred'])).toBeNull()
    expect(parseVisitScoreCommand(['hit', 'one'])).toBeNull()
    expect(parseVisitScoreCommand([])).toBeNull()
  })
})
