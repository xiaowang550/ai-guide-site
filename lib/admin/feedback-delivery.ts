/** 私有截图、邮件通知与发信配置。只依赖 Web API，可在 Pages 和本地运行。 */
import type { Db } from '../db/types.ts'
import { fromBase64Url, toBase64Url } from './crypto.ts'
import { BRAND_NAME } from '../brand.ts'

export const FEEDBACK_RECIPIENT = '1987215931@qq.com'
export const SCREENSHOT_BYTES = 300 * 1024
export const FEEDBACK_BODY_BYTES = 1250 * 1024
export interface FeedbackMailEnv {
  AI_CREDENTIALS_KEY?: string
  RESEND_API_KEY?: string
  FEEDBACK_FROM?: string
  FEEDBACK_FETCH?: typeof fetch
}
export const FEEDBACK_EXTRA_SCHEMA = `
CREATE TABLE IF NOT EXISTS feedback_assets (
 id TEXT PRIMARY KEY, feedback_id TEXT NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,
 name TEXT NOT NULL, mime TEXT NOT NULL, content TEXT NOT NULL, bytes INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_feedback_assets_parent ON feedback_assets(feedback_id);
CREATE TABLE IF NOT EXISTS feedback_notifications (
 feedback_id TEXT PRIMARY KEY REFERENCES feedback(id) ON DELETE CASCADE,
 status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0,
 lease_until INTEGER NOT NULL DEFAULT 0, next_attempt INTEGER NOT NULL DEFAULT 0,
 provider_id TEXT, last_error TEXT, sent_at TEXT);
CREATE TABLE IF NOT EXISTS feedback_mail_settings (
 id INTEGER PRIMARY KEY CHECK(id=1), sender TEXT NOT NULL, credential TEXT,
 updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS feedback_submissions (
 request_id TEXT PRIMARY KEY, feedback_id TEXT NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,
 payload_hash TEXT NOT NULL);`
export async function ensureFeedbackExtras(db: Db) {
  await db.exec(FEEDBACK_EXTRA_SCHEMA)
}
export interface Screenshot {
  name: string
  mime: string
  content: string
  bytes: number
}
export function validateScreenshots(value: unknown): Screenshot[] {
  if (value === undefined) return []
  if (!Array.isArray(value) || value.length > 3) throw new Error('最多上传 3 张截图。')
  return value.map((item, index) => {
    if (!item || typeof item !== 'object') throw new Error('截图格式不正确。')
    const { data } = item as { data?: unknown }
    if (typeof data !== 'string' || data.length > (SCREENSHOT_BYTES * 4) / 3 + 80)
      throw new Error('单张截图压缩后不能超过 300 KB。')
    const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(data)
    if (!match) throw new Error('截图只支持 PNG、JPG 或 WebP 图片。')
    let binary: string
    try {
      binary = atob(match[2])
    } catch {
      throw new Error('截图数据不完整。')
    }
    if (!binary.length || binary.length > SCREENSHOT_BYTES || btoa(binary) !== match[2])
      throw new Error('截图大小或编码不正确。')
    const b = (i: number) => binary.charCodeAt(i)
    const valid =
      match[1] === 'image/png'
        ? binary.slice(0, 8) === '\x89PNG\r\n\x1a\n'
        : match[1] === 'image/jpeg'
          ? b(0) === 255 && b(1) === 216 && b(2) === 255
          : binary.slice(0, 4) === 'RIFF' && binary.slice(8, 12) === 'WEBP'
    if (!valid) throw new Error('图片内容与格式不符，请重新选择截图。')
    // 文件名由服务端生成，避免原始文件名泄露个人信息或被当成路径。
    return {
      name: `截图-${index + 1}.${match[1] === 'image/jpeg' ? 'jpg' : match[1].slice(6)}`,
      mime: match[1],
      content: match[2],
      bytes: binary.length,
    }
  })
}

/** 流式限长，不能只相信调用者提交的 Content-Length。 */
export async function readFeedbackBody(request: Request): Promise<Record<string, unknown>> {
  if (Number(request.headers.get('content-length')) > FEEDBACK_BODY_BYTES)
    throw new Error('反馈内容过大，请减少截图。')
  if (!request.body) throw new Error('请填写反馈内容。')
  const reader = request.body.getReader(),
    parts: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.length
      if (size > FEEDBACK_BODY_BYTES) {
        await reader.cancel()
        throw new Error('反馈内容过大，请减少截图。')
      }
      parts.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const part of parts) {
    bytes.set(part, offset)
    offset += part.length
  }
  try {
    const value = JSON.parse(new TextDecoder().decode(bytes))
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error()
    return value
  } catch {
    throw new Error('反馈格式不正确，请重新提交。')
  }
}

