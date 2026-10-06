# 部署指南

本站是**纯静态导出**（`output: 'export'`），产物在 `out/`。三种部署形态，按需选一种。

---

## 一、三种形态怎么选

| 形态 | 组成 | Key 安全性 | 适合 |
|---|---|---|---|
| **A. 纯静态**（默认） | 静态托管 `out/` | ✅ Key 只存在使用者浏览器 | 对外发布，但用户需自带 Key |
| **B. 静态 + Worker 代理**（推荐） | 静态托管 + Cloudflare Worker | ✅✅ Key 只在服务端环境变量 | 对外发布且希望用户免配置 |
| **C. 全栈** | Vercel 等带函数的平台 | ✅✅ 同上，但需放弃静态导出 | 需要更多后端能力时 |

**为什么推荐 B**：本站是纯静态站，前端没有服务端。如果让用户在设置页填自己的 Key，那 Key 就存在每个访客的浏览器里——共用电脑的人理论上能取到，额度也可能被盗刷。形态 B 用一个几行代码的 Worker 把 Key 藏在服务端，访客只跟自己的域名通信。

---

## 一点五、GitHub 相关的两个坑

这一节记录首次推送时踩到的两个问题，都不是配置写错，而是环境和权限模型的隐性规则。

### 坑 1：`github.com` 的 POST 可能被网络拦掉

| 请求 | 结果 |
|---|---|
| GET `github.com` / `api.github.com` | 正常 |
| **POST `github.com`** | 连接被重置（多次重试均失败） |

这会连带打掉两条常见路径：

- `gh auth login --web`（设备码流程的最后一步要POST 到 `github.com/login/oauth/access_token`）
  → 症状：浏览器授权成功，但 gh 一直卡住最后一步然后报 `failed to authenticate via web browser`
  → 绕法：改用 `--with-token`，在浏览器里生成 Personal Access Token 后用 `gh auth login --with-token`（纯本地写入凭据存储，不走网络）
- `git push`
  → 症状：`RPC failed; curl 55`、`Connection was reset`、`Could not connect to server`
  → 绕法：走 API，见下

如果`api.github.com` 可用而 `github.com` 不稳，用仓库里的 `scripts/push-via-api.mjs` 推送：它用 Git Data API 完成等价操作（建 blob → 建 tree → 建 commit → 更新 ref）。

**日常同步请正常使用 `git push`**，这个脚本只在网络异常时用。

### 坑 2：fine-grained token 推不了工作流文件

即使已经给了 `Contents: Read and write`，推送 `.github/workflows/` 下的文件仍会返回：

```
403 Resource not accessible by personal access token
```

原因：GitHub 把 `.github/workflows/` 当作**独立资源**，需要单独给 `Workflows` 权限。

**区分两个容易混淆的权限**：

| 权限 | 作用 |
|---|---|
| `Contents: Read and write` | 推代码、建blob/tree/commit |
| `Workflows: Read and write` | **推送 `.github/workflows/` 里的文件** |
| `Actions: Read-only` | 只读查看 Actions 日志，**不能**用来推工作流 |

**怎么确认是不是这个问题**：把 `.github/` 整个排除掉再推一次，通常就能过。

```bash
# 排除 .github 的树能建成、包含就403 -> 就是权限缺Workflows
```

### 顺带：空仓库不能直接建 blob

GitHub 不允许在空仓库里创建 blob（返回 `409 Git Repository is empty`）。先用 Contents API 放一个占位文件把仓库「叫醒」，再走 Data API。`scripts/push-via-api.mjs` 已经处理了这一步。

---

## 二、本地：把三种东西都跑起来

```bash
npm install

# 开发（改代码即时生效）
npm run dev                 # http://localhost:3000

# 生产构建
npm run build               # 产物在 out/

# 预览生产构建（带 gzip + 缓存头，对齐真实托管）
npm run serve               # http://localhost:4000
```

### 本地开启 AI 代理（用于验证形态 B）

```bash
# PowerShell
$env:AI_PROXY_UPSTREAM="https://opencode.ai/zen/v1/chat/completions"
npm run serve

# bash / zsh
AI_PROXY_UPSTREAM=https://opencode.ai/zen/v1/chat/completions npm run serve
```

启动日志会提示代理地址。然后在助手「设置 → AI 模式」里：

- 接口地址：`http://localhost:4000/api/chat`
- 模型：`space-bunny-free`（Zen 通道免 Key）或 `stealth/space-bunny-alpha`
- Key：留空

需要 Key 的上游再加一个环境变量：

```bash
$env:AI_PROXY_UPSTREAM="https://openrouter.ai/api/v1/chat/completions"
$env:AI_PROXY_KEY="你的key"
npm run serve
```

> ⚠️ **不要在 dev 服务器运行时执行 `npm run build`**。
> 构建会重写根目录的 `next-env.d.ts`，触发正在运行的 dev 全量重编译，
> 在 Next 15.5 上可能撞上其 DevTools 缺陷，表现为 CSS 变成空文件、页面 500。
> 顺序永远是：构建 → 起预览，或开发 → 构建（先把 dev 停掉）。

---

## 三、形态 B：部署 Cloudflare Worker 代理（推荐）

仓库里已备好 `proxy/cloudflare-worker.js`，**无需构建步骤**。

