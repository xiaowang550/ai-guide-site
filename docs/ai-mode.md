# AI 模式：配置与排错

助手默认是**规则模式**：不联网、不花钱、离线可用，所有结论来自站内 `data/` 并附可点开的来源。
**AI 模式**是可选增强，可以接入 Space Bunny Alpha 等任意 OpenAI 兼容接口。

---

## 一、先理解一条硬约束

> 本站是 `output: 'export'` 纯静态导出，**没有服务端**。
> API Key 一旦写进前端 JS，就等于公开给所有访客 —— 任何人都能扒走并盗刷你的额度。

所以站内**不内置任何 Key**。只有两条路：

| 方式 | Key 存在哪 | 谁付钱 |
|---|---|---|
| 使用者自带 Key | 他的浏览器 | 使用者自己 |
| 自建代理（推荐） | 你的服务端环境变量 | 你（或限额） |

部署方式见 [deployment.md](./deployment.md#三形态-b部署-cloudflare-worker-代理推荐)。

---

## 二、配置步骤

设置 → **AI 模式**：

| 字段 | 说明 |
|---|---|
| 接口地址 | OpenAI 兼容的 chat completions 地址。自建代理就填代理地址 |
| 模型 | **必须是服务商要求的完整 ID**，见下表 |
| API Key | 自建代理时留空；直连服务商时填自己的 |
| 温度 | 站内问答求稳，0.3 及以下 |

### 常用通道

| 预设 | 地址 | 模型 ID | Key | 直连浏览器 |
|---|---|---|---|---|
| OpenRouter | `https://openrouter.ai/api/v1/chat/completions` | `stealth/space-bunny-alpha` | 需要 | ✅ |
| AIMLAPI | `https://api.aimlapi.com/v1/chat/completions` | `stealth/space-bunny-alpha` | 需要 | ✅ |
| Zen 免费通道 | `https://opencode.ai/zen/v1/chat/completions` | `space-bunny-free` | 免 Key | ❌ 必须走代理 |
| 自建代理 | `https://你的worker/v1/chat/completions` | 按上游 | 服务端持有 | ✅ |

> **模型 ID 必须写完整**：聚合平台用「厂商/模型」，例如 `stealth/space-bunny-alpha`。
> 只写 `space-bunny-alpha` 会返回 `400 is not a valid model ID`。
> 设置页会在你漏掉前缀时**当场提示并给出一键补全**。

---

## 三、「测试连接」按钮怎么用

点它会发一次最小请求，把**服务商返回的原文**直接显示出来。典型结果：

```
连接成功，助手可以切到 AI 模式使用
模型回复：可用
```

配置完成后还有一步很多人漏：**到右下角助手的面板里点「规则模式」切换成 AI 模式**。
设置页和助手面板都会给这个提示，并提供一键切换按钮。

---

## 四、提示词策略

助手给模型的上下文**不是整站数据**（几十万 token，既贵又稀释注意力），而是：

```
system：角色 + 硬性约束（只用给定事实、缺信息就说不知道、不要编造能力/价格/链接、
        必须同时说强项和弱项、面向教师学生、300 字内）
        + 站点定位摘要
        + 与本次问题最相关的 6 条站内内容（标题 + 链接 + 一句话）
user  ：「请用简体中文回答。」+ 原始问题
```

为什么这样设计：

- **可控**：模型能看到的事实越少，越不容易编
- **可溯源**：每条相关事实都带链接，回答下方会提示「重要结论请点开来源核对」
- **便宜**：上下文小，首字延迟低

---

## 五、故障排查表

下面每一条都是实际踩过的，症状与处理都写清楚了。

| 症状 | 服务商原文 | 原因 | 处理 |
|---|---|---|---|
| 模型不可用 | `space-bunny-alpha is not a valid model ID` | 模型 ID 少了 `厂商/` 前缀 | 补成 `stealth/space-bunny-alpha` |
| 完全连不上 | `Failed to fetch`（浏览器控制台） | 该通道不允许浏览器直连（CORS 预检失败） | 改用自建代理；Zen 通道必须走代理 |
| Key 报错 | `This request requires a valid API key` | Key 没填、复制不全，或用错了服务商的 Key | AIMLAPI 与 OpenRouter 的 Key 不通用 |
| 请求被拒 | `invalid request` / `invalid_request_error` | 只发了 `system` 消息、没有 `user` 消息 | 客户端已修：测试与真实问答都会带 user 消息 |
| 连上了但回复是空的 | — | 推理模型先输出 `reasoning_content`，`max_tokens` 太小正文被吃光 | 客户端已修：回落到推理内容，预算提到 512/1024 |
| 回复是英文 | `Hi! How can I help?` | 模型默认偏英文，只在 system 里要求不够稳 | 客户端已修：system 末尾 + user 开头双重中文约束 |
| 触发限流 | `429` | 上游限额或请求过密 | 稍后重试；代理侧也有基础限流 |
| 免费通道突然 404 | `OPTIONS → 404` | 上游改了 CORS 策略 | 继续走代理；代理只跟服务端通信 |

---

## 六、设计上的几个取舍

**为什么不默认开 AI 模式**：学校场景里，默认不联网意味着不花钱、不外传任何提问内容、离线可用。AI 模式是明确选择。

**为什么每条回答都标依据**：模型会编。给它的事实有限、并且告诉它「站内没有就说没有」，能显著降低编造，但不可能降到零。所以答案下方固定有一行「依据：…」，提醒点开来源核对。

**为什么不在代理里改写模型输出**：代理只做转发。任何"帮模型美化一下"的操作都会让错误更难被发现。透传原始响应和状态码，前端才有能力给出准确诊断。

**为什么保留规则模式**：即使 AI 挂了、没 Key、离线，助手依然能用——它查的是站内数据，能力不依赖外部服务。

---

## 七、代码位置

| 文件 | 职责 |
|---|---|
| `lib/ai-client.ts` | 配置读写、提示词构造、请求组装、响应解析、错误翻译、连通性测试 |
| `lib/assistant.ts` | 规则引擎（意图识别 + 站内回答）与 `extractSiteFacts`（给 AI 模式提供事实） |
| `components/assistant/assistant-panel.tsx` | 面板 UI，双模式分发 |
| `components/assistant/assistant-dock.tsx` | 浮窗、拖拽、按需加载面板 |
| `components/settings/ai-mode-settings.tsx` | 配置表单 + 预设 + 测试连接 + 安全提示 |
| `proxy/cloudflare-worker.js` | 生产代理（Cloudflare Worker） |
| `scripts/serve-out.mjs` | 本地预览服务器，附带开发用代理 |
| `lib/__tests__/ai-*.test.ts`、`model-id.test.ts`、`reasoning-model.test.ts` | 提示词、解析、错误翻译、推理模型、模型 ID 的测试 |