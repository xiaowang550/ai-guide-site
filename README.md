# AI 能力地图（ai-guide-site）

中文优先的 **AI 学习与工具指南网站**。核心差异化是三件事：

1. **能力地图**：每个 AI 工具在 14 个维度上有分数、有打分依据、有强弱项与「别用它做」。
2. **场景决策器（/find）**：用户只说「我要干什么」，纯规则引擎算出「用哪个 + 为什么 + 怎么问」。
3. **AI 教育供给（/edu）**：面向本地学校的课程体系、教案包、AI 使用规范与定期简报。

一期为**纯静态站点**：零后端、零内置 API Key、零运行成本，可导出到 Vercel / Cloudflare Pages。

---

## 功能清单

### 内容与判断

| 模块 | 路由 | 说明 |
|---|---|---|
| 能力地图 | `/tools`、`/tools/[slug]` | 14 维雷达、强项/弱项/别用它做、价格表、上手三步、提示词模板 |
| 场景决策器 | `/find` | 纯规则引擎，输出首选 + 备选 + 组合工作流 + 提示词 + 避坑，可解释 |
| 工具对比 | `/compare` | 2–4 个并排，`?ids=` 可分享 |
| 知识库 | `/learn`、`/learn/[slug]` | 26 个概念（六段式）+ 56 条术语速查 |
| 教程 | `/guides`、`/guides/[slug]` | 6 篇方法课 + 7 篇场景实操课，含可复制提示词 |
| 案例库 | `/cases`、`/cases/[slug]` | 8 个案例，含**真实提示词原文** |
| 学习路径 | `/paths`、`/paths/[slug]` | 3 条阶梯路线，进度存本地 |
| 全站搜索 | `/search`、顶栏 `/` 快捷键 | Fuse.js 模糊搜索，索引按需加载 |

### AI 教育供给（面向本地学校）

| 模块 | 路由 | 说明 |
|---|---|---|
| 总览 | `/edu` | 三条原则、三类服务对象、教师四层 + 学生三层阶梯 |
| 课程体系 | `/edu/programs` | 11 门课程，标注版本与适用时间 |
| 课程与教案包 | `/edu/toolkits` | 8 套教案包，含教案结构、活动、讨论题、使用声明 |
| 课时排课表 | `/edu/toolkits/[slug]` | 把教案课时对到本校作息（每周天数 / 每天节次 / 每节分钟 / 停课日），可打印可复制 |
| AI 使用规范 | `/edu/policy` | 规范生成器：学段 + 学科 + 强度 → 条款 + 红线 + 学生声明 |
| 试点与推广 | `/edu/schools` | 8 所学校的阶段、阶梯进度与下一步 |
| 定期简报 | `/edu/briefings` | 「变了什么 / 意味着什么 / 建议动作」 |
| 答疑与反馈 | `/edu/support` | 20 条真实问答 + 提问模板 + 反馈闭环 |

### 数据保鲜（时效性保障）

| 模块 | 路由 / 命令 | 说明 |
|---|---|---|
| 保鲜看板 | `/freshness` | 全站内容按 6 类分级，公开新鲜 / 待复核 / 超期状态 |
| 保鲜引擎 | `lib/freshness.ts` | 纯函数，可单测；页面与构建门禁共用同一套判定 |
| 构建门禁 | `node scripts/freshness-check.mjs --strict` | 有超期内容直接 `exit 1`，挡住发布 |

阈值分级而非一刀切：工具能力 30 天算新、概念定义 180 天算新 —— 变化速度本就不同。

### 交互与体验

| 功能 | 位置 | 说明 |
|---|---|---|
| 站内 AI 助手 | 全站右下角浮窗 | 可拖到任意位置、可隐藏、设置页可恢复 |
| 新手引导 | 首次进入自动播放 | 4 步高亮引导，任何一步可跳过，播完不再打扰 |
| 设置中心 | `/settings` | 助手开关 / 停靠位置 / 重播引导 / 恢复默认 |
| 微交互层 | `components/motion` | 卡片光标高亮、滚动入场、阅读进度条、focus 增强、reduced-motion 三层兜底 |
| 勘误反馈闭环 | `/about#errata` | 结构化填写 + 本地队列 + 一键复制/邮件/GitHub Issue |
| 离线可用（PWA） | 全站 | Service Worker：HTML 网络优先、静态资源缓存优先，另有 `/offline` 兜底页 |
| 键盘可达 | 全站 | 搜索弹窗焦点陷阱 + 关闭后焦点归还；对比表横向滚动区可聚焦 |

