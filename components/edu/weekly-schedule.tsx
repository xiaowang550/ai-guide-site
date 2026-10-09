'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CalendarDays, Copy, Printer } from 'lucide-react'
import { buildWeeklySchedule, scheduleToText } from '@/lib/schedule'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** 最近的周一（含今天就是周一则取今天），格式 YYYY-MM-DD */
function nextMondayISO(now: Date = new Date()): string {
  const dow = now.getDay() // 0=周日
  const delta = dow === 1 ? 0 : (8 - dow) % 7 || 7
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + delta)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * 一键生成某一周的课时安排表。
 *
 * 解决老师拿到教案包之后的真实问题：教案按「课时」写，
 * 但学校课表按「第几节、第几分钟」排。这里把两者对上，
 * 老师填自己学校的作息时间就能出表，可打印、可复制。
 *
 * 排满原则：教案里没有的课时不会被编造，标为「机动 / 巩固」，
 * 未排入的课时会明确告知数量，不假装都用上了。
 */
export function WeeklyScheduleBuilder({
  lessons,
  toolkitTitle,
  defaultStartDate = '',
}: {
  lessons: { title: string; goal: string; flow: string[]; minutes: number }[]
  toolkitTitle: string
  /** 由页面传入的服务端起始日期；留空则客户端挂载后自动取最近的周一 */
  defaultStartDate?: string
}) {
  const [startDate, setStartDate] = useState(defaultStartDate)
  const [daysPerWeek, setDaysPerWeek] = useState(5)
  const [periodsPerDay, setPeriodsPerDay] = useState(4)
  const [minutesPerLesson, setMinutesPerLesson] = useState(40)
  const [firstPeriodAt, setFirstPeriodAt] = useState('08:00')
  const [skipDates, setSkipDates] = useState<string[]>([])
  const [holidayInput, setHolidayInput] = useState('')
  const [copied, setCopied] = useState(false)
  // 默认只显示排入的课时：教案包通常只有 1-2 课时，整周 20 个格子
  // 里 18 个是「机动」，全展开反而看不见真正要排的东西
  const [showAllSlots, setShowAllSlots] = useState(false)

  // 静态导出下 HTML 是构建时冻结的，所以「最近的周一」只能在挂载后算。
  // 服务端与客户端首帧保持一致（都为空），避免 hydration 不匹配。
  useEffect(() => {
    if (!startDate) setStartDate(nextMondayISO())
    // 只在挂载时跑一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ready = startDate.length > 0

  const schedule = useMemo(
    () =>
      buildWeeklySchedule(lessons, {
        startDate,
        daysPerWeek,
        periodsPerDay,
        minutesPerLesson,
        firstPeriodAt,
        skipDates,
      }),
    [lessons, startDate, daysPerWeek, periodsPerDay, minutesPerLesson, firstPeriodAt, skipDates]
  )

  const skippedSlots = schedule.freeSlots

  // 默认只列排入的课时，避免整周 20 个格子里 18 个空格子把真正的安排淹没
  const visibleDays = useMemo(
    () =>
      showAllSlots
        ? schedule.days
        : schedule.days
            .map((d) => ({ ...d, slots: d.slots.filter((s) => !s.isFree) }))
            .filter((d) => d.slots.length > 0),
    [schedule, showAllSlots]
  )

  function addHoliday() {
    const v = holidayInput.trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return
    if (!skipDates.includes(v)) setSkipDates((prev) => [...prev, v].sort())
    setHolidayInput('')
  }

  async function copyText() {
    // 与当前视图保持一致：看到 1 行就复制 1 行，不给人意外的 20 行
    const text = scheduleToText({ ...schedule, days: visibleDays }, toolkitTitle)
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <section className="mb-8">
      <h2 className="flex items-center gap-2 text-xl">
        <CalendarDays className="h-5 w-5 text-primary" aria-hidden />
        排进我的课表
      </h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        教案按「课时」写，学校课表按「第几节、第几分钟」排。填入本校作息即可生成安排表，可直接打印或复制进教案本。
      </p>

      {/* 参数 */}
      <div className="mt-4 grid gap-4 rounded-xl border bg-muted/30 p-4 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
        <Field label="起始日期" hint="通常填本周一">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-9 w-full rounded-lg border bg-background px-2.5 text-sm"
          />
        </Field>

        <Field label="第一节课时间">
          <input
            type="time"
            value={firstPeriodAt}
            onChange={(e) => setFirstPeriodAt(e.target.value)}
            className="h-9 w-full rounded-lg border bg-background px-2.5 text-sm"
          />
        </Field>

        <Field label="每周排课天数">
          <Chips
            options={[3, 4, 5, 6, 7]}
            value={daysPerWeek}
            onChange={setDaysPerWeek}
            suffix=" 天"
          />
        </Field>

        <Field label="每天节数">
          <Chips
            options={[2, 3, 4, 5, 6, 7]}
            value={periodsPerDay}
            onChange={setPeriodsPerDay}
            suffix=" 节"
          />
        </Field>

        <Field label="每节分钟">
          <Chips
            options={[35, 40, 45, 50]}
            value={minutesPerLesson}
            onChange={setMinutesPerLesson}
            suffix=" 分钟"
          />
        </Field>

        <Field label="节假日 / 校运会等停课日" hint="可添加多个，按日期跳过">
          <div className="flex gap-1.5">
            <input
              type="date"
              value={holidayInput}
              onChange={(e) => setHolidayInput(e.target.value)}
              className="h-9 min-w-0 flex-1 rounded-lg border bg-background px-2.5 text-sm"
              aria-label="要跳过的日期"
            />
            <Button type="button" size="sm" variant="outline" onClick={addHoliday}>
              加入
            </Button>
          </div>
          {skipDates.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {skipDates.map((d) => (
                <li key={d}>
                  <button
                    type="button"
                    onClick={() => setSkipDates((prev) => prev.filter((x) => x !== d))}
                    className="inline-flex h-6 items-center gap-1 rounded-full border px-2 text-xs hover:border-primary/40"
                    title="点击移除该停课日"
                  >
                    {d} ×
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </Field>
      </div>

      {/* 统计 */}
      {ready ? (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="tabular-nums">
            排入 <strong className="text-primary">{schedule.assignedLessons}</strong> 课时
          </span>
          <span className="tabular-nums text-muted-foreground">
            机动 {schedule.freeSlots} 节
          </span>
          <span className="tabular-nums text-muted-foreground">
            合计 {schedule.totalMinutes} 分钟
          </span>
          {schedule.unassignedLessons > 0 ? (
            <span className="text-amber-700 dark:text-amber-400">
              还有 {schedule.unassignedLessons} 课时没排进本周（需要多排几天或压缩课时）
            </span>
          ) : null}
          {schedule.assignedLessons > 0 ? (
            <button
              type="button"
              onClick={() => setShowAllSlots((v) => !v)}
              aria-pressed={showAllSlots}
              className="ml-auto inline-flex h-7 items-center gap-1 rounded-full border px-3 text-xs text-muted-foreground transition-colors hover:border-primary/40"
            >
              {showAllSlots ? '只看已排课时' : `显示整周课表（含 ${schedule.freeSlots} 节机动）`}
            </button>
          ) : null}
        </div>
      ) : null}

      {/* 表格 */}
      {!ready ? (
        <p className="mt-4 rounded-lg border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          正在按本周一生成安排表…
        </p>
      ) : schedule.assignedLessons === 0 ? (
        <p className="mt-4 rounded-lg border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          这个教案包没有可排入的课时明细。
        </p>
      ) : (
        <>
          <div
            className="mt-3 overflow-x-auto border"
            tabIndex={0}
            role="region"
            aria-label="课时安排表，可横向滚动"
          >
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <caption className="sr-only">
                {toolkitTitle} 的课时安排表，{visibleDays.length} 天，共{' '}
                {visibleDays.reduce((n, d) => n + d.slots.length, 0)} 节
              </caption>
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <Th>日期</Th>
                  <Th>节次</Th>
                  <Th>时间</Th>
                  <Th>课时</Th>
                  <Th>教学目标</Th>
                </tr>
              </thead>
              <tbody>
                {visibleDays.map((day) => (
                  <DayRows key={day.date} day={day} />
                ))}
              </tbody>
            </table>
          </div>

          {!showAllSlots && skippedSlots > 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              另有 {skippedSlots} 节空课未显示（教案只覆盖这些课时）。
              <button
                type="button"
                onClick={() => setShowAllSlots(true)}
                className="ml-1 underline underline-offset-4 hover:text-primary"
              >
                查看整周课表
              </button>
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2 print:hidden">
            <Button type="button" size="sm" variant="outline" onClick={copyText}>
              <Copy className="h-3.5 w-3.5" aria-hidden />
              {copied ? '已复制' : '复制为文本'}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5" aria-hidden />
              打印安排表
            </Button>
          </div>
        </>
      )}

      <p className="mt-3 text-xs leading-6 text-muted-foreground">
        说明：表里没标「机动」的格子就是本教案包的课时，标「机动 / 巩固」的是你课表里空出来的位置 ——
        本站不替你编课。教案里的课时用完后如需继续，请按同一目标自行备课，或看
        <Link href="/edu/toolkits" className="mx-1 underline underline-offset-4">
          其他教案包
        </Link>
        。
      </p>
    </section>
  )
}

/** 同一天的行：日期只在该天第一行显示，其余留空，方便视觉分组 */
function DayRows({
  day,
}: {
  day: {
    date: string
    weekday: string
    slots: {
      period: number
      timeRange: string
      lessonTitle: string | null
      goal: string | null
      isFree: boolean
    }[]
  }
}) {
  return (
    <>
      {day.slots.map((slot, i) => (
        <tr key={`${day.date}-${slot.period}`} className="border-b last:border-0 align-top">
          <td className="whitespace-nowrap px-3 py-2.5 font-medium" rowSpan={i === 0 ? day.slots.length : undefined}>
            {i === 0 ? (
              <>
                <span className="block tabular-nums">{day.date}</span>
                <span className="block text-xs text-muted-foreground">{day.weekday}</span>
              </>
            ) : null}
          </td>
          <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-muted-foreground">
            第 {slot.period} 节
          </td>
          <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-muted-foreground">
            {slot.timeRange}
          </td>
          <td className={cn('px-3 py-2.5', slot.isFree && 'text-muted-foreground')}>
            {slot.isFree ? (
              <span className="text-xs">机动 / 巩固</span>
            ) : (
              <span className="font-medium">{slot.lessonTitle}</span>
            )}
          </td>
          <td className="px-3 py-2.5 text-sm leading-6 text-foreground/85">{slot.goal ?? '—'}</td>
        </tr>
      ))}
    </>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-1.5">{children}</div>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

function Chips({
  options,
  value,
  onChange,
  suffix = '',
}: {
  options: number[]
  value: number
  onChange: (v: number) => void
  suffix?: string
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          aria-pressed={value === o}
          className={cn(
            'inline-flex h-9 min-w-11 items-center justify-center rounded-full border px-3 text-sm tabular-nums transition-colors',
            value === o
              ? 'border-primary bg-primary/5 font-medium text-primary'
              : 'hover:border-primary/40'
          )}
        >
          {o}
          {suffix}
        </button>
      ))}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th scope="col" className="px-3 py-2 text-xs font-medium text-muted-foreground">
      {children}
    </th>
  )
}