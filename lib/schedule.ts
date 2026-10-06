/**
 * 课时安排表生成（纯函数，可单测）。
 *
 * 场景：老师拿到一套教案包（里面有 1-2 个课时的详细流程），
 * 需要排进自己这一周的真实课表 —— 哪个班、第几节、上多久。
 *
 * 设计约束：
 * 1) **确定性**：同样输入永远同样结果。绝不使用随机数或当前时间，
 *    否则老师刷新一次表格就变了，没法拿去和同事核对。
 * 2) **不臆造课时**：教案包里只有 N 个课时，排不满时剩下的槽位标为
 *    「机动 / 巩固」，而不是替老师编一节不存在的课。
 * 3) **尊重真实的课表约束**：可设每周天数、每天节次、每节分钟、
 *    第几节开始、是否跳过周末与节假日。
 */

export interface ScheduleOptions {
  /** 起始日期 ISO（周一通常最省事） */
  startDate: string
  /** 每周排课天数，默认 5（周一到周五） */
  daysPerWeek: number
  /** 每天节数上限，默认 6 */
  periodsPerDay: number
  /** 每节分钟数，默认 40 */
  minutesPerLesson: number
  /** 第几节开始的时间，如 '08:00' */
  firstPeriodAt: string
  /** 跳过的星期（0=周日, 6=周六），默认跳过周末 */
  skipWeekdays: number[]
  /** 额外要跳过的日期（如法定假日），ISO 日期数组 */
  skipDates: string[]
}

export const DEFAULT_SCHEDULE_OPTIONS: ScheduleOptions = {
  startDate: '',
  daysPerWeek: 5,
  periodsPerDay: 6,
  minutesPerLesson: 40,
  firstPeriodAt: '08:00',
  skipWeekdays: [0, 6],
  skipDates: [],
}

/** 课表里的一格 */
export interface ScheduleSlot {
  /** 第几天（0 起，按实际排课日连续计数） */
  dayIndex: number
  /** 该天的第几节（1 起） */
  period: number
  /** ISO 日期 */
  date: string
  /** 星期几中文 */
  weekday: string
  /** 'HH:MM' - 'HH:MM' */
  timeRange: string
  /** 对应的教案课时标题；null 表示机动/巩固 */
  lessonTitle: string | null
  /** 教学目标（只有有课时内容才有） */
  goal: string | null
  /** 课堂活动提示 */
  activity: string | null
  /** 这节课要准备的东西（从该课时的流程第一步提取） */
  prep: string | null
  /** 是否为机动槽位 */
  isFree: boolean
}

export interface WeeklySchedule {
  days: {
    date: string
    weekday: string
    slots: ScheduleSlot[]
  }[]
  /** 实际排入的课时数 */
  assignedLessons: number
  /** 机动槽位数 */
  freeSlots: number
  /** 教案包里剩下的课时数（没排进去的） */
  unassignedLessons: number
  /** 总课时分钟 */
  totalMinutes: number
  /** 是否已经把教案包用完 */
  fullyAssigned: boolean
}

const WEEKDAY_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

/** 最小可用课时（当教案包没提供足够课时时占位用） */
function placeholderLesson(): {
  lessonTitle: string | null
  goal: string | null
  activity: string | null
  prep: string | null
  isFree: boolean
} {
  return {
    lessonTitle: null,
    goal: null,
    activity: null,
    prep: null,
    isFree: true,
  }
}

/** 'HH:MM' 加分钟 → 'HH:MM'（跨天会自动回绕） */
export function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(':').map((n) => Number(n) || 0)
  const total = (h * 60 + m + minutes) % (24 * 60)
  const hh = Math.floor(total / 60)
  const mm = total % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

function parseISO(iso: string): Date {
  // 用 UTC 解析，避免时区导致星期算错
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1))
}

