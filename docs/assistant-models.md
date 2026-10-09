# 免费模型学习助手

公开站的「小芽」提供模型选择、流式对话、停止生成、保留本次会话、提示词实验和站内查找。访客无需网站账号。生成结果旁的教程链接、学习夹和工具对比是实际的站内功能。

管理员在 **管理后台 → 站点设置 → 免费模型与站内助手** 填写 OpenRouter Key。太空兔使用 OpenCode 独立入口，需要另填 OpenCode Zen Key；OpenRouter 当前的太空兔端点没有可用提供商，因此不能借用 OpenRouter Key 调用 OpenCode。连接状态表示已配置凭据，具体模型可用性以服务端响应为准。

目录从 OpenRouter 官方模型 API 获取，每小时重新核验，保留所有当前零价格模型，包括不用于文字助手的音频条目。调用名单必须具有明确的零输入、零输出及零附加费用；不会把 `:free` 字样当作价格证据。缓存过期且无法重新核验时停止 OpenRouter 推理。请求固定零价提供商约束，不自动转到付费模型。

共享 Key 使用独立 `AI_CREDENTIALS_KEY` Secret 经 AES-GCM 加密，数据库只保存密文。Key 不进入前端、浏览器存储、审计详情或 Git。加密 Secret 已配置在 Cloudflare；不要随意替换它，否则已保存的连接需要重新填写。也可使用服务端 `OPENROUTER_API_KEY` / `OPENCODE_API_KEY` Secret。

默认全站每日 30 次请求，管理员可以调整；每个临时访客限流键每日 10 次、每分钟 4 次，同时最多两份生成。请求计数按 UTC 日重置，不等于平台剩余额度。限流键使用每日变换的站点盐哈希，不存原始 IP 或对话正文。平台的免费额度、排队与预览状态仍会影响调用。

站内上下文由当前已发布工具资料和本次构建的公开知识目录提供，已关闭模块不参与检索。模型回答按普通文字呈现，站内操作链接独立来自已验证目录，不由模型文本决定管理员权限。

验证包括价格过滤、权限、密钥加密、零价路由、中文 SSE 分片、错误及中断处理、额度、模态焦点、移动布局、实际查找与收藏。用户尚未提供 Key 时，用明确的接口和界面测试数据验证流式链路，不宣称已经完成真实外部模型推理。

参考：[官方模型 API](https://openrouter.ai/api/v1/models)、[OpenRouter 流式接口](https://openrouter.ai/docs/api_reference/streaming)、[OpenRouter 额度](https://openrouter.ai/docs/api_reference/limits)、[太空兔端点](https://openrouter.ai/api/v1/models/stealth/space-bunny-alpha/endpoints)、[OpenCode 模型](https://opencode.ai/zen/v1/models)。
