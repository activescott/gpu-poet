import { notFound } from "next/navigation"
import Link from "next/link"
import { memoize } from "lodash"
import { Gpu, extractBrandName } from "@/pkgs/isomorphic/model"
import { msrpNote } from "@/pkgs/isomorphic/model/gpu"
import {
  parseYearMonthSlug,
  getCurrentYearMonth,
  formatYearMonthSlug,
  getYearMonthContentLastModified,
  YearMonth,
} from "@/pkgs/isomorphic/yearMonth"
import { getGpu as getGpuWithoutCache } from "@/pkgs/server/db/GpuRepository"
import {
  getPriceStats,
  getHistoricalPriceData,
  GpuPriceStats,
} from "@/pkgs/server/db/ListingRepository"
import { GpuPriceHistoryChart } from "@/pkgs/server/components/charts"
import { Feature } from "@/pkgs/client/components/Feature"
import { FormatCurrency } from "@/pkgs/client/components/FormatCurrency"
import { createLogger } from "@/lib/logger"
import {
  bucketDailyPricesByMonth,
  LOWEST_AVERAGE_PRICE_DEFINITION,
  LOWEST_AVERAGE_PRICE_LABEL,
  MonthlyLowestAveragePriceStats,
} from "@/pkgs/isomorphic/pricing"

// revalidate the data at most every hour:
export const revalidate = 3600

// Force dynamic rendering to avoid database dependency during Docker build
export const dynamic = "force-dynamic"

const log = createLogger("learn:price")

const getGpu = memoize(getGpuWithoutCache)

/**
 * Fetches a GPU by slug, returning null if it doesn't exist rather than throwing.
 */
async function getGpuOrNull(gpuSlug: string): Promise<Gpu | null> {
  try {
    return await getGpu(gpuSlug)
  } catch {
    return null
  }
}

const MIN_CHART_MONTHS = 4
const PRIOR_MONTHS_FOR_COMPARISON = 3
const PERCENT_MULTIPLIER = 100
const MONTHS_PER_YEAR = 12
const ISO_MONTH_PAD = 2
const PRICE_DECIMALS = 2

type CurrentPriceParams = {
  params: Promise<{ yearMonth: string; gpuSlug: string }>
}

/**
 * Calculates how many months of history the chart should show:
 * from 3 months before the target month through today.
 */
function calculateChartMonths(target: YearMonth): number {
  const now = new Date()
  const chartStart = new Date(
    target.year,
    target.month - 1 - PRIOR_MONTHS_FOR_COMPARISON,
    1,
  )
  const monthsDiff =
    (now.getFullYear() - chartStart.getFullYear()) * MONTHS_PER_YEAR +
    (now.getMonth() - chartStart.getMonth()) +
    1
  return Math.max(MIN_CHART_MONTHS, monthsDiff)
}

/**
 * Extracts the release year from a GPU's releaseDate field.
 */
function extractReleaseYear(gpu: Gpu): number | null {
  if (!gpu.releaseDate) return null
  const match = gpu.releaseDate.match(/^(\d{4})/)
  return match ? Number.parseInt(match[1], 10) : null
}

/**
 * Builds JSON-LD structured data for the price-by-month page.
 * Uses Schema.org Product + AggregateOffer scoped to the target month,
 * with prices based on "lowest average price" (avg of 3 lowest per day).
 */
