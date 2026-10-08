/**
 * Cloudflare Pages Functions 入口 —— 全部 /api/* 请求。
 *
 * Cloudflare Pages Functions 的路由约定是「文件名即路径」：
 *   functions/api/[[path]].ts   →   /api/*
 * 双层方括号表示捕获任意多段，所以 /api/admin/content/tool:kimi/publish
 * 也能命中同一个文件，路径解析在 handleApi 内部做。
 *
 * 这个文件刻意保持极薄：所有逻辑在 `lib/admin/api.ts` 里，
 * 那边是框架无关的标准 Request/Response，本地开发服务器跑的是同一份代码。
 * 所以本文件不做任何路由判断、不解析参数、不碰数据库 ——
 * 那些在别处测过的地方，这里就不重复一遍。
 *
 * 部署配置见仓库根目录的 `wrangler.toml`（D1 绑定、Functions 目录）。
 * 一次性后台设置步骤见 `docs/admin-backend.md`。
 */
import { handleApi } from '../../lib/admin/api'
import type { AdminEnv } from '../../lib/admin/api'
import type { D1Database } from '../../lib/db/d1'

interface PagesContext {
  env: {
    DB?: D1Database
    SITE_SALT?: string
    ADMIN_PASSWORD?: string
    ADMIN_USERNAME?: string
    /** 排查用，见 lib/admin/api.ts 里的 ADMIN_DEBUG 说明 */
    ADMIN_DEBUG?: string
  }
}

export const onRequest = async (context: PagesContext & { request: Request }): Promise<Response> => {
  const { request, env } = context

  if (!env.DB) {
    return new Response(
      JSON.stringify({
        error:
          '数据库未绑定。请在 Cloudflare Pages 项目的 Settings → Bindings 里' +
          '添加 D1 数据库，变量名必须是 DB（对应 wrangler.toml 里的 binding）。',
      }),
      {
        status: 500,
        headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
      }
    )
  }

  const adminEnv: AdminEnv = {
    DB: env.DB,
    SITE_SALT: env.SITE_SALT ?? '',
    ADMIN_PASSWORD: env.ADMIN_PASSWORD,
    ADMIN_USERNAME: env.ADMIN_USERNAME,
    ADMIN_DEBUG: env.ADMIN_DEBUG,
  }

  const response = await handleApi(request, adminEnv)
  if (response) return response

  return new Response('Not Found', { status: 404 })
}
