'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, KeyRound, ShieldAlert } from 'lucide-react'
import {
  aiConfigReady,
  KNOWN_MODELS,
  looksLikeMissingNamespace,
  readAiConfig,
  suggestFullModelId,
  testAiConnection,
  writeAiConfig,
  type AiConfig,
  type AiMode,
  type AiTestResult,
} from '@/lib/ai-client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const PRESETS = [
  {
    label: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'stealth/space-bunny-alpha',
    needKey: true,
    note: '需要你自己的 Key。注意模型 ID 必须写成 stealth/space-bunny-alpha',
  },
  {
    label: 'AIMLAPI',
    endpoint: 'https://api.aimlapi.com/v1/chat/completions',
    model: 'stealth/space-bunny-alpha',
    needKey: true,
    note: '同样需要自己的 Key，模型 ID 带 stealth/ 前缀',
  },
  {
    label: 'Zen 免费通道',
    endpoint: 'https://opencode.ai/zen/v1/chat/completions',
    model: 'space-bunny-free',
    needKey: false,
    note: '免 Key 免费用，但浏览器会被 CORS 拦截，必须走自建代理',
  },
  {
    label: '自建代理',
    endpoint: '',
    model: 'stealth/space-bunny-alpha',
    needKey: false,
    note: '推荐用于对外站点：Key 只留在服务端，浏览器只跟自己域名通信',
  },
]

/**
 * 判断这个地址是否需要代理才能从浏览器访问。
 * Zen 通道的 CORS 预检返回 404，直连必然失败 —— 提前告诉用户，
 * 否则他会在「测试连接」里看到一句无法理解的 Failed to fetch。
 */
function needsProxy(endpoint: string): boolean {
  return /opencode\.ai/i.test(endpoint)
}

/**
 * AI 模式配置区。
 *
 * 之所以放在设置页而不是助手面板里：Key 属于"账号级"信息，
 * 应该一次性、在明确告知风险的前提下填写，而不是每次聊天都看到。
 */
