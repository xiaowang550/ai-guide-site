import { describe, expect, it } from 'vitest'
import {
  addMinutes,
  buildWeeklySchedule,
  DEFAULT_SCHEDULE_OPTIONS,
  scheduleToText,
  type WeeklySchedule,
} from '../schedule'

const LESSONS = [
  {
    title: '第 1 课时：认识 AI 的能力边界',
    goal: '能说出 AI 会做什么、不会做什么',
    flow: ['用两个真实例子演示幻觉', '让学生自己找一个 AI 答错的地方', '小组讨论并汇报'],
    minutes: 40,
  },
  {
    title: '第 2 课时：用 AI 提问的四个要素',
    goal: '能写出含背景与约束的提示词',
    flow: ['对比好提问与坏提问的输出', '现场改写三条提示词', '同桌互评'],
    minutes: 40,
  },
]

const opts = { startDate: '2026-09-07', daysPerWeek: 5, periodsPerDay: 4, minutesPerLesson: 40, firstPeriodAt: '08:00' }

describe('addMinutes', () => {
  it('正常累加', () => {
    expect(addMinutes('08:00', 40)).toBe('08:40')
    expect(addMinutes('08:40', 40)).toBe('09:20')
  })

  it('跨小时与跨天都正确', () => {
    expect(addMinutes('09:40', 40)).toBe('10:20')
    expect(addMinutes('23:40', 40)).toBe('00:20')
  })

  it('异常输入不崩', () => {
    expect(() => addMinutes('bad', 30)).not.toThrow()
  })
})

describe('buildWeeklySchedule', () => {
  const s = buildWeeklySchedule(LESSONS, opts)

  it('是确定性的：同样输入两次结果完全一致', () => {
    const again = buildWeeklySchedule(LESSONS, opts)
    expect(JSON.stringify(again)).toBe(JSON.stringify(s))
  })

  it('按 daysPerWeek 排天数，周末被跳过', () => {
    expect(s.days).toHaveLength(5)
    expect(s.days.every((d) => d.weekday !== '周六' && d.weekday !== '周日')).toBe(true)
    // 2026-09-07 是周一
    expect(s.days[0].date).toBe('2026-09-07')
    expect(s.days[0].weekday).toBe('周一')
  })

  it('每天节数符合配置，且时间连续不重叠', () => {
    expect(s.days[0].slots).toHaveLength(4)
    const first = s.days[0].slots
    expect(first[0].timeRange).toBe('08:00-08:40')
    expect(first[1].timeRange).toBe('08:40-09:20')
    // 08:00 / 08:40 / 09:20 / 10:00 —— 共 4 节
    expect(first.map((x) => x.timeRange)).toEqual([
      '08:00-08:40',
      '08:40-09:20',
      '09:20-10:00',
      '10:00-10:40',
    ])
  })

  it('教案里的课时按顺序填入，不篡改内容', () => {
    const titles = s.days.flatMap((d) => d.slots).map((x) => x.lessonTitle)
    expect(titles[0]).toBe(LESSONS[0].title)
    expect(titles[1]).toBe(LESSONS[1].title)
    const first = s.days[0].slots[0]
    expect(first.goal).toBe(LESSONS[0].goal)
    expect(first.activity).toBe(LESSONS[0].flow[0])
    expect(first.prep).toBe(LESSONS[0].flow[1])
  })

  it('课时不够时标为机动，不编造课程', () => {
    const small = buildWeeklySchedule([LESSONS[0]], { ...opts, periodsPerDay: 3, daysPerWeek: 2 })
    const slots = small.days.flatMap((d) => d.slots)
    expect(slots.filter((x) => x.isFree).length).toBeGreaterThan(0)
    expect(slots.filter((x) => x.isFree).every((x) => x.lessonTitle === null)).toBe(true)
    expect(small.fullyAssigned).toBe(true)
  })

  it('课时多于槽位时如实报告未排入数量', () => {
    const many = buildWeeklySchedule([...LESSONS, ...LESSONS, ...LESSONS], { ...opts, periodsPerDay: 2, daysPerWeek: 2 })
    expect(many.unassignedLessons).toBeGreaterThan(0)
    expect(many.fullyAssigned).toBe(false)
  })

  it('可以指定具体节假日跳过', () => {
    const withHoliday = buildWeeklySchedule(LESSONS, {
      ...opts,
      daysPerWeek: 4,
      skipDates: ['2026-09-08'],
    })
    expect(withHoliday.days.some((d) => d.date === '2026-09-08')).toBe(false)
  })

  it('起始日期落在周末时自动顺延到下一个上课日', () => {
    // 2026-09-12 是周六
    const s2 = buildWeeklySchedule(LESSONS, { ...opts, startDate: '2026-09-12', daysPerWeek: 1 })
    expect(s2.days[0].weekday).toBe('周一')
    expect(s2.days[0].date).toBe('2026-09-14')
  })

  it('非法参数被夹到合理范围，不会死循环', () => {
    const wild = buildWeeklySchedule(LESSONS, {
      ...opts,
      daysPerWeek: 99,
      periodsPerDay: 0,
      minutesPerLesson: 100000,
      firstPeriodAt: '乱填',
    })
    expect(wild.days.length).toBeLessThanOrEqual(7)
    expect(wild.days[0].slots.length).toBeGreaterThan(0)
  })

  it('空教案也能出表（全是机动）', () => {
    const empty = buildWeeklySchedule([], opts)
    expect(empty.assignedLessons).toBe(0)
    expect(empty.fullyAssigned).toBe(false)
    expect(empty.days.flatMap((d) => d.slots).every((x) => x.isFree)).toBe(true)
  })

  it('非法 startDate 不会抛错', () => {
    const bad = buildWeeklySchedule(LESSONS, { ...opts, startDate: 'not-a-date' })
    expect(bad.days.length).toBeGreaterThan(0)
  })

  it('统计分钟数只算真正排入的课时', () => {
    const one = buildWeeklySchedule([LESSONS[0]], { ...opts, daysPerWeek: 1, periodsPerDay: 2 })
    expect(one.totalMinutes).toBe(40)
  })

  it('默认配置跳过周末', () => {
    expect(DEFAULT_SCHEDULE_OPTIONS.skipWeekdays).toEqual([0, 6])
  })
})

describe('scheduleToText', () => {
  it('导出可读文本，含标题、日期、每节信息与统计', () => {
    const s: WeeklySchedule = buildWeeklySchedule(LESSONS, opts)
    const text = scheduleToText(s, '小学语文 · AI 入门')
    expect(text).toContain('【课时安排】小学语文 · AI 入门')
    expect(text).toContain('2026-09-07 周一')
    expect(text).toContain('08:00-08:40')
    expect(text).toContain(LESSONS[0].title)
    expect(text).toContain('机动 / 巩固')
    expect(text).toContain('共排入 2 课时')
  })

  it('有未排入课时时会提示', () => {
    const s = buildWeeklySchedule([...LESSONS, ...LESSONS, ...LESSONS], {
      ...opts,
      daysPerWeek: 1,
      periodsPerDay: 2,
    })
    expect(scheduleToText(s, 'x')).toContain('未排入')
  })
})