---

## 关于本地存储的固有限制

助手位置、引导状态、主题等偏好存在浏览器 `localStorage`（`ai-map:settings:v1`），因此：

- **换设备、清缓存、无痕窗口关闭 → 偏好会重置**
- 不跨设备同步，不涉及账号，不上传服务器
- 想让学校统一管理这些偏好，就必须引入后端或第三方身份服务（如 Vercel Functions + KV、Supabase Auth），成本与运维复杂度会随之上升

这是「纯静态 + 零成本」这个前提的直接结果，不是遗漏。同理，助手默认的**规则模式**不联网、不调用任何大模型，所有结论来自 `data/` 并附可点开的来源。

---

## 可选：接入真实大模型（AI 模式）

助手支持切到 **AI 模式**（Space Bunny Alpha 等任意 OpenAI 兼容接口，如 AIMLAPI / OpenRouter），但有一条硬约束：

> 本站是 `output: 'export'` 纯静态导出，**没有服务端**。
> API Key 一旦写进前端 JS 就等于公开 —— 任何访客都能扒走并盗用。
> 因此站内**不内置任何 Key**，只支持两种你自己可控的方式：
>
> 1. **使用者自带 Key**：在 `/settings` 填入自己的 Key，只存在本机浏览器，请求由浏览器直连服务商。
> 2. **自建代理**：部署一个 Edge Function / Cloudflare Worker 持有 Key，把地址填到设置页，或构建时用环境变量指定。

```bash
# .env.local（自建代理场景）
NEXT_PUBLIC_AI_PROXY_URL=https://your-proxy.example.com/v1/chat/completions
NEXT_PUBLIC_AI_MODEL=stealth/space-bunny-alpha
```

对学校场景，默认保持「规则模式」通常更合适：不产生费用、不外传任何提问内容、离线可用。

**📄 完整说明见 [`docs/ai-mode.md`](docs/ai-mode.md)**：配置步骤、提示词策略、
以及一张故障排查表（含「模型 ID 缺前缀」「CORS 被拦」「推理模型回复为空」等实际踩过的坑）。

**部署上线见 [`docs/deployment.md`](docs/deployment.md)**：三种部署形态怎么选、
Cloudflare Worker 代理的逐步部署、上线前检查清单与目标性能值。

---

## 快速开始

```bash
npm install

npm run dev        # 开发服务器 → http://localhost:3000
npm run dev:reset  # 开发服务器出问题时用它干净重启（先杀进程再清 .next）

npm run build      # 静态构建，产物在 out/（期间不要开着 dev，见下方警告）
npm run serve      # 本地预览生产构建 → http://localhost:4000

npm run test       # Vitest：266 个用例
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
node scripts/generate-logos.mjs   # 重新生成 public/logos/*.svg
```

> **两个浏览入口，用途不同**
>
> | 地址 | 用途 | 特点 |
> |---|---|---|
> | http://localhost:4000 | **看成品**（推荐） | 服务 `out/` 静态产物，稳定，不会坏 |
> | http://localhost:3000 | 改代码时看效果 | Next dev，有热更新，但比 4000 脆弱 |
>
> ⚠️ **不要在 dev 运行时执行 `npm run build`。** Next 15.5 的 DevTools 在 Windows +
> 中文路径下有一个已知缺陷：构建会重写根目录的 `next-env.d.ts`，正在运行的 dev 监听到
> 文件变化后触发全量重编译，撞上该缺陷就会损坏客户端清单，表现为
> **CSS 变成 0 条规则 + 资源 404 + 页面 500**，也就是「浏览器里突然打不开」。
>
> 正确做法：先 `npm run build`（或直接用 4000 端口看），需要 dev 时再 `npm run dev`；
> 如果 dev 已经坏了，`npm run dev:reset` 可以恢复 —— 它会先结束所有残留的
> `next dev` / `start-server` 进程、确认端口真正释放，再清 `.next` 并重启。
>
> 同理，dev 每次只能有**一个**实例：旧进程没被完全结束就重启，Next 会自动换到
> 3001 / 3002，多个实例共用同一个 `.next` 互相写坏，症状与上面完全一样。

## 技术栈

