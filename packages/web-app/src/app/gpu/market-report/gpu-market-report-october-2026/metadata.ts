import type { MarketReportMetadata } from "../reports"

export const reportMetadata: MarketReportMetadata = {
  slug: "gpu-market-report-october-2026",
  title:
    "October 2026 GPU Price/Performance Rankings: Used RTX 30 Prices Turn Back Up as the RTX 3090 Jumps 38%",
  description:
    "Best bang for your buck GPUs ranked by $/FPS (1440p and 4K), $/INT8 TOP (inference), and $/TFLOP (training). August's dip in used RTX 30 prices did not last: the RTX 3090 rose 38% to $1,207 in September and 59 of 81 GPUs got more expensive. RTX 50 rose for a second month, new cards on Amazon rose faster than resale, and the RTX 3060 Ti still leads 1440p value at $1.19/FPS.",
  publishedAt: new Date("2026-10-01T16:00:00Z"),
  updatedAt: new Date("2026-10-01T16:00:00Z"),
  author: "Scott Willeke",
  tags: [
    "market-report",
    "gpu-prices",
    "price-performance",
    "ai-gpu",
    "gaming-gpu",
    "buying-guide",
  ],
  dateRange: { from: "2026-09", to: "2026-09" },
}