function toISO(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/**
 * 生成一周（或多天）的课时安排表。
 *
 * @param lessons 教案包里的课时（每个含 title/goal/flow/activity 等）
 * @param options 课表约束
 */
export function buildWeeklySchedule(
  lessons: { title: string; goal: string; flow: string[]; minutes?: number }[],
  options: Partial<ScheduleOptions> = {}
): WeeklySchedule {
  const opts: ScheduleOptions = { ...DEFAULT_SCHEDULE_OPTIONS, ...options }
  const skipDates = new Set(opts.skipDates)
  const periodsPerDay = Math.max(1, Math.min(12, opts.periodsPerDay))
  const minutesPerLesson = Math.max(10, Math.min(180, opts.minutesPerLesson))
  const daysPerWeek = Math.max(1, Math.min(7, opts.daysPerWeek))

  // 起始日期：从它开始往后找可排课的日子
  let cursor = opts.startDate ? parseISO(opts.startDate) : parseISO('2026-09-07')
  if (Number.isNaN(cursor.getTime())) cursor = parseISO('2026-09-07')

  // 队列：教案包里的课时按顺序取
  const queue = lessons.map((l, i) => ({
    title: l.title,
    goal: l.goal,
    activity: l.flow[0] ?? null,
    prep: l.flow.length > 1 ? l.flow[1] : null,
    index: i,
  }))

  const days: WeeklySchedule['days'] = []
  let queueCursor = 0
  let freeSlots = 0
  let guard = 0

  // 最多向后找 60 天，避免 startDate 落在很久以前时死循环
  while (days.length < daysPerWeek && guard < 60) {
    guard += 1
    const iso = toISO(cursor)
    const weekday = cursor.getUTCDay()

    if (opts.skipWeekdays.includes(weekday) || skipDates.has(iso)) {
      cursor = new Date(cursor.getTime() + 86_400_000)
      continue
    }

    const slots: ScheduleSlot[] = []
    let clock = opts.firstPeriodAt

    for (let period = 1; period <= periodsPerDay; period++) {
      const timeRange = `${clock}-${addMinutes(clock, minutesPerLesson)}`
      clock = addMinutes(clock, minutesPerLesson)

      const next = queue[queueCursor]
      const filled = Boolean(next)
      const info = filled
        ? {
            lessonTitle: next.title,
            goal: next.goal,
            activity: next.activity,
            prep: next.prep,
            isFree: false,
          }
        : placeholderLesson()

      if (!filled) freeSlots += 1
      else queueCursor += 1

      slots.push({
        dayIndex: days.length,
        period,
        date: iso,
        weekday: WEEKDAY_CN[weekday] ?? '',
        timeRange,
        ...info,
      })
    }

    days.push({ date: iso, weekday: WEEKDAY_CN[weekday] ?? '', slots })
    cursor = new Date(cursor.getTime() + 86_400_000)
  }

  const assignedLessons = queueCursor

  return {
    days,
    assignedLessons,
    freeSlots,
    unassignedLessons: Math.max(0, lessons.length - assignedLessons),
    totalMinutes: lessons
      .slice(0, assignedLessons)
      .reduce((sum, l) => sum + (l.minutes ?? minutesPerLesson), 0),
    fullyAssigned: assignedLessons >= lessons.length && lessons.length > 0,
  }
}

/** 导出为可复制的文本（老师要贴进教案本或群里） */
export function scheduleToText(schedule: WeeklySchedule, title: string): string {
  const lines: string[] = [`【课时安排】${title}`, '']
  for (const day of schedule.days) {
    lines.push(`${day.date} ${day.weekday}`)
    for (const slot of day.slots) {
      const name = slot.isFree ? '机动 / 巩固' : slot.lessonTitle ?? ''
      lines.push(`  ${slot.period}. ${slot.timeRange}  ${name}`)
      if (slot.goal) lines.push(`     目标：${slot.goal}`)
    }
    lines.push('')
  }
  lines.push(
    `共排入 ${schedule.assignedLessons} 课时` +
      (schedule.unassignedLessons > 0 ? `，另有 ${schedule.unassignedLessons} 课时未排入` : '') +
      `；机动 ${schedule.freeSlots} 节`
  )
  return lines.join('\n')
}