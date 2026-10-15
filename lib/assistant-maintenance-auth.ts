import { fromBase64Url } from './admin/crypto.ts'
const ISSUER = 'https://token.actions.githubusercontent.com'
let cached: { expires: number; keys: (JsonWebKey & { kid?: string })[] } | undefined
/** Scope this identity to one workflow and endpoint; it grants no admin session or key access. */
export async function verifyMaintenanceToken(
  request: Request,
  repository: string,
  fetcher: typeof fetch = fetch,
) {
  try {
    const token = request.headers
      .get('authorization')
      ?.match(/^Bearer ([A-Za-z0-9_.-]{100,12000})$/)?.[1]
    if (!token) return false
    const parts = token.split('.')
    if (parts.length !== 3) return false
    const decode = (value: string) => JSON.parse(new TextDecoder().decode(fromBase64Url(value)))
    const header = decode(parts[0]),
      claims = decode(parts[1]),
      now = Math.floor(Date.now() / 1000)
    if (
      header.alg !== 'RS256' ||
      typeof header.kid !== 'string' ||
      claims.iss !== ISSUER ||
      claims.aud !== new URL(request.url).origin ||
      claims.repository !== repository ||
      claims.ref !== 'refs/heads/main' ||
      claims.workflow_ref !==
        repository + '/.github/workflows/assistant-model-health.yml@refs/heads/main' ||
      !['schedule', 'workflow_dispatch', 'push'].includes(claims.event_name) ||
      typeof claims.exp !== 'number' ||
      claims.exp <= now ||
      typeof claims.iat !== 'number' ||
      claims.iat > now + 60 ||
      now - claims.iat > 600 ||
      (claims.nbf !== undefined && (typeof claims.nbf !== 'number' || claims.nbf > now + 60))
    )
      return false
    if (!cached || cached.expires <= Date.now() || !cached.keys.some((k) => k.kid === header.kid)) {
      const response = await fetcher(ISSUER + '/.well-known/jwks', {
        signal: AbortSignal.timeout(8000),
        redirect: 'manual',
      })
      if (!response.ok) return false
      const payload = (await response.json()) as { keys?: (JsonWebKey & { kid?: string })[] }
      if (!Array.isArray(payload.keys) || payload.keys.length > 30) return false
      cached = { keys: payload.keys, expires: Date.now() + 300000 }
    }
    const jwk = cached.keys.find((k) => k.kid === header.kid && k.kty === 'RSA')
    if (!jwk) return false
    const key = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    )
    return await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      fromBase64Url(parts[2]) as BufferSource,
      new TextEncoder().encode(parts[0] + '.' + parts[1]),
    )
  } catch {
    return false
  }
}
