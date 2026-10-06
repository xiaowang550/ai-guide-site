import type { EduSchool } from './types'

/**
 * 试点学校与区域推广看板数据
 *
 * 阶段划分（同一份数据里的四种状态，交付重点各不相同）：
 * - 试点验证：刚起步，只上了 T1 / T2，重点是跑通流程与暴露工具问题
 * - 成熟复制：已到 T3，有稳定校本做法，重点是把做法写下来交给别人照着做
 * - 区域推广：课程基本铺满，重点是片区统一节奏与教研共同体
 * - 师资自传播：不再依赖外部讲师，校内种子教师自己带，重点是防止质量下滑
 *
 * 口径说明：
 * - seedTeachers 为参加过种子教师培养的骨干教师数，teachersReached 为实际受训教师数
 * - deliveredToolkits 只列已实际开课并被教师使用的教案包
 * - 本文件中的学校均为示例性名称，不指向具体学校
 */

/**
 * ⚠️ 全部为示例数据（isSample: true）。
 *
 * 学校名称、教师人数属于机构真实信息，未经许可不应公开。
 * 示例数据的用途是演示看板结构与指标口径；页面上会显示明确标记，
 * 覆盖人数类指标也会注明「含示例数据」。
 *
 * 替换为真实试点信息时：
 *   1) 逐条替换 id / name / stage / phase / 交付内容 / 人数 / 下一步 / 校本化说明
 *   2) 把 isSample 改成 false（页面标记会自动消失）
 *   3) 更新 data/edu.test.ts 里那条「示例数据必须标记」的断言
 */