export function AiModeSettings() {
  const [config, setConfig] = useState<AiConfig | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<AiTestResult | null>(null)

  useEffect(() => {
    setConfig(readAiConfig())
  }, [])

  // SSR 阶段没有 localStorage，先不渲染；水合后由 useEffect 填上，避免布局跳动
  if (!config) return null
  const ready = aiConfigReady(config)

  function update(patch: Partial<AiConfig>) {
    setConfig(writeAiConfig(patch))
    // 配置一改，上次测试结论就过期了
    setTestResult(null)
  }

  /** 发一次最小请求，把服务商真实报错带回来 */
  async function runTest() {
    if (!config) return
    setTesting(true)
    setTestResult(null)
    const result = await testAiConnection(config)
    setTestResult(result)
    setTesting(false)
  }

  return (
    <div className="mt-2">
      <div className="border-t border-hairline py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-[16rem] flex-1">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              AI 模式
              {config.mode === 'live' ? (
                <span className="rounded bg-highlight/10 px-1.5 py-0.5 text-xs font-medium text-highlight">
                  已开启
                </span>
              ) : null}
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              关闭时助手是<strong className="text-foreground">规则模式</strong>：不联网、不花钱、离线可用，
              所有结论来自站内数据并附来源。开启后会把你输入的问题连同「站内最相关的几条事实」一起发给外部模型。
            </p>
          </div>
          <div className="flex shrink-0 gap-1.5">
            {(['rules', 'live'] as AiMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => update({ mode: m })}
                aria-pressed={config.mode === m}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs transition-colors',
                  config.mode === m
                    ? 'border-primary bg-primary/10 font-medium text-primary'
                    : 'text-muted-foreground hover:border-foreground/25'
                )}
              >
                {m === 'rules' ? '规则模式' : 'AI 模式'}
              </button>
            ))}
          </div>
        </div>

        {config.mode === 'live' ? (
          <div className="mt-5 space-y-5">
            {/* 安全提示 */}
            <div className="flex gap-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3.5">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
              <div className="text-sm leading-6 text-foreground/85">
                <p className="font-medium">请先理解这件事，再决定要不要开</p>
                <ul className="mt-1.5 space-y-1">
                  <li>本站是纯静态站点，<strong>没有服务端</strong>，所以站内不内置任何 Key。</li>
                  <li>
                    你填的 Key 只保存在这台设备的浏览器里，但只要页面开着，它就存在于这个浏览器 ——
                    共用电脑的人理论上能取到。
                  </li>
                  <li>
                    如果这是对外的站点，更稳妥的做法是部署一个自建代理（Edge Function / Worker）持有 Key，
                    这里只填代理地址。
                  </li>
                  <li>不要填写学校/学生的敏感信息：提问内容会离开这台设备。</li>
                  <li>
                    部分通道（如 Zen 免费通道）不允许浏览器直连，会被 CORS 拦掉 ——
                    这类必须配自建代理：仓库里的 <code className="font-mono">proxy/cloudflare-worker.js</code>
                    可直接部署，本地调试用
                    <code className="font-mono">AI_PROXY_UPSTREAM</code> 环境变量启动预览服务器即可。
                  </li>
                </ul>
              </div>
            </div>

            {/* 接口 */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                接口地址
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => update({ endpoint: p.endpoint, model: p.model })}
                    title={p.note}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs transition-colors',
                      config.endpoint === p.endpoint && p.endpoint
                        ? 'border-primary bg-primary/10 font-medium text-primary'
                        : 'text-muted-foreground hover:border-foreground/25'
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <input
                value={config.endpoint}
                onChange={(e) => update({ endpoint: e.target.value })}
                placeholder="https://openrouter.ai/api/v1/chat/completions"
                className="mt-2.5 h-9 w-full rounded-md border bg-background px-2.5 text-sm outline-none focus-visible:border-primary"
                aria-label="AI 接口地址"
              />
              {needsProxy(config.endpoint) ? (
                <p className="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-2.5 text-xs leading-5">
                  这个通道<b>不能从浏览器直接调用</b>（CORS 预检会失败，表现为
                  <span className="font-mono">Failed to fetch</span>）。需要先部署代理：
                  <ul className="mt-1 list-disc pl-4">
                    <li>
                      生产：把仓库里的 <code className="font-mono">proxy/cloudflare-worker.js</code>{' '}
                      部署到 Cloudflare Workers
                    </li>
                    <li>
                      本地：启动预览服务器时加环境变量{' '}
                      <code className="font-mono">AI_PROXY_UPSTREAM={config.endpoint}</code>，
                      然后把地址改填 <code className="font-mono">http://localhost:4000/api/chat</code>
                    </li>
                  </ul>
                </p>
              ) : null}
            </div>

            {/* 模型 */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                模型
              </p>
              <input
                value={config.model}
                onChange={(e) => update({ model: e.target.value })}
                placeholder="stealth/space-bunny-alpha"
                className="mt-2 h-9 w-full rounded-md border bg-background px-2.5 font-mono text-sm outline-none focus-visible:border-primary"
                aria-label="模型名称"
              />

              {/* 缺前缀是最高频的填错方式，这里主动提示而不是等 400 */}
              {looksLikeMissingNamespace(config.model, config.endpoint) ? (
                <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-2.5">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                  <p className="text-xs leading-5">
                    这个平台的模型 ID 必须写成
                    <strong className="font-mono">厂商/模型</strong>
                    的完整形式，只写模型名会报
                    <span className="font-mono">not a valid model ID</span>。
                  </p>
                  <button
                    type="button"
                    onClick={() => update({ model: suggestFullModelId(config.model) })}
                    className="rounded-full border border-amber-500/50 bg-background px-2.5 py-0.5 font-mono text-xs hover:bg-accent"
                  >
                    补全为 {suggestFullModelId(config.model)}
                  </button>
                </div>
              ) : null}

              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="self-center text-xs text-muted-foreground">常用：</span>
                {KNOWN_MODELS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    title={m.note}
                    onClick={() => update({ model: m.id })}
                    className={cn(
                      'rounded-full border px-2.5 py-0.5 font-mono text-xs transition-colors',
                      config.model === m.id
                        ? 'border-primary bg-primary/10 font-medium text-primary'
                        : 'text-muted-foreground hover:border-foreground/25'
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Key */}
            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <KeyRound className="h-3 w-3" aria-hidden />
                API Key（自建代理可留空）
              </p>
              <div className="mt-2 flex gap-2">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={config.apiKey}
                  onChange={(e) => update({ apiKey: e.target.value })}
                  placeholder="sk-…"
                  autoComplete="off"
                  spellCheck={false}
                  className="h-9 min-w-0 flex-1 rounded-md border bg-background px-2.5 font-mono text-sm outline-none focus-visible:border-primary"
                  aria-label="API Key"
                />
                <Button variant="outline" size="sm" onClick={() => setShowKey((v) => !v)}>
                  {showKey ? '隐藏' : '显示'}
                </Button>
                {config.apiKey ? (
                  <Button variant="outline" size="sm" onClick={() => update({ apiKey: '' })}>
                    清除
                  </Button>
                ) : null}
              </div>
            </div>

            {/* 温度 */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                温度：{config.temperature.toFixed(1)}
              </p>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={config.temperature}
                onChange={(e) => update({ temperature: Number(e.target.value) })}
                className="mt-2 w-full accent-[hsl(var(--primary))]"
                aria-label="生成温度"
              />
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                站内问答要的是稳定而不是文采，建议保持 0.3 及以下。
              </p>
            </div>

            <div className="border-t border-hairline pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={runTest} disabled={testing}>
                  {testing ? '测试中…' : '测试连接'}
                </Button>
                <span className="text-xs text-muted-foreground">
                  发一次最小请求，确认 Key / 模型 / 地址三者都对
                </span>
              </div>

              {testResult ? (
                <div
                  className={cn(
                    'mt-3 rounded-lg border p-3 text-xs leading-5',
                    testResult.ok
                      ? 'border-score-4/40 bg-score-4/5 text-foreground/85'
                      : 'border-danger/40 bg-danger/5 text-foreground/85'
                  )}
                >
                  <p className="font-medium">{testResult.message}</p>
                  {testResult.preview ? (
                    <p className="mt-1 text-muted-foreground">模型回复：{testResult.preview}</p>
                  ) : null}
                  {testResult.hint ? (
                    <p className="mt-1 text-muted-foreground">建议：{testResult.hint}</p>
                  ) : null}
                  {testResult.providerMessage ? (
                    <p className="mt-1.5 break-all text-xs text-muted-foreground">
                      服务商原始返回：{testResult.providerMessage}
                    </p>
                  ) : null}
                  <p className="mt-1.5 break-all text-xs text-muted-foreground">
                    实际请求：{testResult.endpointUsed} · {testResult.modelUsed}
                  </p>
                </div>
              ) : null}
            </div>

            {ready ? (
              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg bg-accent/40 p-3">
                <p className="text-xs leading-5">
                  配置完成后，还要在助手里打开 AI 模式：点右下角助手 → 面板标题旁的
                  <strong className="text-foreground">「规则模式」</strong> 按钮切换。
                </p>
                <button
                  type="button"
                  onClick={() => {
                    writeAiConfig({ mode: 'live' })
                    setConfig(readAiConfig())
                  }}
                  className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                >
                  帮我切到 AI 模式
                </button>
              </div>
            ) : null}

            <p
              className={cn(
                'flex items-center gap-1.5 text-xs',
                ready ? 'text-score-4' : 'text-amber-700 dark:text-amber-400'
              )}
            >
              {ready ? (
                <>配置完整，可以在右下角助手切到 AI 模式</>
              ) : (
                <>
                  <AlertTriangle className="h-3 w-3" aria-hidden />
                  还不完整：{!config.endpoint ? '缺接口地址 ' : ''}
                  {!config.apiKey && !config.endpoint.startsWith('https://api.aimlapi')
                    ? '缺 Key（或改用自建代理）'
                    : ''}
                </>
              )}
            </p>
          </div>
        ) : null}

        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          无论开关如何，规则模式永远可用 —— 即使没有 Key、离线、或服务商挂了，助手仍能给出基于站内数据的答案。
          AI 模式的回答由外部模型生成，<strong className="text-foreground">可能出错</strong>，
          助手会在每条 AI 回答下方标注依据，请点开来源自行核对。
          <Link href="/about#scoring" className="ml-1 underline underline-offset-2">
            为什么坚持先给依据
          </Link>
        </p>
      </div>
    </div>
  )
}