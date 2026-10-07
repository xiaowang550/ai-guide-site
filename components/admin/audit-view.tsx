'use client'

import { useCallback, useEffect, useState } from 'react'
import { ApiError, apiGet, apiSend, formatDateTime, relativeTime } from './api-client'

interface AuditEntry {
  id: number
  at: string
  actor: string
  action: string
  target: string | null
  detail: string | null
}

const ACTION_LABEL: Record<string, string> = {
  bootstrap: '初始建号',
  publish: '发布',
  rollback: '恢复版本',
  'feedback.update': '处理反馈',
  'review.resolve': '处理待办',
  'password.change': '改密码',
  import: '导入备份',
  seed: '迁移基线数据',
}

/** 操作记录 + 备份导出 / 导入 */
export function AuditView() {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null)
  const [filter, setFilter] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importText, setImportText] = useState('')

  const load = useCallback(async () => {
    setBusy(true)
    try {
      const qs = filter ? `?action=${encodeURIComponent(filter)}&limit=200` : '?limit=200'
      const res = await apiGet<{ entries: AuditEntry[] }>(`/api/admin/audit${qs}`)
      setEntries(res.entries)
      setError(null)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '加载失败')
    } finally {
      setBusy(false)
    }
  }, [filter])

  useEffect(() => {
    void load()
  }, [load])

  function downloadBackup() {
    // 导出走浏览器下载：备份文件必须落到管理员自己的机器上，
    // 而不是由服务器代为保存一份（那会让「有备份」变成一个假承诺）
    const a = document.createElement('a')
    a.href = '/api/admin/backup'
    a.download = ''
    document.body.appendChild(a)
    a.click()
    a.remove()
    setMsg('备份文件已开始下载，请确认它存在你的下载目录里 —— 没有落到本地就不算备份。')
  }

  async function doImport() {
    let parsed: unknown
    try {
      parsed = JSON.parse(importText)
    } catch {
      setError('JSON 解析失败，请检查格式。')
      return
    }
    if (!confirm('导入是「幂等追加」：已存在的版本会被跳过，不会覆盖。\n\n确定继续？')) return
    setBusy(true)
    try {
      const res = await apiSend<{ items: number; versions: number; skipped: number }>(
        '/api/admin/backup',
        'POST',
        parsed
      )
      setMsg(
        `导入完成：条目 ${res.items}，新增版本 ${res.versions}，跳过 ${res.skipped}（已存在）。`
      )
      setError(null)
      setImporting(false)
      setImportText('')
      await load()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '导入失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 border-b border-hairline pb-3">
        <h2 className="text-sm font-semibold">操作记录与备份</h2>
        <span className="flex-1" />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded border border-hairline bg-background px-2 py-1 text-xs"
        >
          <option value="">全部操作</option>
          {Object.entries(ACTION_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {/* 备份 */}
      <section className="mt-4">
        <h3 className="text-xs font-medium">备份</h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          导出内容包含全部条目与**全部历史版本**，可用来做真备份或迁移到另一个站点。
          导入是幂等追加：已存在的 (条目, 版本) 会跳过，所以重复导入同一个文件是安全操作。
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            onClick={downloadBackup}
            className="rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
          >
            导出备份
          </button>
          <button
            onClick={() => setImporting((v) => !v)}
            className="rounded border border-hairline px-3 py-1.5 text-sm"
          >
            {importing ? '取消导入' : '从文件导入'}
          </button>
        </div>
        {msg ? (
          <p className="mt-2 rounded border border-hairline bg-muted/30 px-3 py-2 text-xs">{msg}</p>
        ) : null}
        {importing ? (
          <div className="mt-2">
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder='粘贴备份文件内容，或用 file 读取：await file.text() 后填进来。格式形如 {"format":"ai-guide-content-backup","version":1,...}'
              rows={8}
              className="w-full rounded border border-hairline bg-background p-2 font-mono text-[11px]"
            />
            <input
              type="file"
              accept="application/json"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (f) setImportText(await f.text())
              }}
              className="mt-2 text-xs"
            />
            <button
              onClick={() => void doImport()}
              disabled={!importText.trim() || busy}
              className="mt-2 rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              确认导入
            </button>
          </div>
        ) : null}
      </section>

      {/* 审计 */}
      <section className="mt-6">
        <h3 className="text-xs font-medium">操作记录</h3>
        {error ? (
          <p className="mt-2 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm">{error}</p>
        ) : null}
        {entries === null ? (
          <p className="mt-2 text-sm text-muted-foreground">{busy ? '加载中…' : ''}</p>
        ) : entries.length === 0 ? (
          <p className="mt-2 rounded border border-dashed border-hairline px-3 py-3 text-sm text-muted-foreground">
            没有符合条件的操作记录。
          </p>
        ) : (
          <table className="mt-2 w-full text-left text-xs">
            <thead className="border-b border-hairline text-muted-foreground">
              <tr>
                <th className="py-1.5 pr-3 font-medium">时间</th>
                <th className="py-1.5 pr-3 font-medium">操作人</th>
                <th className="py-1.5 pr-3 font-medium">操作</th>
                <th className="py-1.5 pr-3 font-medium">对象</th>
                <th className="py-1.5 font-medium">详情</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-hairline/60">
                  <td className="py-1.5 pr-3 whitespace-nowrap text-muted-foreground" title={formatDateTime(e.at)}>
                    {relativeTime(e.at)}
                  </td>
                  <td className="py-1.5 pr-3">{e.actor}</td>
                  <td className="py-1.5 pr-3">{ACTION_LABEL[e.action] ?? e.action}</td>
                  <td className="py-1.5 pr-3 font-mono text-[11px] text-muted-foreground">
                    {e.target ?? '—'}
                  </td>
                  <td className="py-1.5 font-mono text-[11px] text-muted-foreground">{e.detail ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="mt-2 text-[11px] text-muted-foreground">
          记录只增不删。内容本身的历史在「内容 → 历史版本」，两者分工不同：
          那里记的是「内容变成了什么」，这里记的是「谁在什么时候做了什么操作」。
        </p>
      </section>
    </div>
  )
}