| 层 | 选型 | 说明 |
|---|---|---|
| 框架 | Next.js 15（App Router）+ TypeScript strict | `output: 'export'` 纯静态导出 |
| 样式 | Tailwind CSS 3 + CSS 变量 design token | 深色模式一等公民（`class` 策略 + 防闪烁脚本） |
| 组件 | 手写 shadcn 风格原子组件 | 无额外运行时依赖，可控体积 |
| 图表 | 纯 SVG 雷达图 + CSS 评分条 | 不引重型图表库；移动端自动降级为条形 |
| 搜索 | Fuse.js 客户端模糊索引 | 同一套纯函数同时服务于 `/` 快捷键与 `/search` |
| 状态 | 仅 localStorage | 学习路径进度，不引全局状态库 |
| 质量 | ESLint + Prettier + Vitest | `npm run build` 与 `npm run test` 必须通过 |

## 目录结构

```
ai-guide-site/
├─ app/                     # 路由（每个文件夹即一条路由）
│  ├─ layout.tsx            # 根布局：顶栏 / 页脚 / 深色模式 / 搜索数据注入
│  ├─ page.tsx              # 首页
│  ├─ tools/                # 工具库 + 工具详情（14 维雷达、强弱项、上手三步）
│  ├─ find/                 # 场景决策器 + 公开权重表
│  ├─ compare/              # 2-4 工具并排对比（?ids= 驱动）
│  ├─ learn/                # 知识库 + 概念详情 + /learn/glossary 术语表
│  ├─ guides/               # 教程列表 + 教程详情（固定八段式结构）
│  ├─ paths/                # 学习路径 + localStorage 进度
│  ├─ cases/                # 案例库 + 含真实提示词原文的案例详情
│  ├─ updates/              # 更新雷达（数据变更日志）
│  ├─ about/                # 关于 / 我们怎么打分 / 勘误入口
│  ├─ search/               # 搜索结果页
│  ├─ edu/                  # ★ AI 教育服务专区（面向本地学校）
│  │  ├─ layout.tsx         #   专区子导航
│  │  ├─ page.tsx           #   总览：定位、三条原则、四层/三层阶梯、过程指标
│  │  ├─ programs/          #   课程体系 + 课程详情（大纲/交付物/常见错误/版本）
│  │  ├─ toolkits/          #   课程与教案包 + 教案详情（教案结构/活动/讨论题/声明）
│  │  ├─ policy/            #   AI 使用规范生成器（纯规则引擎）
│  │  ├─ schools/           #   试点学校与区域推广看板
│  │  ├─ briefings/         #   定期简报 + 简报详情
│  │  └─ support/           #   答疑与反馈回路（FAQ + 提问模板 + 反馈闭环）
│  ├─ sitemap.ts robots.ts  # SEO
│  └─ not-found.tsx         # 404 引导
├─ components/              # UI 组件（data 与 UI 严格分离）
│  ├─ ui/                   # button / badge / card / input / icon
│  ├─ layout 相关           # site-header / site-footer / theme-toggle / command-search
│  ├─ tool-*                # tool-card / tool-explorer / tool-logo
│  ├─ capability-*          # capability-bar / capability-radar（含文字替代表格）
│  ├─ score-badge pros-cons-card updated-badge prompt-block
│  ├─ compare-picker compare-table compare-workbench
│  ├─ scenario-wizard       # 决策器多步表单 + 可解释推荐结果
│  ├─ guide-explorer path-progress glossary-browser search-page
│  ├─ copyable-text         # 通用「一键复制文本块」
│  ├─ edu/                  # ladder / edu-metrics / policy-generator / faq-list / toolkit-explorer
│  └─ page-header           # PageHeader / Section / Breadcrumbs / EmptyState
├─ data/                    # ★ 全部内容数据，UI 不硬编码任何工具名与价格
│  ├─ types.ts              # 唯一数据契约（14 维 CapabilityKey + 教育模块类型）
│  ├─ tools.ts              # 18 个工具的完整档案
│  ├─ concepts.ts           # 16 个 AI 概念（六段式）
│  ├─ glossary.ts           # 40 条中英对照术语
│  ├─ guides.ts             # 13 篇教程（6 方法课 + 7 场景实操课）
│  ├─ prompts.ts            # 10 个可复制提示词模板
│  ├─ scenarios.ts          # 10 条场景规则（决策器权重表）
│  ├─ cases.ts paths.ts updates.ts
│  ├─ edu-programs.ts       # 教师四层 + 学生三层阶梯与课程
│  ├─ edu-toolkits.ts       # 8 套课程与教案包（版本化 + 替代关系）
│  ├─ edu-schools.ts        # 试点学校与推广阶段看板
│  ├─ edu-briefings.ts      # 定期简报（变了什么 / 意味着什么 / 建议动作）
│  ├─ edu-policy.ts         # AI 使用规范规则表（生成器数据源）
│  ├─ edu-faq.ts            # 答疑与反馈回路 FAQ
│  └─ index.ts              # 统一出口 + overallScore 计算 + 搜索索引（含 edu 文档）
├─ lib/                     # 纯函数层
│  ├─ score.ts              # 维度元数据、综合分加权、新鲜度判断
│  ├─ recommend.ts          # 决策器引擎（归一化 → 加权 → 约束加减分 → 可解释输出）
│  ├─ edu.ts                # 教育模块：指标统计、阶梯进度、规范生成、版本判定
│  ├─ search.ts site.ts entries.ts glossary.ts utils.ts
│  └─ __tests__/            # Vitest 单测（355 个用例）
├─ docs/
│  ├��� deployment.md          # 三种部署形态、Worker 代理部署、上线检查清单
│  ├─ ai-mode.md             # AI 模式配置、提示词策略、故障排查表
│  └─ 试点学校信息模板.md    # 填真实试点学校信息用（可直接发我）
├─ proxy/
│  └─ cloudflare-worker.js   # 生产用 AI 代理（可直接部署，无需构建）
├─ public/logos/            # 本地 SVG 标记（脚本生成，可换成官方素材）
└─ scripts/                 # 构建 / 预览 / 体检 / 资源生成脚本
```

