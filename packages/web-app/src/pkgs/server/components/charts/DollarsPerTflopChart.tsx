/**
 * DollarsPerTflopChart - Shows price-per-TFLOP rankings for gaming GPUs.
 * Displays as a vertical bar chart sorted by best value (lowest $/TFLOP).
 */
import { prismaSingleton } from "@/pkgs/server/db/db"
import type { BarChartConfig } from "@/pkgs/isomorphic/model/news"
import { ChartJS, ChartContainer } from "@/pkgs/client/components/charts"
import {
  DateRange,
  ChartComponentProps,
  parseDateRange,
  formatGpuName,
  CHART_HASHTAGS,
} from "./types"

interface DollarsPerTflopRow {
  gpuName: string
  bestDeal: number
  fp32Tflops: number
  dollarsPerTflop: number
}

const LIMIT_RESULTS = 15
const GOOD_VALUE_THRESHOLD = 8
const FAIR_VALUE_THRESHOLD = 10

async function fetchDollarsPerTflopData(
  dateRange: DateRange,
): Promise<DollarsPerTflopRow[]> {
  const { startDate, endDate } = parseDateRange(dateRange.to)

  const result = await prismaSingleton.$queryRaw<DollarsPerTflopRow[]>`
    -- Temporal correctness: use createdAt+archivedAt for "active during window" (see getHistoricalPriceData)
    WITH active_versions AS (
      SELECT DISTINCT ON (l."itemId") l."gpuName", l."priceValue"::float AS price
      FROM "Listing" l
      WHERE l."exclude" = false
        AND l."source" IN ('ebay', 'amazon')
        AND l."createdAt" <= (${endDate} AT TIME ZONE 'UTC')
        AND (l."archivedAt" IS NULL OR l."archivedAt" >= (${startDate} AT TIME ZONE 'UTC'))
      ORDER BY l."itemId", l."priceValue"::float ASC
    ),
    ranked AS (
      SELECT "gpuName", price, ROW_NUMBER() OVER (PARTITION BY "gpuName" ORDER BY price ASC) AS rn
      FROM active_versions
    ),
    march_prices AS (
      SELECT "gpuName", AVG(price) AS "bestDeal"
      FROM ranked WHERE rn <= 3 GROUP BY "gpuName"
    )
    SELECT
      p."gpuName",
      ROUND(p."bestDeal"::numeric)::float as "bestDeal",
      g."fp32TFLOPS"::float as "fp32Tflops",
      ROUND((p."bestDeal" / NULLIF(g."fp32TFLOPS"::float, 0))::numeric, 1)::float as "dollarsPerTflop"
    FROM march_prices p
    JOIN gpu g ON g.name = p."gpuName"
    JOIN "GpuMetricValue" mem ON mem."gpuName" = p."gpuName" AND mem."metricSlug" = 'memory-gb'
    WHERE g."fp32TFLOPS" IS NOT NULL AND g."fp32TFLOPS" > 0
      AND mem.value::float >= 16
      AND p."bestDeal" > 50
    ORDER BY "dollarsPerTflop" ASC
    LIMIT ${LIMIT_RESULTS}
  `

  return result
}

function valueColor(value: number): "success" | "warning" | "primary" {
  if (value <= GOOD_VALUE_THRESHOLD) return "success"
  if (value <= FAIR_VALUE_THRESHOLD) return "warning"
  return "primary"
}

function buildChartConfig(data: DollarsPerTflopRow[]): BarChartConfig {
  return {
    id: "dollars-per-tflop",
    title: "Best Value GPUs: $/TFLOP",
    chartType: "bar",
    unit: "$",
    orientation: "vertical",
    data: data.map((row) => ({
      label: formatGpuName(row.gpuName),
      value: row.dollarsPerTflop,
      sublabel: `$${Math.round(row.bestDeal)} best deal, ${row.fp32Tflops} TFLOPS`,
      color: valueColor(row.dollarsPerTflop),
    })),
  }
}

export async function getDollarsPerTflopConfig(
  dateRange: DateRange,
): Promise<BarChartConfig> {
  const data = await fetchDollarsPerTflopData(dateRange)
  return buildChartConfig(data)
}

export async function DollarsPerTflopChart({
  dateRange,
}: ChartComponentProps): Promise<JSX.Element> {
  const config = await getDollarsPerTflopConfig(dateRange)
  const shareImageUrl = `/api/images/chart/DollarsPerTflopChart?from=${dateRange.from}&to=${dateRange.to}`

  return (
    <ChartContainer
      title={config.title}
      subtitle="Lower is better"
      shareImageUrl={shareImageUrl}
      hashtags={CHART_HASHTAGS.DollarsPerTflopChart ?? ["GPU", "GPUValue"]}
    >
      <ChartJS config={config} />
    </ChartContainer>
  )
}
