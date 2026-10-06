import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  ClipboardCheck,
  Compass,
  FileStack,
  GraduationCap,
  School,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { eduPrograms, eduTiers } from '@/data/edu-programs'
import { computeEduMetrics } from '@/lib/edu'
import { PageHeader, Section } from '@/components/page-header'
import { Ladder } from '@/components/edu/ladder'
import { EduFreshnessNote, EduMetricsBar } from '@/components/edu/edu-metrics'

export const metadata: Metadata = {
  title: 'AI 教育服务：面向本地学校的课程与教案包',
  description:
    '把外部快速变化的 AI 能力，转化为教师与学生当下就能用起来的内容：教师四层阶梯课程、学生三层素养课程、可直接开课的教案包、AI 使用规范与定期简报。',
  alternates: { canonical: '/edu' },
}

const principles = [
  { title: '以课堂为落点', detail: '任何内容都要能在真实教学中使用，不能用的不发。' },
  { title: '以可用为标准', detail: '不做无法落地的理论介绍，每门课都有当天可带走的产出。' },
  { title: '以更新为常态', detail: '内容维护是固定动作，不是交付一次就结束的工作。' },
]

const audiences = [
  {
    icon: School,
    title: '学校管理者',
    need: '要方向与标准',
    detail: '该支持什么、该限制什么、如何评价，以及如何向家长与教师解释。',
    href: '/edu/policy',
    cta: '看使用规范与标准',
  },
  {
    icon: Users,
    title: '教师',
    need: '要方法与工具',
    detail: '从「知道」到「会用」，再到备课、出题、批改与课堂设计的提效。',
    href: '/edu/programs',
    cta: '看教师端四层课程',
  },
  {
    icon: GraduationCap,
    title: '学生',
    need: '要认知与边界',
    detail: 'AI 是什么、怎么用对、什么时候不能用，以及如何核验与留痕。',
    href: '/edu/programs',
    cta: '看学生端三层课程',
  },
]

const delivery = [
  { name: '进校宣讲与工作坊', solves: '解决「不知道」与「不会用」，让教师当天就能上手。' },
  { name: '课程与教案包', solves: '解决持续性问题，学校拿到即可开课、即可备课。' },
  { name: '教师社群与答疑', solves: '解决日常问题，形成互帮互学的稳定通道。' },
  { name: '试点到区域推广', solves: '先在真实场景验证，再把成熟做法复制到更大范围。' },
  { name: '校本定制', solves: '结合学段、学科与教研安排调整，不做一套课件走遍所有学校。' },
  { name: '常态化答疑与回访', solves: '避免出现「当场会、回去就忘」。' },
]

const teams = [
  { name: '课程研发组', duty: '内容与教案包的开发、版本化与季度复核' },
  { name: '培训实施组', duty: '进校宣讲、教师工作坊与种子教师培养' },
  { name: '运营保障组', duty: '学校对接、材料发放与效果跟踪' },
]