## AI 教育服务模块（面向本地学校）

主站回答「哪个工具更强、怎么问才靠谱」，教育专区把这些方法**转成按学段与学科编排的课程与材料**，
并按版本管理。六个页面分别对应方案里的六项供给：

| 路由 | 对应方案条目 | 说明 |
|---|---|---|
| `/edu` | 部门定位与总方向 | 三条原则、三类服务对象、教师四层 + 学生三层阶梯、六种落地方式、职能组、过程指标 |
| `/edu/programs` | 教师端四层 / 学生端三层 | 11 门课程，含大纲模块与时长、交付物、常见错误清单、验收标准、关联站内材料 |
| `/edu/toolkits` | 课程与教案包 | 8 套教案包，含教案结构、课堂活动、讨论题、规范要点、可复制的学生使用声明 |
| `/edu/policy` | 评价方式 / 校级规范 | **AI 使用规范生成器**：选学段 + 学科 + 使用强度 → 规范草案 + 红线 + 学生声明 + 作业评价调整建议 |
| `/edu/schools` | 试点学校到区域推广 | 8 所学校的阶段、阶梯进度、已交付内容、校本化说明与下一步；含过程指标看板 |
| `/edu/briefings` | 更新机制 / 定期简报 | 5 期简报：本期变了什么、对学校意味着什么、建议动作（责任方 + 优先级） |
| `/edu/support` | 教师社群 / 常态化答疑回访 | 20 条真实问答、可复制的提问模板、反馈如何变成下一版内容 |

### 两条关键设计

**1. 规范生成器也是纯规则引擎**（`lib/edu.ts` 的 `generatePolicy`）
输入「学段 + 学科 + 使用强度」，按 12 条规则匹配、合并去重，输出条款、红线、学生声明与作业调整建议。
页面会显示**命中了哪几条规则**（便于学校质疑与修订）。32 种学段×学科组合全部有结果，不会出现空草案。

**2. 内容版本化**（`isCurrent` / `supersededBy`）
每份课程与教案包都有 `version`、`validFrom`、可选 `validTo` 与 `supersededBy`：
过期材料在列表与详情页都会被标成「已更新」，并直接给出替代它的新版本链接 —— 对应方案里
「内容实行版本化管理，过时内容及时下线」这条要求。

## 三条产品原则（代码里的落点）

| 原则 | 落地方式 |
|---|---|
| **可决策** | 每个页面都有明确结论：工具页给「最适合/别用它做」，`/find` 给首选+备选+工作流+提示词 |
| **有时效** | 所有数据带 `updatedAt` + `sources[]`；`UpdatedBadge` 在 >90 天时显示「可能已过时」；`/updates` 记录每一次变更 |
| **不吹不黑** | `Tool` 类型强制要求 `strengths[]` / `weaknesses[]` / `avoidFor[]`（3 条）；详情页用 `ProsConsCard` 三栏并列展示 |

