import { describe, expect, it } from 'vitest'
import { GAME_PACKAGE_NAME } from './index'

describe('game package', () => {
  it('exports its package name', () => {
    expect(GAME_PACKAGE_NAME).toBe('@open-darts/game')
  })
})
