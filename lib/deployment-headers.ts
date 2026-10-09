export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), interest-cohort=()',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'",
}
/** Pages Functions 不继承 _headers，显式为函数与栏目门禁响应补齐策略。 */
export function deploymentHeaders(response: Response, request: Request): Response {
  const headers = new Headers(response.headers),
    url = new URL(request.url)
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value)
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname === '/admin' ||
    url.pathname.startsWith('/admin/') ||
    url.searchParams.has('admin-preview')
  )
    headers.set('cache-control', 'no-store')
  else if (url.pathname === '/sw.js') {
    headers.set('cache-control', 'no-cache')
    headers.set('Service-Worker-Allowed', '/')
  } else if (url.pathname.startsWith('/_next/static/'))
    headers.set('cache-control', 'public, max-age=31536000, immutable')
  else if (
    headers.get('content-type')?.includes('text/html') &&
    headers.get('cache-control') !== 'no-store'
  )
    headers.set('cache-control', 'public, max-age=0, must-revalidate')
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
