// 组件：可核查性（评分依据区块 + 覆盖度徽章）
import { AlertTriangle, CheckCircle2, ExternalLink, FileSearch } from 'lucide-react'
import type { CapabilityKey, Tool } from '@/data/types'
import { CAPABILITY_META, capabilityLabel, computeEvidenceCoverage, formatDate } from '@/lib/score'
import { cn } from '@/lib/utils'

/** 依据覆盖度徽章：可量化的可信度信号 */
export function EvidenceCoverageBadge({ tool, className }: { tool: Tool; className?: string }) {
  const cov = computeEvidenceCoverage(tool.capabilities)
  const strong = cov.ratio >= 0.9
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium',
        strong
          ? 'bg-score-4/10 text-score-4'
          : cov.ratio >= 0.7
            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
            : 'bg-danger/10 text-danger',
        className
      )}
      title={`${cov.total} 个维度中有 ${cov.covered} 个写明了打分依据`}
    >
      {strong ? <CheckCircle2 className="h-3 w-3" aria-hidden /> : <AlertTriangle className="h-3 w-3" aria-hidden />}
      依据覆盖 {cov.covered}/{cov.total}
    </span>
  )
}

/**
 * 「评分怎么来的」区块。
 *
 * 这是本站可信度的核心：把方法、逐维度依据、来源链接都摊开，
 * 让读者可以自己去核对，而不是只能选择相信。
 */
export function EvidenceSection({ tool }: { tool: Tool }) {
  const cov = computeEvidenceCoverage(tool.capabilities)

  return (
    <section aria-labelledby="evidence-title" className="mt-10">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="evidence-title" className="flex items-center gap-2 text-xl">
          <FileSearch className="h-5 w-5 text-primary" aria-hidden />
          评分怎么来的
        </h2>
        <EvidenceCoverageBadge tool={tool} />
      </div>

      {tool.evidence ? (
        <p className="measure-wide mt-4 border-l-2 border-primary/40 pl-4 text-[15px] leading-7 text-foreground/85">
          {tool.evidence}
        </p>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">（该工具暂未补充评分方法说明）</p>
      )}

      {cov.thinButHigh.length > 0 ? (
        <p className="mt-4 flex gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-[13px] leading-6">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          <span>
            以下维度分数较高但依据写得较薄，使用时请自行核对：
            {cov.thinButHigh.map((k) => capabilityLabel(k as CapabilityKey)).join('、')}
          </span>
        </p>
      ) : null}

      {/* 逐维度依据 */}
      <details className="mt-5 border-y border-hairline">
        <summary className="cursor-pointer py-3 text-sm font-medium">
          展开 {cov.total} 个维度的逐条依据
        </summary>
        <dl className="divide-y divide-hairline border-t border-hairline">
          {CAPABILITY_META.map((meta) => {
            const cap = tool.capabilities[meta.key]
            return (
              <div key={meta.key} className="grid gap-1 py-3 sm:grid-cols-[7rem_3rem_1fr] sm:gap-3">
                <dt className="text-sm font-medium">{meta.label}</dt>
                <dd className="text-sm tabular-nums text-muted-foreground">
                  {cap?.score ?? 0} / 5
                </dd>
                <dd className="text-[13px] leading-6 text-muted-foreground">
                  {cap?.basis?.trim() ? cap.basis : '（未写依据）'}
                </dd>
              </div>
            )
          })}
        </dl>
      </details>

      {/* 来源 */}
      {tool.sources.length > 0 ? (
        <div className="mt-5">
          <p className="eyebrow">来源链接</p>
          <ul className="mt-2 space-y-1.5">
            {tool.sources.map((s) => (
              <li key={s.url}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="link inline-flex items-center gap-1 text-[13px]"
                >
                  {s.label}
                  <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-4 text-[11px] text-muted-foreground">
        本页数据复核于 {formatDate(tool.updatedAt)}。如果你认为某条依据不成立或有更新，
        请在 <Linkish /> 提交勘误 —— 依据被推翻比分数算错更需要纠正。
      </p>
    </section>
  )
}

function Linkish() {
  return (
    <a href="/about#errata" className="link">
      勘误入口
    </a>
  )
}