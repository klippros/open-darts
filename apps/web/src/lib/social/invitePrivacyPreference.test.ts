import { describe, expect, it } from 'vitest'
import {
  DEFAULT_REQUIRE_MUTUAL_FOLLOW_FOR_INVITES,
  parseRequireMutualFollowPreference,
} from './invitePrivacyPreference'

describe('parseRequireMutualFollowPreference', () => {
  it('preserves explicit boolean values', () => {
    expect(parseRequireMutualFollowPreference(true)).toBe(true)
    expect(parseRequireMutualFollowPreference(false)).toBe(false)
  })

  it('fails closed for missing or invalid values', () => {
    expect(parseRequireMutualFollowPreference(undefined)).toBe(
      DEFAULT_REQUIRE_MUTUAL_FOLLOW_FOR_INVITES,
    )
    expect(parseRequireMutualFollowPreference(null)).toBe(true)
    expect(parseRequireMutualFollowPreference('true')).toBe(true)
  })
})
