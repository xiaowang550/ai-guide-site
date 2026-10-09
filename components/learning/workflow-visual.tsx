import Image from 'next/image'

export function WorkflowVisual() {
  return (
    <figure className="workflow-visual">
      <Image
        src="/illustrations/work-with-ai-v1.webp"
        alt="从原始记录，到明确提问，再到核对后的报告：AI 工作流程图解"
        width={960}
        height={640}
        className="w-full"
        sizes="(max-width: 640px) 100vw, 640px"
      />
      <figcaption className="grid grid-cols-3 gap-3 p-4 text-center">
        <div>
          <strong>准备材料</strong>
          <span>保留真实信息</span>
        </div>
        <div>
          <strong>说清任务</strong>
          <span>告诉 AI 要什么</span>
        </div>
        <div>
          <strong>核对再用</strong>
          <span>检查事实与格式</span>
        </div>
      </figcaption>
    </figure>
  )
}

export function ContextVisual() {
  return (
    <figure className="workflow-visual">
      <Image
        src="/illustrations/context-desk-v1.webp"
        alt="有限的办公桌上只能展开少量资料，桌外仍有一叠未使用的文件：上下文容量的比喻"
        width={960}
        height={640}
        className="w-full"
        sizes="(max-width: 640px) 100vw, 700px"
      />
      <figcaption className="p-5 text-sm leading-7">
        <strong className="text-primary">把上下文想成一张办公桌。</strong>
        <br />
        当前对话的材料放在桌上，空间有限。优先放关键资料，不需要的内容先收起来。
      </figcaption>
    </figure>
  )
}