async function mailKey(secret?: string) {
  if (!secret || secret.length < 32) throw new Error('服务端密钥加密未就绪。')
  const bytes = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode('feedback-mail:v1:' + secret),
  )
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt'])
}
async function mailSettings(db: Db, env: FeedbackMailEnv) {
  await ensureFeedbackExtras(db)
  const row = await db.first<{ sender: string; credential: string | null }>(
    'SELECT sender, credential FROM feedback_mail_settings WHERE id=1',
  )
  let key = env.RESEND_API_KEY || ''
  if (!key && row?.credential) {
    try {
      const { iv, ciphertext } = JSON.parse(row.credential)
      const decoded = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: fromBase64Url(iv) as BufferSource,
          additionalData: new TextEncoder().encode('feedback-mail'),
        },
        await mailKey(env.AI_CREDENTIALS_KEY),
        fromBase64Url(ciphertext) as BufferSource,
      )
      key = new TextDecoder().decode(decoded)
    } catch {
      throw new Error('发信密钥无法读取，请在后台重新保存。')
    }
  }
  return { sender: row?.sender || env.FEEDBACK_FROM || 'onboarding@resend.dev', key }
}
export async function feedbackMailStatus(db: Db, env: FeedbackMailEnv) {
  const value = await mailSettings(db, env).catch(() => ({ sender: '', key: '' }))
  const counts = await db.all<{ status: string; n: number }>(
    'SELECT status, COUNT(*) AS n FROM feedback_notifications GROUP BY status',
  )
  return {
    recipient: FEEDBACK_RECIPIENT,
    sender: value.sender || 'onboarding@resend.dev',
    configured: !!value.key,
    encryptedStorageReady: !!env.AI_CREDENTIALS_KEY,
    counts: Object.fromEntries(counts.map((r) => [r.status, r.n])),
  }
}
export async function saveFeedbackMail(
  db: Db,
  env: FeedbackMailEnv,
  input: Record<string, unknown>,
  actor: string,
) {
  await ensureFeedbackExtras(db)
  const sender = typeof input.sender === 'string' ? input.sender.trim() : ''
  if (!/^[^\s<>@\r\n]+@[^\s<>@\r\n]+\.[^\s<>@\r\n]+$/.test(sender) || sender.length > 120)
    throw new Error('请填写有效的发件邮箱。')
  const raw = typeof input.key === 'string' ? input.key.trim() : ''
  if (raw && (!/^re_[A-Za-z0-9_-]+$/.test(raw) || raw.length > 200))
    throw new Error('请填写正确的 Resend API Key。')
  const old = await db.first<{ credential: string | null }>(
    'SELECT credential FROM feedback_mail_settings WHERE id=1',
  )
  let credential = old?.credential ?? null
  if (input.clearKey === true) credential = null
  if (raw) {
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: new TextEncoder().encode('feedback-mail') },
      await mailKey(env.AI_CREDENTIALS_KEY),
      new TextEncoder().encode(raw),
    )
    credential = JSON.stringify({
      iv: toBase64Url(iv),
      ciphertext: toBase64Url(new Uint8Array(ciphertext)),
    })
  }
  const at = new Date().toISOString()
  await db.batch([
    {
      sql: 'INSERT INTO feedback_mail_settings(id,sender,credential,updated_at) VALUES(1,?,?,?) ON CONFLICT(id) DO UPDATE SET sender=excluded.sender,credential=excluded.credential,updated_at=excluded.updated_at',
      params: [sender, credential, at],
    },
    {
      sql: 'INSERT INTO audit_log(at,actor,action,target,detail) VALUES(?,?,?,?,?)',
      params: [
        at,
        actor,
        'feedback.mail.settings',
        'feedback',
        JSON.stringify({ sender, keyChanged: !!raw || input.clearKey === true }),
      ],
    },
  ])
  return { ok: true }
}

async function sendMail(
  env: FeedbackMailEnv,
  settings: { key: string; sender: string },
  id: string,
  text: string,
  assets: Screenshot[],
) {
  if (!settings.key) throw new Error('尚未配置邮件发送服务。')
  const response = await (env.FEEDBACK_FETCH ?? fetch)('https://api.resend.com/emails', {
    method: 'POST',
    redirect: 'manual',
    signal: AbortSignal.timeout(12000),
    headers: {
      'content-type': 'application/json',
      Authorization: 'Bearer ' + settings.key,
      'Idempotency-Key': 'feedback/' + id,
    },
    body: JSON.stringify({
      from: BRAND_NAME + ' <' + settings.sender + '>',
      to: [FEEDBACK_RECIPIENT],
      subject: id.startsWith('test-')
        ? `${BRAND_NAME}：反馈通知测试`
        : `${BRAND_NAME}：收到新的问题反馈`,
      text,
      ...(assets.length
        ? { attachments: assets.map((a) => ({ filename: a.name, content: a.content })) }
        : {}),
    }),
  })
  // 不保存供应商原始错误正文，避免泄露密钥、邮箱内容或供应商内部信息。
  if (!response.ok)
    throw new Error(
      response.status === 401 || response.status === 403
        ? '发信授权或发件域名未通过，请核对 Resend 配置。'
        : response.status === 429
          ? '邮件服务暂时限流，请稍后重试。'
          : '邮件服务暂时不可用，请稍后重试。',
    )
  const result = (await response.json()) as { id?: unknown }
  if (typeof result.id !== 'string' || !result.id) throw new Error('邮件服务没有确认接收，请重试。')
  return result.id
}
export async function testFeedbackMail(db: Db, env: FeedbackMailEnv) {
  const settings = await mailSettings(db, env)
  const id = await sendMail(
    env,
    settings,
    'test-' + crypto.randomUUID(),
    '这是一封反馈通知测试邮件。\n网站的新反馈将发送到此邮箱，并保留在管理后台。\n查看反馈：https://ai-guide-site.pages.dev/admin/',
    [],
  )
  return { ok: true, providerId: id, message: '邮件服务已接收测试邮件，请检查收件箱和垃圾邮件。' }
}

