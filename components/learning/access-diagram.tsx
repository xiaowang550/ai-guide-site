import { ArrowRight, Check, Globe2, Monitor, RefreshCw } from 'lucide-react'

/** 原生图解对应实际排查步骤，可缩放且无需下载额外插画。 */
export function AccessDiagram() {
  return (
    <div className="access-diagram" aria-label="从访问受阻，到核对条件，再选择可用工具">
      <div className="access-browser">
        <span className="access-browser-dots" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <Monitor size={44} strokeWidth={1.3} />
        <b>工具打不开</b>
        <small>先看页面提示</small>
      </div>
      <ArrowRight className="access-diagram-arrow" size={24} aria-hidden />
      <div className="access-diagram-check">
        <Globe2 size={36} strokeWidth={1.3} />
        <b>核对条件</b>
        <small>地区 · 账号 · 服务状态</small>
        <RefreshCw size={18} aria-hidden />
      </div>
      <ArrowRight className="access-diagram-arrow" size={24} aria-hidden />
      <div className="access-browser is-ready">
        <span className="access-browser-dots" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <span className="access-ready-icon">
          <Check size={40} />
        </span>
        <b>继续完成任务</b>
        <small>选合适的替代工具</small>
      </div>
    </div>
  )
}
