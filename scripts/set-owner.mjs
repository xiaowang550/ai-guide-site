/** 管理账号维护：凭据通过环境变量传入，只保存密码哈希。 */
import { readFileSync } from 'node:fs'
import { createSqliteDb } from '../lib/db/sqlite.ts'
import { hashPassword } from '../lib/admin/crypto.ts'

const username = process.env.ADMIN_USERNAME?.trim()
const password = process.env.ADMIN_PASSWORD
if (!username || !password || password.length < 8)
  throw new Error('请设置 ADMIN_USERNAME 和至少 8 位的 ADMIN_PASSWORD。')
const record = await hashPassword(password, process.env.ADMIN_PEPPER)
const statements = [
  { sql: 'DELETE FROM sessions', params: [] },
  { sql: 'DELETE FROM login_attempts', params: [] },
  {
    sql: `INSERT INTO admins (username, password_hash, salt, iterations, role, created_at)
      VALUES (?, ?, ?, ?, 'owner', ?) ON CONFLICT(username) DO UPDATE SET
      password_hash = excluded.password_hash, salt = excluded.salt, iterations = excluded.iterations, role = 'owner'`,
    params: [username, record.hash, record.salt, record.iterations, new Date().toISOString()],
  },
  { sql: 'DELETE FROM admins WHERE username != ?', params: [username] },
  {
    sql: 'INSERT INTO audit_log (at, actor, action, target, detail) VALUES (?, ?, ?, ?, ?)',
    params: [
      new Date().toISOString(),
      'system',
      'account.configure',
      username,
      JSON.stringify({ note: '配置唯一站点所有者，撤销旧会话' }),
    ],
  },
]
if (process.argv.includes('--remote')) throw new Error('此脚本仅维护本地账号；线上账号请通过已认证后台或 D1 管理工具维护。')
const db = createSqliteDb({ path: '.data/admin-dev.db' })
  await db.exec(readFileSync('db/schema.sql', 'utf8'))
  await db.batch(statements)
  db.close()
  console.log('本地唯一管理员已更新；所有旧会话已退出。')
