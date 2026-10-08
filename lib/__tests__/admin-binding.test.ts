import { describe, expect, it } from 'vitest'
import { createD1Db, D1BindingMissingError } from '@/lib/db/d1'
import { handleApi } from '@/lib/admin/api'

/**
 * D1 绑定缺失时的行为。
 *
 * 为什么单独测：这是本项目最难自查的一个 bug，已经真实踩过一次。
 *
 * 当时的症状是「所有接口都正常，只有一个接口 500」：
 *   - `createD1Db(undefined)` 安静成功 —— 它只返回一个闭包，
 *     `database.prepare` 要等第一次查询才执行，所以调用方的 try/catch 抓不到
 *   - 鉴权接口不查库就返回（无 token 时 verifySession 直接 `return null`），
 *     于是 dashboard 返回 401，看起来「后台是活的」
 *   - 直到真的查库的接口才抛 `undefined.prepare`，
 *     而那句话被通用错误处理吞成「服务端处理出错」
 *
 * 也就是说「Pages 没配 D1 绑定」在现场完全不像绑定问题，
 * 而日志里也查不到任何跟绑定有关的线索。
 *
 * 这些断言的作用是把这个症状钉死在测试里：绑定一丢，
 * 立刻失败并指向真正的原因，而不是变成一个需要排查两小时的 500。
 */
describe('D1 绑定缺失', () => {
  it('createD1Db(undefined) 立刻抛错，而不是返回一个假 db', () => {
    // 这一条是根因：原来它安静成功，try/catch 因此形同虚设
    expect(() => createD1Db(undefined as never)).toThrow(D1BindingMissingError)
    expect(() => createD1Db(null as never)).toThrow(D1BindingMissingError)
    // 形状不对的也要挡（比如绑定指向了 KV 或 R2）
    expect(() => createD1Db({ get: () => null } as never)).toThrow(D1BindingMissingError)
  })

  it('错误类型可被精确识别，不与普通异常混淆', () => {
    const e = new D1BindingMissingError()
    expect(e).toBeInstanceOf(Error)
    expect(e.name).toBe('D1BindingMissingError')
    // 关键：不能被「no such table」那条规则误捕获
    expect(/no such table|SQLITE_ERROR.*table/i.test(e.message)).toBe(false)
  })

  it('任何管理接口都返回可操作的提示，而不是「服务端处理出错」', async () => {
    // DB 绑定换成 undefined，模拟 Pages 运行时没注入绑定的情形
    for (const path of [
      '/api/content/published',
      '/api/admin/dashboard',
      '/api/admin/feedback',
      '/api/admin/content',
    ]) {
      const res = await handleApi(new Request(`https://example.test${path}`), {
        DB: undefined as never,
        SITE_SALT: 'test-salt',
      })
      expect(res, `${path} 应该有响应`).not.toBeNull()
      const body = await res!.json()
      expect(res!.status, `${path} 应为 500`).toBe(500)
      expect(body.error, `${path} 不该是通用错误`).not.toMatch(/服务端处理出错/)
      // 提示必须包含可执行的下一步，否则等于没提示
      expect(body.error).toMatch(/Bindings/)
      expect(body.error).toMatch(/DB/)
    }
  })

  it('绑定正常时不会被误报成缺失', () => {
    // 造一个形状正确的 D1Database，确认校验放行
    const fake = {
      prepare: () => ({
        bind: () => fake.prepare(),
        first: async () => null,
        all: async () => [],
        run: async () => ({ success: true }),
      }),
      batch: async () => [],
      exec: async () => ({ count: 0, duration: 0 }),
    }
    expect(() => createD1Db(fake as never)).not.toThrow()
  })
})