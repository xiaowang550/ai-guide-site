import { describe, expect, it } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { deploymentHeaders, SECURITY_HEADERS } from '@/lib/deployment-headers'

/**
 * Cloudflare Pages 部署配置门禁。
 *
 * 背景：`_headers` 与 `_redirects` 是 Cloudflare 的原生约定 ——
 * 文件写错或漏了，平台**不会报错**，只会静默不生效：
 *   - 没有 _headers → HTML 被 CDN 长时间缓存，更新内容后访客看不到
 *   - /sw.js 被缓存 → 离线能力与更新机制失效
 *   - CSP 太紧 → 页面白屏但没有任何提示
 *
 * 这类问题在真实托管上才暴露，所以这里提前锁住。
 */
describe('Cloudflare Pages 配置', () => {
  const headersPath = 'public/_headers'
  const redirectsPath = 'public/_redirects'

  it('两个 Cloudflare 专用文件都存在', () => {
    expect(existsSync(headersPath), '缺少 public/_headers').toBe(true)
    expect(existsSync(redirectsPath), '缺少 public/_redirects').toBe(true)
  })

  it('Service Worker 不被缓存（否则离线能力与更新失效）', () => {
    const c = readFileSync(headersPath, 'utf8')
    expect(c).toMatch(/\/sw\.js[\s\S]*?Cache-Control:\s*no-cache/i)
    expect(c, 'sw.js 需要 Service-Worker-Allowed').toContain('Service-Worker-Allowed')
  })

  it('带 hash 的静态资源永久缓存', () => {
    const c = readFileSync(headersPath, 'utf8')
    expect(c).toMatch(/\/_next\/static\/\*[\s\S]*?immutable/i)
  })

  it('HTML 必须可重新验证（内容站不能被 CDN 长期缓存）', () => {
    const c = readFileSync(headersPath, 'utf8')
    // 必须有 no-cache / must-revalidate / max-age=0 之类的指令
    expect(c, 'HTML 缺少不可缓存策略').toMatch(/must-revalidate|max-age=0|no-cache/i)
  })

  it('安全响应头齐全', () => {
    const c = readFileSync(headersPath, 'utf8')
    for (const h of [
      'X-Content-Type-Options',
      'Referrer-Policy',
      'X-Frame-Options',
      'Content-Security-Policy',
    ]) {
      expect(c, `缺少 ${h}`).toContain(h)
    }
  })
  it('路径必须顶格，正文不能被误当成规则，静态头与函数头一致', () => {
    const text = readFileSync(headersPath, 'utf8')
    let path = ''
    for (const line of text.split(/\r?\n/)) {
      if (!line.trim() || line.trimStart().startsWith('#')) continue
      if (/^\s/.test(line)) {
        expect(path).not.toBe('')
        expect(line.trim()).toMatch(/^[A-Za-z][A-Za-z-]*:\s*.+/)
      } else {
        expect(line).toMatch(/^\//)
        expect(line).not.toBe('*/')
        path = line
      }
    }
    for (const [name, value] of Object.entries(SECURITY_HEADERS))
      expect(text).toContain(`${name}: ${value}`)
  })
  it('函数响应保留原状态和正文，API/后台/私人预览不缓存，HTML 可重新验证', async () => {
    for (const path of [
      '/api/site',
      '/admin/',
      '/tools/?admin-preview=1',
      '/tools/',
      '/sw.js',
      '/_next/static/app-a1.js',
    ]) {
      const response = deploymentHeaders(
        new Response('body', { status: 200, headers: { 'content-type': 'text/html' } }),
        new Request(`https://site.test${path}`),
      )
      expect(await response.text()).toBe('body')
      expect(response.headers.get('x-frame-options')).toBe('SAMEORIGIN')
      if (path.includes('/api/') || path.includes('/admin/') || path.includes('admin-preview'))
        expect(response.headers.get('cache-control')).toBe('no-store')
      else if (path === '/sw.js') expect(response.headers.get('cache-control')).toBe('no-cache')
      else if (path.startsWith('/_next'))
        expect(response.headers.get('cache-control')).toContain('immutable')
      else expect(response.headers.get('cache-control')).toContain('must-revalidate')
    }
  })

  it('CSP 允许同源脚本但禁止 eval（本站不需要 eval）', () => {
    const c = readFileSync(headersPath, 'utf8')
    const m = c.match(/Content-Security-Policy:\s*(.+)/)
    expect(m).not.toBeNull()
    const csp = m ? m[1] : ''
    expect(csp).toContain("default-src 'self'")
    expect(csp, 'CSP 不该允许 unsafe-eval').not.toContain('unsafe-eval')
    expect(csp, 'CSP 应限制 frame-ancestors').toContain('frame-ancestors')
    expect(csp, '不应允许 object-src').toContain("object-src 'none'")
  })

  it('目录式静态导出使用原生路由，不重写到会触发规范化跳转的 index.html', () => {
    const rules = readFileSync(redirectsPath, 'utf8')
      .split(/\r?\n/)
      .filter((line) => line.trim() && !line.trimStart().startsWith('#'))
    expect(rules).toEqual([])
    expect(readFileSync('next.config.ts', 'utf8')).toMatch(/trailingSlash:\s*true/)
  })

  it('package.json 的 build 产物就是 out（Cloudflare 要填这个目录）', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
    expect(pkg.scripts.build, 'build 脚本应产出 out/').toContain('build.mjs')
    // next.config.ts 的 output: 'export' 决定产物落在 out/
    const nextConfig = readFileSync('next.config.ts', 'utf8')
    expect(nextConfig, "next.config.ts 应设置 output: 'export'").toMatch(/output:\s*['"]export['"]/)
  })
})
