/**
 * DollarsPerFps4kChart - Shows price-per-FPS rankings using CS2 4K benchmarks.
 * Displays as a vertical bar chart sorted by best value (lowest $/FPS).
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

interface DollarsPerFps4kRow {
  gpuName: string
  bestDeal: number
  fps4k: number
  dollarsPerFps: number
}

const LIMIT_RESULTS = 15
const GOOD_VALUE_THRESHOLD = 2.3
const FAIR_VALUE_THRESHOLD = 2.7

async function fetchData(dateRange: DateRange): Promise<DollarsPerFps4kRow[]> {
  const { startDate, endDate } = parseDateRange(dateRange.to)

  return prismaSingleton.$queryRaw<DollarsPerFps4kRow[]>`
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
    prices AS (
      SELECT "gpuName", AVG(price) AS "bestDeal"
      FROM ranked WHERE rn <= 3 GROUP BY "gpuName"
    )
    SELECT
      p."gpuName",
      ROUND(p."bestDeal"::numeric)::float as "bestDeal",
      gmv.value::float as "fps4k",
      ROUND((p."bestDeal" / NULLIF(gmv.value::float, 0))::numeric, 2)::float as "dollarsPerFps"
    FROM prices p
    JOIN "GpuMetricValue" gmv ON gmv."gpuName" = p."gpuName"
    WHERE gmv."metricSlug" = 'counter-strike-2-fps-3840x2160'
      AND p."bestDeal" > 50
      AND gmv.value::float > 0
    ORDER BY "dollarsPerFps" ASC
    LIMIT ${LIMIT_RESULTS}
  `
}

function valueColor(value: number): "success" | "warning" | "primary" {
  if (value <= GOOD_VALUE_THRESHOLD) return "success"
  if (value <= FAIR_VALUE_THRESHOLD) return "warning"
  return "primary"
}

function buildChartConfig(data: DollarsPerFps4kRow[]): BarChartConfig {
  return {
    id: "dollars-per-fps-4k",
    title: "Best Value GPUs: $/FPS (CS2 4K)",
    chartType: "bar",
    unit: "$",
    orientation: "vertical",
    data: data.map((row) => ({
      label: formatGpuName(row.gpuName),
      value: row.dollarsPerFps,
      sublabel: `$${Math.round(row.bestDeal)}, ${Math.round(row.fps4k)} FPS`,
      color: valueColor(row.dollarsPerFps),
    })),
  }
}

export async function getDollarsPerFps4kConfig(
  dateRange: DateRange,
): Promise<BarChartConfig> {
  const data = await fetchData(dateRange)
  return buildChartConfig(data)
}

export async function DollarsPerFps4kChart({
  dateRange,
}: ChartComponentProps): Promise<JSX.Element> {
  const config = await getDollarsPerFps4kConfig(dateRange)
  const shareImageUrl = `/api/images/chart/DollarsPerFps4kChart?from=${dateRange.from}&to=${dateRange.to}`

  return (
    <ChartContainer
      title={config.title}
      subtitle="Lower is better"
      shareImageUrl={shareImageUrl}
      hashtags={
        CHART_HASHTAGS.DollarsPerFps4kChart ?? ["GPU", "4KGaming", "GPUValue"]
      }
    >
      <ChartJS config={config} />
    </ChartContainer>
  )
}
