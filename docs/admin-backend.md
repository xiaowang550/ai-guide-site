# 管理后台部署指南

本文档只讲**如何把这个仓库的管理后台跑起来**。
架构选择的理由见 `deployment.md` 第一章与本文件末尾的「为什么是这个方案」。

**后台需要你在 Cloudflare 后台做一次性设置**，那几步我无法代做。
本地开发则完全不需要任何 Cloudflare 凭据。

---

## 一、方案一句话概括

公开站**仍然是纯静态导出**（134 个 HTML，构建方式、Lighthouse 满分、读者侧零后端成本全部不变），
在同一套 Cloudflare Pages 项目上多一层 **Pages Functions（`functions/`）+ D1（SQLite）**：

| 部分 | 放哪 | 运行时 |
|---|---|---|
| 公开页面 | `out/`（Next.js 静态导出） | 静态文件，读者侧无服务端 |
| 后台界面 | `out/admin/`（同一个静态导出里的一个页面壳） | 静态壳，数据全靠客户端拉 |
| 管理接口 | `functions/api/[[path]].ts` | Pages Functions |
| 内容 / 反馈 / 统计 / 历史 | D1 | SQLite |
| 内容同步 | 构建第一步 `scripts/sync-content.mjs` | 构建期 |

---

## 二、本地开发（不需要任何 Cloudflare 凭据）

```bash
npm install

# 1. 迁移基线数据进本地库（幂等，可重复执行）
npm run admin:seed

# 2. 起后台（Windows PowerShell）
$env:ADMIN_PASSWORD="换成你自己的密码-至少12位"
npm run admin:dev            # http://localhost:4100/admin/

# bash / zsh
ADMIN_PASSWORD="换成你自己的密码-至少12位" npm run admin:dev
```

首次访问 `/admin/` 用上面的密码登录，会**自动创建** `admin` 账号（见「初始管理员」一节）。

本地库是普通 SQLite 文件：`.data/admin-dev.db`（已在 `.gitignore` 里）。
想从零开始就删掉它再 `npm run admin:seed`。

### 本地验证「发布 → 公开站更新」

后台改完并发布之后，公开站要重新构建才会变：

```bash
# 指向本地后台，让同步脚本从它拉已发布内容
# PowerShell
$env:SITE_URL="http://localhost:4100"; npm run build
# bash / zsh
SITE_URL=http://localhost:4100 npm run build

npm run serve   # http://localhost:4000 打开 /tools/kimi/ 看效果
```

**`SITE_URL` 不设会回落到线上地址**（`NEXT_PUBLIC_SITE_URL`，再回落到 `ai-guide-site.pages.dev`）。
本地要验证后台改动就必须设，否则会拉到线上那份内容 —— 这不是 bug，是内容源的指向问题。

---

## 三、线上部署（一次性，需要你在 Cloudflare 后台操作）

### 第 1 步：创建 D1 数据库

```bash
npx wrangler d1 create ai-guide-site
```

命令会返回 `database_id`。把它填进 `wrangler.toml`：

```toml
[[d1_databases]]
binding = "DB"
database_name = "ai-guide-site"
database_id = "把刚才的 database_id 填在这里"
```

### 第 2 步：建表

```bash
npx wrangler d1 execute ai-guide-site --remote --file=db/schema.sql
```

13 张表、12 个索引。语句都是 `CREATE TABLE IF NOT EXISTS`，重复执行安全。

### 第 3 步：迁移现有内容

```bash
node --experimental-strip-types scripts/seed-content.mjs --remote
```

把仓库里 22 个工具资料灌成各自的**版本 1**。UPSERT，重复执行安全。

> 为什么仓库的 `data/*.ts` 还要保留？
> 因为它是全部 data 门禁的输入，也是内容源不可达时的兜底。
> D1 是**增量的编辑层**，不是内容的唯一存放处。
> 新增工具应该走 git（代码变更，需要评审），而不是后台新建。

### 第 4 步：加 D1 绑定

Cloudflare Pages → 你的项目 → **Settings → Bindings** → Add → **D1 database**，
变量名必须写 **`DB`**（对应 `wrangler.toml` 里的 `binding`）。

### 第 5 步：加两个 Secret

Cloudflare Pages → **Settings → Variables and Secrets** → Add → **Secret**（不是普通变量）：

| 名称 | 值 | 说明 |
|---|---|---|
| `ADMIN_PASSWORD` | 一个 ≥12 位的强密码 | 只在 `admins` 表为空时用来建第一个账号 |
| `SITE_SALT` | 一串随机字符串 | 登录限流与反馈限流的哈希盐，换站点就该换 |

`ADMIN_USERNAME` 已在 `wrangler.toml` 的 `[vars]` 里（默认 `admin`），可以改。

> **Secret 不要写进 `wrangler.toml` 的 `[vars]`** —— 那个文件会进 git。
> 密码只存在 Cloudflare 的 Secret 存储与你的浏览器密码库里。

### 第 6 步：确认 Functions 被识别

部署后打开 Pages 项目 → **Functions** 标签页，应该能看到一个 `/api` 路由。