function buildStructuredData(
  gpu: Gpu,
  target: YearMonth,
  monthStats: MonthlyLowestAveragePriceStats | undefined,
  currentStats: GpuPriceStats,
): object | null {
  const contentLastModified = getYearMonthContentLastModified(target)

  // Build the offers object first — if we have no price data at all,
  // Product structured data would be invalid (Google requires at least one
  // of offers/review/aggregateRating).
  const offerValidThrough = contentLastModified.toISOString()
  let offers: Record<string, unknown> | null = null
  if (monthStats && monthStats.minLowestAvgPrice > 0) {
    offers = {
      "@type": "AggregateOffer",
      lowPrice: monthStats.minLowestAvgPrice.toFixed(PRICE_DECIMALS),
      highPrice: monthStats.maxLowestAvgPrice.toFixed(PRICE_DECIMALS),
      priceCurrency: "USD",
      validFrom: `${target.isoMonth}-01`,
      validThrough: offerValidThrough,
      url: `https://gpupoet.com/gpu/shop/${gpu.name}`,
    }
  } else if (currentStats.activeListingCount > 0 && currentStats.minPrice > 0) {
    offers = {
      "@type": "AggregateOffer",
      lowPrice: currentStats.minPrice.toFixed(PRICE_DECIMALS),
      highPrice: currentStats.maxPrice.toFixed(PRICE_DECIMALS),
      priceCurrency: "USD",
      offerCount: Math.floor(currentStats.activeListingCount),
      availability: "https://schema.org/InStock",
      url: `https://gpupoet.com/gpu/shop/${gpu.name}`,
    }
  }

  if (!offers) {
    return null
  }

  const structuredData: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${gpu.label}${gpu.memoryCapacityGB ? ` ${gpu.memoryCapacityGB}GB` : ""}`,
    description: `${gpu.label} street prices for ${target.display} based on real marketplace listings tracked by GPU Poet.`,
    brand: {
      "@type": "Brand",
      name: extractBrandName(gpu.label),
    },
    category: "Graphics Card",
    dateModified: contentLastModified.toISOString(),
    offers,
  }

  if (gpu.releaseDate) {
    structuredData.releaseDate = gpu.releaseDate
  }

  if (currentStats.representativeImageUrl) {
    const absoluteImageUrl = currentStats.representativeImageUrl.startsWith("/")
      ? `https://gpupoet.com${currentStats.representativeImageUrl}`
      : currentStats.representativeImageUrl
    structuredData.image = [absoluteImageUrl]
  }

  return structuredData
}

export async function generateMetadata(props: CurrentPriceParams) {
  const params = await props.params
  const { yearMonth: yearMonthSlug, gpuSlug } = params

  const target = parseYearMonthSlug(yearMonthSlug)
  if (!target) {
    return { title: "Price Not Found | GPU Poet" }
  }

  log.debug({ yearMonthSlug, gpuSlug }, "generateMetadata for price page")
  const gpu = await getGpuOrNull(gpuSlug)
  if (!gpu) {
    return { title: "Price Not Found | GPU Poet" }
  }

  const title = `${gpu.label} Price in ${target.display} | GPU Poet`
  const description = `${gpu.label} lowest average prices for ${target.display} — the average of the three lowest-priced listings each day. See historical pricing and real-time availability tracked continuously by GPU Poet.`
  const url = `https://gpupoet.com/gpu/learn/price/${target.slug}/${gpu.name}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      images: [
        {
          url: "https://gpupoet.com/images/social.png",
          width: 2400,
          height: 1260,
          alt: `${gpu.label} price chart and availability for ${target.display}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image" as const,
      title,
      description,
      images: ["https://gpupoet.com/images/social.png"],
    },
  }
}

