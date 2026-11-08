export const DEFAULT_REQUIRE_MUTUAL_FOLLOW_FOR_INVITES = true

/** Missing or invalid server values fail closed to requiring mutual follows. */
export const parseRequireMutualFollowPreference = (value: unknown): boolean =>
  typeof value === 'boolean' ? value : DEFAULT_REQUIRE_MUTUAL_FOLLOW_FOR_INVITES