**看不到的话后台就是完全不可用的**（`/admin/` 只会显示登录表单，任何接口都 404）。
此时检查仓库根目录有没有 `functions/` 目录、文件名是不是 `functions/api/[[path]].ts`
（双层方括号是必须的，它是「捕获任意多段路径」）。

### 第 7 步：首次登录

打开 `https://你的域名/admin/`，用 `ADMIN_PASSWORD` 登录。
系统会检测到 `admins` 表为空，自动创建 `admin` 账号（角色 `owner`）。

**建号之后 `ADMIN_PASSWORD` 这个变量就再也不被读取了。**
所以之后想改密码要走后台，而不是改 Secret —— 改 Secret 不会影响已有账号
（这一点有测试守着：`admin-auth.test.ts`）。

### 第 8 步：验证（6 项）

| # | 检查 | 怎么看 |
|---|---|---|
| 1 | 未登录时接口一律 401 | `curl -i https://你的域名/api/admin/dashboard` 应返回 401 |
| 2 | 公开内容接口可用且无需认证 | `curl https://你的域名/api/content/published` |
| 3 | 登录成功并拿到 Cookie | 浏览器登录，看 DevTools 里 `admin_session` 是 HttpOnly |
| 4 | 内容列表有 22 条 | 后台「内容」页 |
| 5 | **发布后公开站会更新** | 改一条 → 发布 → 等 2-4 分钟 → 刷新 `/tools/<id>/` |
| 6 | 控制台无报错 | DevTools → Console |

第 5 项是最容易出问题的一项，验证方法：

```bash
# 改完之后，等几分钟，再确认产物里已经是新内容
curl -s https://你的域名/tools/kimi/ | grep -o '你改的那句话'
```

---

## 四、部署后改了内容，为什么公开站不会立刻变

这是**有意设计**，不是故障：

```
后台发布 → 写入 D1（版本 +1，指针移动）
         → 你在后台看到的是 D1 的即时状态
公开站   → 下一次 Cloudflare 构建时，scripts/sync-content.mjs 拉取已发布内容
         → 与仓库基线做字段级比对，生成 data/generated/content-override.json
         → 合并进静态数据，重新生成全部页面
         → 部署（约 2-4 分钟）
```

这么做换来三个好处：
1. 公开站的构建过程**不需要任何凭据** —— 内容源是公开接口，
   不需要在构建环境里放 wrangler 登录态或 API Token（凭据管理是最容易在部署时出错的一环）。
2. 内容源临时不可达时，站点照常按基线发布，不会因为后台故障导致全站发不出去。
3. `data/*.ts` 仍是唯一基线，后台改出来的内容合并后要过**同一套 194 项 data 门禁** ——
   引用了不存在的工具、缺了能力维度，都会在 CI 里被抓到，而不是等线上才发现。

代价是发布到上线之间有 2-4 分钟延迟。后台在发布成功后会明确写出这段时间。

---

## 五、权限模型（必读）

| 接口 | 需要登录 | 说明 |
|---|---|---|
| `POST /api/admin/login` | 否 | 有频率限制，见下 |
| `GET /api/admin/session` | 否 | 未登录时返回 `{authenticated:false}`，不报错 |
| `GET /api/content/published` | 否 | **有意公开**，见下 |
| `POST /api/feedback` | 否 | 访客提交反馈，有频率限制 |
| `POST /api/collect` | 否 | 统计埋点，有频率限制 |
| 其余全部 `/api/admin/*` | **是** | 服务端逐接口校验会话，未登录一律 401 |

四条防线：

1. **会话令牌只存哈希**。Cookie 里是令牌明文，库里是 SHA-256。
   会话表泄露也无法直接冒用 —— 攻击者需要两者同时具备。
2. **写操作校验 Origin**。会话 Cookie 已是 `SameSite=Strict`，
   这一层是第二道防线：万一 Cookie 属性被改宽了，还能挡住诱导管理员发起的写请求。
3. **`ADMIN_PASSWORD` 只在 `admins` 表为空时生效一次**。
   改成「每次登录都同步」的话，知道这个 Secret 的人就能重置管理员密码。
4. **改密码会踢掉该账号的其他所有会话**，保留当前会话。
   不这么做的话，攻击者用旧密码建立的会话会一直有效到自然过期（最多 12 小时）。

### 为什么 `GET /api/content/published` 不需要认证

它返回的内容**本来就是公开的** —— 公开站每个页面都渲染了同样的数据。
用它做构建时同步，就完全不需要在构建环境里放任何凭据。

这一点看起来像个漏洞：任何人拿到这个 JSON 都能读到工具资料。
但他们本来就能从公开站的页面上读到同样的内容，所以这里没有额外泄露任何东西，
只是省掉了整套构建凭据管理。接口带 ETag，内容没变时返回 304。

### 登录限流的已知局限

连续 5 次失败锁定 15 分钟，限流键是 `SHA-256(站点盐 + 账号 + IP 的 /24 网段)`。

