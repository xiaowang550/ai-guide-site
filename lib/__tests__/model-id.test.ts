import { describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_AI_CONFIG,
  KNOWN_MODELS,
  looksLikeMissingNamespace,
  suggestFullModelId,
  testAiConnection,
  type AiConfig,
} from '../ai-client'

const base: AiConfig = {
  ...DEFAULT_AI_CONFIG,
  mode: 'live',
  endpoint: 'https://openrouter.ai/api/v1/chat/completions',
  model: 'stealth/space-bunny-alpha',
  apiKey: 'sk-test',
}

describe('模型 ID 辅助（最高频的填错方式）', () => {
  it('识别缺少「厂商/」前缀', () => {
    expect(looksLikeMissingNamespace('space-bunny-alpha', 'https://openrouter.ai/api/v1/chat/completions')).toBe(true)
    expect(looksLikeMissingNamespace('space-bunny-alpha', 'https://api.aimlapi.com/v1/chat/completions')).toBe(true)
  })

  it('已有前缀 / 非聚合平台时不提示', () => {
    expect(looksLikeMissingNamespace('stealth/space-bunny-alpha', 'https://openrouter.ai/...')).toBe(false)
    expect(looksLikeMissingNamespace('space-bunny-alpha', 'http://localhost:8787/v1/chat/completions')).toBe(false)
    expect(looksLikeMissingNamespace('', 'https://openrouter.ai/...')).toBe(false)
  })

  it('能补全已知模型', () => {
    expect(suggestFullModelId('space-bunny-alpha')).toBe('stealth/space-bunny-alpha')
    expect(suggestFullModelId('space-bunny-free')).toBe('space-bunny-free')
  })

  it('补全时不破坏已填的 ID', () => {
    expect(suggestFullModelId('anthropic/claude-3')).toBe('anthropic/claude-3')
    expect(suggestFullModelId('some-unknown-model')).toBe('some-unknown-model')
  })

  it('聚合平台用的模型都是完整 ID（Zen 通道除外）', () => {
    // space-bunny-free 走 OpenCode Zen 通道，它本身就不带厂商前缀
    const aggregatorModels = KNOWN_MODELS.filter((m) => m.id !== 'space-bunny-free')
    expect(aggregatorModels.length).toBeGreaterThan(0)
    for (const m of aggregatorModels) {
      expect(m.id).toContain('/')
    }
  })
})

describe('testAiConnection 对「模型 ID 不合法」的处理', () => {
  it('服务商说 not a valid model 时，直接给出补全后的正确写法', async () => {
    const f = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ error: { message: 'space-bunny-alpha is not a valid model ID', code: 400 } }),
          { status: 400, headers: { 'content-type': 'application/json' } }
        )
    ) as unknown as typeof fetch

    const r = await testAiConnection({ ...base, model: 'space-bunny-alpha' }, f)
    expect(r.ok).toBe(false)
    expect(r.hint).toContain('stealth/space-bunny-alpha')
    expect(r.providerMessage).toContain('not a valid model')
  })

  it('其他 400 不误导成模型问题', async () => {
    const f = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: { message: 'max_tokens is too large' } }), {
          status: 400,
          headers: { 'content-type': 'application/json' },
        })
    ) as unknown as typeof fetch

    const r = await testAiConnection(base, f)
    expect(r.hint).toBeTruthy()
    expect(r.hint).not.toContain('厂商/模型')
  })
})