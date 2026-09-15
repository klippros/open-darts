import { describe, expect, it } from 'vitest'
import {
  clearSupabaseJwksCache,
  signEs256Jwt,
  signHs256Jwt,
  verifyAsymmetricJwt,
  verifySupabaseAccessToken,
} from '../src/auth/jwt'
import type { JwtSigningJwk } from '../src/auth/jwt'
import { TEST_SUPABASE_JWT_SECRET } from './secrets'

const userId = '11111111-1111-4111-8111-111111111111'

const authenticatedClaims = () => {
  const now = Math.floor(Date.now() / 1000)

  return {
    sub: userId,
    role: 'authenticated',
    aud: 'authenticated',
    exp: now + 3600,
  }
}

const generateEs256Pair = async (): Promise<{
  privateJwk: JwtSigningJwk
  publicJwk: JwtSigningJwk
}> => {
  const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify',
  ])) as CryptoKeyPair
  const privateJwk = (await crypto.subtle.exportKey('jwk', pair.privateKey)) as JwtSigningJwk
  const publicJwk = (await crypto.subtle.exportKey('jwk', pair.publicKey)) as JwtSigningJwk
  publicJwk.kid = 'test-es256'
  publicJwk.alg = 'ES256'
  publicJwk.use = 'sig'

  return { privateJwk, publicJwk }
}

describe('supabase access token verification', () => {
  it('accepts HS256 tokens signed with the JWT secret', async () => {
    const token = await signHs256Jwt(authenticatedClaims(), TEST_SUPABASE_JWT_SECRET)

    const payload = await verifySupabaseAccessToken(token, {
      jwtSecret: TEST_SUPABASE_JWT_SECRET,
      supabaseUrl: 'http://example.invalid',
    })

    expect(payload.sub).toBe(userId)
    expect(payload.role).toBe('authenticated')
  })

  it('accepts ES256 tokens verified against JWKS', async () => {
    clearSupabaseJwksCache()
    const { privateJwk, publicJwk } = await generateEs256Pair()
    const token = await signEs256Jwt(authenticatedClaims(), privateJwk, 'test-es256')

    const payload = await verifyAsymmetricJwt(token, [publicJwk])

    expect(payload.sub).toBe(userId)
    expect(payload.role).toBe('authenticated')
  })

  it('rejects ES256 tokens when JWKS has no matching key', async () => {
    const { privateJwk } = await generateEs256Pair()
    const { publicJwk: otherPublic } = await generateEs256Pair()
    const token = await signEs256Jwt(authenticatedClaims(), privateJwk, 'missing-kid')

    await expect(verifyAsymmetricJwt(token, [otherPublic])).rejects.toThrow(
      /No matching JWKS key|Invalid JWT signature/u,
    )
  })
})