export async function deliverFeedback(db: Db, env: FeedbackMailEnv, id: string, force = false) {
  await ensureFeedbackExtras(db)
  const settings = await mailSettings(db, env)
  if (!settings.key) {
    await db.run(
      "UPDATE feedback_notifications SET status='unconfigured' WHERE feedback_id=? AND status IN ('pending','unconfigured','failed')",
      [id],
    )
    return
  }
  const now = Date.now()
  const claim = await db.run(
    `UPDATE feedback_notifications SET status='sending', attempts=attempts+1, lease_until=?
    WHERE feedback_id=? AND status!='sent' AND lease_until<? AND (?=1 OR next_attempt<=?)`,
    [now + 60000, id, now, force ? 1 : 0, now],
  )
  if (!claim.changes) return
  try {
    const row = await db.first<{
      kind: string
      message: string
      page_url: string | null
      contact: string | null
      created_at: string
    }>('SELECT kind,message,page_url,contact,created_at FROM feedback WHERE id=?', [id])
    if (!row) throw new Error('反馈记录不存在。')
    const assets = await db.all<Screenshot>(
      'SELECT name,mime,content,bytes FROM feedback_assets WHERE feedback_id=? ORDER BY name',
      [id],
    )
    const kinds: Record<string, string> = {
      errata: '使用问题 / 内容有误',
      correction: '数据更正',
      question: '使用问题',
      suggestion: '建议 / 使用感受',
    }
    const text = [
      `反馈编号：${id}`,
      `类型：${kinds[row.kind] ?? row.kind}`,
      `时间：${row.created_at}`,
      `页面：${row.page_url || '未指定'}`,
      `联系方式：${row.contact || '未留下'}`,
      '',
      row.message,
      '',
      '按使用规范评估，优先改进方便、快捷、易理解的体验；并非所有建议都会采纳。',
      '查看与处理：https://ai-guide-site.pages.dev/admin/',
    ].join('\n')
    const providerId = await sendMail(env, settings, id, text, assets)
    await db.run(
      "UPDATE feedback_notifications SET status='sent',provider_id=?,sent_at=?,last_error=NULL,lease_until=0 WHERE feedback_id=?",
      [providerId, new Date().toISOString(), id],
    )
  } catch (error) {
    const message =
      error instanceof Error && /^(发信|邮件|反馈记录)/.test(error.message)
        ? error.message
        : '邮件发送超时或连接失败，请稍后重试。'
    await db.run(
      "UPDATE feedback_notifications SET status='failed',last_error=?,lease_until=0,next_attempt=? WHERE feedback_id=?",
      [message, now + 5 * 60000, id],
    )
  }
}
/** 每次最多补发 5 条，既能手动补发，也可由访问触发后台任务。 */
export async function retryFeedbackMail(db: Db, env: FeedbackMailEnv, force = false) {
  await ensureFeedbackExtras(db)
  if (!(await mailSettings(db, env)).key) return { processed: 0 }
  const rows = await db.all<{ feedback_id: string }>(
    `SELECT feedback_id FROM feedback_notifications
    WHERE status!='sent' AND lease_until<? AND (?=1 OR next_attempt<=?) ORDER BY rowid LIMIT 5`,
    [Date.now(), force ? 1 : 0, Date.now()],
  )
  for (const row of rows) await deliverFeedback(db, env, row.feedback_id, force)
  return { processed: rows.length }
}
export async function feedbackExtras(db: Db, ids: string[]) {
  await ensureFeedbackExtras(db)
  if (!ids.length) return { assets: [], notifications: [] }
  const placeholders = ids.map(() => '?').join(',')
  const [assets, notifications] = await Promise.all([
    db.all<{ id: string; feedback_id: string; name: string; bytes: number }>(
      `SELECT id,feedback_id,name,bytes FROM feedback_assets WHERE feedback_id IN (${placeholders}) ORDER BY name`,
      ids,
    ),
    db.all<{
      feedback_id: string
      status: string
      last_error: string | null
      sent_at: string | null
    }>(
      `SELECT feedback_id,status,last_error,sent_at FROM feedback_notifications WHERE feedback_id IN (${placeholders})`,
      ids,
    ),
  ])
  return { assets, notifications }
}
export async function feedbackAsset(db: Db, id: string) {
  await ensureFeedbackExtras(db)
  return db.first<Screenshot>('SELECT name,mime,content,bytes FROM feedback_assets WHERE id=?', [
    id,
  ])
}
