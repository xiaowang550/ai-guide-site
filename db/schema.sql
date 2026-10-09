-- ============================================================================
-- AI 能力图谱 · 管理后台数据库（D1 / SQLite）
-- ============================================================================
--
-- 设计前提（决定了下面每一条约束）：
--
-- 1) 公开站是纯静态导出（output: 'export'）。读者侧的 140 个页面在构建期
--    就生成好了，运行时不会查库。所以这张表的首要读者不是访客，是**构建机**：
--    `scripts/sync-content.mjs` 在每次构建前把「已发布」的内容拉成快照文件，
--    静态页面再从快照渲染。后台改完东西不会让数据库变慢，只会让下一次构建变新。
--
-- 2) 版本不可变。`content_versions` 只 INSERT，永不 UPDATE。
--    任何一次编辑产生的新内容都是一行新版本，而不是原地改。
--    这样「回滚上一版」就是把 `content_items.published_version` 指回去，
--    而不是「反向编辑」—— 后者在多人或多次编辑后无法保证回到真正的历史状态。
--
-- 3) 统计不存个人标识。这张表里没有任何 IP、指纹或可关联到个人的字段，
--    见 `page_views` 的注释。站点对外承诺不做用户画像，就不能从后门做。
--
-- 4) 所有时间戳用 ISO 8601 字符串（TEXT）。与 data/*.ts 里的 updatedAt 格式一致，
--    排序与比较可以直接用字符串比较，不需要时区处理。
--    SQLite 的 TEXT 比较默认就是逐字节（BINARY collation），
--    而 ISO 8601 UTC 字符串的字典序与时间序一致，所以 ORDER BY 直接可用。
-- ============================================================================

-- ── 管理员与会话 ─────────────────────────────────────────────────────────────

-- 管理员账号。
-- 密码只存 PBKDF2-SHA256 的派生结果，**永不存明文、永不存可逆密文**。
-- iterations 定为 210000 是 OWASP 对 PBKDF2-SHA256 的当前建议值。
CREATE TABLE IF NOT EXISTS admins (
  username       TEXT PRIMARY KEY,
  password_hash  TEXT NOT NULL,              -- base64url(PBKDF2-SHA256(password, salt))
  salt           TEXT NOT NULL,              -- base64url(16 字节随机盐)
  iterations     INTEGER NOT NULL,
  -- 角色分离是为了让「改内容」和「管账号」不是同一权限。
  -- 当前只发放 owner；editor 预留在 schema 里，避免将来改表结构。
  role           TEXT NOT NULL DEFAULT 'editor'
                 CHECK (role IN ('owner', 'editor')),
  created_at     TEXT NOT NULL,
  last_login_at  TEXT
);

-- 会话。
--
-- 为什么存 token 的哈希而不是 token 本身：会话表是后台最容易被读到的数据
-- （D1 控制台、备份文件、误配置的 Analytics 导出）。
-- 存哈希后，即使这张表泄露，攻击者也无法直接冒用会话 —— 他只有哈希，
-- 而 Cookie 里是原文，需要两者同时具备。
CREATE TABLE IF NOT EXISTS sessions (
  token_hash  TEXT PRIMARY KEY,              -- base64url(SHA-256(cookie 中的 token))
  username    TEXT NOT NULL,
  expires_at  TEXT NOT NULL,                 -- ISO 8601，过期会话由清理任务删除
  created_at  TEXT NOT NULL,
  -- 记录创建会话时的 UA 与 IP **前缀**（/24 掩码）只用于审计显示，
  -- 但这两列刻意允许为空且从不上报：站点不存 IP，这是唯一的例外点，
  -- 因为「谁在什么时候登录」的安全审计确实需要它，且掩码后无法定位到个人。
  user_agent  TEXT,
  ip_prefix   TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user    ON sessions(username);

-- 登录失败计数，用于登录接口的限流。
--
-- 没有它的话后台登录接口就是一个可以无限撞库的公开端点。
-- key 是 SHA-256(用户名 + IP 的 /24 前缀)，**不存原始 IP** ——
-- 既能限流，又没有把访客地址写进库。
-- 计数按分钟分桶，所以不需要定时任务清理历史桶：
-- 查询只关心当前分钟这一行。
CREATE TABLE IF NOT EXISTS login_attempts (
  key          TEXT PRIMARY KEY,             -- base64url(SHA-256(username|ip_prefix))
  username     TEXT NOT NULL,
  window_start INTEGER NOT NULL,             -- Unix 分钟
  count        INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT                          -- 锁定截止时间（ISO）
);

CREATE INDEX IF NOT EXISTS idx_attempts_window ON login_attempts(window_start);

-- 公开端点的通用限流（反馈提交、统计埋点）。
--
-- 这两个接口都不需要登录，等于对全网开放。没有限流的话：
--   · 反馈表可以被灌满垃圾，真实的纠错反馈会被淹没
--   · 埋点可以被刷，统计数字失去意义
--
-- key 一律是 SHA-256(用途 + 站点盐 + IP 掩码)，不存原始 IP。
-- 窗口按分钟分桶，查询只看当前分钟，因此不需要定时任务清理。
CREATE TABLE IF NOT EXISTS rate_limits (
  key          TEXT PRIMARY KEY,
  purpose      TEXT NOT NULL,               -- 'feedback' | 'analytics'
  window_start INTEGER NOT NULL,
  count        INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_ratelimits_window ON rate_limits(window_start);

-- ── 内容：条目 / 版本 / 草稿 ─────────────────────────────────────────────────

-- 内容条目：一个 slug 对应一行，记录「现在对外发布的是哪一版」。
--
-- 这是「当前状态」表，不是「内容表」—— 内容本身在 content_versions 里。
-- 拆开的原因：详情页、列表页都需要「最新一版」，如果内容存在这里，
-- 每次读都要 JOIN；而这里只存一个版本号，读起来是一行。
CREATE TABLE IF NOT EXISTS content_items (
  id                TEXT PRIMARY KEY,       -- 形如 'tool:kimi'（类型:slug）
  kind              TEXT NOT NULL,           -- 'tool' | 'case' | 'guide' | 'path' | 'concept'
  slug              TEXT NOT NULL,
  -- 已发布版本号；NULL 表示从未发布（新建但还没发布）。
  -- 回滚 = 把这个数字改回旧版本号，不改动任何内容数据。
  published_version INTEGER,
  -- 已发布内容的小摘要，列表页不用 JOIN versions 就能显示一行标题。
  -- 从来不是权威数据，权威数据永远是对应版本号的 JSON。
  published_title  TEXT,
  published_at     TEXT,
  -- 乐观锁：编辑表单提交时带上它，不一致就拒绝写入，
  -- 防止两个人同时打开同一页编辑，后提交的把前一个的改动整份盖掉。
  edit_version      INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  UNIQUE (kind, slug)
);

CREATE INDEX IF NOT EXISTS idx_items_kind ON content_items(kind);
CREATE INDEX IF NOT EXISTS idx_items_updated ON content_items(updated_at);

-- 版本历史。只增不改。
--
-- data 存的是该版本的**完整 JSON 快照**，不是补丁。理由：
--   · 回滚必须是精确的。用补丁要「反向应用」才能还原，
--     中间任何一次 schema 变更都会让老补丁失效。
--   · 备份与导出可以直接按版本号取，不依赖当前基线。
-- 代价是重复存储，但单条工具资料约 6-10 KB，
-- 即使每天发布 10 次、单条 10 KB，一年也只有约 35 MB，D1 免费额度完全够。
CREATE TABLE IF NOT EXISTS content_versions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id     TEXT NOT NULL,
  version     INTEGER NOT NULL,
  data        TEXT NOT NULL,                -- 完整 JSON 快照
  -- 这一版相对上一版改了什么（人话描述，后台历史列表直接显示）。
  change_note TEXT,
  -- 完整快照的字节数，用来在历史列表显示体积增长，
  -- 也能发现「误把整份文件贴进来」这类事故。
  size_bytes  INTEGER NOT NULL,
  actor       TEXT,                         -- 发布者用户名
  created_at  TEXT NOT NULL,
  UNIQUE (item_id, version),
  FOREIGN KEY (item_id) REFERENCES content_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_versions_item ON content_versions(item_id, version DESC);

-- 草稿：编辑中、尚未发布。
--
-- 为什么要独立于版本表：草稿是**会被反复覆盖**的工作区，
-- 而版本是不可变的历史。放在一起会导致历史里全是「编辑了三次还没发布」的垃圾版本。
CREATE TABLE IF NOT EXISTS content_drafts (
  item_id      TEXT PRIMARY KEY,
  data         TEXT NOT NULL,
  -- 草稿是从哪个已发布版本开始编辑的。
  -- 发布时如果 published_version 已经变了，说明期间有人发布过，
  -- 此时必须提示冲突而不是静默覆盖。
  base_version INTEGER,
  actor        TEXT,
  note         TEXT,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  FOREIGN KEY (item_id) REFERENCES content_items(id) ON DELETE CASCADE
);

-- ── 用户反馈 ────────────────────────────────────────────────────────────────

-- 反馈状态机：新 → 处理中 → 已解决 / 已忽略。
-- 「已忽略」单独存在而不是直接删除：重复反馈需要能看到「上次是怎么处理的」，
-- 删掉记录就会再次收到同一条。
CREATE TABLE IF NOT EXISTS feedback (
  id            TEXT PRIMARY KEY,           -- uuid
  kind          TEXT NOT NULL DEFAULT 'errata'
                CHECK (kind IN ('errata', 'question', 'suggestion', 'correction')),
  page_url      TEXT,
  -- 邮箱可选：很多人只想提一句，不愿留联系方式。
  -- 留了才可能有回访，不留也照常受理。
  contact       TEXT,
  message       TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'new'
                CHECK (status IN ('new', 'triaged', 'resolved', 'dismissed')),
  handled_by    TEXT,
  handled_note  TEXT,
  -- 提交来源，便于分辨是公开站表单还是后台手工录入。
  source        TEXT NOT NULL DEFAULT 'public',
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at DESC);

-- ── 访问统计与关键事件 ───────────────────────────────────────────────────────

-- 访问量：按天 × 路径聚合。
--
-- **这里刻意不存 IP、User-Agent 全文或任何指纹。**
-- 独立访客数（UV）必须靠某种跨请求的可关联标识来算，那等于用户画像，
-- 与站点「不做用户画像、不存个人信息」的对外承诺冲突。
-- 所以这里只答「哪些页面被看了多少次」，不答「谁来了几次」。
-- 后台仪表盘也据此不显示 UV —— 宁可少一个指标，不做一个骗人的指标。
--
-- 路径做了归一化：去掉尾部斜杠与 query string，否则
-- /tools/kimi/?from=home 和 /tools/kimi 会变成两行，热门页面统计会被打散。
CREATE TABLE IF NOT EXISTS page_views (
  day          TEXT NOT NULL,               -- YYYY-MM-DD（UTC）
  path         TEXT NOT NULL,
  count        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, path)
);

CREATE INDEX IF NOT EXISTS idx_pageviews_path ON page_views(path, day DESC);

-- 实时浏览量按分钟聚合，只保留最近两天，不记录任何访客标识。
CREATE TABLE IF NOT EXISTS page_view_minutes (
  minute TEXT NOT NULL,
  path TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (minute, path)
);

-- 关键使用事件：同样按天 × 事件名 × 路径聚合。
-- 事件名是白名单里的枚举，不接受前端随意传字符串 —— 否则
-- 一个写错的埋点名就会在库里堆出一堆垃圾行，且无法聚合。
CREATE TABLE IF NOT EXISTS events (
  day          TEXT NOT NULL,
  name         TEXT NOT NULL,
  path         TEXT NOT NULL,
  count        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, name, path)
);

CREATE INDEX IF NOT EXISTS idx_events_name ON events(name, day DESC);

-- 事件名白名单。与 lib/admin/analytics.ts 的 EVENT_NAMES 保持一致，
-- 两侧都要改；不一致会在测试里被抓到。
CREATE TABLE IF NOT EXISTS event_names (
  name        TEXT PRIMARY KEY,
  label       TEXT NOT NULL,                -- 后台显示的中文名
  description TEXT NOT NULL                 -- 这个事件代表什么用户行为
);

-- 一次性事件（用于「首次接入」这类只需记录一次的标记）。
-- 与 events 分开是因为语义不同：events 是可累加的计数，
-- 这里记的是「已经发生/尚未发生」这件事本身。
CREATE TABLE IF NOT EXISTS milestones (
  name       TEXT PRIMARY KEY,
  payload    TEXT,                          -- JSON，可空
  created_at TEXT NOT NULL
);

-- ── 内容复核待办 ────────────────────────────────────────────────────────────

-- 待办来源两类：
--   · 'freshness'  由内容更新时间超过阈值自动生成（复用 lib/freshness.ts 的分级）
--   · 'evidence'   依据覆盖度过低，需要补写打分依据
--   · 'manual'     人工添加（例如「等厂商发布新版本后复核价格」）
--
-- 自动生成的那两类必须能被重新计算覆盖，否则改了 updatedAt 之后
-- 旧待办会一直挂在列表里提醒你去看一个已经复核过的条目。
CREATE TABLE IF NOT EXISTS review_tasks (
  id          TEXT PRIMARY KEY,              -- 自动生成时为 'freshness:<item_id>'，可重复计算覆盖
  item_id     TEXT,
  kind        TEXT NOT NULL
              CHECK (kind IN ('freshness', 'evidence', 'manual')),
  title       TEXT NOT NULL,
  detail      TEXT,
  -- 严重度决定后台列表的排序与是否高亮。
  severity    TEXT NOT NULL DEFAULT 'normal'
              CHECK (severity IN ('low', 'normal', 'high')),
  due_date    TEXT,
  status      TEXT NOT NULL DEFAULT 'open'
              CHECK (status IN ('open', 'done', 'dismissed')),
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  resolved_at TEXT,
  resolved_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_review_status ON review_tasks(status, severity, due_date);

-- ── 审计日志 ────────────────────────────────────────────────────────────────

-- 所有会改变状态的后台操作都写这里，且**只写不删**。
-- 与 content_versions 的区别：versions 记的是「内容变成了什么」，
-- audit_log 记的是「谁在什么时候做了什么操作」，包括发布、回滚、
-- 删除反馈、改账号这些不对应内容版本的操作。
CREATE TABLE IF NOT EXISTS audit_log (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  at        TEXT NOT NULL,
  actor     TEXT NOT NULL,
  action    TEXT NOT NULL,                  -- 'publish' | 'rollback' | 'login' | ...
  target    TEXT,                           -- 目标标识，如 'tool:kimi'
  detail    TEXT,                           -- JSON，可空
  -- 请求来源 IP 的 /24 前缀，仅用于安全审计（见 sessions.ip_prefix 的说明）。
  ip_prefix TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_at     ON audit_log(at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor  ON audit_log(actor, at DESC);
