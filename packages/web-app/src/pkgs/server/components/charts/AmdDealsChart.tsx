/**
 * AmdDealsChart - Shows AMD GPUs with discounts below MSRP.
 * Displays as a diverging bar chart with success colors for good deals.
 */
import { prismaSingleton } from "@/pkgs/server/db/db"
import type { DivergingBarChartConfig } from "@/pkgs/isomorphic/model/news"
import { ChartJS, ChartContainer } from "@/pkgs/client/components/charts"
import {
  DateRange,
  ChartComponentProps,
  parseDateRange,
  formatGpuName,
  CHART_HASHTAGS,
} from "./types"

interface AmdDealRow {
  name: string
  msrp: number
  lowestAvgPrice: number
  discountPct: number
}

const LIMIT_RESULTS = 4

/**
 * Fetches AMD GPU deals below MSRP.
 * Uses "lowest average price" (avg of 3 lowest listings) for stable pricing.
 */
async function fetchAmdDealsData(dateRange: DateRange): Promise<AmdDealRow[]> {
  const { startDate, endDate } = parseDateRange(dateRange.to)

  const result = await prismaSingleton.$queryRaw<AmdDealRow[]>`
    -- Temporal correctness: use createdAt+archivedAt for "active during window" (see getHistoricalPriceData)
    WITH active_versions AS (
      SELECT DISTINCT ON (l."itemId") l."gpuName", l."priceValue"::float AS price
      FROM "Listing" l
      WHERE l."exclude" = false
        AND l."source" IN ('ebay', 'amazon')
        AND l."createdAt" <= (${endDate} AT TIME ZONE 'UTC')
        AND (l."archivedAt" IS NULL OR l."archivedAt" >= (${startDate} AT TIME ZONE 'UTC'))
        AND l."gpuName" LIKE 'amd-radeon-%'
      ORDER BY l."itemId", l."priceValue"::float ASC
    ),
    ranked AS (
      SELECT "gpuName", price, ROW_NUMBER() OVER (PARTITION BY "gpuName" ORDER BY price ASC) AS rn
      FROM active_versions
    ),
    lowest_avg AS (
      SELECT "gpuName" AS name, AVG(price) AS lowest_avg_price
      FROM ranked WHERE rn <= 3 GROUP BY "gpuName"
    )
    SELECT
      la.name,
      g."msrpUSD"::float as msrp,
      la.lowest_avg_price as "lowestAvgPrice",
      ROUND(((la.lowest_avg_price / g."msrpUSD"::float - 1) * 100)::numeric, 0)::float as "discountPct"
    FROM lowest_avg la
    JOIN gpu g ON g.name = la.name
    WHERE g."msrpUSD" IS NOT NULL
      AND g."msrpUSD" > 0
      AND la.lowest_avg_price < g."msrpUSD"::float
    ORDER BY "discountPct" ASC
    LIMIT ${LIMIT_RESULTS}
  `

  return result
}

/**
 * Builds the chart configuration from the data.
 */
function buildChartConfig(data: AmdDealRow[]): DivergingBarChartConfig {
  return {
    id: "amd-deals",
    title: "AMD GPU Deals (vs MSRP)",
    chartType: "diverging",
    unit: "% below MSRP",
    data: data.map((row) => ({
      label: formatGpuName(row.name),
      value: row.discountPct, // Already negative from query
      sublabel: `$${Math.round(row.lowestAvgPrice)} avg`,
      color: "success",
    })),
  }
}

/**
 * Returns the chart configuration for image generation.
 */
export async function getAmdDealsConfig(
  dateRange: DateRange,
): Promise<DivergingBarChartConfig> {
  const data = await fetchAmdDealsData(dateRange)
  return buildChartConfig(data)
}

/**
 * React Server Component for rendering the chart on a page.
 */
export async function AmdDealsChart({
  dateRange,
}: ChartComponentProps): Promise<JSX.Element> {
  const config = await getAmdDealsConfig(dateRange)

  const shareImageUrl = `/api/images/chart/AmdDealsChart?from=${dateRange.from}&to=${dateRange.to}`

  return (
    <ChartContainer
      title={config.title}
      shareImageUrl={shareImageUrl}
      hashtags={CHART_HASHTAGS.AmdDealsChart}
    >
      <ChartJS config={config} />
    </ChartContainer>
  )
}
