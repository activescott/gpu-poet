/**
 * ScalperPremiumChart - Shows RTX 50 series premiums above MSRP.
 * Displays as a horizontal bar chart with danger colors for high premiums.
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

interface ScalperPremiumRow {
  name: string
  msrp: number
  avgPrice: number
  lowestAvgPrice: number
  premiumPct: number
}

const LIMIT_RESULTS = 6
const HIGH_PREMIUM_THRESHOLD = 75

/**
 * Fetches scalper premium data for RTX 50 series GPUs.
 * Uses "lowest average price" (avg of 3 lowest listings) for stable pricing.
 */
async function fetchScalperPremiumData(
  dateRange: DateRange,
): Promise<ScalperPremiumRow[]> {
  const { startDate, endDate } = parseDateRange(dateRange.to)

  const result = await prismaSingleton.$queryRaw<ScalperPremiumRow[]>`
    -- Temporal correctness: use createdAt+archivedAt for "active during window" (see getHistoricalPriceData).
    -- We compute one price per listing (distinct by itemId) using the listing's lowest observed
    -- price in the window, then aggregate per GPU.
    WITH active_versions AS (
      SELECT DISTINCT ON (l."itemId") l."gpuName", l."priceValue"::float AS price
      FROM "Listing" l
      WHERE l."exclude" = false
        AND l."source" IN ('ebay', 'amazon')
        AND l."createdAt" <= (${endDate} AT TIME ZONE 'UTC')
        AND (l."archivedAt" IS NULL OR l."archivedAt" >= (${startDate} AT TIME ZONE 'UTC'))
        AND l."gpuName" LIKE 'nvidia-geforce-rtx-50%'
      ORDER BY l."itemId", l."priceValue"::float ASC
    ),
    ranked AS (
      SELECT "gpuName", price, ROW_NUMBER() OVER (PARTITION BY "gpuName" ORDER BY price ASC) AS rn
      FROM active_versions
    ),
    lowest_avg AS (
      SELECT "gpuName" AS name, AVG(price) AS lowest_avg_price
      FROM ranked WHERE rn <= 3 GROUP BY "gpuName"
    ),
    avg_per_gpu AS (
      SELECT "gpuName", AVG(price) AS avg_price
      FROM active_versions GROUP BY "gpuName"
    )
    SELECT
      la.name,
      g."msrpUSD"::float as msrp,
      a.avg_price as "avgPrice",
      la.lowest_avg_price as "lowestAvgPrice",
      ROUND(((la.lowest_avg_price / g."msrpUSD"::float - 1) * 100)::numeric, 0)::float as "premiumPct"
    FROM lowest_avg la
    JOIN gpu g ON g.name = la.name
    JOIN avg_per_gpu a ON a."gpuName" = la.name
    WHERE g."msrpUSD" IS NOT NULL
      AND g."msrpUSD" > 0
    ORDER BY "premiumPct" DESC
    LIMIT ${LIMIT_RESULTS}
  `

  return result
}

/**
 * Builds the chart configuration from the data.
 */
function buildChartConfig(data: ScalperPremiumRow[]): BarChartConfig {
  return {
    id: "scalper-premium",
    title: "RTX 50 Series Scalper Premiums",
    chartType: "bar",
    unit: "% vs MSRP",
    orientation: "vertical",
    data: data.map((row) => ({
      label: formatGpuName(row.name),
      value: row.premiumPct,
      sublabel: `$${Math.round(row.lowestAvgPrice)} best deal`,
      color: row.premiumPct > HIGH_PREMIUM_THRESHOLD ? "danger" : "warning",
    })),
  }
}

/**
 * Returns the chart configuration for image generation.
 */
export async function getScalperPremiumConfig(
  dateRange: DateRange,
): Promise<BarChartConfig> {
  const data = await fetchScalperPremiumData(dateRange)
  return buildChartConfig(data)
}

/**
 * React Server Component for rendering the chart on a page.
 */
export async function ScalperPremiumChart({
  dateRange,
}: ChartComponentProps): Promise<JSX.Element> {
  const config = await getScalperPremiumConfig(dateRange)

  const shareImageUrl = `/api/images/chart/ScalperPremiumChart?from=${dateRange.from}&to=${dateRange.to}`

  return (
    <ChartContainer
      title={config.title}
      shareImageUrl={shareImageUrl}
      hashtags={CHART_HASHTAGS.ScalperPremiumChart}
    >
      <ChartJS config={config} />
    </ChartContainer>
  )
}
