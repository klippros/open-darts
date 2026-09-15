import { isRecord } from '../json'

const textEncoder = new TextEncoder()

const JWKS_CACHE_TTL_MS = 10 * 60 * 1000

export interface JwtPayload {
  sub: string
  role?: string
  exp?: number
  nbf?: number
  iss?: string
  aud?: string | string[]
  [key: string]: unknown
}

export interface SupabaseAccessTokenOptions {
  jwtSecret: string
  supabaseUrl: string
}

export interface JwtSigningJwk extends JsonWebKey {
  kid?: string
  alg?: string
  use?: string
}

interface JwksCacheEntry {
  url: string
  expiresAt: number
  keys: JwtSigningJwk[]
}

let jwksCache: JwksCacheEntry | null = null

const toBase64Url = (bytes: Uint8Array): string => {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

const fromBase64Url = (value: string): Uint8Array => {
  const padded =
    value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (value.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

const importHmacKey = (secret: string, usages: ('sign' | 'verify')[]): Promise<CryptoKey> =>
  crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    usages,
  )

const decodeJsonObject = (part: string): Record<string, unknown> => {
  const decoded = new TextDecoder().decode(fromBase64Url(part))
  const parsed: unknown = JSON.parse(decoded)

  if (!isRecord(parsed)) {
    throw new Error('JWT part is not an object')
  }

  return parsed
}

const splitJwt = (
  token: string,
): {
  header: Record<string, unknown>
  payloadPart: string
  signature: Uint8Array
  data: string
} => {
  const parts = token.split('.')

  if (
    parts.length !== 3 ||
    parts[0] === undefined ||
    parts[1] === undefined ||
    parts[2] === undefined
  ) {
    throw new Error('Malformed JWT')
  }

  return {
    header: decodeJsonObject(parts[0]),
    payloadPart: parts[1],
    signature: fromBase64Url(parts[2]),
    data: `${parts[0]}.${parts[1]}`,
  }
}

const normalizeJwtPayload = (payload: Record<string, unknown>): JwtPayload => {
  const nowSeconds = Math.floor(Date.now() / 1000)

  if (typeof payload.exp === 'number' && payload.exp < nowSeconds) {
    throw new Error('JWT expired')
  }

  if (typeof payload.nbf === 'number' && payload.nbf > nowSeconds) {
    throw new Error('JWT not yet valid')
  }

  if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
    throw new Error('JWT is missing sub')
  }

  const audience = payload.aud
  const aud =
    typeof audience === 'string'
      ? audience
      : Array.isArray(audience) && audience.every((entry) => typeof entry === 'string')
        ? audience
        : undefined

  return {
    ...payload,
    sub: payload.sub,
    role: typeof payload.role === 'string' ? payload.role : undefined,
    exp: typeof payload.exp === 'number' ? payload.exp : undefined,
    nbf: typeof payload.nbf === 'number' ? payload.nbf : undefined,
    iss: typeof payload.iss === 'string' ? payload.iss : undefined,
    aud,
  }
}

const jwksUrlFor = (supabaseUrl: string): string =>
  `${supabaseUrl.replace(/\/$/u, '')}/auth/v1/.well-known/jwks.json`

const parseJwksKeys = (body: unknown): JwtSigningJwk[] => {
  if (!isRecord(body) || !Array.isArray(body.keys)) {
    throw new Error('Invalid JWKS response')
  }

  return body.keys.filter(
    (entry): entry is JwtSigningJwk => isRecord(entry) && typeof entry.kty === 'string',
  )
}

export const clearSupabaseJwksCache = (): void => {
  jwksCache = null
}

export const fetchSupabaseJwks = async (supabaseUrl: string): Promise<JwtSigningJwk[]> => {
  const url = jwksUrlFor(supabaseUrl)
  const now = Date.now()

  if (jwksCache !== null && jwksCache.url === url && jwksCache.expiresAt > now) {
    return jwksCache.keys
  }

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error('Failed to fetch JWKS')
  }

  const keys = parseJwksKeys(await response.json())
  jwksCache = { url, expiresAt: now + JWKS_CACHE_TTL_MS, keys }

  return keys
}

const importVerifyKey = (jwk: JwtSigningJwk, alg: string): Promise<CryptoKey> => {
  const publicJwk: JsonWebKey = { ...jwk }
  delete publicJwk.d
  publicJwk.key_ops = ['verify']

  if (alg === 'ES256') {
    return crypto.subtle.importKey(
      'jwk',
      publicJwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify'],
    )
  }

  if (alg === 'RS256') {
    return crypto.subtle.importKey(
      'jwk',
      publicJwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    )
  }

  return Promise.reject(new Error('Unsupported JWT algorithm'))
}

