import type { EduProgram } from './types'

/**
 * 课程体系数据（教师端四层阶梯 + 学生端三层阶梯）
 *
 * 阶梯设计原则（来自方案）：
 * - 教师端四层是阶梯关系而非并列选项：基础层不牢，效率层容易用错；效率层不熟，教学层难以深入
 * - 学生端三层有先后：先知道 AI 是什么，再学会怎么用，最后懂得何时不该用
 * - 每门课程都标注适用时间与替代关系（内容版本化）
 */

export const eduTiers = [
  {
    id: 'T1',
    audience: 'teacher',
    order: 1,
    name: '基础层：从「知道」到「会用」',
    goal: '补齐认知：知道 AI 能做什么、不能做什么，完成第一次有效使用',
    requires: '无门槛要求，这是起点。本地教师最常见的状态是「知道，却没用过」，第一层不能跳过',
  },
  {
    id: 'T2',
    audience: 'teacher',
    order: 2,
    name: '效率层：把时间还给教学',
    goal: '备课、出题、批改、材料与数据处理的提效方法，以重复性事务为切口',
    requires: '需要已完成基础层。没理解能力边界就上手提效，容易把省下的时间又浪费在返工上',
  },
  {
    id: 'T3',
    audience: 'teacher',
    order: 3,
    name: '教学层：AI 进入课堂设计与评价',
    goal: '让工具成为设计、互动与反馈的一部分，而不是课外点缀',
    requires: '需要效率层已有稳定习惯。教学层要求能判断哪些环节该用、哪些环节必须人来判断',
  },
  {
    id: 'T4',
    audience: 'teacher',
    order: 4,
    name: '骨干层：种子教师培养',
    goal: '每校培养一批能讲、能用、能带人的教师，形成校内自传播',
    requires: '需要完成前三层。骨干教师要能讲清边界，而不只是会用',
  },
  {
    id: 'S1',
    audience: 'student',
    order: 1,
    name: '认知层：AI 是什么、能与不能',
    goal: '从零建立基本判断，既不神化，也不回避',
    requires: '无门槛要求。先建立判断力，再谈使用',
  },
  {
    id: 'S2',
    audience: 'student',
    order: 2,
    name: '应用层：把 AI 用在学习与项目中',
    goal: '学会提问、拆解任务、核对结果、标明使用过程',
    requires: '需要完成认知层。不理解边界的提问，只会更快地得到错误答案',
  },
  {
    id: 'S3',
    audience: 'student',
    order: 3,
    name: '素养层：核验、伦理、诚信与依赖风险',
    goal: '知道哪些事不能交给 AI，知道何时应当停手',
    requires: '需要完成应用层。素养层不是附加内容，而是长期正确使用的前提',
  },
] as const

