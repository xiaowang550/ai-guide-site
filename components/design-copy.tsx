/** Both versions are real, accessible text; the selected design hides its counterpart. */
export function DesignCopy({ children, brief }: { children: string; brief?: string }) {
  const next = brief ?? SHORT_COPY[children]
  if (next === undefined) return <>{children}</>
  return (
    <>
      <span className="design-original">{children}</span>
      <span className="design-brief">{next}</span>
    </>
  )
}
const SHORT_COPY: Record<string, string> = {
  '知识库：AI 到底是什么': '知识库',
  '教程：从不会用，到会用、会判断、会产出': '教程',
  '系统、实用、可操作。从基础认知到高阶应用，把 AI 用到学习和工作里。': '选一节，跟着做。',
  '案例库：别人到底怎么用的': '工作案例',
  '选一个日常任务，看场景图、亲手改材料，带走核对后的成果。': '选任务，改材料，练一遍。',
  '不用先懂术语，也不赶进度。从第一条消息开始，做完六个小练习，学会在本站继续探索。':
    '六个练习，边做边学。',
  '按你要做的事选工具，再比较能力、费用和使用条件。': '按任务找工具，比较能力与费用。',
  '从这里，开启你的 AI 能力成长': '从哪里开始',
  '精选资源与实用工具，帮你把 AI 用到真实的学习和工作场景中。': '学习、参考、动手做。',
  '慢慢学，也能走得很远': '学习路径',
  '新模型、新功能和工具变化，一眼掌握。': '来自官方与公开来源。',
  '从一节课开始，把 AI 用进教学。': '教学工作台',
  '初中先认识，高中再实践；教师从正在发生的教学任务入手。': '选课程，备教案，做课堂练习。',
  先确定怎么学: '课程路线',
  准备一节能上的课: '课程与教案',
  讲清使用边界: '使用规范',
  '让每一次整理，都带来收获': '网站管理',
  '不会也没关系，我们一次做一小步。': '跟着练习',
  '从对话到作图，和小芽一起试一次。': '先试一条消息',
}