## 场景决策器算法

```
1. 场景权重归一化        weights = Σ = 1
2. 基础适配分            base = Σ(维度分 / 5 × 归一权重) × 5      → 0..5
3. 硬过滤（直接淘汰）      必须免费 / 大陆直连 / 场景硬门槛维度（如做图要求 imageGen ≥ 3）
4. 软约束（加减分，±1.2） 中文优先 / 低预算 / 数据不出本机 / 要成品文件 / 不想折腾
5. 排序取前三             首选 + 2 个备选，并输出命中维度、加分项、扣分项
```

- 引擎：`lib/recommend.ts`，**不调用任何大模型 API**，同样的输入永远得到同样的结果。
- 每条结论可解释：结果卡里会显示命中了哪几个维度、贡献多少分、哪个条件扣了分。
- 权重表在 `/find` 页面底部公开，可直接质疑。

## 微交互层（components/motion）

全站只挂**一个** client 组件 `MotionLayer`（在 `app/layout.tsx`），用全局委托实现三件事，
避免给每张卡片都套 client 组件把整页变成客户端渲染。

| 能力 | 实现 | 设计约束 |
|---|---|---|
| 卡片光标高亮 `.spotlight` | 单个 `pointermove` 委托，写 `--mx/--my`，CSS 画径向渐变 | **不包 rAF**：两个 CSS 变量赋值开销可忽略，换来不依赖帧调度 |
| 进入视口入场 `.reveal` | rAF 节流的滚动检测 + 错峰延迟 `--d` | **刻意不用 IntersectionObserver**：它在后台标签页 / 无头浏览器不触发回调，一旦不触发内容就永久停在初始态 |
| 阅读进度条 | rAF 节流的 scroll，进度写 `scaleX` | 只有 `scrollHeight > 2.2×视口` 的长文页才显示，接近底部自动淡出 |

### 三层可访问性兜底

动效不能以「内容不可见」为代价，因此叠了三道保险：

1. **进场动画不动画 `opacity`，只动 `transform`** —— 即使过渡被冻结（无帧环境、省电模式），
   内容也只是偏了 12px，永远可读。
2. **`prefers-reduced-motion: reduce`** —— CSS 侧统一 `!important` 关掉所有动画与过渡，
   JS 侧直接跳过入场逻辑。
3. **`<noscript>` + 兜底定时器** —— 禁用 JS 时用 `noscript` 撤销初始位移；
   正常情况下 1.5 秒强制点亮「视口上下一个屏」内的元素，2.4 秒摘掉 `html.js-reveal`
   让入场规则整体失效（此时动画已播完，不会有视觉跳变）。

> 改这块时务必保持上述约束。踩过的坑：IntersectionObserver 不回调 + `opacity: 0`
> = 整页内容消失，且没有任何报错。

### 自动化门禁

两件事靠自觉一定会烂，所以写成了 GitHub Actions：

| 工作流 | 触发 | 做什么 | 失败时 |
|---|---|---|---|
| `.github/workflows/ci.yml` | 每次 push / PR | typecheck → lint → 测试 → 构建与产物校验 → 一致性审计 → 首屏体积对比基线 | 直接失败，挡住合并 |
| `.github/workflows/freshness.yml` | 每周一 01:20 UTC、手动触发、改 `data/` 的 PR | 保鲜检查生成 Markdown 报告 | 有内容超期就**开或更新一条 Issue**；恢复后自动关掉 |

为什么超期不让工作流直接失败：红一片的工作流会被习惯性忽略，
而一条写明「哪几条、过期多少天、怎么处理」的 Issue 才会被真的处理。
同一周只维护一条 Issue，不会每周堆一条新的。

> 前端仍然零凭据：CI 里的 token 只存在于 GitHub 自己的运行环境，
> 浏览器端没有任何密钥，反馈仍然走「预填链接 + 匿名读公开 API」。

---

## 性能基线

首屏体积是这类内容站最实在的质量指标，所以做了可复现的测量，而不是凭感觉。

```bash
node scripts/perf-baseline.mjs            # 打印当前数据
node scripts/perf-baseline.mjs --save     # 写入 perf-baseline.json
node scripts/perf-baseline.mjs --check    # 与基线对比，超出 5% 则退出码 1
node scripts/audit-client-data.mjs        # 检查 data/ 长文本是否泄漏到浏览器包
node scripts/audit-bundle.mjs             # 全站体积与单页预算
```

