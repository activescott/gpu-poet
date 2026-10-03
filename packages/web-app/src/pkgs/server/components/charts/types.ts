/**
 * Shared types for high-order chart components.
 * These components embed SQL queries and return ChartConfig for rendering.
 */

// Time constants for end-of-day
const END_OF_DAY_HOURS = 23
const END_OF_DAY_MINUTES = 59
const END_OF_DAY_SECONDS = 59
const END_OF_DAY_MILLISECONDS = 999
const MONTH_PAD_LENGTH = 2

// Default threshold for value color determination
const DEFAULT_VALUE_THRESHOLD = 10

/**
 * Date range for chart queries.
 * Format: YYYY-MM (e.g., "2026-01")
 */
export interface DateRange {
  from: string
  to: string
}

/**
 * Props for chart components that render JSX.
 */
export interface ChartComponentProps {
  dateRange: DateRange
  /** The number of GPU results to return */
  resultCount?: number
}

/**
 * Hashtags for social sharing, keyed by chart component name.
 */
export const CHART_HASHTAGS: Record<string, string[]> = {
  ScalperPremiumChart: ["GPU", "RTX5090", "PCGaming"],
  BestDealsChart: ["GPU", "GPUDeals", "PCGaming"],
  PriceChangesChart: ["GPU", "GPUPrices"],
  PriceHistoryChart: ["GPU", "GPUPrices", "PriceTrend"],
  AmdDealsChart: ["AMD", "Radeon", "GPUDeals"],
  DollarsPerTflopChart: ["GPU", "GPUValue", "PricePerformance"],
  DollarsPerFpsChart: ["GPU", "CS2", "GPUValue", "PricePerformance"],
  DollarsPerInt8TopChart: ["GPU", "AI", "Inference", "PricePerformance"],
  DollarsPerFps4kChart: ["GPU", "4KGaming", "CS2", "PricePerformance"],
}

/**
 * Parses a YYYY-MM string into start and end dates for that month, in UTC.
 * Listing timestamps are stored as UTC without a time zone, and Prisma sends a
 * Date as timestamptz, so queries must compare with `AT TIME ZONE 'UTC'`.
 * A `::timestamp` cast converts in the DB session time zone instead.
 */
export function parseDateRange(yearMonth: string): {
  startDate: Date
  endDate: Date
} {
  const [year, month] = yearMonth.split("-").map(Number)
  const startDate = new Date(Date.UTC(year, month - 1, 1))
  const endDate = new Date(Date.UTC(year, month, 0)) // Last day of month
  endDate.setUTCHours(
    END_OF_DAY_HOURS,
    END_OF_DAY_MINUTES,
    END_OF_DAY_SECONDS,
    END_OF_DAY_MILLISECONDS,
  )
  return { startDate, endDate }
}

/**
 * Returns the YYYY-MM month before the given YYYY-MM month.
 * e.g., "2026-01" -> "2025-12"
 */
export function previousYearMonth(yearMonth: string): string {
  const prevMonth = new Date(parseDateRange(yearMonth).startDate)
  prevMonth.setUTCMonth(prevMonth.getUTCMonth() - 1)
  return `${prevMonth.getUTCFullYear()}-${String(prevMonth.getUTCMonth() + 1).padStart(MONTH_PAD_LENGTH, "0")}`
}

/**
 * Formats a GPU name for display.
 * e.g., "nvidia-geforce-rtx-5090" -> "RTX 5090"
 */
export function formatGpuName(name: string): string {
  // Remove common prefixes
  let formatted = name
    .replace(/^nvidia-geforce-/i, "")
    .replace(/^amd-radeon-/i, "")
    .replace(/^intel-arc-/i, "Arc ")

  // Convert to uppercase and add spaces
  formatted = formatted.replaceAll("-", " ").toUpperCase()

  return formatted
}

/**
 * Determines the chart color based on a value.
 * Positive values (premiums) = danger (red)
 * Negative values (discounts) = success (green)
 * Near zero = warning (orange)
 */
export function getValueColor(
  value: number,
  threshold = DEFAULT_VALUE_THRESHOLD,
): "danger" | "success" | "warning" | "primary" {
  if (value > threshold) return "danger"
  if (value < -threshold) return "success"
  if (Math.abs(value) <= threshold) return "warning"
  return "primary"
}
