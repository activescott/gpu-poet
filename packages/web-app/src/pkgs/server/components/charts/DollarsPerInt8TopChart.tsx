/**
 * DollarsPerInt8TopChart - Shows price-per-INT8-TOP rankings for AI inference.
 * Displays as a vertical bar chart sorted by best value (lowest $/TOP).
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

interface DollarsPerInt8TopRow {
  gpuName: string
  bestDeal: number
  int8Tops: number
  vramGb: number | null
  dollarsPerTop: number
}

const LIMIT_RESULTS = 15
const GOOD_VALUE_THRESHOLD = 1.2
const FAIR_VALUE_THRESHOLD = 1.8

async function fetchData(
  dateRange: DateRange,
): Promise<DollarsPerInt8TopRow[]> {
  const { startDate, endDate } = parseDateRange(dateRange.to)

  return prismaSingleton.$queryRaw<DollarsPerInt8TopRow[]>`
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
      gmv.value::float as "int8Tops",
      gmv2.value::float as "vramGb",
      ROUND((p."bestDeal" / NULLIF(gmv.value::float, 0))::numeric, 2)::float as "dollarsPerTop"
    FROM prices p
    JOIN "GpuMetricValue" gmv ON gmv."gpuName" = p."gpuName" AND gmv."metricSlug" = 'int8-tops'
    LEFT JOIN "GpuMetricValue" gmv2 ON gmv2."gpuName" = p."gpuName" AND gmv2."metricSlug" = 'memory-gb'
    WHERE p."bestDeal" > 50
      AND gmv.value::float > 0
    ORDER BY "dollarsPerTop" ASC
    LIMIT ${LIMIT_RESULTS}
  `
}

function valueColor(value: number): "success" | "warning" | "primary" {
  if (value <= GOOD_VALUE_THRESHOLD) return "success"
  if (value <= FAIR_VALUE_THRESHOLD) return "warning"
  return "primary"
}

function buildChartConfig(data: DollarsPerInt8TopRow[]): BarChartConfig {
  return {
    id: "dollars-per-int8-top",
    title: "Best Value GPUs: $/INT8 TOP (AI Inference)",
    chartType: "bar",
    unit: "$",
    orientation: "vertical",
    data: data.map((row) => ({
      label: formatGpuName(row.gpuName),
      value: row.dollarsPerTop,
      sublabel: `$${Math.round(row.bestDeal)}, ${row.int8Tops} TOPS${row.vramGb ? `, ${row.vramGb}GB` : ""}`,
      color: valueColor(row.dollarsPerTop),
    })),
  }
}

export async function getDollarsPerInt8TopConfig(
  dateRange: DateRange,
): Promise<BarChartConfig> {
  const data = await fetchData(dateRange)
  return buildChartConfig(data)
}

export async function DollarsPerInt8TopChart({
  dateRange,
}: ChartComponentProps): Promise<JSX.Element> {
  const config = await getDollarsPerInt8TopConfig(dateRange)
  const shareImageUrl = `/api/images/chart/DollarsPerInt8TopChart?from=${dateRange.from}&to=${dateRange.to}`

  return (
    <ChartContainer
      title={config.title}
      subtitle="Lower is better"
      shareImageUrl={shareImageUrl}
      hashtags={
        CHART_HASHTAGS.DollarsPerInt8TopChart ?? ["GPU", "AI", "Inference"]
      }
    >
      <ChartJS config={config} />
    </ChartContainer>
  )
}