export const eduPrograms: EduProgram[] = [
  // ==================== 教师端 T1 基础层 ====================
  {
    id: 't1-ai-literacy',
    title: '教师 AI 第一课：AI 能做什么、不能做什么',
    tier: 'T1',
    stage: '跨学段',
    subject: '通用',
    lessons: 1,
    format: '进校宣讲',
    outcome: '当场上完课，每位教师用 AI 独立完成一次真实任务，并能说出三条「不能交给 AI」的事',
    audience: '全体教师（含非信息技术背景）',
    prerequisites: ['自备手机或电脑一台，能打开任意一个对话式 AI'],
    modules: [
      {
        title: '开场：为什么「知道」不等于「会用」',
        minutes: 10,
        points: [
          '本地教师现状：听说过 AI，但说不清能做什么、不能做什么',
          '技术迭代速度已超过教材更新速度，一年前写的讲义今天可能过时',
          '本课不追求讲全，只追求讲清边界',
        ],
      },
      {
        title: '能力边界：三个必须记住的判断',
        minutes: 20,
        points: [
          '它会说得像真的，但不是数据库：不知道的事情也会编（幻觉）',
          '它没有替你的人生负责：最终判断必须由人做出',
          '它不知道你班上的情况：任何「结合学情」的建议都要你补充信息',
        ],
        activity: '现场演示一次幻觉：问一个看似专业但可能不存在的条款，让教师亲眼看到它编出来',
      },
      {
        title: '第一次有效使用：现场做一件真事',
        minutes: 20,
        points: [
          '不要用「帮我写首诗」这类无任务场景试水',
          '用今天真实要做的材料：通知、总结、教案框架任选其一',
          '现场互相看结果，找出为什么有的输出能用、有的不能用',
        ],
        activity: '教师用真实材料完成第一次输出，同桌互评',
      },
      {
        title: '收尾：三条不能交给 AI 的事',
        minutes: 10,
        points: ['学生的评价与处分', '涉及学生个人信息的处理', '你专业判断后才能落地的最终结论'],
      },
    ],
    deliverables: ['讲义（含 20 条边界判断清单）', '现场演示案例包', '首次使用实操任务单', '常见错误清单'],
    commonMistakes: [
      '把 AI 当搜索引擎用，问「2026 年最新政策」却不要求给来源',
      '只试一次就下结论说「不好用」，没有给足背景信息',
      '把它输出的结论直接转发给家长，中间没有自己的核对',
    ],
    relatedRefs: [
      { kind: 'concept', id: 'hallucination' },
      { kind: 'concept', id: 'llm' },
      { kind: 'guide', id: 'prompt-basics' },
    ],
    assessment: '现场提交一份用 AI 产出的真实材料 + 一句话写出「这件事我为什么要再核对一遍」',
    version: 'v1.2',
    validFrom: '2026-09-01',
    updatedAt: '2026-09-20',
  },
  {
    id: 't1-tool-basics',
    title: '常用工具上手：按场景选工具，不追新',
    tier: 'T1',
    stage: '跨学段',
    subject: '通用',
    lessons: 1,
    format: '进校宣讲',
    outcome: '能为自己的三类任务（写材料 / 读长文档 / 处理数据）各选出一个合适工具，并知道每个工具的短板',
    audience: '全体教师',
    prerequisites: ['完成 t1-ai-literacy 或已能独立使用任意对话式 AI'],
    modules: [
      {
        title: '为什么不要追新',
        minutes: 10,
        points: [
          '工具每月都在变，但教学场景的种类是稳定的',
          '真正需要的是「一类场景配一个主力工具」，而不是十个工具都用',
          '换工具前先确认：换的是场景，还是只是新鲜感',
        ],
      },
      {
        title: '按场景分四类主力工具',
        minutes: 25,
        points: [
          '写材料类：中文语感好、能改写润色的通用对话工具',
          '读长文档类：能上传文件并给出页码依据的工具',
          '数据处理类：能真正跑公式、验算数据的工具',
          '图像与视频类：做课件配图、做短视频素材的专用工具',
        ],
        activity: '现场用「场景决策器」为三个真实任务各选一个工具，并记录理由',
      },
      {
        title: '每个工具都要看它的短板',
        minutes: 20,
        points: [
          '免费额度和付费墙是真实存在的约束，密集使用会撞墙',
          '中国大陆可直连与不可直连的工具，稳定性差别很大',
          '幻觉风险高的工具，输出必须逐条核对',
        ],
      },
      {
        title: '建立自己的工具清单',
        minutes: 15,
        points: ['写下你常用的三个工具、各自负责什么场景、什么时候该换'],
      },
    ],
    deliverables: ['工具清单模板（按场景分类）', '选型对照表', '现场演示包', '常见错误清单'],
    commonMistakes: [
      '同时订阅五六个同类工具，最后一个都没用熟',
      '只看强项宣传页，不看「别用它做」的部分',
      '把不适合本地网络环境的工具排进主力清单，导致课上打不开',
    ],
    relatedRefs: [
      { kind: 'guide', id: 'prompt-basics' },
      { kind: 'tool', id: 'deepseek' },
      { kind: 'tool', id: 'kimi' },
    ],
    assessment: '提交一份个人工具清单：三个工具 + 各自场景 + 更换条件',
    version: 'v1.1',
    validFrom: '2026-09-01',
    updatedAt: '2026-09-18',
  },

  // ==================== 教师端 T2 效率层 ====================
  {
    id: 't2-lesson-prep',
    title: '备课提效：从 90 分钟到 30 分钟的一节课',
    tier: 'T2',
    stage: '跨学段',
    subject: '通用',
    lessons: 1,
    format: '教师工作坊',
    outcome: '用 AI 在 30 分钟内产出一份可直接进课堂的教案初稿，并保留自己的教学判断',
    audience: '语文、数学、英语等文科与理科任课教师',
    prerequisites: ['完成 T1 基础层，能独立完成一次 AI 交互'],
    modules: [
      {
        title: '先看清时间花在哪',
        minutes: 10,
        points: [
          '备课时间的典型构成：找素材、抄题目、写环节、想问题链',
          '其中只有「想问题链」必须由人做，其余都值得提速',
          '不要一上来就「让 AI 写教案」，它不知道你的学情',
        ],
        activity: '现场写下自己一节课的时间分配，找出最该被压缩的部分',
      },
      {
        title: '把「素材整理」交出去',
        minutes: 25,
        points: [
          '正确的做法：先给学情与教学目标，再让它产出教学环节框架',
          '必须给的信息：本班学情、课时长度、教学进度位置',
          '产出物只到「环节框架」为止，环节内的具体问题必须自己写',
        ],
        activity: '用提示词模板产出一份环节框架，并对照自己的习惯补两处',
      },
      {
        title: '出题：一次生成 + 三次筛掉',
        minutes: 20,
        points: [
          '出题最容易出错的是难度和知识点对不对齐，必须人工筛',
          '提示词里要写明：学段、知识点、题型、数量、难度分布',
          '生成后必做：用答案反推题干是否有歧义',
        ],
        activity: '现场生成 5 道题，圈出至少 1 道不合格的并说明理由',
      },
      {
        title: '判断边界：哪些环节不能交给 AI',
        minutes: 15,
        points: ['分层教学的具体设计', '与本班学风相关的判断', '涉及学生情感的沟通话术'],
      },
    ],
    deliverables: ['备课提示词模板（含变量）', '教案环节框架模板', '出题与筛题清单', '常见错误清单'],
    commonMistakes: [
      '不给学情，只说「帮我写一节 XX 教案」，产出全是通用套话',
      '直接采纳 AI 出的题目，难度与本题教学目标对不上',
      '把「环节框架」当成「教案」，进课堂后发现没有可执行的问题链',
    ],
    relatedRefs: [
      { kind: 'guide', id: 'weekly-report' },
      { kind: 'guide', id: 'prompt-basics' },
      { kind: 'concept', id: 'context-window' },
    ],
    assessment: '提交一份 30 分钟内完成的教案初稿 + 标注出你自己改动的三处',
    version: 'v1.3',
    validFrom: '2026-08-20',
    updatedAt: '2026-09-24',
  },
  {
    id: 't2-grading-data',
    title: '批改与数据处理：把机械时间还给老师',
    tier: 'T2',
    stage: '跨学段',
    subject: '通用',
    lessons: 1,
    format: '教师工作坊',
    outcome: '能用 AI 完成一次成绩统计与错因归类，并把批改反馈的时间压到原来的三分之一',
    audience: '班主任、年级组长、任课教师',
    prerequisites: ['完成 T2 备课提效或有等效经验'],
    modules: [
      {
        title: '批改的三种做法与三种风险',
        minutes: 15,
        points: [
          'AI 可做：错题归类、反馈话术初稿、家长沟通文本草稿',
          'AI 不可做：给出最终评语与分数、涉及学生个体的判断',
          '最大风险：把学生个人信息粘贴进云端工具',
        ],
      },
      {
        title: '成绩统计：先体检，再分析',
        minutes: 25,
        points: [
          '步骤一：数据体检（缺失、重复、格式不一致、疑似录错）',
          '步骤二：让它写公式，并用你的样例数据代入验算',
          '步骤三：确认口径后再让 AI 解读，顺序不能颠倒',
        ],
        activity: '用本班真实成绩（脱敏后）走完三步',
      },
      {
        title: '错因归类：从「分数」到「下一步教什么」',
        minutes: 20,
        points: ['把错题按知识点归类，而不是按题号', '要求 AI 给出每一类的共同错因假设，并说明如何验证'],
      },
      {
        title: '隐私底线：哪些数据不能上传',
        minutes: 10,
        points: ['姓名、学号、身份证号、家庭情况：一律先脱敏', '优先选择可本地运行的方案处理敏感数据'],
      },
    ],
    deliverables: ['成绩统计提示词模板', '脱敏操作清单', '错因归类表模板', '常见错误清单'],
    commonMistakes: [
      '把含学生姓名的成绩表整表粘贴给 AI',
      '让 AI 直接给学生的评语与分数，失去评价的育人性',
      '不验算就采用它给出的统计公式，得到一个漂亮的错误结论',
    ],
    relatedRefs: [
      { kind: 'guide', id: 'excel-analysis' },
      { kind: 'concept', id: 'hallucination' },
      { kind: 'tool', id: 'ollama' },
    ],
    assessment: '提交一份脱敏后的错因归类表 + 标注出 AI 给出的假设中你打算如何验证',
    version: 'v1.2',
    validFrom: '2026-08-20',
    updatedAt: '2026-09-22',
  },

  // ==================== 教师端 T3 教学层 ====================
  {
    id: 't3-ai-in-class',
    title: 'AI 融入课堂：设计、互动与反馈三处落点',
    tier: 'T3',
    stage: '跨学段',
    subject: '通用',
    lessons: 2,
    format: '教师工作坊',
    outcome: '设计并试讲一节真正用上 AI 的课，且能说清每个环节为什么必须用工具、为什么必须由人做',
    audience: '骨干教师、学科组长',
    prerequisites: ['完成 T2 效率层，效率层不熟则教学层难以深入'],
    modules: [
      {
        title: '三处落点，不要更多',
        minutes: 20,
        points: [
          '设计前：让 AI 提供多角度切入与常见误区清单，帮助教师打开思路',
          '课堂中：即时生成变式题、按学生基础分层生成练习',
          '课后：把课堂问题整理成结构化反馈',
          '课外的其他环节暂不纳入，避免工具挤占课堂',
        ],
      },
      {
        title: '课堂中的实时使用：三条纪律',
        minutes: 25,
        points: [
          '投影使用前必须预演：学生看到的每一个字都要先自己核对',
          '不把未核对的生成内容当作「标准答案」投出去',
          '每次使用要向学生说明这是工具生成的、谁核对的',
        ],
        activity: '两人一组，各自用同一工具生成一道变式题，互查有没有错误',
      },
      {
        title: '课堂评价：AI 能替代哪一部分',
        minutes: 25,
        points: [
          '可替代：练习批改、错因统计、即时反馈生成',
          '不可替代：学习态度、进步幅度的判断、情感性反馈',
          '把评价标准改成可观察的过程证据，是这一层的核心动作',
        ],
      },
      {
        title: '试讲与复盘',
        minutes: 30,
        points: ['现场试讲 10 分钟', '复盘：哪一步学生没有反应，是工具的问题还是设计的问题'],
      },
    ],
    deliverables: ['课堂三处落点设计表', '实时使用三条纪律卡片', '评价改造清单', '试讲复盘表'],
    commonMistakes: [
      '为了用而用，把课堂时间让给了工具演示',
      '把未核对的生成内容当作权威答案投屏',
      '用工具代替评价，把评价简化成机器判分',
    ],
    relatedRefs: [
      { kind: 'guide', id: 'iterate-and-correct' },
      { kind: 'concept', id: 'llm' },
      { kind: 'tool', id: 'chatgpt' },
    ],
    assessment: '提交一节 40 分钟试讲教案 + 一份复盘记录，指出一个「本不该用 AI」的环节并说明理由',
    version: 'v1.0',
    validFrom: '2026-09-01',
    updatedAt: '2026-09-26',
  },
  {
    id: 't3-homework-redesign',
    title: '作业与评价改造：学生开始用 AI 之后怎么办',
    tier: 'T3',
    stage: '跨学段',
    subject: '通用',
    lessons: 1,
    format: '线上直播',
    outcome: '产出一份改造后的作业设计：过程可追溯、评价看证据、能识别「代做」',
    audience: '教研组长、班主任、任课教师',
    prerequisites: ['完成 T3 课堂融合或具备等效经验'],
    modules: [
      {
        title: '问题起点：原标准为什么会失效',
        minutes: 15,
        points: [
          '原评价建立在「所有产出都由人完成」的前提上',
          '一旦学生开始使用 AI，这个前提消失，而学校往往没有替代标准',
          '常见的错误应对：全面禁止（管不住）或全面放开（失去评价意义）',
        ],
      },
      {
        title: '三个改造动作',
        minutes: 30,
        points: [
          '过程留痕：要求提交草稿、修改记录与提问记录',
          '口头答辩：随机抽问两个细节，验证是否本人完成',
          '过程性评分：把评分拆成「过程 40% + 结果 60%」等可配比',
        ],
        activity: '用同一道题，设计「禁止使用」和「允许使用并留痕」两版评分标准，对比成本',
      },
      {
        title: '使用声明：让声明成为习惯',
        minutes: 15,
        points: ['声明不用于惩罚，而是用于教学：写的过程本身就是学习', '给出可直接使用的声明模板'],
      },
    ],
    deliverables: ['作业改造三动作清单', '评分标准对照表', '学生 AI 使用声明模板', '常见错误清单'],
    commonMistakes: [
      '一刀切禁止，学生转到不可控渠道，反而更危险',
      '只交最终成品，不留过程，出问题无法追溯',
      '把「用了 AI」直接等同于作弊，取消了对学习过程的评价',
    ],
    relatedRefs: [
      { kind: 'guide', id: 'reliable-output' },
      { kind: 'concept', id: 'alignment' },
      { kind: 'concept', id: 'open-vs-closed' },
    ],
    assessment: '提交一份改造后的作业单（含评分标准与声明模板位置）',
    version: 'v1.0',
    validFrom: '2026-09-01',
    updatedAt: '2026-09-25',
  },

  // ==================== 教师端 T4 骨干层 ====================
  {
    id: 't4-seed-teacher',
    title: '种子教师培养：能讲、能用、能带人',
    tier: 'T4',
    stage: '跨学段',
    subject: '通用',
    lessons: 2,
    format: '种子教师培养',
    outcome: '每位种子教师能在校内独立完成一次进校宣讲，并带出至少 2 名同伴',
    audience: '每校 3-8 名骨干教师',
    prerequisites: ['完成前三层，且愿意承担校内的传播职责'],
    modules: [
      {
        title: '种子教师要会讲什么',
        minutes: 20,
        points: ['不是讲工具功能，是讲「什么时候不用」', '必须能回答同事最尖锐的问题：「它会不会让我们变懒」'],
      },
      {
        title: '试讲与互评',
        minutes: 40,
        points: ['每人讲 15 分钟 T1 内容，其余成员按统一评分表互评', '评分表四项：准确性、可操作性、边界讲清程度、控场'],
      },
      {
        title: '带人：从一对一到一对多',
        minutes: 40,
        points: [
          '每个种子教师带 2 名同伴，第一次一起备课效果最好',
          '同伴遇到的问题要回到工作坊统一答疑，不要各自摸索',
        ],
      },
      {
        title: '建立校内传播节奏',
        minutes: 20,
        points: ['每月一次 30 分钟的校内小分享', '收集问题清单，统一反馈给 AI 教育部门'],
      },
    ],
    deliverables: ['宣讲评分表', '带人手册', '问题收集模板', '常见错误清单'],
    commonMistakes: [
      '种子教师只会用，讲不出边界，同事一问就露底',
      '一次讲太多内容，参训教师记不住任何一个方法',
      '没有收集问题机制，问题散落在私聊里，无法汇总改进',
    ],
    relatedRefs: [
      { kind: 'guide', id: 'iterate-and-correct' },
      { kind: 'guide', id: 'bad-prompt-fix' },
      { kind: 'concept', id: 'prompt' },
    ],
    assessment: '完成一次 15 分钟试讲并通过评分表；提交一份同伴带教记录',
    version: 'v1.0',
    validFrom: '2026-09-01',
    updatedAt: '2026-09-27',
  },

  // ==================== 学生端 S1 认知层 ====================
  {
    id: 's1-what-is-ai',
    title: '学生第一课：AI 是什么、能做什么、不能做什么',
    tier: 'S1',
    stage: '跨学段',
    subject: '通用',
    lessons: 1,
    format: '进校宣讲',
    outcome: '学生能用自己的话解释 AI 的能力边界，并举出三件「不该交给 AI」的事',
    audience: '全体学生（建议按学段分班授课）',
    prerequisites: ['无需准备，允许学生用手机参与课堂'],
    modules: [
      {
        title: '开场活动：它会不会取代我',
        minutes: 10,
        points: ['先让学生表态，再给结论：短期不会，长期取决于你怎么用它'],
      },
      {
        title: '两个生活比喻',
        minutes: 20,
        points: [
          '它像一个读过很多书但记不清出处的同学：知道很多，引用不可靠',
          '它像一个不会累的朋友：随时在，但不承担责任',
        ],
      },
      {
        title: '现场演示：它会怎么出错',
        minutes: 15,
        points: ['演示一次幻觉：它会自信地编出一段不存在的内容'],
      },
      {
        title: '三件不该交给它的事',
        minutes: 15,
        points: ['你的经历和感受', '需要你自己负责的决定', '你还没学会的那部分思考过程'],
      },
    ],
    deliverables: ['课堂课件', '讨论题卡', '学生使用规范一页纸', '家长说明要点'],
    commonMistakes: [
      '把 AI 讲成无所不能的神奇工具，学生预期失真',
      '只讲好处不讲边界，学生把幻觉当成事实',
      '课堂时间被工具演示占满，没有留给讨论',
    ],
    relatedRefs: [
      { kind: 'concept', id: 'llm' },
      { kind: 'concept', id: 'hallucination' },
      { kind: 'concept', id: 'token' },
    ],
    assessment: '课堂末尾每人写三句「AI 不能替我做的事」，当场收集',
    version: 'v1.2',
    validFrom: '2026-09-01',
    updatedAt: '2026-09-21',
  },

  // ==================== 学生端 S2 应用层 ====================
  {
    id: 's2-use-well',
    title: '学生实操：会问、会拆、会核对、会交代',
    tier: 'S2',
    stage: '跨学段',
    subject: '通用',
    lessons: 1,
    format: '进校宣讲',
    outcome: '学生完成一次「自己提问 → 核对 → 标明过程」的完整任务',
    audience: '初中及以上全体学生',
    prerequisites: ['已完成 S1 认知层'],
    modules: [
      {
        title: '四步法：会问、会拆、会核对、会交代',
        minutes: 20,
        points: [
          '会问：给出背景、目标、约束，而不是只丢一个题目',
          '会拆：复杂问题先拆成三步，再逐步确认',
          '会核对：至少用一种方式验证关键结论',
          '会交代：在作业里标明哪一步用了工具、怎么用的',
        ],
      },
      {
        title: '现场实操：一个真实学习任务',
        minutes: 25,
        points: ['任务：就本学科一个知识点，写出讲解并自己核对', '要求全程保留提问与修改记录'],
        activity: '两人一组互相检查对方的结果，指出至少一处需要核对的地方',
      },
      {
        title: '核对方法：三种最常用的',
        minutes: 15,
        points: [
          '换一种问法再问一次，看答案是否一致',
          '要求它给出依据，然后你去找那个依据',
          '用你自己的知识做反证测试',
        ],
      },
    ],
    deliverables: ['四步法卡片', '实操任务单', '提问记录表', '常见错误清单'],
    commonMistakes: [
      '直接交 AI 的输出，没有自己的判断过程',
      '把 AI 的解释当成标准答案背下来，考试时无法复述',
      '不记录使用过程，事后说不清哪里用到了工具',
    ],
    relatedRefs: [
      { kind: 'guide', id: 'bad-prompt-fix' },
      { kind: 'guide', id: 'reliable-output' },
      { kind: 'concept', id: 'prompt' },
    ],
    assessment: '提交实操任务单 + 提问记录表，教师按「有没有核对动作」评分',
    version: 'v1.1',
    validFrom: '2026-09-01',
    updatedAt: '2026-09-23',
  },

  // ==================== 学生端 S3 素养层 ====================
  {
    id: 's3-integrity',
    title: '素养课：核验、诚信、安全与依赖风险',
    tier: 'S3',
    stage: '初中及以上',
    subject: '通用',
    lessons: 1,
    format: '进校宣讲',
    outcome: '学生能识别四种常见风险场景，并知道每种场景下应当停手还是继续',
    audience: '初中及以上全体学生（建议与德育结合）',
    prerequisites: ['已完成 S2 应用层'],
    modules: [
      {
        title: '学术诚信：界线在哪里',
        minutes: 20,
        points: [
          '可接受的：让 AI 解释概念、给练习、检查你的错题',
          '不可接受的：让 AI 代写作业、代写论文、伪造实验数据',
          '判断标准：这件事本该体现你的哪部分能力？被替掉了吗？',
        ],
      },
      {
        title: '信息核验：三条硬规则',
        minutes: 15,
        points: [
          '涉及事实与数据，必须找到至少一个可点开的来源',
          'AI 给的链接必须点开看，链接存在不等于内容支持',
          '找不到来源的结论，只能当作「待核实」',
        ],
      },
      {
        title: '安全与隐私',
        minutes: 15,
        points: [
          '不输入他人个人信息、班级名单、家庭情况',
          '不上传未公开的试卷与内部材料',
          '不与 AI 讨论个人情绪困扰，AI 不是心理支持渠道',
        ],
      },
      {
        title: '依赖风险：当它越来越顺手',
        minutes: 10,
        points: [
          '自我检测题：不看 AI 还能完成这项任务吗？',
          '每周挑一项任务，坚持不用 AI 完成一次',
        ],
      },
    ],
    deliverables: ['素养课课件', '诚信判断情景卡', '三条核验规则海报', '自我检测表'],
    commonMistakes: [
      '把「是否使用 AI」当成唯一标准，忽略了被替代的是哪部分能力',
      '只讲诚信不讲核验方法，学生无从执行',
      '安全提醒讲成恐吓，学生转而偷偷使用',
    ],
    relatedRefs: [
      { kind: 'guide', id: 'reliable-output' },
      { kind: 'concept', id: 'alignment' },
      { kind: 'concept', id: 'mcp' },
    ],
    assessment: '情景判断测验：给出 6 个真实场景，学生判断「继续 / 停手 / 需留痕」并说明理由',
    version: 'v1.0',
    validFrom: '2026-09-01',
    updatedAt: '2026-09-28',
  },
  {
    id: 's3-media-literacy',
    title: '看穿生成内容：图、视频与「AI 味」的识别',
    tier: 'S3',
    stage: '初中及以上',
    subject: '通用',
    lessons: 1,
    format: '进校宣讲',
    outcome: '学生能对一段可疑的图文或视频内容提出三个具体的核实问题，而不是直接转发',
    audience: '初中及以上全体学生',
    prerequisites: ['已完成 S2 应用层'],
    modules: [
      {
        title: '生成内容的常见破绽',
        minutes: 20,
        points: ['手指、文字、界面元素的细节错误', '光影与透视的不一致', '声音与口型对不上'],
      },
      {
        title: '三个核实问题',
        minutes: 20,
        points: ['原始来源是谁，能不能找到第二份报道', '发布时间与事件是否对得上', '画面里有没有其他可查证的实物'],
      },
      {
        title: '课堂练习',
        minutes: 20,
        points: ['给出三条素材（其中一条为生成内容），学生分组核实并说明理由'],
        activity: '分组核实并汇报，采用「先下结论再给证据」的顺序，防止先入为主',
      },
    ],
    deliverables: ['识别要点卡', '核实三问卡', '课堂素材包（含 3 条待核实素材）', '常见错误清单'],
    commonMistakes: [
      '凭「看起来很真」就转发，不问来源',
      '把「AI 生成」当成自动免责，忽略了内容本身可能有害',
      '核实流于形式，没有真正去找第二份来源',
    ],
    relatedRefs: [
      { kind: 'concept', id: 'multimodal' },
      { kind: 'concept', id: 'hallucination' },
      { kind: 'guide', id: 'market-research' },
    ],
    assessment: '课堂汇报：对给定素材的核实结论与三条证据',
    version: 'v1.0',
    validFrom: '2026-09-01',
    updatedAt: '2026-09-28',
  },
]

export const eduProgramsById: Record<string, EduProgram> = Object.fromEntries(
  eduPrograms.map((p) => [p.id, p])
)

/** 按 id 取课程，找不到返回 undefined（不抛异常，避免页面崩溃） */
export function getEduProgram(id: string): EduProgram | undefined {
  return eduProgramsById[id]
}