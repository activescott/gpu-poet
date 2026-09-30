/**
 * GPU Price History Chart Image API Route
 *
 * Renders price history chart images for a specific GPU.
 *
 * URL format: /api/images/chart/GpuPriceHistoryChart?gpu={gpuSlug}&months={number}
 * Example: /api/images/chart/GpuPriceHistoryChart?gpu=nvidia-geforce-rtx-3090&months=6
 *
 * NOTE: This is a separate route from the generic [componentName]/route.tsx because
 * it has different parameters. The generic route handles market report charts that
 * take a date range (from/to in YYYY-MM format), while this route handles per-GPU
 * price history which requires a GPU slug and months count. Both routes share the
 * same `composeChartImage` function for consistent header/footer/watermark rendering.
 */
import { NextRequest, NextResponse } from "next/server"
import { composeChartImage } from "@/pkgs/server/charts"
import { getGpuPriceHistoryConfig } from "@/pkgs/server/components/charts"
import { findGpu } from "@/pkgs/server/db/GpuRepository"
import { createLogger } from "@/lib/logger"

const log = createLogger("api:images:chart:GpuPriceHistoryChart")

// Use Node.js runtime for canvas rendering
export const runtime = "nodejs"

// Cache for 1 hour, stale-while-revalidate for 1 day
export const revalidate = 3600

const DEFAULT_MONTHS = 6

/**
 * GET /api/images/chart/GpuPriceHistoryChart
 *
 * Query parameters:
 * - gpu: GPU slug (e.g., "nvidia-geforce-rtx-3090")
 * - months: Number of months of history (default: 6)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)

  // Get GPU slug from query params
  const gpuSlug = searchParams.get("gpu")
  if (!gpuSlug) {
    return NextResponse.json(
      { error: "Missing required query parameter: gpu" },
      { status: 400 },
    )
  }

  // Get months (optional, default to 6)
  const monthsParam = searchParams.get("months")
  const months = monthsParam ? Number.parseInt(monthsParam, 10) : DEFAULT_MONTHS

  if (Number.isNaN(months) || months < 1) {
    return NextResponse.json(
      { error: "Invalid months parameter. Must be a positive integer." },
      { status: 400 },
    )
  }

  try {
    // Look up GPU to get the label
    const gpu = await findGpu(gpuSlug)
    if (!gpu) {
      return NextResponse.json(
        { error: `GPU not found: ${gpuSlug}` },
        { status: 404 },
      )
    }

    // Fetch the chart configuration
    const config = await getGpuPriceHistoryConfig(gpuSlug, gpu.label, months)

    // Render the chart image
    const imageBuffer = await composeChartImage(config, {
      title: config.title,
      date: new Date(),
    })

    // Return PNG with caching headers
    return new NextResponse(new Uint8Array(imageBuffer), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Length": String(imageBuffer.length),
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    })
  } catch (error) {
    log.error({ err: error, gpuSlug }, "Error rendering GpuPriceHistoryChart")
    return NextResponse.json(
      { error: "Failed to render chart image" },
      { status: 500 },
    )
  }
}
