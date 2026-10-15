import type { Db } from './db/types.ts'
import type { FreeModel } from './assistant-models.ts'
import { isTaskModel, isClassificationOnlyReply } from './assistant-models.ts'
import { fromBase64Url, toBase64Url, sha256Base64Url } from './admin/crypto.ts'
import { json, fail, readJson } from './admin/http.ts'
import { checkExternalHost, externalBaseUrl } from './assistant-external-url.ts'
import { consumeGeneration, upstreamFailure, UpstreamError } from './assistant-upstream.ts'
import { HEALTH_TTL_MS } from './assistant-health.ts'

interface ExternalEnv {
  AI_CREDENTIALS_KEY?: string
  ASSISTANT_FETCH?: typeof fetch
}
function externalFailure(error: UpstreamError) {
  const code = error.code
  const reason =
    code === 401 || code === 403
      ? 'Key 被拒绝，或账号没有这个模型的权限。'
      : code === 429
        ? '接口限流或额度不足，可以稍后复测。'
        : code === 402
          ? '这个接口的账户额度不足。'
          : code === 404
            ? '接口地址或模型不存在，请检查服务商的模型目录。'
            : code === 400 || code === 422
              ? '接口不接受当前模型或聊天参数。'
              : '接口暂时不可用，可以稍后复测。'
  return reason + `（HTTP ${code}）`
}
interface Source {
  id: string
  name: string
  base_url: string
  credential: string
  run_id: string
  discovered_at: string | null
  error: string | null
  catalog_count: number
  paused: number
}
interface Candidate {
  id: string
  source_id: string
  remote_id: string
  name: string
  run_id: string
  state: 'pending' | 'testing' | 'passed' | 'failed'
  published: number
  checked_at: string | null
  latency_ms: number | null
  first_token_ms: number | null
  error: string | null
  code: string | null
  probe_token: string | null
  probe_started_at: number | null
  hidden: number
  alias: string | null
}
const SCHEMA = `CREATE TABLE IF NOT EXISTS assistant_external_sources(
id TEXT PRIMARY KEY,name TEXT NOT NULL,base_url TEXT NOT NULL,credential TEXT NOT NULL,run_id TEXT NOT NULL,
discovered_at TEXT,error TEXT,catalog_count INTEGER NOT NULL DEFAULT 0,paused INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS assistant_external_models(
id TEXT PRIMARY KEY,source_id TEXT NOT NULL,remote_id TEXT NOT NULL,name TEXT NOT NULL,run_id TEXT NOT NULL,
state TEXT NOT NULL,published INTEGER NOT NULL DEFAULT 0,checked_at TEXT,latency_ms INTEGER,first_token_ms INTEGER,
error TEXT,code TEXT,probe_token TEXT,probe_started_at INTEGER,hidden INTEGER NOT NULL DEFAULT 0,alias TEXT);
CREATE INDEX IF NOT EXISTS assistant_external_models_source ON assistant_external_models(source_id);`
export async function ensureExternal(db: Db) {
  await db.exec(SCHEMA)
}
async function cryptoKey(secret: string | undefined) {
  if (!secret || secret.length < 32) throw Error('服务端尚未配置密钥加密。')
  const bytes = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode('assistant-external:v1:' + secret),
  )
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt'])
}
async function seal(env: ExternalEnv, id: string, url: string, value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(id + '\n' + url) },
    await cryptoKey(env.AI_CREDENTIALS_KEY),
    new TextEncoder().encode(value),
  )
  return JSON.stringify({
    iv: toBase64Url(iv),
    ciphertext: toBase64Url(new Uint8Array(ciphertext)),
  })
}
async function unseal(env: ExternalEnv, source: Source) {
  const stored = JSON.parse(source.credential)
  const clear = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: fromBase64Url(stored.iv) as BufferSource,
      additionalData: new TextEncoder().encode(source.id + '\n' + source.base_url),
    },
    await cryptoKey(env.AI_CREDENTIALS_KEY),
    fromBase64Url(stored.ciphertext) as BufferSource,
  )
  return new TextDecoder().decode(clear)
}
async function limitedText(response: Response, max = 1024 * 1024) {
  if (!response.body) throw Error('接口没有返回内容。')
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const next = await reader.read()
      if (next.done) break
      size += next.value.length
      if (size > max) throw Error('接口返回内容过大。')
      chunks.push(next.value)
    }
  } finally {
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.length
  }
  return new TextDecoder().decode(bytes)
}
/** Some compatible endpoints return ordinary JSON even when stream:true. */
export async function externalResponse(response: Response) {
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json'))
    return response
  const data = JSON.parse(await limitedText(response, 100000)) as {
    model?: string
    choices?: { message?: { content?: unknown }; finish_reason?: string }[]
  }
  const content = data.choices?.[0]?.message?.content
  if (typeof content !== 'string' || !content.trim()) throw new UpstreamError(502)
  return new Response(
    'data: ' +
      JSON.stringify({
        model: data.model,
        choices: [
          { delta: { content }, finish_reason: data.choices?.[0]?.finish_reason ?? 'stop' },
        ],
      }) +
      '\n\ndata: [DONE]\n\n',
    { headers: { 'content-type': 'text/event-stream' } },
  )
}
function fresh(model: Candidate) {
  const age = Date.now() - Date.parse(model.checked_at ?? '')
  return model.state === 'passed' && age >= 0 && age <= HEALTH_TTL_MS
}
function publicCandidate(model: Candidate) {
  return {
    id: model.id,
    name: model.alias ?? model.name,
    originalName: model.name,
    state: model.state === 'passed' && !fresh(model) ? 'pending' : model.state,
    published: !!model.published,
    checkedAt: model.checked_at,
    latencyMs: model.latency_ms,
    firstTokenMs: model.first_token_ms,
    error: model.error,
    code: model.code,
  }
}
export async function externalSummary(db: Db) {
  await ensureExternal(db)
  const sources = await db.all<Source>('SELECT * FROM assistant_external_sources ORDER BY name,id')
  const models = await db.all<Candidate>('SELECT * FROM assistant_external_models ORDER BY name,id')
  return {
    sources: sources.map((source) => ({
      id: source.id,
      name: source.name,
      baseUrl: source.base_url,
      runId: source.run_id,
      discoveredAt: source.discovered_at,
      error: source.error,
      catalogCount: source.catalog_count,
      paused: !!source.paused,
      deletedCount: models.filter(
        (m) => m.source_id === source.id && m.run_id === source.run_id && m.hidden,
      ).length,
      models: models
        .filter((m) => m.source_id === source.id && m.run_id === source.run_id && !m.hidden)
        .map(publicCandidate),
    })),
  }
}
export async function externalModels(db: Db): Promise<FreeModel[]> {
  await ensureExternal(db)
  const rows = await db.all<Candidate & { source_name: string }>(
    `SELECT m.*,s.name AS source_name FROM assistant_external_models m JOIN assistant_external_sources s ON s.id=m.source_id AND s.run_id=m.run_id WHERE m.published=1 AND m.state='passed' AND m.hidden=0`,
  )
  return rows.filter(fresh).map((m) => ({
    id: m.id,
    name: m.alias ?? m.name,
    provider: 'custom',
    sourceName: m.source_name,
    context: 0,
    vision: false,
    reasoning: false,
    tools: false,
    available: true,
    note: '外部连接 · 已通过实际回答测试',
    verifiedAt: m.checked_at!,
    firstTokenMs: m.first_token_ms,
  }))
}
export async function externalConnection(
  db: Db,
  env: ExternalEnv,
  modelId: string,
  ownOrigin: string,
) {
  await ensureExternal(db)
  const candidate = await db.first<Candidate>(
    'SELECT * FROM assistant_external_models WHERE id=?',
    [modelId],
  )
  const source = candidate
    ? await db.first<Source>('SELECT * FROM assistant_external_sources WHERE id=?', [
        candidate.source_id,
      ])
    : null
  if (
    !candidate ||
    !source ||
    candidate.hidden ||
    candidate.run_id !== source.run_id ||
    !candidate.published ||
    !fresh(candidate)
  )
    throw Error('这个外部模型尚未添加、测试失败或测试已过期，请管理员重新检测。')
  await checkExternalHost(source.base_url, env.ASSISTANT_FETCH ?? fetch, ownOrigin)
  return { baseUrl: source.base_url, key: await unseal(env, source), model: candidate.remote_id }
}
async function discover(
  db: Db,
  env: ExternalEnv,
  body: Record<string, unknown>,
  origin: string,
  daily: boolean,
) {
  const fetcher = env.ASSISTANT_FETCH ?? fetch
  const prior =
    typeof body.sourceId === 'string'
      ? await db.first<Source>('SELECT * FROM assistant_external_sources WHERE id=?', [
          body.sourceId,
        ])
      : null
  if (body.sourceId && !prior) return fail(404, '这个连接已移除，请重新添加。')
  if (daily && prior?.paused) return fail(409, '这个连接已暂停检测。')
  const url = externalBaseUrl(body.baseUrl ?? prior?.base_url)
  await checkExternalHost(url, fetcher, origin)
  const id = prior?.id ?? crypto.randomUUID()
  const key =
    typeof body.apiKey === 'string'
      ? body.apiKey.trim()
      : prior && url === prior.base_url
        ? await unseal(env, prior)
        : ''
  if (key.length < 8 || key.length > 512 || /[^\x21-\x7e]/.test(key))
    return fail(400, '请填写完整的 API Key；更改地址时需要重新填写 Key。')
  if (url.includes(key)) return fail(400, 'API 地址不能包含 Key，请分别填写两个字段。')
  if (
    !prior &&
    (await db.first<{ n: number }>('SELECT COUNT(*) AS n FROM assistant_external_sources'))!.n >= 12
  )
    return fail(400, '最多保存12个外部连接，请先移除不用的连接。')
  const name =
    typeof body.name === 'string' && body.name.trim()
      ? body.name.trim().slice(0, 60)
      : (prior?.name ?? new URL(url).hostname)
  if (name.includes(key) || /[\x00-\x1f]/.test(name)) return fail(400, '连接名称不正确。')
  const runId = crypto.randomUUID()
  // Invalidate old admission before replacing any credential or rediscovering.
  await db.run(
    `INSERT INTO assistant_external_sources(id,name,base_url,credential,run_id) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,base_url=excluded.base_url,credential=excluded.credential,run_id=excluded.run_id,discovered_at=NULL,error=NULL,paused=0`,
    [id, name, url, await seal(env, id, url, key), runId],
  )
  try {
    const response = await fetcher(url + '/models', {
      headers: { Authorization: 'Bearer ' + key, accept: 'application/json' },
      redirect: 'manual',
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) throw await upstreamFailure(response)
    const payload = JSON.parse(await limitedText(response)) as { data?: unknown }
    if (!Array.isArray(payload.data)) throw Error('接口没有返回 OpenAI 兼容的模型目录。')
    const seen = new Set<string>()
    const items = payload.data.filter((raw: unknown) => {
      if (!raw || typeof raw !== 'object') return false
      const remote = (raw as { id?: unknown }).id
      if (
        typeof remote !== 'string' ||
        !remote.trim() ||
        remote.length > 160 ||
        /[\x00-\x20]/.test(remote) ||
        remote.includes(key) ||
        seen.has(remote)
      )
        return false
      seen.add(remote)
      return true
    }) as { id: string; name?: unknown }[]
    if (!items.length) throw Error('没有发现可以检测的模型，请检查 API 地址和账号权限。')
    if (items.length > 256) throw Error('目录超过256个模型，请使用范围更小的模型接口后检测。')
    for (const raw of items) {
      const modelId = 'external:' + id + ':' + (await sha256Base64Url(raw.id)).slice(0, 22)
      const label =
        typeof raw.name === 'string' && !raw.name.includes(key)
          ? raw.name.replace(/[\x00-\x1f]/g, '').slice(0, 100)
          : raw.id
      const supported =
        isTaskModel({ id: raw.id, name: label }) &&
        !/(?:^|[/:_-])(?:embedding|rerank|whisper|tts)(?:$|[/:_-])/i.test(raw.id)
      await db.run(
        `INSERT INTO assistant_external_models(id,source_id,remote_id,name,run_id,state,error,code) SELECT ?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM assistant_external_sources WHERE id=? AND run_id=?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,run_id=excluded.run_id,state=excluded.state,checked_at=NULL,latency_ms=NULL,first_token_ms=NULL,error=excluded.error,code=excluded.code,probe_token=NULL,probe_started_at=NULL`,
        [
          modelId,
          id,
          raw.id,
          label,
          runId,
          supported ? 'pending' : 'failed',
          supported ? null : '这个模型用于审核、向量或语音处理，不能作为文字对话模型。',
          supported ? null : 'unsupported',
          id,
          runId,
        ],
      )
    }
    await db.run(
      'UPDATE assistant_external_sources SET discovered_at=?,catalog_count=? WHERE id=? AND run_id=?',
      [new Date().toISOString(), items.length, id, runId],
    )
    // Keep tombstones, so a future discovery cannot resurrect deleted models.
    const latest = (await externalSummary(db)).sources.find((s) => s.id === id)
    if (!latest || latest.runId !== runId)
      return fail(409, '连接在读取目录期间已更改，请刷新后重试。')
    return json({
      sourceId: id,
      runId,
      models: latest.models,
      daily,
    })
  } catch (error) {
    const message =
      error instanceof UpstreamError
        ? externalFailure(error)
        : error instanceof Error &&
            [
              '接口没有返回 OpenAI 兼容的模型目录。',
              '没有发现可以检测的模型，请检查 API 地址和账号权限。',
              '目录超过256个模型，请使用范围更小的模型接口后检测。',
            ].includes(error.message)
          ? error.message
          : '目录读取失败，请检查地址、Key 和接口是否支持 /models。'
    await db.run('UPDATE assistant_external_sources SET error=? WHERE id=? AND run_id=?', [
      message,
      id,
      runId,
    ])
    return fail(400, message)
  }
}
async function probe(db: Db, env: ExternalEnv, body: Record<string, unknown>, request: Request) {
  const model =
    typeof body.model === 'string'
      ? await db.first<Candidate>('SELECT * FROM assistant_external_models WHERE id=?', [
          body.model,
        ])
      : null
  const source = model
    ? await db.first<Source>('SELECT * FROM assistant_external_sources WHERE id=?', [
        model.source_id,
      ])
    : null
  if (
    !source ||
    !model ||
    model.hidden ||
    source.run_id !== body.runId ||
    model.run_id !== source.run_id
  )
    return fail(409, '目录已更新或模型已删除，请刷新检测列表。')
  if (source.paused) return fail(409, '检测已暂停，点击继续检测后重试。')
  if (model.state === 'failed' && model.code === 'unsupported') return json(publicCandidate(model))
  if ((model.state === 'failed' || fresh(model)) && model.checked_at)
    return json(publicCandidate(model))
  const token = crypto.randomUUID(),
    started = Date.now()
  const locked = await db.run(
    "UPDATE assistant_external_models SET state='testing',probe_token=?,probe_started_at=? WHERE id=? AND run_id=? AND (state<>'testing' OR probe_started_at<?)",
    [token, started, model.id, source.run_id, started - 60000],
  )
  if (!locked.changes) return fail(409, '这个模型正在检测，请稍后继续。')
  let ok = false,
    message: string | null = null,
    code: string | null = null,
    firstTokenMs: number | null = null
  try {
    const fetcher = env.ASSISTANT_FETCH ?? fetch
    await checkExternalHost(source.base_url, fetcher, new URL(request.url).origin)
    const admission = await db.first<{
      paused: number
      probe_token: string | null
      hidden: number
    }>(
      `SELECT s.paused,m.probe_token,m.hidden FROM assistant_external_sources s JOIN assistant_external_models m ON m.source_id=s.id AND m.run_id=s.run_id WHERE m.id=?`,
      [model.id],
    )
    if (!admission || admission.paused || admission.hidden || admission.probe_token !== token)
      throw Error('检测已停止。')
    const key = await unseal(env, source)
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(45000)])
    const response = await fetcher(source.base_url + '/chat/completions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'content-type': 'application/json' },
      redirect: 'manual',
      signal,
      body: JSON.stringify({
        model: model.remote_id,
        stream: true,
        max_tokens: 1024,
        messages: [
          { role: 'user', content: '这是连接测试，请只回复四个汉字：连接正常。不要添加其他文字。' },
        ],
      }),
    })
    let answer = ''
    const generation = await consumeGeneration(
      await externalResponse(response),
      (text) => {
        if (firstTokenMs === null) firstTokenMs = Date.now() - started
        answer += text
      },
      () => {},
    )
    ok =
      generation.finishReason !== 'length' &&
      answer.replace(/[\s\p{P}\p{S}]/gu, '') === '连接正常' &&
      answer.length <= 160 &&
      !isClassificationOnlyReply(answer)
    if (!ok) {
      code = 'instruction'
      message = '模型没有完成中文回答测试，暂不加入小助手。'
    }
  } catch (error) {
    code = error instanceof UpstreamError ? String(error.code) : 'connection'
    message =
      error instanceof UpstreamError
        ? externalFailure(error)
        : '连接超时、网络中断或接口格式不兼容，请稍后重新检测。'
  }
  await db.run(
    `UPDATE assistant_external_models SET state=?,checked_at=?,latency_ms=?,first_token_ms=?,error=?,code=?,probe_token=NULL,probe_started_at=NULL WHERE id=? AND run_id=? AND probe_token=?`,
    [
      ok ? 'passed' : 'failed',
      new Date().toISOString(),
      Date.now() - started,
      firstTokenMs,
      message,
      code,
      model.id,
      source.run_id,
      token,
    ],
  )
  const current = await db.first<Candidate>('SELECT * FROM assistant_external_models WHERE id=?', [
    model.id,
  ])
  if (!current || current.hidden || current.run_id !== source.run_id)
    return fail(409, '检测期间连接已更新或模型已删除，请刷新。')
  return json(publicCandidate(current))
}
/** Same bounded pipeline is used by the owner UI and the daily maintenance identity. */
export async function assistantExternal(db: Db, env: ExternalEnv, request: Request, daily = false) {
  await ensureExternal(db)
  if (request.method === 'GET') return json(await externalSummary(db))
  const body = await readJson<Record<string, unknown>>(request)
  if (
    !body ||
    Object.keys(body).some(
      (k) =>
        ![
          'phase',
          'sourceId',
          'baseUrl',
          'apiKey',
          'name',
          'runId',
          'model',
          'published',
          'scope',
          'label',
        ].includes(k),
    )
  )
    return fail(400, '接入测试格式不正确。')
  if (daily && !['list', 'discover', 'probe'].includes(String(body.phase)))
    return fail(403, '每日检查不能添加或移除模型。')
  if (body.phase === 'list') return json(await externalSummary(db))
  if (body.phase === 'discover') {
    if (
      daily &&
      (body.apiKey !== undefined || body.baseUrl !== undefined || body.name !== undefined)
    )
      return fail(400, '每日检查只能使用已经保存的连接。')
    try {
      return await discover(db, env, body, new URL(request.url).origin, daily)
    } catch {
      return fail(400, '请检查公网 HTTPS 地址、域名解析和密钥加密设置。')
    }
  }
  if (body.phase === 'probe') return probe(db, env, body, request)
  if (
    body.phase === 'publish' &&
    typeof body.model === 'string' &&
    typeof body.published === 'boolean'
  ) {
    const model = await db.first<Candidate>('SELECT * FROM assistant_external_models WHERE id=?', [
      body.model,
    ])
    const source = model
      ? await db.first<Source>('SELECT * FROM assistant_external_sources WHERE id=?', [
          model.source_id,
        ])
      : null
    if (
      !model ||
      model.hidden ||
      !source ||
      source.run_id !== model.run_id ||
      body.runId !== source.run_id
    )
      return fail(409, '目录已更新或模型已删除，请刷新检测列表。')
    if (body.published && !fresh(model)) return fail(400, '只有最近通过回答测试的模型才能添加。')
    await db.run('UPDATE assistant_external_models SET published=? WHERE id=? AND run_id=?', [
      body.published ? 1 : 0,
      model.id,
      source.run_id,
    ])
    return json(await externalSummary(db))
  }
  if (
    ['pause', 'resume', 'deleteFailed', 'restoreDeleted'].includes(String(body.phase)) &&
    typeof body.sourceId === 'string'
  ) {
    const source = await db.first<Source>('SELECT * FROM assistant_external_sources WHERE id=?', [
      body.sourceId,
    ])
    if (!source || source.run_id !== body.runId) return fail(409, '目录已更新，请刷新后重试。')
    if (body.phase === 'pause')
      await db.batch([
        {
          sql: 'UPDATE assistant_external_sources SET paused=1 WHERE id=? AND run_id=?',
          params: [source.id, source.run_id],
        },
        {
          sql: "UPDATE assistant_external_models SET state='pending',probe_token=NULL,probe_started_at=NULL WHERE source_id=? AND run_id=? AND state='testing'",
          params: [source.id, source.run_id],
        },
      ])
    if (body.phase === 'resume')
      await db.run('UPDATE assistant_external_sources SET paused=0 WHERE id=? AND run_id=?', [
        source.id,
        source.run_id,
      ])
    if (body.phase === 'deleteFailed')
      await db.run(
        "UPDATE assistant_external_models SET hidden=1,published=0,probe_token=NULL WHERE source_id=? AND run_id=? AND state='failed'",
        [source.id, source.run_id],
      )
    if (body.phase === 'restoreDeleted')
      await db.run(
        "UPDATE assistant_external_models SET hidden=0,state='pending',checked_at=NULL,published=0,probe_token=NULL WHERE source_id=? AND run_id=? AND hidden=1",
        [source.id, source.run_id],
      )
    return json(await externalSummary(db))
  }
  if (
    ['deleteModel', 'editModel', 'retest'].includes(String(body.phase)) &&
    typeof body.model === 'string'
  ) {
    const model = await db.first<Candidate>('SELECT * FROM assistant_external_models WHERE id=?', [
      body.model,
    ])
    const source = model
      ? await db.first<Source>('SELECT * FROM assistant_external_sources WHERE id=?', [
          model.source_id,
        ])
      : null
    if (!model || !source || model.run_id !== source.run_id || body.runId !== source.run_id)
      return fail(409, '目录已更新，请刷新列表。')
    if (body.phase === 'deleteModel')
      await db.run(
        'UPDATE assistant_external_models SET hidden=1,published=0,probe_token=NULL WHERE id=?',
        [model.id],
      )
    if (body.phase === 'editModel') {
      if (
        typeof body.label !== 'string' ||
        !body.label.trim() ||
        body.label.length > 80 ||
        /[\x00-\x1f]/.test(body.label)
      )
        return fail(400, '模型名称应为1–80字。')
      await db.run('UPDATE assistant_external_models SET alias=? WHERE id=?', [
        body.label.trim(),
        model.id,
      ])
    }
    if (body.phase === 'retest' && !model.hidden)
      await db.run(
        "UPDATE assistant_external_models SET state='pending',checked_at=NULL,probe_token=NULL,probe_started_at=NULL,error=NULL,code=NULL WHERE id=?",
        [model.id],
      )
    return json(await externalSummary(db))
  }
  if (body.phase === 'remove' && typeof body.sourceId === 'string') {
    await db.run('DELETE FROM assistant_external_sources WHERE id=?', [body.sourceId])
    await db.run('DELETE FROM assistant_external_models WHERE source_id=?', [body.sourceId])
    return json(await externalSummary(db))
  }
  return fail(400, '请选择发现、检测、添加或移除操作。')
}
