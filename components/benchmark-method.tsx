import { BENCHMARK_BOARDS } from '@/lib/tool-benchmarks'
export function BenchmarkMethod() {
  return (
    <section id="benchmarks" className="benchmark-evidence scroll-mt-24">
      <h2 className="text-xl font-semibold">怎样读公开实测</h2>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">
        工具库已撤下把 14 种功能混在一起的总分。此前 ChatGPT 的 7.4 是编辑能力覆盖的加权结果，不是
        GPT 模型的测试分。没有视频或音乐功能也不代表文字能力差。
      </p>
      <ul className="mt-4 space-y-4">
        {Object.entries(BENCHMARK_BOARDS).map(([key, board]) => (
          <li key={key}>
            <a
              className="font-medium text-primary underline underline-offset-4"
              href={board.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {board.name} ↗
            </a>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{board.method}</p>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-sm leading-7">
        我们保留原榜分数、模型版本、推理档位、票数和原榜提供的误差范围。来源核查日期不等于模型测试日期；榜单发布日期有公开时另行注明。快照超过
        30 天会提示打开原榜，且不再参与实测排序。
      </p>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">
        AA 和 Arena
        的模型版本可能不同，请逐条查看。图像与视频分别比较；工作流、办公、音乐等产品本次未核实到同条件的可比实测时，明确显示“暂无可比实测”，不会填
        0 分或借用别的模型成绩。厂商自己的测试也不直接称为独立测试。
      </p>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">
        编程系统还要看模型和执行环境。
        <a
          className="text-primary underline"
          href="https://www.swebench.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          SWE-bench
        </a>{' '}
        的任务通过率只适用于榜单中的具体系统，不能直接给 Cursor、Copilot 整个产品赋分。
      </p>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">
        14 维图表保留为编辑能力参考，0–10
        的数字是站内分档显示，没有实测精度。筛选与场景匹配也使用这些参考资料；它们帮助初步选型，不能替代你在实际任务中试用。
      </p>
    </section>
  )
}
