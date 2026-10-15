# 免费模型实测与每日维护

2026-10-15。仅使用站主已有连接；没有独立 Key 的额外平台不启用。

公开模型列表和后台默认模型列表只保留：官方零输入、零输出、零附加价格，账户目录允许，文字模型，当前连接的实际回答测试通过且证据在 36 小时内。新模型、失败、下架、改价、换 Key 或过期证据均不能直接调用。失败记录留在后台折叠诊断中，不作为可选模型。手动目录检查不会更新旧探测证据的时间。

GitHub Actions 每天 00:40 UTC（北京时间 08:40）执行 `.github/workflows/assistant-model-health.yml`，也可手动运行。任务从服务器读取候选目录，逐个发送固定中文测试并验证完成事件、正文及指令响应，单个测试最长 45 秒，间隔 3.5 秒。测试会消耗平台免费次数，成功结果立即可用，全部完成后记录最近每日检查时间。不充值、不转付费通道。

任务使用 GitHub OIDC 短期身份访问独立维护接口，仅允许指定仓库 main 分支上的这一个 schedule/workflow_dispatch 工作流。核验 RS256 签名、官方 JWKS、issuer、audience、仓库、分支、工作流路径和有效期；不向 Actions 提供模型 Key，也不授予管理员会话。平台 Key 始终留在服务端加密存储。后台手动批量检查走原有所有者鉴权。

推理控件依据官方 `reasoning.supported_efforts`、`mandatory`、`supports_max_tokens` 元数据。未公布档位不猜测，必选推理不提供关闭项，自动路由不发送虚构推理参数。选择支持的预算时，为输出预留额外 token 空间。练习模式对可关闭的模型优先低延迟，对必选推理采用已声明的最低档位或平台默认值。

OpenCode 候选同时要求官方定价页面的 Free 行、官方文字接口和实际目录 ID，不能仅凭 free 后缀加入。未配置 Key 不探测或展示为可用。Groq、Gemini 等需要独立免费账户；百炼新人额度有有效期，默认不是永久零价来源，本次按站主选择不新增这些连接。

自动测试覆盖白名单、失败过滤、换 Key、证据过期、幂等恢复、禁止测试目录外模型、零价路由、推理参数和 OIDC 范围/签名。浏览器界面验证使用明确模拟数据；生产结果以每日任务生成的报告为准，不把目录或模拟当作实测。

来源：[OpenRouter 官方目录](https://openrouter.ai/models?variant=free)、[模型 API](https://openrouter.ai/api/v1/models)、[官方推理参数](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens)、[OpenCode 免费定价](https://opencode.ai/v2/docs/console/models/)、[GitHub OIDC](https://docs.github.com/en/actions/reference/security/oidc)、[Groq 免费计划](https://console.groq.com/docs/rate-limits)、[百炼免费额度规则](https://help.aliyun.com/zh/model-studio/new-free-quota)。
