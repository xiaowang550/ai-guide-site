import { createD1Db } from '../lib/db/d1'
import { readSiteConfig } from '../lib/admin/modules'
import { moduleForPath, pathEnabled } from '../lib/site-modules'
import { verifySession, parseCookies, SESSION_COOKIE } from '../lib/admin/auth'
import type { AdminEnv } from '../lib/admin/api'
import { deploymentHeaders } from '../lib/deployment-headers'
interface Context {
  request: Request
  env: AdminEnv
  next: () => Promise<Response>
}
async function route(context: Context) {
  const url = new URL(context.request.url)
  if (
    !moduleForPath(url.pathname) ||
    url.pathname.startsWith('/api/') ||
    /\.(?:js|css|svg|webp|png|json)$/.test(url.pathname)
  )
    return context.next()
  const db = createD1Db(context.env.DB)
  const config = await readSiteConfig(db)
  if (pathEnabled(config, url.pathname)) return context.next()
  const token = parseCookies(context.request.headers.get('cookie') ?? '')[SESSION_COOKIE]
  if (
    url.searchParams.get('admin-preview') === '1' &&
    token &&
    (await verifySession(db, token))?.role === 'owner'
  )
    return context.next()
  return new Response(
    '<!doctype html><meta charset="utf-8"><title>栏目暂时关闭</title><main style="font-family:system-ui;max-width:680px;margin:15vh auto;padding:24px"><h1>这个栏目暂时关闭</h1><p>其他学习内容仍可直接浏览，无需登录。</p><a href="/">返回首页</a></main>',
    {
      status: 404,
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
    },
  )
}
export async function onRequest(context: Context) {
  return deploymentHeaders(await route(context), context.request)
}
