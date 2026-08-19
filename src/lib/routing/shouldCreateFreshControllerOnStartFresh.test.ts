import { describe, expect, it } from 'vitest'
import { shouldCreateFreshControllerOnStartFresh } from './shouldCreateFreshControllerOnStartFresh'

describe('shouldCreateFreshControllerOnStartFresh', () => {
  it('does not replace the controller on the first route sync', () => {
    expect(shouldCreateFreshControllerOnStartFresh(null, 'mode=501')).toBe(false)
  })

  it('does not replace the controller when startFresh flips on the same route', () => {
    expect(
      shouldCreateFreshControllerOnStartFresh(
        { routeKey: 'mode=501', startFresh: false },
        'mode=501',
      ),
    ).toBe(false)
  })

  it('does not replace the controller when startFresh stays true on the same route', () => {
    expect(
      shouldCreateFreshControllerOnStartFresh(
        { routeKey: 'mode=501', startFresh: true },
        'mode=501',
      ),
    ).toBe(false)
  })

  it('replaces the controller when startFresh is true and the route changed', () => {
    expect(
      shouldCreateFreshControllerOnStartFresh(
        { routeKey: 'mode=501', startFresh: true },
        'mode=301',
      ),
    ).toBe(true)
  })
})