### 当前基线（gzip，真实首屏，不含 `noModule` polyfills）

| 页面 | 总计 | HTML | 框架 | 本页代码 |
|---|---|---|---|---|
| 首页 | 176.0 KB | 22.2 | 140.6 | 13.2 |
| 工具库 | 185.2 KB | 18.7 | 145.0 | 21.5 |
| 工具详情 | 195.9 KB | 40.2 | 140.6 | 15.0 |
| 场景决策器 | 226.6 KB | 16.6 | 186.1 | 24.0 |
| 知识库 | 167.1 KB | 18.5 | 135.5 | 13.2 |
| 案例库 | 167.7 KB | 13.9 | 140.6 | 13.2 |
| AI 教育服务 | 168.7 KB | 20.1 | 135.5 | 13.2 |
| 工具对比 | 202.7 KB | 40.4 | 145.0 | 17.3 |

框架底座（React + Next 运行时）约 135-186 KB，业务侧能优化的只有 HTML 与本页 chunk。

> **工具库那一行是优化来的**：原本 213.6 KB、HTML 47.0 KB。
> 原因是把完整 `Tool[]` 当 props 传给客户端组件做筛选，而强项/弱项/依据/来源
> 这些长文本卡片一个字都不用 —— 同一份内容在 HTML 和 RSC payload 里传了两遍。
> 改用 `lib/tool-list-item.ts` 的最小投影后 HTML 降到 18.7 KB（-60%）。

> **关于这次基线上涨（2026-10-05）**：全站涨了 5-10%，主因是内容变多 ——
> 工具 18→22（每个 14 个维度都要渲染）、概念 16→26、教程 9→13。
> 工具库 HTML 从 37.3 涨到 47.0 KB 就是这个原因，属于**渲染成本而非效率退化**。
>
> 需要留意的是框架部分也涨了约 2-5%：这一点**没有被完全解释**，
> 用 `audit-client-data.mjs --strict` 确认过没有新的 data/ 长文本进入共享 chunk
> （唯一的命中仍是既有的助手与 siteConfig），推测是新增 layout 组件导致的 chunk 重新分组。
> 如果后续继续增长，应当逐个 chunk 对比确认，而不是继续调基线。
>
> **调基线的正确顺序**：先 `audit-client-data.mjs --strict` 排除数据泄漏，
> 再确认增长能被内容量解释，最后才 `--save`。反过来就是在给退化发通行证。

### Lighthouse（本地预览，含 gzip 与缓存头）

每项跑 3 次取区间 —— 这台机器上单次结果波动可达 10 分，写单点数字没有意义。

| 页面 | 性能 | 无障碍 | 最佳实践 | SEO | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|
| 首页 | 90-93 | 100 | 100 | 100 | 2.6-3.0 s | 131-303 ms | 0 |
| `/tools` | 87-90 | 100 | 100 | 100 | 3.4 s | 141-229 ms | 0 |

对比本轮改动之前记录的值（首页 97、`/tools` 98），性能确有下降，主因同样是内容量增长：
工具 18→22、概念 16→26、教程 9→13，工具库 HTML 从 37.3 KB 涨到 47.0 KB。

> **首屏内容必须立即可见**：`.reveal` 的入场动画原本要等 hydration 跑完才点亮，
> 在 4× CPU 降级下让 `/tools` 的 LCP 多出 2.9 s 纯 Render Delay。
> 现在改为在 `</body>` 末尾放一段内联脚本，HTML 一解析完就点亮首屏，
> 滚动入场只留给下方内容（`app/layout.tsx` 的 `REVEAL_EAGER`）。
> `/tools` LCP 因此从 3.4 s 降到 2.4 s（该页最慢的一次实测）。
>
> 仍待处理：`/tools` 把 22 个工具的完整数据作为 props 传给 client 组件
> `ToolExplorer` 做客户端筛选，这是本 README「两条必须守住的规则」第 2 条的反例。
> 合理的改法是首屏只传列表所需字段（id / 名称 / logo / 总分 / 标签），
> 完整数据在用户真正筛选时再按需拉取。约 226 KB 的最重页（场景决策器）同理。

### 两条必须守住的规则

