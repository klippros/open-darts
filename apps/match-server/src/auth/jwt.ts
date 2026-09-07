import { isRecord } from '../json'

const textEncoder = new TextEncoder()

export interface JwtPayload {
  sub: string
  role?: string
  exp?: number
  nbf?: number
  iss?: string
  aud?: string | string[]
  [key: string]: unknown
}

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

export const verifyHs256Jwt = async (token: string, secret: string): Promise<JwtPayload> => {
  const parts = token.split('.')

  if (
    parts.length !== 3 ||
    parts[0] === undefined ||
    parts[1] === undefined ||
    parts[2] === undefined
  ) {
    throw new Error('Malformed JWT')
  }

  const header = decodeJsonObject(parts[0])

  if (header.alg !== 'HS256') {
    throw new Error('Unsupported JWT algorithm')
  }

  const data = `${parts[0]}.${parts[1]}`
  const key = await importHmacKey(secret, ['verify'])
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    fromBase64Url(parts[2]),
    textEncoder.encode(data),
  )

  if (!valid) {
    throw new Error('Invalid JWT signature')
  }

  const payload = decodeJsonObject(parts[1])
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
  jwtSecret: string,
): Promise<JwtPayload> => {
  const payload = await verifyHs256Jwt(token, jwtSecret)

  if (payload.role !== 'authenticated') {
    throw new Error('JWT role is not authenticated')
  }

  return payload
}
