const AUTH_RETURN_TO_KEY = 'open-darts:auth-return-to'

/** Relative in-app path only — rejects open redirects. */
export const resolveAuthReturnPath = (raw: string | null | undefined): string | null => {
  if (raw === undefined || raw === null || raw === '') {
    return null
  }

  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('://')) {
    return null
  }

  return raw
}

/**
 * Persist where to send the user after OAuth/OTP. Kept out of `redirectTo` so the
 * callback URL stays an exact match for Supabase/Google allowlists (query strings
 * are rejected and fall back to Site URL, often 127.0.0.1).
 */
export const stashAuthReturnPath = (returnTo?: string | null): void => {
  const safeReturnTo = resolveAuthReturnPath(returnTo ?? null)

  if (safeReturnTo === null) {
    sessionStorage.removeItem(AUTH_RETURN_TO_KEY)
    return
  }

  sessionStorage.setItem(AUTH_RETURN_TO_KEY, safeReturnTo)
}

export const consumeAuthReturnPath = (): string | null => {
  const raw = sessionStorage.getItem(AUTH_RETURN_TO_KEY)
  sessionStorage.removeItem(AUTH_RETURN_TO_KEY)
  return resolveAuthReturnPath(raw)
}

export const buildAuthRedirectUrl = (): string => {
  const baseUrlValue: unknown = import.meta.env.BASE_URL
  const baseUrl = typeof baseUrlValue === 'string' ? baseUrlValue : '/tools/open-darts/'
  return new URL(`${baseUrl}auth/callback`, window.location.origin).toString()
}
