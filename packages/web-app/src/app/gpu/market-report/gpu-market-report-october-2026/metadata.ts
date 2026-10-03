import type { MarketReportMetadata } from "../reports"

export const reportMetadata: MarketReportMetadata = {
  slug: "gpu-market-report-october-2026",
  title:
    "October 2026 GPU Price/Performance Rankings: Prices Rose on 59 of 81 GPUs, and a Resale RTX 5090 Now Costs 2.4x MSRP",
  description:
    "Best bang for your buck GPUs ranked by $/FPS (1440p and 4K), $/INT8 TOP (inference), and $/TFLOP (training). Prices rose on 59 of 81 GPUs in September. The RTX 5090's best resale deal reached $4,795, 140% over MSRP, new RTX 50 cards on Amazon rose faster than resale, and the RTX 3060 Ti still leads 1440p value at $1.19/FPS.",
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
