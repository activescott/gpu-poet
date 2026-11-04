/**
 * GPU benchmark fields.
 * NOTE: Benchmark values are now stored in the GpuMetricValue table,
 * not directly on the gpu table. This type is kept empty for backwards
 * compatibility with the Gpu type which extends it.
 */
// zod 4 infers z.object({}) as Record<string, never> (keyof is string), so
// the empty benchmark shape is typed directly.
type GpuBenchmarks = Record<never, never>

export type GpuBenchmarkKey = keyof GpuBenchmarks

export const GpuBenchmarkKeys: GpuBenchmarkKey[] = []

interface _GpuBenchmarkItem {
  label: string
  unit: string
  unitShortest: string
  description: string
  descriptionDollarsPer: string
  category: "ai" | "gaming"
  benchmarkId: string
  benchmarkName: string
  slug: string
}