export default function EduHomePage() {
  const metrics = computeEduMetrics()

  return (
    <>
      <PageHeader
        title="面向本地学校的 AI 教育供给"
        description="我们不做模型研发，也不停留在概念介绍。我们的角色是「从技术到课堂」的转化者，以及持续更新的内容供给方：技术向前走一步，课程、教案与工具清单同步向前走一步。"
        breadcrumbs={[{ label: '首页', href: '/' }, { label: 'AI 教育服务' }]}
        meta={<EduFreshnessNote latestUpdate={metrics.latestUpdate} />}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/edu/programs"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground"
            >
              浏览课程体系
              <ArrowRight className="h-3 w-3" aria-hidden />
            </Link>
            <Link
              href="/edu/policy"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium hover:bg-accent"
            >
              生成 AI 使用规范
            </Link>
          </div>
        }
      />

      <div className="container py-8">
        {/* 三条原则 */}
        <section className="mb-10 grid gap-3 md:grid-cols-3">
          {principles.map((p) => (
            <div key={p.title} className="border-b border-hairline pb-5">
              <h2 className="text-sm font-semibold">{p.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{p.detail}</p>
            </div>
          ))}
        </section>

        {/* 三类服务对象 */}
        <Section
          title="三类服务对象，三种不同的需求"
          description="需求不相同，供给方式必须分层设计 —— 而不是用一套内容应对所有人。"
        >
          <div className="grid gap-4 md:grid-cols-3">
            {audiences.map((a, i) => (
              <Link
                key={a.title}
                href={a.href}
                className="spotlight reveal group border-b border-hairline pb-5 transition-colors hover:border-foreground/20"
                style={{ ['--d' as string]: `${i * 60}ms` }}
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <a.icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-4 flex items-baseline gap-2 text-base font-semibold">
                  {a.title}
                  <span className="text-xs font-normal text-muted-foreground">{a.need}</span>
                </h3>
                <p className="mt-2 text-sm leading-6 text-foreground/80">{a.detail}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
                  {a.cta}
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            ))}
          </div>
        </Section>

        {/* 阶梯 */}
        <Section
          title="教师端四层阶梯"
          description="阶梯关系而不是并列选项：基础层不牢，效率层容易用错；效率层不熟，教学层难以深入。"
        >
          <Ladder tiers={eduTiers} programs={eduPrograms} audience="teacher" />
        </Section>

        <Section
          title="学生端三层阶梯"
          description="先知道 AI 是什么，再学会怎么用，最后懂得何时不该用。素养层不是附加内容，而是长期正确使用的前提。"
        >
          <Ladder tiers={eduTiers} programs={eduPrograms} audience="student" />
        </Section>

        {/* 交付物 */}
        <Section
          title="我们提供什么"
          description="不只是「讲一场」，而是可以直接进入学校日常的组合。"
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <DeliverCard
              icon={GraduationCap}
              title="课程体系"
              detail={`${metrics.programs} 门课程，每层配套讲义、演示案例、实操任务与常见错误清单`}
              href="/edu/programs"
            />
            <DeliverCard
              icon={FileStack}
              title="课程与教案包"
              detail={`${metrics.toolkits} 套教案包，按学段与学科编排，含课件、讨论题与使用规范要点`}
              href="/edu/toolkits"
            />
            <DeliverCard
              icon={ShieldCheck}
              title="AI 使用规范生成器"
              detail="选学段、学科与使用强度，即时生成校级规范草案、学生使用声明与作业调整建议"
              href="/edu/policy"
            />
            <DeliverCard
              icon={ClipboardCheck}
              title="定期简报与答疑"
              detail="用最短篇幅说明「这一期变了什么、对我们意味着什么」，并把问题接住"
              href="/edu/briefings"
            />
          </div>
        </Section>

        {/* 落地方式 */}
        <Section title="六种落地方式" description="缺一不可：只有宣讲没有材料，热度过后归零；只有试点没有推广，经验停留在个别学校。">
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {delivery.map((d) => (
              <li key={d.name} className="border-t border-hairline pt-4">
                <p className="text-sm font-semibold">{d.name}</p>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{d.solves}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-l-2 border-primary/30 bg-accent/30 p-4 text-sm leading-6 text-foreground/85">
            推进顺序上先做深度、再做广度：先在少量学校把内容打磨到可复制，再扩大覆盖范围。
            范围扩张的速度取决于内容成熟度，而不是宣讲场次。
          </p>
        </Section>

        {/* 指标 */}
        <Section
          title="过程指标"
          description="价值最终要落在可观察的变化上。下列口径与看板中的数字一致，覆盖教师为「人次」统计（同一教师参加多门课会重复计入）。"
        >
          <EduMetricsBar metrics={metrics} />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link
              href="/edu/schools"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium hover:bg-accent"
            >
              <Compass className="h-3 w-3" aria-hidden />
              查看试点学校与推广看板
            </Link>
          </div>
        </Section>

        {/* 机构设置 */}
        <Section title="谁在做" description="对接学校教研部门，不替代学校教学管理，负责内容供给与质量把关。">
          <div className="grid gap-3 md:grid-cols-3">
            {teams.map((t) => (
              <div key={t.name} className="border-t border-hairline pt-4">
                <p className="text-sm font-semibold">{t.name}</p>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{t.duty}</p>
              </div>
            ))}
          </div>
        </Section>

        <p className="border-t pt-6 text-xs leading-6 text-muted-foreground">
          本专区所有课程与材料均标注适用时间与版本，过时内容会在
          <Link href="/edu/briefings" className="text-primary underline underline-offset-4">
            {' '}
            定期简报
          </Link>
          中说明并替换。发现某份材料已经不适用，请通过
          <Link href="/edu/support" className="text-primary underline underline-offset-4">
            {' '}
            反馈回路
          </Link>{' '}
          告诉我们 —— 教师与学生的真实使用问题，是下一版内容的优先改进项。
        </p>
      </div>
    </>
  )
}

function DeliverCard({
  icon: Icon,
  title,
  detail,
  href,
}: {
  icon: typeof GraduationCap
  title: string
  detail: string
  href: string
}) {
  return (
    <Link href={href} className="group border-b border-hairline pb-5 transition-colors hover:border-primary/50">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <h3 className="mt-3 text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
        查看
        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </span>
    </Link>
  )
}