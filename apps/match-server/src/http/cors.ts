const ALLOWED_HEADERS = 'Authorization, Content-Type'
const ALLOWED_METHODS = 'GET, POST, OPTIONS'

export const corsHeaders = (request: Request): Headers => {
  const headers = new Headers()
  const origin = request.headers.get('Origin')

  if (origin !== null) {
    headers.set('Access-Control-Allow-Origin', origin)
    headers.set('Vary', 'Origin')
    headers.set('Access-Control-Allow-Headers', ALLOWED_HEADERS)
    headers.set('Access-Control-Allow-Methods', ALLOWED_METHODS)
  }

  return headers
}

export const withCors = (request: Request, response: Response): Response => {
  const headers = new Headers(response.headers)
  const extra = corsHeaders(request)

  extra.forEach((value, key) => {
    headers.set(key, value)
  })

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export const corsPreflight = (request: Request): Response =>
  new Response(null, { status: 204, headers: corsHeaders(request) })