const verifyWithJwk = async (
  data: string,
  signature: Uint8Array,
  jwk: JwtSigningJwk,
  alg: string,
): Promise<boolean> => {
  const key = await importVerifyKey(jwk, alg)

  if (alg === 'ES256') {
    return crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      signature,
      textEncoder.encode(data),
    )
  }

  return crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature, textEncoder.encode(data))
}

export const verifyAsymmetricJwt = async (
  token: string,
  keys: JwtSigningJwk[],
): Promise<JwtPayload> => {
  const { header, payloadPart, signature, data } = splitJwt(token)
  const alg = header.alg

  if (alg !== 'ES256' && alg !== 'RS256') {
    throw new Error('Unsupported JWT algorithm')
  }

  const kid = typeof header.kid === 'string' ? header.kid : undefined
  const candidates =
    kid === undefined
      ? keys.filter((key) => key.alg === undefined || key.alg === alg)
      : keys.filter((key) => key.kid === kid)

  if (candidates.length === 0) {
    throw new Error('No matching JWKS key')
  }

  for (const candidate of candidates) {
    try {
      if (await verifyWithJwk(data, signature, candidate, alg)) {
        return normalizeJwtPayload(decodeJsonObject(payloadPart))
      }
    } catch {
      // Try the next key when import/verify fails for a candidate.
    }
  }

  throw new Error('Invalid JWT signature')
}

export const signHs256Jwt = async (
  payload: Record<string, unknown>,
  secret: string,
): Promise<string> => {
  const header = toBase64Url(textEncoder.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })))
  const body = toBase64Url(textEncoder.encode(JSON.stringify(payload)))
  const data = `${header}.${body}`
  const key = await importHmacKey(secret, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', key, textEncoder.encode(data))

  return `${data}.${toBase64Url(new Uint8Array(signature))}`
}

export const signEs256Jwt = async (
  payload: Record<string, unknown>,
  privateJwk: JwtSigningJwk,
  kid?: string,
): Promise<string> => {
  const header = toBase64Url(
    textEncoder.encode(
      JSON.stringify({
        alg: 'ES256',
        typ: 'JWT',
        ...(kid === undefined ? {} : { kid }),
      }),
    ),
  )
  const body = toBase64Url(textEncoder.encode(JSON.stringify(payload)))
  const data = `${header}.${body}`
  const key = await crypto.subtle.importKey(
    'jwk',
    privateJwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    textEncoder.encode(data),
  )

  return `${data}.${toBase64Url(new Uint8Array(signature))}`
}

export const verifyHs256Jwt = async (token: string, secret: string): Promise<JwtPayload> => {
  const { header, payloadPart, signature, data } = splitJwt(token)

  if (header.alg !== 'HS256') {
    throw new Error('Unsupported JWT algorithm')
  }

  const key = await importHmacKey(secret, ['verify'])
  const valid = await crypto.subtle.verify('HMAC', key, signature, textEncoder.encode(data))

  if (!valid) {
    throw new Error('Invalid JWT signature')
  }

  return normalizeJwtPayload(decodeJsonObject(payloadPart))
}

export const readBearerToken = (request: Request): string | null => {
  const header = request.headers.get('Authorization')

  if (header === null || !header.startsWith('Bearer ')) {
    return null
  }

  const token = header.slice('Bearer '.length).trim()

  return token.length > 0 ? token : null
}

export const verifySupabaseAccessToken = async (
  token: string,
  options: SupabaseAccessTokenOptions,
): Promise<JwtPayload> => {
  const { header } = splitJwt(token)
  const alg = header.alg

  let payload: JwtPayload

  if (alg === 'HS256') {
    payload = await verifyHs256Jwt(token, options.jwtSecret)
  } else if (alg === 'ES256' || alg === 'RS256') {
    try {
      payload = await verifyAsymmetricJwt(token, await fetchSupabaseJwks(options.supabaseUrl))
    } catch (error) {
      clearSupabaseJwksCache()
      try {
        payload = await verifyAsymmetricJwt(token, await fetchSupabaseJwks(options.supabaseUrl))
      } catch {
        throw error
      }
    }
  } else {
    throw new Error('Unsupported JWT algorithm')
  }

  if (payload.role !== 'authenticated') {
    throw new Error('JWT role is not authenticated')
  }

  return payload
}