export default async function Page(props: CurrentPriceParams) {
  const params = await props.params
  const { yearMonth: yearMonthSlug, gpuSlug } = params

  const target = parseYearMonthSlug(yearMonthSlug)
  if (!target) {
    notFound()
  }

  const gpu = await getGpuOrNull(gpuSlug)
  if (!gpu) {
    notFound()
  }

  const currentYm = getCurrentYearMonth()
  const chartMonths = calculateChartMonths(target)

  // Fetch current CTA data and all daily history (covers target, prior 3 months,
  // and current month through today in a single query)
  const [currentStats, dailyHistory] = await Promise.all([
    getPriceStats(gpu.name),
    getHistoricalPriceData(gpu.name, chartMonths),
  ])

  const statsByMonth = bucketDailyPricesByMonth(dailyHistory)
  const monthStats = statsByMonth.get(target.isoMonth)
  const currentMonthStats = statsByMonth.get(currentYm.isoMonth)

  // Compute prior N-month mean of the monthly lowest-average prices
  const priorLowestAvgs: number[] = []
  for (let i = 1; i <= PRIOR_MONTHS_FOR_COMPARISON; i++) {
    const d = new Date(target.year, target.month - 1 - i, 1)
    const priorIso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(ISO_MONTH_PAD, "0")}`
    const s = statsByMonth.get(priorIso)
    if (s && s.meanLowestAvgPrice > 0)
      priorLowestAvgs.push(s.meanLowestAvgPrice)
  }
  const priorMeanLowestAvg =
    priorLowestAvgs.length > 0
      ? priorLowestAvgs.reduce((sum, p) => sum + p, 0) / priorLowestAvgs.length
      : null

  // % change of target's lowest-avg vs prior months' lowest-avg
  let priorChangePercent: number | null = null
  if (
    priorMeanLowestAvg !== null &&
    monthStats &&
    monthStats.meanLowestAvgPrice > 0
  ) {
    priorChangePercent =
      ((monthStats.meanLowestAvgPrice - priorMeanLowestAvg) /
        priorMeanLowestAvg) *
      PERCENT_MULTIPLIER
  }

  // % change of current month vs target month (both in lowest-avg terms)
  const isTargetCurrentMonth = target.isoMonth === currentYm.isoMonth
  let currentChangePercent: number | null = null
  if (
    !isTargetCurrentMonth &&
    monthStats &&
    monthStats.meanLowestAvgPrice > 0 &&
    currentMonthStats &&
    currentMonthStats.meanLowestAvgPrice > 0
  ) {
    currentChangePercent =
      ((currentMonthStats.meanLowestAvgPrice - monthStats.meanLowestAvgPrice) /
        monthStats.meanLowestAvgPrice) *
      PERCENT_MULTIPLIER
  }
  const annotationDate = new Date(target.year, target.month - 1, 1)
  const releaseYear = extractReleaseYear(gpu)
  const estimatedMsrpNote = msrpNote(gpu)
  const structuredData = buildStructuredData(
    gpu,
    target,
    monthStats,
    currentStats,
  )

  const currentMonthSlug = formatYearMonthSlug(currentYm.year, currentYm.month)

  return (
    <>
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}
      <div className="container py-4">
        <header className="mb-4">
          <h1 className="h2 mb-2">
            {gpu.label} Price in {target.display}
          </h1>
          <p className="text-muted mb-2">
            {extractBrandName(gpu.label)} graphics card
            {releaseYear ? ` released in ${releaseYear}` : ""}
            {gpu.msrpUSD != null && gpu.msrpUSD > 0 && (
              <>
                {` with an MSRP of $${gpu.msrpUSD.toLocaleString()}`}
                {estimatedMsrpNote && <sup>†</sup>}
              </>
            )}
            .{" "}
            <Link href={`/gpu/learn/card/${gpu.name}`}>
              View full {gpu.label} specifications and benchmarks →
            </Link>
          </p>
          {gpu.msrpUSD != null && gpu.msrpUSD > 0 && estimatedMsrpNote && (
            <p className="small text-muted mb-2">† {estimatedMsrpNote}</p>
          )}
          {/*
            Every elapsed month has a near-duplicate page per GPU, and Google
            picks among them on generic queries: in September 2026 the query
            "rtx 4090 price 2026" was served the June 2026 page. A visitor
            landing there had to scroll past the whole chart to find the link
            to the live month. This states the page is historical at the point
            the reader forms an impression, and links out at the same place.
          */}
          {!isTargetCurrentMonth && (
            <p className="alert alert-secondary py-2 px-3 mb-0">
              This page reports {gpu.label} prices for {target.display}, which
              has ended.{" "}
              <Link href={`/gpu/learn/price/${currentMonthSlug}/${gpu.name}`}>
                See current {currentYm.display} {gpu.label} prices →
              </Link>
            </p>
          )}
        </header>

        <section className="row mb-4">
          <div className="col-12">
            <Feature
              title={`Buy the ${gpu.label}`}
              icon="gpu-card"
              callToAction={
                currentStats.activeListingCount > 0
                  ? `See All ${currentStats.activeListingCount} Deals`
                  : undefined
              }
              callToActionLink={
                currentStats.activeListingCount > 0
                  ? `/gpu/shop/${gpu.name}`
                  : undefined
              }
            >
              {currentStats.activeListingCount > 0 ? (
                <>
                  We&apos;re tracking <em>{currentStats.activeListingCount}</em>{" "}
                  {gpu.label} deals from major online marketplaces right now,
                  starting at{" "}
                  <b>
                    <FormatCurrency
                      currencyValue={currentStats.minPrice}
                      forceInteger={true}
                    />
                  </b>
                  . Click through to compare every deal and buy at the best
                  price.
                </>
              ) : (
                <>No {gpu.label} deals are available right now.</>
              )}
            </Feature>
          </div>
        </section>

        <section className="mb-4">
          <h2 className="h4 mb-3">
            {gpu.label} Price History Through {target.display}
          </h2>
          <GpuPriceHistoryChart
            gpuName={gpu.name}
            gpuLabel={gpu.label}
            months={chartMonths}
            annotationDate={annotationDate}
            annotationLabel={target.display}
          />
        </section>

        <section className="mb-4">
          <h2 className="h4 mb-3">Price Insights for {target.display}</h2>
          {monthStats ? (
            <>
              <p>
                In {target.display}, the {gpu.label} had a{" "}
                <b>{LOWEST_AVERAGE_PRICE_LABEL}</b> of{" "}
                <b>
                  <FormatCurrency
                    currencyValue={monthStats.meanLowestAvgPrice}
                    forceInteger={true}
                  />
                </b>
                , ranging from{" "}
                <FormatCurrency
                  currencyValue={monthStats.minLowestAvgPrice}
                  forceInteger={true}
                />{" "}
                on the best day down to{" "}
                <FormatCurrency
                  currencyValue={monthStats.maxLowestAvgPrice}
                  forceInteger={true}
                />{" "}
                on the most expensive day. This price is{" "}
                {LOWEST_AVERAGE_PRICE_DEFINITION}.
              </p>
              {priorChangePercent !== null && (
                <p>
                  That&apos;s{" "}
                  <b>
                    {priorChangePercent >= 0 ? "up" : "down"}{" "}
                    {Math.abs(priorChangePercent).toFixed(1)}%
                  </b>{" "}
                  compared to the {LOWEST_AVERAGE_PRICE_LABEL} across the prior{" "}
                  {priorLowestAvgs.length}{" "}
                  {priorLowestAvgs.length === 1 ? "month" : "months"} (
                  <FormatCurrency
                    currencyValue={priorMeanLowestAvg!}
                    forceInteger={true}
                  />
                  ).
                </p>
              )}
              {!isTargetCurrentMonth && currentChangePercent !== null && (
                <p>
                  Compared to{" "}
                  <Link
                    href={`/gpu/learn/price/${currentMonthSlug}/${gpu.name}`}
                  >
                    this month&apos;s {LOWEST_AVERAGE_PRICE_LABEL} (
                    <FormatCurrency
                      currencyValue={currentMonthStats!.meanLowestAvgPrice}
                      forceInteger={true}
                    />
                    )
                  </Link>
                  , prices are{" "}
                  <b>
                    {currentChangePercent >= 0 ? "up" : "down"}{" "}
                    {Math.abs(currentChangePercent).toFixed(1)}%
                  </b>{" "}
                  since {target.display}.
                </p>
              )}
            </>
          ) : (
            <p>
              No {gpu.label} price data was recorded for {target.display}. This
              can happen for months with limited marketplace activity.
              {isTargetCurrentMonth ? (
                <> Check back soon as our data continues to update.</>
              ) : (
                <>
                  {" "}
                  <Link
                    href={`/gpu/learn/price/${currentMonthSlug}/${gpu.name}`}
                  >
                    View this month&apos;s {gpu.label} prices instead →
                  </Link>
                </>
              )}
            </p>
          )}
        </section>

        <section className="mb-4">
          <h2 className="h4 mb-3">How GPU Poet Tracks Prices</h2>
          <p className="text-muted">
            GPU Poet continuously monitors graphics card prices across major
            online marketplaces, recording real listing data every day. Our
            price history reflects actual street prices paid by real buyers —
            not manufacturer suggested retail prices or speculation. Every
            listing is validated for quality so you get a reliable view of what
            GPUs actually cost.
          </p>
        </section>
      </div>
    </>
  )
}
