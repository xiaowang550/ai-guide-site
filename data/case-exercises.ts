import { dailyExercises, type CaseExercise } from './daily-cases'
const materials: Record<string, string> = {
  'weekly-report-ops':
    '【虚构材料】周一整理了3份用户反馈；周三完成通知草稿，等待负责人确认发布时间；下周准备复查反馈分类。没有提供转化率或业务增长数据。',
  'market-sizing':
    '【虚构材料】A资料统计某区域100家店，B资料只覆盖其中20家店；两份统计年份不同，缺少同口径总数。不得将20家直接外推为完整市场规模。',
  'teaching-materials':
    '【虚构短文】学生在校园观察树叶，记录颜色和形状，再把相同形状分为一组。请设计两道观察题，答案必须来自这段短文。',
  'excel-cleaning':
    '【虚构表格】行1：A01，10月1日，100元；行2：A01，2026/10/01，100元；行3：A02，日期为空，金额未填。保留行号，先查重复和缺失，不直接删除。',
  'code-legacy-review':
    '【练习代码】function total(items){return items.reduce((s,x)=>s+x.price*x.qty,0)}\n输入可能缺少price或qty。只解释输入校验缺口，提出最小修订，不执行代码，也不声称测试已经通过。',
  'ppt-sales-deck':
    '【虚构材料】产品用途：整理会议待办；功能：按负责人分类、标记缺失日期；客户反馈只有两条文字，没有效果测量。写3页演示提纲，不编造客户案例或收益。',
  'short-video-scripts':
    '【练习材料】主题：检查AI回答。要点：核对原文；数字用表格复算；缺失写待核对。受众为新员工，写30秒三镜头脚本，画面是示意。',
  'research-literature':
    '【虚构文献摘录】研究A：20名参与者完成写作练习，报告平均时间；研究B：访谈10名教师，只讨论主观体验。来源与方法不同，不能合并成总体效果结论。',
  'credit-review-brief':
    '【虚构申请材料】申请人A，提供收入说明但缺少流水区间；用途写设备采购，未附采购合同。只列已知材料与缺失项，不给审批建议。',
  'contract-risk-scan':
    '【虚构条款】交付：11月10日；验收：到货后5日；付款：验收后30日。合同签署页未提供。只定位字段与待确认问题，不判断法律效力。',
  'gov-guide-plain-language':
    '【虚构办事指引】申请表需签字；材料不完整时补正；办理时限见受理回执。没有提供具体天数。改为口语提醒，不能补造时限。',
  'restaurant-shift-forecast':
    '【虚构排班】甲只可上午，乙只可下午，周五晚间需要2人但目前没有可用人员。整理排班缺口，不自动承诺人员到岗。',
  'farm-tech-plain-reminder':
    '【虚构观察记录】田块A：叶片发黄，日期10月12日；田块B：记录不完整。未提供品种、天气与检测结果。只整理观察与需要补充的信息，不推断病害或给药方案。',
  'newsroom-factcheck-first':
    '【虚构稿件】A说活动在周三；B说场地预约为周四；没有官方活动通知。列冲突证据与需要查证的问题，不挑一个日期发布。',
  'clinic-followup-list':
    '【虚构记录】约定下周联系了解复查安排；复查日期待确认；记录没有药物名称或剂量。只提取联络待办，不新增诊疗或用药建议。',
  'tender-bid-review':
    '【虚构招标摘录】第2条要求资质文件；第5条要求签字页；提交日期缺失。列材料清单与缺失字段，不判断是否能中标。',
  'logistics-delay-letter':
    '【虚构节点】昨日到分拨中心；今日运输中。未提供异常原因与承诺到达时间。起草说明并列待查询事项，不编造预计送达时间。',
  'travel-itinerary-facts':
    '【虚构计划】上午参观场馆，下午公园步行；场馆开放时间未确认，交通时长未提供。整理需要查官网的事项，不把计划写成已验证行程。',
  'tech-translation-glossary':
    '【练习文本】The cache may be invalidated after an update.\n词汇约定：cache译缓存；invalidated译失效。保留may的不确定性，给译文与术语表。',
  'claim-materials-checklist':
    '【虚构资料】申请表已提供，票据缺一页，事故时间未填写，条款版本未提供。只做缺失材料清单，不判断责任或赔付金额；确认前不能标为材料齐全。',
  'campus-notice-check':
    '【虚构材料】A方案：周三下午，相关教师参加；B预约表：周四下午，礼堂待确认；C说明：每人带一个案例，未写截止时间。保留日期冲突，不能发布完整通知。',
  'workorder-triage':
    '【虚构表单】R021：投影仪无画面，位置未填；R022：会议室灯闪烁，综合楼二楼；R022重复提交。先查缺失和重复，不推断故障原因。',
  'meeting-action-review':
    '【虚构记录】张老师周二前整理材料；李老师建议周五讨论，未确定；办公室负责通知，截止时间未写。区分决定、建议与缺失信息。',
}
export function caseExercise(id: string): CaseExercise {
  if (dailyExercises[id]) return dailyExercises[id]
  const material = materials[id]
  if (!material) throw new Error(`Missing case exercise: ${id}`)
  return {
    material,
    task: '只完成这组小材料指定的任务，给一份150字以内的待审核草稿；附原文依据与待确认项。',
    checks: [
      '每项事实可以回查到输入材料',
      '缺失或冲突保留为待核对',
      '我已修改一处表达，结果还未正式发布',
    ],
    example:
      '【核对示例，不是本次模型回答】先划出材料中明确写出的事实，再用【待核对】标出缺失项。草稿不能比输入更确定。请亲手填写这组材料的具体结果，再逐项检查。',
  }
}
