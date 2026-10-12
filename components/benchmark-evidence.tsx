'use client'
import { useEffect, useState } from 'react'
import type { ToolBenchmark } from '@/lib/tool-benchmarks'
import { BENCHMARK_BOARDS, benchmarkStale } from '@/lib/tool-benchmarks'

/** Static export must age in the visitor's browser, without hydration mismatch. */
function useBenchmarkStale(date: string) {
  const [stale, setStale] = useState(false)
  useEffect(() => {
    const check = () => setStale(benchmarkStale(date))
    check()
    const interval = setInterval(check, 60 * 60 * 1000)
    document.addEventListener('visibilitychange', check)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', check)
    }
  }, [date])
  return stale
}

export function BenchmarkTag({ evidence }: { evidence: ToolBenchmark }) {
  const result = evidence.results[0]
  const stale = useBenchmarkStale(evidence.checkedAt)
  return (
    <span
      className="benchmark-tag"
      title={
        result
          ? `${result.model} · ${BENCHMARK_BOARDS[result.board].method} · 核查 ${evidence.checkedAt}`
          : evidence.note
      }
    >
      {result
        ? `${BENCHMARK_BOARDS[result.board].short} ${result.value}${stale ? ' · 旧快照' : ''}`
        : '暂无可比实测'}
    </span>
  )
}
export function BenchmarkEvidence({
  evidence,
  compact = false,
}: {
  evidence: ToolBenchmark
  compact?: boolean
}) {
  const stale = useBenchmarkStale(evidence.checkedAt)
  return (
    <section className="benchmark-evidence" aria-label="公开实测与来源">
      <h2 className="text-base font-semibold">{compact ? '参考模型实测' : '公开实测与来源'}</h2>
      <p className="mt-2 text-xs leading-6 text-muted-foreground">{evidence.note}</p>
      {evidence.results.length ? (
        <dl className="mt-3 space-y-3">
          {evidence.results.map((r) => (
            <div key={r.board + r.model} className="benchmark-result">
              <dt>
                <a
                  href={BENCHMARK_BOARDS[r.board].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-4"
                >
                  {BENCHMARK_BOARDS[r.board].name} ↗
                </a>
                <small className="mt-1 block break-words">{r.model}</small>
              </dt>
              <dd>
                <strong>
                  {r.value}
                  {r.uncertainty !== undefined && <small> ±{r.uncertainty}</small>}
                </strong>
                {r.preliminary && <span className="block text-xs text-amber-700">初步结果</span>}
                {r.votes !== undefined && (
                  <span className="block text-xs text-muted-foreground">
                    {r.votes.toLocaleString('en-US')} 票
                  </span>
                )}
              </dd>
              {!compact && (
                <p className="col-span-2 text-xs leading-6 text-muted-foreground">
                  {BENCHMARK_BOARDS[r.board].method}
                  {r.publishedAt && ` 榜单日期：${r.publishedAt}。`}
                </p>
              )}
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-3 text-sm font-medium text-muted-foreground">暂无可比实测 · 不编造分数</p>
      )}
      <p className="mt-4 text-xs leading-6 text-muted-foreground">
        来源核查：{evidence.checkedAt} ·{' '}
        {stale
          ? '快照已超过 30 天，请打开原榜查看最新结果。'
          : '带日期的快照；最新结果以原榜为准。'}
      </p>
    </section>
  )
}