export const eduSchools: EduSchool[] = [
  // ==================== 试点验证 ====================
  {
    id: 'school-linxi-primary',
    name: '临溪镇中心小学',
    isSample: true,
    stage: '小学',
    phase: '试点验证',
    deliveredPrograms: ['t1-ai-literacy', 't1-tool-basics', 't2-lesson-prep'],
    deliveredToolkits: ['primary-chinese'],
    seedTeachers: 4,
    teachersReached: 46,
    nextStep:
      '10 月下旬组织第二次工作坊，重点打磨作业改造方案：先选定三、四年级两个班做作业改造试点，把「先做后看」的提问记录表落到每次作业上交环节。',
    customization:
      '全校以语文、数学两个学科组为试点，暂不动综合科。考虑到乡镇小学非信息技术背景教师占比高，T1 宣讲把「幻觉」演示压缩到 3 分钟，其余时间留给现场实操；工具统一用学校已开通的公益入口，不要求教师自备账号。',
    updatedAt: '2026-09-20',
  },
  {
    id: 'school-shuanghekou-junior',
    name: '双河口初级中学',
    isSample: true,
    stage: '初中',
    phase: '试点验证',
    deliveredPrograms: ['t1-ai-literacy', 't2-lesson-prep'],
    deliveredToolkits: ['junior-english', 'junior-it'],
    seedTeachers: 5,
    teachersReached: 52,
    nextStep:
      '10 月中旬先补 T2 的第二场（出题与批改数据处理），再排 11 月的学生 S2 实操课；同步把学生使用声明的格式统一到年级组，减少同一份作业出现两种填法。',
    customization:
      '英语组与信息技术组先行，语文组观望。英语课把工具限制在「只挑错不重写」这一步，因为担心学生直接用生成稿；信息技术课因机房设备老旧，改为教师端演示为主、学生用纸面记录模板跟做，T2 备课环节的产出一律存在教研组共享目录。',
    updatedAt: '2026-09-18',
  },

  // ==================== 成熟复制 ====================
  {
    id: 'school-huaiyin-primary',
    name: '槐荫乡中心小学',
    isSample: true,
    stage: '小学',
    phase: '成熟复制',
    deliveredPrograms: [
      't1-ai-literacy',
      't1-tool-basics',
      't2-lesson-prep',
      't2-grading-data',
      't3-ai-in-class',
    ],
    deliveredToolkits: ['primary-chinese', 'general-literacy-class'],
    seedTeachers: 6,
    teachersReached: 68,
    nextStep:
      '11 月把「AI 找错单」做成语文组常规作业附件，并把素养课的两课时拆成两次晨会完成；同时整理一份两页的校本操作说明，交给乡内另一所小学试用。',
    customization:
      '在通用教案基础上按本校要求改动三处：找错单只保留两类错误标签，删去需要学生解释成因的开放题；素养课安排在周五晨会而非整节课，避免挤占自习；家长说明会并入学期末家长会前 20 分钟，只讲三条底线与签署家庭约定。',
    updatedAt: '2026-09-24',
  },
  {
    id: 'school-baishawan-junior',
    name: '白沙湾中学',
    isSample: true,
    stage: '初中',
    phase: '成熟复制',
    deliveredPrograms: [
      't1-ai-literacy',
      't2-lesson-prep',
      't2-grading-data',
      't3-ai-in-class',
      't3-homework-redesign',
    ],
    deliveredToolkits: ['junior-chinese', 'junior-math', 'general-literacy-class'],
    seedTeachers: 8,
    teachersReached: 96,
    nextStep:
      '11 月组织第二次以作业改造为主题的工作坊，重点打磨数学「先独立列式再看 AI」的硬性环节；同时把三个年级的提问记录表格式统一，避免教师批改时看到五种写法。',
    customization:
      '按年级分层：七年级只用第 1 课时的四步法，八年级加做核对环节，九年级增加「超纲解法不得作为答案」的专项提醒。数学组把生成内容一律打印后再发到班级群，规避学生在草稿上直接抄步骤；语文组则要求电子留存记录表，便于抽查使用痕迹。',
    updatedAt: '2026-09-26',
  },
  {
    id: 'school-shiqiao-junior',
    name: '石桥镇第一初级中学',
    isSample: true,
    stage: '初中',
    phase: '成熟复制',
    deliveredPrograms: [
      't1-ai-literacy',
      't1-tool-basics',
      't2-lesson-prep',
      't2-grading-data',
      't3-ai-in-class',
    ],
    deliveredToolkits: ['junior-math', 'junior-english', 'junior-it'],
    seedTeachers: 7,
    teachersReached: 84,
    nextStep:
      '10 月底把信息技术的两个课次并入机房正常排课，先做一次校级公开课检验节奏；11 月组织 T4 种子教师培养，从现有骨干中选出 5 人接手校内传播。',
    customization:
      '以数学与英语两个主科为切口，语文暂缓（教研组长认为当前课时紧张）。本校特色是把信息技术教案包的「班级共享测试库」做成跨班资产，每年级一份，测试用例来自学生自己的踩坑记录，下学期直接复用。',
    updatedAt: '2026-09-23',
  },

  // ==================== 区域推广 ====================
  {
    id: 'school-qinghuai-junior',
    name: '青槐镇联合中学',
    isSample: true,
    stage: '初中',
    phase: '区域推广',
    deliveredPrograms: [
      't1-ai-literacy',
      't1-tool-basics',
      't2-lesson-prep',
      't3-ai-in-class',
      't3-homework-redesign',
    ],
    deliveredToolkits: ['junior-chinese', 'junior-math', 'junior-it', 'general-literacy-class'],
    seedTeachers: 11,
    teachersReached: 118,
    nextStep:
      '11 月牵头召开片区教研协调会，统一四个学科的提问记录表格式与声明模板；同时启动学生 S2 实操课的全年级铺开，先做八年级，年末复盘后再推到七、九年级。',
    customization:
      '作为片区牵头校，承担统一模板的制定工作：各学科共用同一份声明骨架，学科差异只体现在「核对方法」一栏。数学组额外要求生成内容统一打印发放，信息技术组把「只问原因不改代码」写成机房值班教师的一句话提醒，张贴在每台机器旁。',
    updatedAt: '2026-09-27',
  },
  {
    id: 'school-nantang-primary',
    name: '南塘片区中心小学',
    isSample: true,
    stage: '小学',
    phase: '区域推广',
    deliveredPrograms: [
      't1-ai-literacy',
      't1-tool-basics',
      't2-lesson-prep',
      't3-ai-in-class',
      's1-what-is-ai',
    ],
    deliveredToolkits: ['primary-chinese', 'general-literacy-class'],
    seedTeachers: 9,
    teachersReached: 74,
    nextStep:
      '11 月在片区三所学校各设一个学生 S2 实操试点班，用同一份任务单采集效果数据；12 月前产出片区统一的低年级版使用规范一页纸，明确小学阶段不布置需要 AI 协助完成的作业。',
    customization:
      '小学阶段把重点放在家长侧而非学生侧：S1 认知课先在家长会上试讲一遍，用家长能接受的语言讲边界，再进入学生课堂。工具选择上只保留两个可直连的入口，减少培训变量；学科上仅在语文试点，数学与科学本学期不纳入，避免战线过长。',
    updatedAt: '2026-09-25',
  },

  // ==================== 师资自传播 ====================
  {
    id: 'school-yuntai-senior',
    name: '云台镇第二中学',
    isSample: true,
    stage: '高中',
    phase: '师资自传播',
    deliveredPrograms: [
      't1-ai-literacy',
      't1-tool-basics',
      't2-lesson-prep',
      't3-ai-in-class',
      't4-seed-teacher',
    ],
    deliveredToolkits: ['junior-chinese', 'junior-math', 'general-literacy-class'],
    seedTeachers: 12,
    teachersReached: 142,
    nextStep:
      '10 月至 11 月由校内种子教师独立带完 T1 复训，每场安排两名新教师试讲、种子教师按评分表互评；同步启动高中专属教案包的需求梳理，10 月底前产出三份高中学科的改造需求清单交回课程组。',
    customization:
      '已不再依赖外部讲师，T1 至 T3 的复训全部由校内 12 名种子教师轮流主讲，校长只做排课与考勤。教案包当前直接沿用初中版本，属于过渡安排：高中阶段把「诚实报告使用范围」的要求提到最前，研究性学习与论文类任务一律要求先提交使用声明再交正文；本学期尚无高中专属教案包，是下一阶段最明确的缺口。',
    updatedAt: '2026-09-28',
  },
]

export const eduSchoolsById: Record<string, EduSchool> = Object.fromEntries(
  eduSchools.map((s) => [s.id, s])
)

/** 按 id 取学校，找不到返回 undefined（不抛异常，避免页面崩溃） */
export function getEduSchool(id: string): EduSchool | undefined {
  return eduSchoolsById[id]
}

/** 按推广阶段取学校列表，页面做看板分组时直接调用 */
export function getEduSchoolsByPhase(phase: EduSchool['phase']): EduSchool[] {
  return eduSchools.filter((s) => s.phase === phase)
}