1. **client 组件禁止从 `@/data`（聚合出口）import**。
   聚合出口会连带 tools/cases/edu 全量数据，而且常常被提升进「所有页面都加载」的共享 chunk
   —— 等于全站替一段用不到的数据付下载成本。
   正确做法：server 组件计算好，把**用得到的字段**作为 props 传给 client 组件
   （参考 `ToolkitExplorer` 的 `toolRefs`：只传 id / name / logo）。
   常量与纯函数请从 `lib/edu-shared.ts` 取，不要从 `lib/edu.ts` 取（后者会拖入整个教育数据集）。

2. **不要把大数组当 props 传给常驻组件**。
   曾经把 `searchDocs` 从 layout 传给 `SiteHeader`，结果被序列化进**每个页面**的 HTML，
   每页多十几 KB。改为 `/search-index.json` 按需拉取后，首页 HTML 从 38.5 KB 降到 21.5 KB。

   同一个错在工具库页又犯了一次：把完整 `Tool[]` 传给客户端组件 `ToolExplorer` 做筛选，
   而强项/弱项/依据/来源这些长文本卡片根本不渲染。修法是定义最小投影
   `lib/tool-list-item.ts`（只留「筛选要用 + 卡片要显示」的字段，
   capabilities 只留分数不留 `basis`），HTML 从 47.0 KB 降到 18.7 KB。

   **怎么判断该传什么**：把客户端组件真正读到的字段列出来，只传那些。
   `ToolExplorer` 读了 12 个字段，而完整 `Tool` 有 25 个。

3. **改完要用 `perf-baseline.mjs` 量，别凭感觉**。
   体积回归不会报错、不会崩，只会让所有人慢慢变慢。

## 反馈闭环（勘误 / 需求）

本站没有后端，所以反馈通道刻意做成「**帮用户填好，然后由他自己送出去**」，而不是一个点完没动静的假表单。

| 出口 | 适用 | 说明 |
|---|---|---|
| 结构化填写 | 全部 | 页面 / 字段 / 问题 / 建议 / **依据链接** / 备注；必填校验 + 缺依据提醒 |
| 本地队列 | 全部 | 攒多条一起发；只存在本机浏览器，不上传；填一半关掉不丢 |
| 一键复制 | 全部 | 生成可直接入库的纯文本 |
| 邮件 | 全部 | 收件箱见 `lib/site.ts` 的 `feedbackEmail`；正文过长会提示改用复制 |
| GitHub Issue | 配置仓库后 | 预填标题与正文的 Issue 链接，**不需要 token**（用户自己的账号提交） |
| 反馈统计 | 配置仓库后 | 读公开 Issues API：总条数 / 待处理 / 被质疑最多的页面 |

> ⚠️ **为什么不给 GitHub token**：token 放在前端等于公开给所有访客，
> 泄露后别人能以你的名义改仓库、建 issue、提 PR。所以这里只做「预填链接」和「匿名读」。
>
> **配置仓库**：在 `.env.local` 里加 `NEXT_PUBLIC_FEEDBACK_REPO=owner/repo`，或改 `lib/site.ts`。
> 未配置时相关入口自动隐藏，复制与邮件两个出口始终可用。

读取公开 Issues 有速率限制，失败时统计面板**静默隐藏**，不会显示一个假的 0。

## 数据规范（改数据前请先读）

1. 组件里禁止硬编码工具名、模型名、价格 —— 一律来自 `data/`。
2. 每个工具必须有 `updatedAt` 与至少 1 条 `sources`。
3. 评分 ≥4 或 ≤2 的维度必须写 `basis`（依据）。
4. `strengths` 与 `weaknesses` 数量对等，`avoidFor` 恰好 3 条。
5. 不确定的数值标 `// TODO: verify`，不要留空字符串占位。
6. 改完数据后：`npm run typecheck && npm run test && npm run build`。

## 待替换的占位内容

- [ ] 站点名称 / 域名 / Logo（`lib/site.ts` 的 `siteConfig`）
- [ ] 品牌主色 HEX（`app/globals.css` 的 `--primary` / `--highlight`）
- [ ] 勘误邮箱（`app/about/page.tsx` 的 `1302582367@qq.com`）
- [ ] 教育专区咨询邮箱（`app/edu/support/page.tsx` 的 `edu@example.com`）
- [ ] 试点学校名单（`data/edu-schools.ts` 目前为示例数据，需替换为真实合作学校或明确标注为示例）
- [ ] `public/logos/*.svg` 换成厂商官方素材
- [ ] 是否需要英文版