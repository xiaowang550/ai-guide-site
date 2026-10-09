import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail, MessageCircleQuestion, Repeat2 } from 'lucide-react'
import { eduFaq } from '@/data/edu-faq'
import { computeEduMetrics } from '@/lib/edu'
import { PageHeader, Section } from '@/components/page-header'
import { FaqList } from '@/components/edu/faq-list'
import { CopyableText } from '@/components/copyable-text'

export const metadata: Metadata = {
  title: '答疑与反馈回路',
  description:
    '培训结束后保持联系，避免「当场会、回去就忘」。教师与学生在实际使用中遇到的问题，会作为下一版内容的优先改进项。',
  alternates: { canonical: '/edu/support' },
}

const QUESTION_TEMPLATE = `【提问/反馈模板】（可直接复制填写后发送给我们）

1. 我是谁：教师 / 学生 / 家长 / 学校管理者
2. 学校与学段：____________（如：某初级中学）
3. 学科或岗位：____________（如：初中数学）
4. 类型：提问 / 反馈某份材料有问题 / 申请校本定制 / 申请试点
5. 具体问题或现象：____________
   （工具相关问题请写明：工具名称、使用环节、完整提示词、输出结果）
6. 我已经试过的做法：____________
7. 我希望得到的答案：____________

（反馈材料问题时请附上材料名称与版本号，例如「教师第一课 v1.2」）`

export default function SupportPage() {
  const metrics = computeEduMetrics()

  return (
    <>
      <PageHeader
        className="school-page-heading"
        title="答疑与反馈回路"
        description="三种问题都能提：不知道怎么做、发现材料有问题、想按本校情况调整。反馈不是客服工单，而是内容迭代的输入。"
        breadcrumbs={[
          { label: '首页', href: '/' },
          { label: 'AI 教育服务', href: '/edu' },
          { label: '答疑与反馈' },
        ]}
      />

      <div className="container py-8">
        <Section
          title="常见问题"
          description="这里只写学校真实会问到的原话。答案是先给立场，再给能照着做的做法，最后指出边界。"
        >
          <FaqList items={eduFaq} />
        </Section>

        <Section title="怎么提问 / 反馈" description="按下面的模板填写，我们能少问一轮，你也能更快拿到答案。">
          <CopyableText text={QUESTION_TEMPLATE} title="提问与反馈模板（可复制）" label="复制模板" />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <a
              href="mailto:edu@example.com?subject=%E6%95%99%E5%AD%A6%E6%9C%8D%E5%8A%A1%E6%8F%90%E9%97%AE"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Mail className="h-4 w-4" aria-hidden />
              发送邮件
            </a>
            <span className="text-xs text-muted-foreground">
              邮箱地址为占位示例，正式发布前需替换为部门邮箱
            </span>
          </div>
        </Section>

        <Section title="教师社群" description="解决日常问题，形成互帮互学的稳定通道。">
          <div className="grid gap-4 md:grid-cols-3">
            <Card
              icon={<MessageCircleQuestion className="h-4 w-4" aria-hidden />}
              title="怎么进群"
              detail="参加进校宣讲或工作坊的学校，由培训实施组在活动后建立对应分组；未参训学校可先通过邮件联系。"
            />
            <Card
              icon={<Repeat2 className="h-4 w-4" aria-hidden />}
              title="群里能拿到什么"
              detail={`最新课程与教案包版本、简报提前预览、跨校经验（去标识化后）。当前已沉淀 ${metrics.programs} 门课程、${metrics.toolkits} 套教案包。`}
            />
            <Card
              icon={<Mail className="h-4 w-4" aria-hidden />}
              title="社群纪律"
              detail="不转发未标注来源的工具输出截图；不在群里讨论具体学生个人信息；发现材料问题请走反馈通道，便于进入修订流程。"
            />
          </div>
        </Section>

        <Section title="反馈如何变成下一版内容" description="这是我们对合作学校的承诺，也是内容能保持可用的唯一办法。">
          <ol className="space-y-2.5">
            {[
              '收到反馈后先归类：是内容错误、案例不适配、还是表述不清',
              '内容错误：立即修订对应材料，版本号 +1，并在简报里说明改了什么',
              '案例不适配：由课程研发组评估是否需要校本版本，不直接改通用材料',
              '表述不清：进入下一版重写清单，优先处理被三所以上学校提到的问题',
              '每学期至少做一次全面复核，明确本学期推荐工具与不建议使用的做法',
            ].map((s, i) => (
              <li key={s} className="flex gap-3 border-t border-hairline pt-4">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {i + 1}
                </span>
                <span className="text-sm leading-6 text-foreground/85">{s}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs leading-6 text-muted-foreground">
            如果一条反馈在两周内没有被处理，我们会回复你当前的进展与预计时间 ——
            沉默比拒绝更消耗信任。相关流程也记录在
            <Link href="/edu" className="mx-1 text-primary underline underline-offset-4">
              AI 教育服务总览
            </Link>
            中。
          </p>
        </Section>
      </div>
    </>
  )
}

function Card({
  icon,
  title,
  detail,
}: {
  icon: React.ReactNode
  title: string
  detail: string
}) {
  return (
    <div className="border-b border-hairline pb-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
      </h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
    </div>
  )
}