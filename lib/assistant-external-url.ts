/** External connections are owner supplied; credentials must never reach private networks or redirects. */
export function externalBaseUrl(value: unknown) {
  if (typeof value !== 'string' || value.length > 300) throw Error('请填写 HTTPS API 地址。')
  const url = new URL(value.trim())
  const host = url.hostname.toLowerCase()
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.port && url.port !== '443') ||
    !host.includes('.') ||
    !/^[a-z0-9.-]+$/.test(host) ||
    /^\d+(?:\.\d+)*$/.test(host) ||
    /(?:^|\.)(?:localhost|local|internal|lan|home|arpa|onion)$/.test(host)
  )
    throw Error('请使用公网 HTTPS API 地址，不支持内网、IP 地址或带密钥参数的网址。')
  let path = url.pathname.replace(/\/(?:chat\/completions|models)\/?$/, '').replace(/\/+$/, '')
  if (!path) path = '/v1'
  if (!/^\/[a-zA-Z0-9/_-]{1,120}$/.test(path)) throw Error('API 地址路径不正确。')
  return url.origin + path
}
export function publicAddress(address: string) {
  if (address.includes(':')) {
    const first = parseInt(address.split(':')[0], 16)
    return (
      first >= 0x2000 &&
      first <= 0x3fff &&
      !/^(?:2001:(?:db8|0|2|10|20):|2002:|3ffe:)/i.test(address)
    )
  }
  const p = address.split('.').map(Number)
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false
  const [a, b, c] = p
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
    (a === 203 && b === 0 && c === 113)
  )
}
export async function checkExternalHost(
  baseUrl: string,
  fetcher: typeof fetch,
  ownOrigin?: string,
) {
  const url = new URL(externalBaseUrl(baseUrl))
  if (ownOrigin && url.origin === ownOrigin) throw Error('不能将本站作为模型接口。')
  const records = await Promise.all(
    ['A', 'AAAA'].map(async (type) => {
      const endpoint = new URL('https://cloudflare-dns.com/dns-query')
      endpoint.searchParams.set('name', url.hostname)
      endpoint.searchParams.set('type', type)
      const response = await fetcher(endpoint.toString(), {
        headers: { accept: 'application/dns-json' },
        redirect: 'manual',
        signal: AbortSignal.timeout(8000),
      })
      if (!response.ok) throw Error('暂时无法验证接口域名，请稍后重试。')
      const data = (await response.json()) as {
        Status?: number
        Answer?: { type: number; data: string }[]
      }
      if (data.Status !== 0) throw Error('接口域名无法解析。')
      return (data.Answer ?? []).filter((r) => r.type === 1 || r.type === 28).map((r) => r.data)
    }),
  )
  const addresses = records.flat()
  if (!addresses.length || addresses.some((ip) => !publicAddress(ip)))
    throw Error('接口必须解析到公网地址，不能连接内网或保留地址。')
}
