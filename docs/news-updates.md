# AI 实时资讯与工具维护

公开入口沿用 `/updates/`。原更新雷达页面保存在 `archive/update-radar/`，原数据在 `data/updates.ts`；只有所有者能通过后台“更新雷达（保留）”查看。它不进入公开页面、搜索或前端数据导出。

## 当前更新方式

- 资讯采集：每 30 分钟检查 9 个固定官方来源（OpenAI、Anthropic、Google、DeepSeek、Qwen、GitHub Copilot、Cursor、Ollama、Kimi）。网页可见时每分钟读取最新消息。按官方发布时间排序，获取时间单独显示。
- 获取失败：保留已有消息，显示获取状态；不用采集时间替代发布时间，也不把历史消息标成“刚发布”。
- 中文摘要：初始重点消息已人工整理。新消息先显示官方标题和链接，管理员可补充中文标题、短摘要和适用人群，或隐藏消息。不会自动编造全文、翻译结论或厂商价格。
- 工具档案：有近期官方动态时生成对应复核待办。另每 6 小时检查全部已收录工具的定价或官方页面公开正文；检测到变化只创建待办。页面需登录、正文无法读取或请求失败会在后台明确提示人工核验。正文变化可能由版式修改引起，需要核实。
- 人工复核日期和采集日期分开。`data/tool-reviews.ts` 保存本次已核对的工具修订；新的管理员编辑优先。`scripts/sync-reviewed-tools.mjs` 可将这些修订合入本地数据库，保留旧版本，跳过未发布草稿。

同步有数据库锁、超时、响应大小限制及固定官方域名校验。服务端只保存消息标题、日期、链接和管理员的短说明。所有资讯编辑、采集状态和原雷达数据均通过所有者权限校验；公开资讯响应不缓存。

## 本地运行

`npm run admin:dev` 同时提供静态页面与真实 SQLite API。启动时立即检查，之后定期执行。电脑及开发服务停止后，本地任务也停止。访问量统计和管理接口沿用现有后台。

```powershell
node --experimental-strip-types scripts/sync-reviewed-tools.mjs
$env:SITE_URL='http://127.0.0.1:4100'
npm run build
npm run admin:dev
```

## 上线持续运行

Pages Functions 使用已有 DB 绑定，并在公开资讯请求的后台执行到期检查。即使无人访问也持续检查，需要部署独立的定时 Worker。`workers/news-refresh.ts` 和 `wrangler.news.toml` 已准备好，共享现有 D1，每半小时执行。

```powershell
npx wrangler deploy --config wrangler.news.toml
```

本次仅完成本地修改与验证，未发布网站，也未部署云端定时任务。上线时先核对 `wrangler.news.toml` 的 D1 绑定；现有后台 schema 须已创建，资讯与来源检查专用表由服务首次使用时补齐。Worker 没有公开采集或管理入口，不需要暴露管理员密码。

## 增加来源

在 `lib/news/sources.ts` 添加固定官方地址、允许域名、解析方式与关联工具。同步维护解析测试。来源没有可靠发布时间时，不把它当资讯自动发布；可使用工具来源检查将变化交给管理员复核。全部工具的固定资料入口在 `lib/news/tool-sources.ts`；新增工具时同步维护这个列表。首次采集不表示已完成所有工具资料的复核。
