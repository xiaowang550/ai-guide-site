import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { eduToolkits } from '@/data/edu-toolkits'
import { eduPrograms } from '@/data/edu-programs'
import { searchDocs } from '@/data'
import { eduNav, megaNav } from '@/lib/site'
import { generatePolicy } from '@/lib/edu-shared'
import { buildFreshnessReport } from '@/lib/freshness'
import sitemap from '@/app/sitemap'
import { login, makeTestEnv, request } from './helpers/admin-test-env'

describe('当前学校服务的教学范围', () => {
  it('教师演示与禁止学生使用时，只要求观察证据，不要求学生使用声明', () => {
    for (const intensity of ['仅教师可用', '明确禁止'] as const) {
      for (const stage of ['初中', '高中'] as const) {
        const result = generatePolicy({ stage, subject: '通用', intensity })
        expect(result.declaration).toContain('观察记录')
        expect(result.declaration).not.toContain('我使用的工具')
        expect(result.sections.flatMap((section) => section.items).join('')).toContain('学生')
        expect(result.redLines.join('')).toContain('家庭信息')
        expect(result.homeworkAdjustments.join('')).not.toContain('40%')
      }
    }
  })
  it('删除公开小学教案，保留初中、高中与跨学段场景', () => {
    expect(new Set(eduToolkits.map((item) => item.stage))).toEqual(
      new Set(['初中', '高中', '跨学段']),
    )
    expect(eduToolkits.some((item) => item.id.startsWith('primary-'))).toBe(false)
    expect(eduPrograms.find((item) => item.id === 's2-use-well')?.stage).toBe('高中')
  })
  it('初中仅安排认识和教师演示，不要求个人工具使用', () => {
    for (const item of eduToolkits.filter((item) => item.stage === '初中')) {
      expect(item.mode).toBe('认识 AI')
      expect(item.declarationTemplate).toContain('我未注册或独立使用 AI 工具')
      expect(item.policyNotes.join('')).toContain('不要求学生注册账号')
    }
  })
  it('每套教案的流程时长等于课时，并有材料与可填写的工作单', () => {
    for (const program of eduPrograms) {
      expect(program.modules.reduce((sum, module) => sum + module.minutes, 0)).toBe(
        program.lessons * 45,
      )
    }
    for (const item of eduToolkits) {
      expect(item.materials.length).toBeGreaterThanOrEqual(2)
      expect(item.worksheetTemplate).toContain('____')
      for (const plan of item.lessonPlans) {
        const minutes = plan.flow.map((step) => Number(step.match(/^(\d+) 分钟/)?.[1]))
        expect(minutes.every(Number.isFinite)).toBe(true)
        expect(minutes.reduce((total, value) => total + value, 0)).toBe(plan.minutes)
      }
    }
  })
})

describe('暂停的学校模块仅保留于后台', () => {
  it('导航、搜索、站点地图和公开路由均不包含暂停模块', () => {
    const hidden = /\/edu\/(schools|briefings)(\/|$)/
    const publicUrls = [
      ...eduNav.map((item) => item.href),
      ...megaNav.flatMap((item) => (item.children ?? []).map((child) => child.href)),
      ...searchDocs.map((item) => item.href),
      ...sitemap().map((item) => new URL(item.url).pathname),
    ]
    expect(publicUrls.filter((url) => hidden.test(url))).toEqual([])
    for (const section of ['schools', 'briefings']) {
      expect(existsSync(`app/(public)/edu/${section}`)).toBe(false)
      expect(existsSync(`archive/edu/${section}/page.tsx`)).toBe(true)
    }
    expect(searchDocs.some((item) => item.href.includes('primary-'))).toBe(false)
    expect(buildFreshnessReport().items.filter(item => hidden.test(item.href))).toEqual([])
  })
  it('匿名请求被拒绝；所有者可读取保留的内容且不缓存', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    const denied = await request(env, 'GET', '/api/admin/school-modules')
    expect(denied.status).toBe(401)
    await login(env)
    const response = await request(env, 'GET', '/api/admin/school-modules')
    expect(response.status).toBe(200)
    expect(response.json.publicEnabled).toBe(false)
    expect(response.json.schools.length).toBeGreaterThan(0)
    expect(response.json.briefings.length).toBeGreaterThan(0)
    expect(response.headers.get('cache-control')).toBe('no-store')
  })
  it('后台组件通过认证接口获取内容，未打包学校与简报数据', () => {
    const view = readFileSync('components/admin/school-modules-view.tsx', 'utf8')
    expect(view).toContain('/api/admin/school-modules')
    expect(view).not.toMatch(/from ['"]@\/data\/edu-(schools|briefings)/)
    const publicData = readFileSync('data/index.ts', 'utf8')
    expect(publicData).not.toContain('eduSchools')
    expect(publicData).not.toContain('eduBriefings')
    const publicFreshness = readFileSync('lib/freshness.ts', 'utf8')
    expect(publicFreshness).not.toContain('eduSchools')
    expect(publicFreshness).not.toContain('eduBriefings')
  })
})
