import type { MarketReportMetadata } from "../reports"

export const reportMetadata: MarketReportMetadata = {
  slug: "gpu-market-report-november-2026",
  title:
    "November 2026 GPU Price/Performance Rankings: A Resale RTX 5090 Now Costs 3x MSRP, and Prices Rose on 65 of 80 GPUs",
  description:
    "Best bang for your buck GPUs ranked by $/FPS (1440p and 4K), $/INT8 TOP (inference), and $/TFLOP (training). Prices rose on 65 of 80 GPUs in October. The RTX 5090's best resale deal reached $5,986, three times its MSRP and up 89% since July, and the RTX 3060 Ti still leads 1440p value at $1.20/FPS.",
  publishedAt: new Date("2026-11-01T16:00:00Z"),
  updatedAt: new Date("2026-11-01T16:00:00Z"),
  author: "Scott Willeke",
  tags: [
    "market-report",
    "gpu-prices",
    "price-performance",
    "ai-gpu",
    "gaming-gpu",
    "buying-guide",
  ],
  dateRange: { from: "2026-10", to: "2026-10" },
}