**换 IP 可以绕过。** 这是有意的取舍：本站没有引入更重的反滥用基础设施
（不想为了一个后台多上一套风控），锁住「同一账号短时间大量失败」能挡住最常见的撞库，
但挡不住有耐心的分布式尝试。这个限制写在后台登录页上。

---

## 六、隐私边界（与站点对外承诺一致）

统计与反馈**不记录任何可关联到个人的标识**：

| 记录 | 不记录 |
|---|---|
| 页面路径（按天聚合） | IP |
| 事件名（按天 × 路径聚合） | User-Agent |
| 反馈内容与可选联系方式 | 浏览器指纹、Cookie、localStorage 标识 |

- **没有独立访客数（UV）。** UV 必须靠跨请求可关联的标识来算，
  那等于用户画像。后台仪表盘因此不显示 UV 卡片，而不是显示一个「—」再写小字解释。
- **限流用的键是哈希后的值**，不是原始 IP。
- **唯一的例外**：`sessions.ip_prefix` 与 `login_attempts` 只存 IP 的 /24 掩码。
  「谁在什么时候登录」的安全审计确实需要网段级别的信息，而 /24 在 IPv4 上最多覆盖
  256 个地址，足够区分正常用户与撞库，又无法定位到具体某台机器。
  这两处允许为空，且从不上报。

---

## 七、内容可信度的额外防线

后台编辑的内容会经过**写入时校验**，不只是 CI：

`lib/admin/validate.ts` 会拒绝任何含**未加否定的「实测」**的内容 ——
本站对外承诺「不做自建评测」，管理员把「我们自己的实测」粘进 evidence 字段，
等于让站点对外做了虚假陈述，而 CI 抓不到（内容在 D1 里，不在仓库里）。

这条判据与 `lib/__tests__/claim-policy.test.ts` 用的是同一份否定词表，
`admin-schema.test.ts` 断言两边一致。

其余写入校验包括：14 个能力维度齐全且分数在 0-5、强项/弱项 3-5 条、
「别用它做」3 条、替代品不能包含自己且不能重复、`updatedAt` 由服务端注入（不能手填）。

`updatedAt` 不能手填是有意的：公开站的「超过 90 天未复核标可能已过时」完全依赖这个字段，
能手填就等于可以自己把过期内容标成新鲜的。

---

## 八、常见问题

### 后台能打开但一直显示登录失败

**Function 没被识别**（第 6 步）。检查 Pages 项目的 Functions 标签页里有没有 `/api` 路由。

或者 D1 没绑定：接口会返回 500 并带上明确的提示文案（`数据库未绑定：…变量名必须是 DB`）。

### 首次登录一直失败

`ADMIN_PASSWORD` 没有设成 **Secret**（设成普通变量也会生效，但会进 git，不安全），
或者 `admins` 表里已经有账号了 —— 这时 Secret 不再被读取，请用已有账号登录。

### 发布成功但公开站没变

按顺序排查：

1. **是不是还没到构建时间？** Cloudflare 上约 2-4 分钟。
2. **构建日志里 `[sync]` 那几行写了什么？**
   - 「没有需要覆盖的工具」→ 内容与基线一致，你的改动可能被回滚掉了
   - 「无可用内容源」→ 构建时拉不到内容，用了缓存或空覆盖
3. **本地构建记得设 `SITE_URL`**（见第二节）。

### 覆盖文件怎么清掉

```bash
rm -rf data/generated .cache
npm run build      # 会重新生成
```

### 想加一个管理员账号

目前只有 `admin:seed` 迁移和 `ADMIN_PASSWORD` 自动建号两条路径。
加账号需要直接写库（用 `scripts/` 下的脚本或 D1 控制台执行
`INSERT INTO admins …`，密码哈希用 `lib/admin/crypto.ts` 的 `hashPassword` 生成）。

---

## 九、为什么是这个方案（而不是别的）

| 方案 | 为什么没选 |
|---|---|
| 迁移到全栈平台（Vercel 等） | 要放弃 `output: 'export'`，构建变慢、Pages 部署链路要重建，改动面最大。而公开站的静态导出正是这个站的价值所在。 |
| 不引入数据库，走 Git | 后台写入后提交到仓库分支，Cloudflare 自动重建。零新基础设施，但发布要等 2-4 分钟构建，「预览」做不到独立于线上，修改历史只能靠 git 而不是产品功能，反馈与统计也没有真正的存放处。 |
| 继续纯静态 | 静态 HTML 里没有任何能判断「你是不是管理员」的地方，「所有管理接口在服务端验证权限」物理上无法实现。 |

选 Pages Functions + D1 的原因：与现有部署同源（一个 Pages 项目、同一个域名、Git 集成本来就有），
公开站的静态导出完全不受影响，而后台拿到的是真正的服务端权限校验、事务化的版本历史、
以及能落库的反馈与统计。

**代价要说明白**：D1 需要你去后台做一次性设置（第 3-6 步），
本地开发完全不需要凭据但用的是 SQLite 而不是 D1（同一套 SQL、同一套 handler，
差异只在驱动，本地测试跑的是真实 SQLite 引擎而不是 mock）。
