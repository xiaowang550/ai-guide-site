# Cloudflare Pages 部署指南

本文档只讲**如何把这个仓库部署到 Cloudflare Pages**。
部署形态的选择（纯静态 / 静态+Worker 代理 / 全栈）见 `deployment.md` 第一章。

---

## 一、准备：确认构建产物是自包含的

Cloudflare Pages 只托管静态文件，**没有 Node 运行时**。所以本站必须是纯静态导出 —— 已经是了：

```bash
npm run build     # 产物在 out/，120 个 HTML 页面
npm run serve     # 本地预览 http://localhost:4000
```

验证产物目录里有这两个文件（Cloudflare 靠它们配置响应头和路由）：

```
out/_headers       # 缓存策略 + 安全响应头
out/_redirects     # 目录式 URL 重写
```

站内测试 `lib/__tests__/cloudflare-config.test.ts` 会在构建前检查这两个文件的内容是否正确。

---

## 二、在 Cloudflare 后台连接仓库（一次性，约 3 分钟）

### 第1 步：登录并新建项目

打开 <https://dash.cloudflare.com> → 登录 → 左侧 **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**

### 第 2 步：选择仓库

在 GitHub 账号列表里选 `xiaowang550`，勾选 **`ai-guide-site`**，点 **Begin setup**。

### 第 3 步：填构建设置（关键，逐项照抄）

| 字段 | 填什么 | 为什么 |
|---|---|---|
| **Project name** | `ai-guide-site` | 会生成 `ai-guide-site.pages.dev` |
| **Production branch** | `main` | 与本地一致 |
| **Framework preset** | **`None`** | 本站不用 Next.js 运行时，preset 选错会让 Cloudflare 尝试 SSR |
| **Build command** | `npm run build` | 产出 `out/` |
| **Build output directory** | **`out`** | 不是 `public`，也不是 `.next` |
| **Root directory** | 留空 | 仓库根目录即项目根 |

### 第 4 步：环境变量

点 **Environment variables** → **Add variable**，加两个：

| 名称 | 值 | 说明 |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://ai-guide-site.pages.dev` | 换成你最终的域名。影响 sitemap / canonical / opengraph，**上线后要改成正式域名再部署一次** |
| `NODE_VERSION` | `22` | 让 Cloudflare 用 Node 22 构建，与本地一致 |

> `NEXT_PUBLIC_FEEDBACK_REPO` **不用设** —— `lib/site.ts` 里有默认值 `xiaowang550/ai-guide-site`。
> 如果将来想指向别的仓库，才需要加这个变量。

### 第 5 步：部署

点 **Save and Deploy**。第一次构建约 2-4 分钟（要 `npm ci`）。

---

## 三、部署完成后必须验证的 6 项

Cloudflare 的构建日志全绿**不等于**站点正常。以下每一项都实际打开页面确认：

| # | 检查 | 怎么看 | 出问题怎么办 |
|---|---|---|---|
| 1 | 首页能打开且样式正常 | 打开域名 | 看构建日志的 `产物校验` 是否通过 |
| 2 | 工具详情页能打开 | `/tools/kimi/` | 若 404，检查 `_redirects` 是否进了产物 |
| 3 | **响应头正确** | 打开 `curl -I https://你的域名/tools/` | 没有 `_headers` 里的策略就是文件没被识别 |
| 4 | **离线可用** | 浏览器 DevTools → Application → Service Workers 应有本站 | `/sw.js` 被缓存或 404，见下文排查 |
| 5 | 站内搜索能用 | 首页点搜索图标 | 搜索索引 `/search-index.json` 是按需拉取的，404 就是产物不全 |
| 6 | 控制台无报错 | DevTools → Console | CSP 拦了资源会在这里出现 |

命令行快速验证：

```bash
# 3. 缓存头与安全头
curl -I https://你的域名/tools/

# 4. Service Worker 可访问且不被缓存
curl -I https://你的域名/sw.js
#   期望：Cache-Control: no-cache

# 5. 搜索索引存在
curl -I https://你的域名/search-index.json
```

---

## 四、常见问题

### 页面白屏，控制台报 CSP 错误

`_headers` 里的 `Content-Security-Policy` 拦掉了资源。本站不引入任何第三方脚本，
所以 CSP 收得很紧。如果将来加了外部统计/字体，需要同步放宽对应指令
（改 `public/_headers`，**重新构建一次**才会生效 —— 这个文件是构建时复制的）。

### Service Worker 没生效

三个可能，按顺序查：

1. `curl -I 你的域名/sw.js` 是否 200
2. 响应头里 `Cache-Control` 是不是 `no-cache`（被缓存的 SW 不会更新，用户会卡在旧版本）
3. 是否 HTTPS —— Service Worker 只在安全上下文可用（`localhost` 除外）

更新 SW 时记得改 `public/sw.js` 里的 `CACHE_VERSION`，否则用户拿不到新缓存策略。

### 目录式 URL 404

Cloudflare Pages 默认就能把 `/tools/` 映射到 `out/tools/index.html`，
`public/_redirects` 只是显式声明。如果仍然 404，在 Cloudflare 后台的
**Settings → Builds & deployments → Header redirects and rewrites** 里确认文件已加载。

### 构建失败，报 Node 版本不对

Cloudflare 默认 Node 版本可能低于 22，而本站的 `package.json` 要求 `>=20`。
在环境变量里加 `NODE_VERSION=22`。

### 想换正式域名

1. 在 Cloudflare 的 Pages 项目里添加自定义域
2. 把 `NEXT_PUBLIC_SITE_URL` 改成正式域名
3. 重新部署一次（只改环境变量也会触发）

`canonical`、`sitemap`、`opengraph` 都读这个变量，不改的话搜索引擎会收录成 pages.dev 域名。

---

## 五、之后每次更新怎么做

```bash
git add -A && git commit -m "你的提交信息"
git push
```

Cloudflare 会自动构建并部署，几分钟后线上就是新版本。
构建日志在项目的 **Deployments** 页面，失败会同时给 GitHub 上一条 commit 标红
（由 `.github/workflows/ci.yml` 负责，那是另一道更严格的门禁）。

想回滚：在 **Deployments** 页面点旧版本右侧的 `...` → **Rollback to this deployment**。

---

## 六、也可以不用 Cloudflare 的 Git 集成

如果你更希望构建发生在 GitHub Actions 里（能看到日志、能手动触发），
用 Wrangler 直接上传：

```bash
npm run build
npx wrangler pages deploy out --project-name ai-guide-site
```

这种方式需要 `npx wrangler login` 登录，token 存在本地，同样不进入仓库。