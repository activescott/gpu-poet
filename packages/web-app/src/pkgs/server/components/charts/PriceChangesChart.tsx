/**
 * PriceChangesChart - Shows month-over-month price changes.
 * Displays as a diverging bar chart with colors based on direction.
 */
import { prismaSingleton } from "@/pkgs/server/db/db"
import type { DivergingBarChartConfig } from "@/pkgs/isomorphic/model/news"
import { ChartJS, ChartContainer } from "@/pkgs/client/components/charts"
import {
  DateRange,
  ChartComponentProps,
  parseDateRange,
  previousYearMonth,
  formatGpuName,
  getValueColor,
  CHART_HASHTAGS,
} from "./types"

interface PriceChangeRow {
  gpuName: string
  prevBestDeal: number
  currBestDeal: number
  pctChange: number
}

const LIMIT_RESULTS_DEFAULT = 5
const MIN_PRICE_THRESHOLD = 100

/**
 * Fetches month-over-month price change data.
 * Compares the target month to the previous month.
 */
async function fetchPriceChangesData(
  dateRange: DateRange,
  resultCount: number = LIMIT_RESULTS_DEFAULT,
): Promise<PriceChangeRow[]> {
  const { startDate: currStart, endDate: currEnd } = parseDateRange(
    dateRange.to,
  )

  if (resultCount <= 0) {
    return []
  }

  // Calculate previous month
  const { startDate: prevStart, endDate: prevEnd } = parseDateRange(
    previousYearMonth(dateRange.to),
  )

  // Temporal correctness: "active during window" uses createdAt+archivedAt, NOT cachedAt.
  // See getHistoricalPriceData for the full rationale.
  const result = await prismaSingleton.$queryRaw<PriceChangeRow[]>`
    WITH curr_active AS (
      SELECT DISTINCT ON (l."itemId") l."gpuName", l."priceValue"::float AS price
      FROM "Listing" l
      WHERE l."exclude" = false
        AND l."source" IN ('ebay', 'amazon')
        AND l."createdAt" <= (${currEnd} AT TIME ZONE 'UTC')
        AND (l."archivedAt" IS NULL OR l."archivedAt" >= (${currStart} AT TIME ZONE 'UTC'))
      ORDER BY l."itemId", l."priceValue"::float ASC
    ),
    curr_ranked AS (
      SELECT "gpuName", price, ROW_NUMBER() OVER (PARTITION BY "gpuName" ORDER BY price ASC) AS rn
      FROM curr_active
    ),
    curr_month AS (
      SELECT "gpuName", AVG(price) AS best_deal
      FROM curr_ranked WHERE rn <= 3
      GROUP BY "gpuName" HAVING COUNT(*) >= 3
    ),
    prev_active AS (
      SELECT DISTINCT ON (l."itemId") l."gpuName", l."priceValue"::float AS price
      FROM "Listing" l
      WHERE l."exclude" = false
        AND l."source" IN ('ebay', 'amazon')
        AND l."createdAt" <= (${prevEnd} AT TIME ZONE 'UTC')
        AND (l."archivedAt" IS NULL OR l."archivedAt" >= (${prevStart} AT TIME ZONE 'UTC'))
      ORDER BY l."itemId", l."priceValue"::float ASC
    ),
    prev_ranked AS (
      SELECT "gpuName", price, ROW_NUMBER() OVER (PARTITION BY "gpuName" ORDER BY price ASC) AS rn
      FROM prev_active
    ),
    prev_month AS (
      SELECT "gpuName", AVG(price) AS best_deal
      FROM prev_ranked WHERE rn <= 3
      GROUP BY "gpuName" HAVING COUNT(*) >= 3
    )
    SELECT
      c."gpuName",
      p.best_deal as "prevBestDeal",
      c.best_deal as "currBestDeal",
      ROUND(((c.best_deal - p.best_deal) / p.best_deal * 100)::numeric, 0)::float as "pctChange"
    FROM curr_month c
    JOIN prev_month p ON c."gpuName" = p."gpuName"
    WHERE p.best_deal > ${MIN_PRICE_THRESHOLD}
    ORDER BY "pctChange" ASC
    LIMIT ${resultCount}
  `

  return result
}

/**
 * Formats price change for sublabel display.
 */
function formatPriceChange(prev: number, curr: number): string {
  return `$${Math.round(prev)} → $${Math.round(curr)}`
}

/**
 * Builds the chart configuration from the data.
 */
function buildChartConfig(data: PriceChangeRow[]): DivergingBarChartConfig {
  return {
    id: "price-changes",
    title: "Month-over-Month Price Changes",
    chartType: "diverging",
    unit: "%",
    data: data.map((row) => ({
      label: formatGpuName(row.gpuName),
      value: row.pctChange,
      sublabel: formatPriceChange(row.prevBestDeal, row.currBestDeal),
      color: getValueColor(row.pctChange),
    })),
  }
}

/**
 * Returns the chart configuration for image generation.
 */
export async function getPriceChangesConfig(
  dateRange: DateRange,
  resultCount: number = LIMIT_RESULTS_DEFAULT,
): Promise<DivergingBarChartConfig> {
  const data = await fetchPriceChangesData(dateRange, resultCount)
  return buildChartConfig(data)
}

/**
 * React Server Component for rendering the chart on a page.
 */
export async function PriceChangesChart({
  dateRange,
  resultCount,
}: ChartComponentProps): Promise<JSX.Element> {
  const config = await getPriceChangesConfig(dateRange, resultCount)

  const shareImageUrl = `/api/images/chart/PriceChangesChart?from=${dateRange.from}&to=${dateRange.to}`

  // Handle case where there's no data (e.g., no previous month data)
  if (config.data.length === 0) {
    return (
      <ChartContainer
        title={config.title}
        shareImageUrl={shareImageUrl}
        hashtags={CHART_HASHTAGS.PriceChangesChart}
      >
        <div className="alert alert-secondary">
          Insufficient data for month-over-month comparison. Historical data is
          required.
        </div>
      </ChartContainer>
    )
  }

  return (
    <ChartContainer
      title={config.title}
      shareImageUrl={shareImageUrl}
      hashtags={CHART_HASHTAGS.PriceChangesChart}
    >
      <ChartJS config={config} />
    </ChartContainer>
  )
}
