import { describe, expect, it, vi, afterEach } from 'vitest'
import { tools } from '@/data'
import { toolBenchmark } from '@/data/tool-benchmarks'
import {
  benchmarkStale,
  benchmarkValue,
  compareBenchmarks,
  BENCHMARK_BOARDS,
} from '../tool-benchmarks'
afterEach(() => vi.useRealTimers())
describe('benchmark evidence', () => {
  it('records a measured model and its scale rather than a product total', () => {
    const gpt = toolBenchmark('chatgpt')
    expect(gpt.results[0]).toMatchObject({
      model: 'GPT-6.1 Sol (max)',
      value: 52,
      board: 'aa-intelligence',
    })
    expect(gpt.results.find((r) => r.board === 'arena-text')).toMatchObject({
      value: 1484,
      uncertainty: 9,
      votes: 4512,
      publishedAt: '2026-10-08',
    })
    expect(gpt.note).toContain('不代表整个产品')
  })
  it('gives every tool an evidence status without assigning invented measurements', () => {
    for (const t of tools) {
      const e = toolBenchmark(t.id)
      expect(e.note.length).toBeGreaterThan(10)
      for (const r of e.results) {
        expect(r.model.length).toBeGreaterThan(3)
        expect(Number.isFinite(r.value)).toBe(true)
        expect(BENCHMARK_BOARDS[r.board].url).toMatch(/^https:\/\//)
      }
    }
    for (const id of ['dify', 'n8n', 'cursor', 'copilot', 'suno', 'jimeng', 'unknown'])
      expect(toolBenchmark(id).results).toEqual([])
  })
  it('does not compare missing values as zero, even in ascending order', () => {
    vi.useFakeTimers().setSystemTime(new Date('2026-10-12T12:00:00Z'))
    const known = toolBenchmark('chatgpt'),
      missing = toolBenchmark('dify')
    expect(benchmarkValue(missing, 'aa-intelligence')).toBeNull()
    for (const dir of ['asc', 'desc'] as const) {
      expect(compareBenchmarks(missing, known, 'aa-intelligence', dir)).toBe(1)
      expect(compareBenchmarks(known, missing, 'aa-intelligence', dir)).toBe(-1)
    }
    expect(benchmarkValue(toolBenchmark('runway'), 'arena-text')).toBeNull()
  })
  it('keeps stale snapshots out of current sorting', () => {
    vi.useFakeTimers().setSystemTime(new Date('2026-12-01T12:00:00Z'))
    expect(benchmarkValue(toolBenchmark('chatgpt'), 'aa-intelligence')).toBeNull()
    expect(benchmarkStale('invalid')).toBe(true)
    expect(benchmarkStale('2028-10-12')).toBe(true)
  })
})
