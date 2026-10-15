'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Layers, Search, X } from 'lucide-react'
import { useSiteModules } from '@/components/site-module-context'
import { pathEnabled } from '@/lib/site-modules'

export function ExperiencedGuide({ onClose }: { onClose: () => void }) {
  const router = useRouter(),
    { config } = useSiteModules()
  const [step, setStep] = useState<'choose' | 'compare' | 'cases'>('choose'),
    [selected, setSelected] = useState(['chatgpt', 'claude']),
    [query, setQuery] = useState('周报'),
    [collapsed, setCollapsed] = useState(false)
  function go(path: string) {
    const url = new URL(path, location.href)
    const preview = new URLSearchParams(location.search).get('design-preview')
    if (preview) url.searchParams.set('design-preview', preview)
    onClose()
    router.push(url.pathname + url.search)
  }
  return (
    <aside className="experienced-guide" aria-label="有基础的使用引导">
      <header>
        <button type="button" onClick={() => setCollapsed(!collapsed)} aria-expanded={!collapsed}>
          {collapsed ? '继续了解网站' : '有基础，从这里开始'}
        </button>
        <button type="button" aria-label="结束首页引导" onClick={onClose}>
          <X size={18} />
        </button>
      </header>
      {!collapsed && (
        <div className="experienced-guide-body">
          {step !== 'choose' && (
            <button className="intro-back" onClick={() => setStep('choose')}>
              <ArrowLeft size={15} /> 换一种用法
            </button>
          )}
          {step === 'choose' && (
            <>
              <p>不用从头学。选一个入口，马上操作一次。</p>
              {pathEnabled(config, '/compare') && (
                <button className="experienced-entry" onClick={() => setStep('compare')}>
                  <Layers size={21} />
                  <span>
                    <strong>选两款工具，看看区别</strong>
                    <small>亲手选择，再看能力和使用条件。</small>
                  </span>
                  <ArrowRight size={17} />
                </button>
              )}
              {pathEnabled(config, '/cases') && (
                <button className="experienced-entry" onClick={() => setStep('cases')}>
                  <Search size={21} />
                  <span>
                    <strong>找一个能照做的案例</strong>
                    <small>按工作任务找步骤和练习材料。</small>
                  </span>
                  <ArrowRight size={17} />
                </button>
              )}
            </>
          )}
          {step === 'compare' && (
            <>
              <h3>先选两款你想了解的工具</h3>
              <div className="experienced-tool-options">
                {[
                  ['chatgpt', 'ChatGPT'],
                  ['claude', 'Claude'],
                  ['gemini', 'Gemini'],
                ].map(([id, name]) => (
                  <label key={id}>
                    <input
                      type="checkbox"
                      checked={selected.includes(id)}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked ? [...selected, id] : selected.filter((v) => v !== id),
                        )
                      }
                    />
                    {name}
                  </label>
                ))}
              </div>
              <p>进入对比页后，先看与你的任务有关的能力，再看费用和使用条件。</p>
              <button
                className="intro-primary"
                disabled={selected.length < 2}
                onClick={() => go('/compare/?ids=' + selected.join(','))}
              >
                打开对比（{selected.length} 款）
                <ArrowRight size={16} />
              </button>
            </>
          )}
          {step === 'cases' && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                go('/cases/?q=' + encodeURIComponent(query.trim()))
              }}
            >
              <label htmlFor="experienced-case-query">你想用 AI 做哪件事？</label>
              <input
                id="experienced-case-query"
                value={query}
                maxLength={60}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="例如：周报、会议、通知"
              />
              <div className="experienced-keywords">
                {['周报', '会议', '通知'].map((q) => (
                  <button
                    type="button"
                    key={q}
                    aria-pressed={query === q}
                    onClick={() => setQuery(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
              <p>打开案例后，点“开始动手练习”，替换材料、生成草稿，再检查结果。</p>
              <button className="intro-primary" disabled={!query.trim()}>
                查找案例
                <ArrowRight size={16} />
              </button>
            </form>
          )}
        </div>
      )}
    </aside>
  )
}
