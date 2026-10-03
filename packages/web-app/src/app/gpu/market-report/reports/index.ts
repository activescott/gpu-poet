/**
 * Market Report Registry
 *
 * Imports metadata from each report's page.tsx file.
 * Each report defines its own `reportMetadata` export as the single source of truth.
 *
 * To add a new report:
 * 1. Create folder: /gpu/market-report/gpu-market-report-{month}-{year}/page.tsx
 * 2. Export `reportMetadata` from the page
 * 3. Import and add to the `reports` array below
 */
import type { DateRange } from "@/pkgs/server/components/charts"

// Import metadata from each report's metadata file (not page.tsx, which Next.js restricts exports on)
import { reportMetadata as october2026 } from "../gpu-market-report-october-2026/metadata"
import { reportMetadata as september2026 } from "../gpu-market-report-september-2026/metadata"
import { reportMetadata as august2026 } from "../gpu-market-report-august-2026/metadata"
import { reportMetadata as july2026 } from "../gpu-market-report-july-2026/metadata"
import { reportMetadata as june2026 } from "../gpu-market-report-june-2026/metadata"
import { reportMetadata as may2026 } from "../gpu-market-report-may-2026/metadata"
import { reportMetadata as april2026 } from "../gpu-market-report-april-2026/metadata"
import { reportMetadata as march2026 } from "../gpu-market-report-march-2026/metadata"
import { reportMetadata as february2026 } from "../gpu-market-report-february-2026/metadata"
import { reportMetadata as january2026 } from "../gpu-market-report-january-2026/metadata"

/**
 * Metadata for a market report.
 */
export interface MarketReportMetadata {
  slug: string
  title: string
  description: string
  publishedAt: Date
  updatedAt: Date
  author: string
  tags: string[]
  dateRange: DateRange
}

/**
 * All market reports, newest first.
 */
const reports: MarketReportMetadata[] = [
  october2026,
  september2026,
  august2026,
  july2026,
  june2026,
  may2026,
  april2026,
  march2026,
  february2026,
  january2026,
]

/**
 * Lists all market report metadata, sorted by publish date (newest first).
 */
export function listMarketReports(): MarketReportMetadata[] {
  return [...reports].sort(
    (a, b) => b.publishedAt.getTime() - a.publishedAt.getTime(),
  )
}