### 步骤

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create Worker**
2. 粘贴 `proxy/cloudflare-worker.js` 的全部内容 → **Deploy**
3. **Settings → Variables and Secrets** 添加两项：

   | 类型 | 名称 | 值 |
   |---|---|---|
   | Secret | `UPSTREAM_URL` | 上游地址，例如 `https://opencode.ai/zen/v1/chat/completions` |
   | Secret | `UPSTREAM_KEY` | 上游 API Key（Zen 通道免 Key 可不填） |

   > 用 **Secret** 而不是普通变量：Key 不会出现在代码和部署日志里。

4. 修改 Worker 代码顶部的 `ALLOWED_ORIGINS`，把你的站点域名加进去（保留 `http://localhost:4000` 便于本地调试）
5. 复制 Worker 域名，形如 `https://xxx.workers.dev`

### 接到助手里

设置 → AI 模式：

```
接口地址：https://你的worker域名/v1/chat/completions
模　型：space-bunny-free  或  stealth/space-bunny-alpha
API Key：留空（由 Worker 注入）
```

### Worker 已包含的保护

- 来源域名白名单（避免被别人白嫖额度）
- 每 IP 每分钟 30 次限流
- 只接受 `POST` 且路径必须以 `/chat/completions` 结尾
- **原样透传上游响应与状态码**（成功是 completion，失败是上游错误原文）—— 前端据此给出可操作提示，不在代理层吞错

---

## 四、形态 C：Vercel 全栈（可选）

如果将来需要更多后端能力（用户系统、内容后台），可以改成全栈部署：

1. `next.config.ts` 里把 `output: 'export'` 移除
2. 新建 `app/api/chat/route.ts`，逻辑与 `proxy/cloudflare-worker.js` 相同：

```ts
export const runtime = 'edge'

export async function POST(request: Request) {
  const origin = request.headers.get('Origin') ?? ''
  // TODO: 换成你自己的域名白名单
  const cors = { 'Access-Control-Allow-Origin': origin }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: { message: '只接受 POST' } }), { status: 405 })
  }

  const upstream = await fetch(process.env.UPSTREAM_URL!, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(process.env.UPSTREAM_KEY
        ? { authorization: `Bearer ${process.env.UPSTREAM_KEY}` }
        : {}),
    },
    body: await request.text(),
  })

  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...cors },
  })
}
```

3. 环境变量在 Vercel 项目设置里配 `UPSTREAM_URL` / `UPSTREAM_KEY`

**代价**：放弃纯静态导出后，构建产物变大、部署链路更重。只有真的需要后端时才值得。

---

## 五、上线前检查清单

```bash
npm run typecheck        # 类型
npm run lint             # 代码规范
npm run test             # 355 个单测
npm run build            # 构建（含产物校验：out/index.html 必须存在）
node scripts/freshness-check.mjs --strict   # 数据保鲜门禁：有超期内容会失败
node scripts/perf-baseline.mjs --check       # 体积基线：回退超 5% 会失败
node scripts/audit-client-data.mjs           # 确认 data/ 长文本没有泄漏进浏览器包
```

再跑一次真实 Lighthouse（需本机 Chrome）：

```bash
npx lighthouse http://localhost:4000/ \
  --output=json --output-path=./lh.json \
  --chrome-flags="--headless=new --no-sandbox" --quiet

node scripts/read-lighthouse.mjs lh.json
```

**目标值**（截至 2026-10 的一次实测）：

| 页面 | 性能 | 无障碍 | 最佳实践 | SEO | LCP |
|---|---|---|---|---|---|
| `/` | 97 | 100 | 100 | 100 | 2.3s |
| `/tools/` | 98 | 100 | 100 | 100 | 2.1s |
| `/find` | 98 | 100 | 100 | 100 | 2.1s |

### 别忘了这几件事

- [ ] `NEXT_PUBLIC_SITE_URL` 改成真实域名（`lib/site.ts` 的 `siteConfig.url` 也可改）
- [ ] 改品牌主色（`app/globals.css` 的 `--primary` / `--highlight`）
- [ ] 换掉占位邮箱（`/about` 的 `1302582367@qq.com`、`/edu/support` 的 `edu@example.com`）
- [ ] 品牌 Logo（`public/logos/*.svg` 目前是脚本生成的字母标记）
- [ ] `data/edu-schools.ts` 里的学校条目全部是示例数据。当前已做三层防护（`isSample: true` 标记 + 页面提示与徽章 + 测试断言），不会冒充真实成果。
      要替换成真实信息：按 [`试点学校信息模板.md`](./试点学校信息模板.md) 填好发我即可。
      **注意**：学校名称与教师人数属于机构真实信息，公开前需取得学校同意。
- [ ] 决定 `browserslist`：当前只面向现代浏览器（Chrome 111+ / Safari 16.4+）。如果学校里有老设备，要放宽

---

## 六、常见部署问题

| 现象 | 原因 | 处理 |
|---|---|---|
| 部署后样式全丢 | 平台没配 SPA fallback 或没部署整个 `out/` | 确认上传的是 `out/` 目录本身 |
| 刷新子页面 404 | 平台未开启 clean URL 重写 | 开启 "Pretty URLs" / fallback 到 `index.html` |
| 部署后仍是旧内容 | 平台缓存 | 带 hash 的资源设 immutable，HTML 设 `no-cache`；重新部署即可刷新 HTML |
| Worker 部署后 403 | `ALLOWED_ORIGINS` 没加你的域名 | 把站点域名加进数组 |
| Worker 报额度异常 | 上游返回 429 | 看日志里的透传错误，按上游限额处理 |