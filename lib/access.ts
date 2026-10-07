import type { Tool } from '@/data/types'

/**
 * 网络可访问性。
 *
 * 这个模块存在的理由：`chinaAccessible: false` 本身没有行动价值。
 * 读者看到「不能直连」之后真正需要的是「那我现在该怎么办」，
 * 所以这里把散落在数据里的说明聚合成可判断、可校验的结论。
 */

/** 三类原因性质不同，读者需要的应对也不同，不能笼统写「需要网络工具」 */
export type AccessReason = 'unserved' | 'tos-restricted' | 'network-dependent'

export const ACCESS_REASON_LABELS: Record<AccessReason, string> = {
  unserved: '官方未在该地区开放',
  'tos-restricted': '服务条款未把该地区列入支持范围',
  'network-dependent': '能力完全依赖其服务器可达',
}

/**
 * 不可直连的工具必须说清原因类型。
 *
 * 判断依据刻意写得保守：只要 access.reality 里提到「服务条款」「账号受限」
 * 就归到 tos-restricted，因为那是**风险等级最高**的一类 ——
 * 用户需要知道的不只是「打不开」，还有「硬用可能出事」。
 */
export function classifyAccess(tool: Tool): AccessReason | null {
  if (tool.chinaAccessible) return null
  const text = tool.access?.reality ?? ''
  if (!text) return null
  if (/服务条款|账号受限|不支持的地区|支持地区/.test(text)) return 'tos-restricted'
  if (/未在.*开放|不在.*列表/.test(text)) return 'unserved'
  return 'network-dependent'
}

/** 该工具是否给了替代方案 */
export function hasAlternatives(tool: Tool): boolean {
  return (tool.access?.alternatives?.length ?? 0) > 0
}

/**
 * 校验一批工具的可访问性说明是否自洽。
 *
 * 存在的理由：这类内容最容易腐化 —— 新增工具时忘了写说明、
 * 写了个替代方案但那个工具自己也不可直连（等于把用户推到另一扇关着的门）、
 * 或者文案里混进了不该出现的东西。
 * 把这些变成会失败的测试，比上线后再被发现便宜。
 */
export interface AccessAudit {
  /** chinaAccessible: false 但没写 access 的工具 */
  missingNote: string[]
  /** 替代方案指向了不存在的工具 */
  danglingAlternative: string[]
  /** 替代方案指向了同样不可直连的工具（把用户推到另一扇关着的门） */
  blockedAlternative: string[]
  /** 可直连但写了「打不开」的说明（自相矛盾） */
  contradictory: string[]
  /** access 里出现了不该出现的内容 */
  suspicious: string[]
  /** reality 太短，等于没说明 */
  tooShort: string[]
}

export function auditAccess(tools: readonly Tool[]): AccessAudit {
  const byId = new Map(tools.map((t) => [t.id, t]))
  const out: AccessAudit = {
    missingNote: [],
    danglingAlternative: [],
    blockedAlternative: [],
    contradictory: [],
    suspicious: [],
    tooShort: [],
  }

  for (const t of tools) {
    if (!t.chinaAccessible && !t.access) {
      out.missingNote.push(t.id)
      continue
    }
    if (t.chinaAccessible && t.access) {
      out.contradictory.push(t.id)
    }
    if (!t.access) continue

    if ((t.access.reality ?? '').trim().length < 20) out.tooShort.push(t.id)

    for (const alt of t.access.alternatives ?? []) {
      const target = byId.get(alt)
      if (!target) out.danglingAlternative.push(`${t.id} -> ${alt}`)
      else if (!target.chinaAccessible) out.blockedAlternative.push(`${t.id} -> ${alt}`)
    }

    // 立场检查：不得出现绕过网络限制的方法或厂商名
    const blob = `${t.access.reality} ${(t.access.alternatives ?? []).join(' ')}`
    if (/翻墙|梯子|机场|节点|订阅链接|clash|shadow|v2ray|wireguard|起飞|西游云|机场节点/i.test(blob)) {
      out.suspicious.push(t.id)
    }
  }

  return out
}

/**
 * 本站明确不提供的内容清单。
 *
 * 写在这里是为了让「不提供」成为一个可检验的承诺，而不是一句表态。
 * 新增相关页面时，`lib/__tests__/no-circumvention.test.ts` 会扫到这些词并失败。
 */
export const OUT_OF_SCOPE: { topic: string; why: string }[] = [
  {
    topic: '绕过网络限制的具体方法、工具或厂商',
    why: '规避网络管理在境内有法律风险；本站也不做厂商带货',
  },
  {
    topic: '代购、共享账号、借用他人账号',
    why: '违反服务条款，且账号随时可能被收回，连累的是共用者',
  },
  {
    topic: '宣称某个工具「一定可用」',
    why: '可直连也不等于稳定；不给做不到的承诺',
  },
]