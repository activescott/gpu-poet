import { createLogger } from "@/lib/logger"
import { Suspense, type JSX } from "react"
import { ShopListingsWithFilters } from "./ShopListingsWithFilters"
import { findGpu } from "@/pkgs/server/db/GpuRepository"
import {
  Gpu,
  type GpuMetricKey,
  GpuMetricKeys,
  extractBrandName,
} from "@/pkgs/isomorphic/model"
import type { SortKey } from "@/pkgs/client/components/SortPanel"
import { chain } from "irritable-iterable"
import { ISOMORPHIC_CONFIG } from "@/pkgs/isomorphic/config"
import { Integer } from "type-fest"
import {
  listActiveListingsForGpus,
  getPriceStats,
  GpuPriceStats,
} from "@/pkgs/server/db/ListingRepository"
import Link from "next/link"
import { notFound } from "next/navigation"

const log = createLogger("gpu:shop:gpuSlug")

// Minimum used/refurbished listings before the shop-page title and
// description lead with condition instead of the generic "for Sale" copy.
// Threshold of 3 (not 1) gives hysteresis so a page does not flip
// between branches day to day, which would muddy attribution.
const MIN_USED_LISTINGS_FOR_USED_BRANCH = 3

/**
 * Compares the cheapest live listing against the GPU's launch MSRP.
 *
 * Returns null when the GPU has no recorded MSRP or no listings, so callers can
 * omit the comparison entirely rather than print a partial one.
 */
function compareToMsrp(
  gpu: Gpu,
  lowestPrice: number,
): { msrp: number; difference: number; isUnderMsrp: boolean } | null {
  if (!gpu.msrpUSD || gpu.msrpUSD <= 0 || lowestPrice <= 0) {
    return null
  }
  return {
    msrp: gpu.msrpUSD,
    difference: Math.abs(lowestPrice - gpu.msrpUSD),
    isUnderMsrp: lowestPrice < gpu.msrpUSD,
  }
}

/**
 * One-clause MSRP comparison for meta descriptions, e.g. "$180 under the $1,599
 * MSRP". Stating both directions is deliberate: under-MSRP is the strongest
 * proof a price is a real deal, and over-MSRP explains why an otherwise
 * expensive-looking number is in fact the market floor — without it a $2,917
 * "from" price reads as us being overpriced next to results quoting a $1,599
 * MSRP.
 */
function msrpClause(gpu: Gpu, lowestPrice: number): string {
  const comparison = compareToMsrp(gpu, lowestPrice)
  if (!comparison) {
    return ""
  }
  const direction = comparison.isUnderMsrp ? "under" : "over"
  return `, ${formatUsd(comparison.difference)} ${direction} the ${formatUsd(comparison.msrp)} MSRP`
}

/**
 * Builds the shop-page meta title, meta description, and `h1`. Leads with
 * used/refurbished inventory when there is enough of it (Branch A), falls back
 * to generic "for Sale" copy when there are only new listings (Branch B), and
 * falls back further to a price-history pitch when there are no listings at all
 * (Branch C).
 *
 * The `h1` is built here, in the same branch, rather than in the page body:
 * Google treats the `h1` as a title candidate and rewrites `<title>` when the
 * two disagree. Leaving a static "{label} Listings" heading under a
 * "Used {label} for Sale" title invites exactly that rewrite, which would make
 * the used-intent experiment measure nothing.
 *
 * Every branch states a single "from" price and never a range. The high end of
 * the range is the worst listing on the page and answers nobody's question, and
 * it made our SERP snippet ("from $2917 to $7258") read as the most expensive
 * result on a used-price query.
 */
function buildShopCopy(
  gpu: Gpu,
  stats: GpuPriceStats,
): { title: string; description: string; heading: string } {
  const gpuLabel = gpu.label
  const hasUsed =
    stats.usedListingCount >= MIN_USED_LISTINGS_FOR_USED_BRANCH &&
    stats.usedMinPrice !== null
  const hasListings = stats.activeListingCount > 0

  if (hasUsed && stats.usedMinPrice !== null) {
    return {
      title: `Used ${gpuLabel} for Sale — ${stats.usedListingCount} Listings from ${formatUsd(stats.usedMinPrice)}`,
      description: `${stats.usedListingCount} used & refurbished ${gpuLabel} from ${formatUsd(stats.usedMinPrice)}${msrpClause(gpu, stats.usedMinPrice)}. Scam and accessory listings removed. eBay + Amazon, updated every 30 min.`,
      // Matches the title prefix so the two reinforce rather than compete. The
      // page does also carry new listings, so this heading is a mild stretch;
      // the lead paragraph immediately below states the exact used/new split.
      heading: `Used ${gpuLabel} for Sale`,
    }
  }

  if (hasListings) {
    return {
      title: `${gpuLabel} for Sale — ${stats.activeListingCount} Listings from ${formatUsd(stats.minPrice)} | GPU Poet`,
      description: `${stats.activeListingCount} ${gpuLabel} listings from ${formatUsd(stats.minPrice)}${msrpClause(gpu, stats.minPrice)}. Scam and accessory listings removed. eBay + Amazon, updated every 30 min.`,
      heading: `${gpuLabel} for Sale`,
    }
  }

  return {
    title: `${gpuLabel} Used & New Price History — Availability Tracker | GPU Poet`,
    description: `No ${gpuLabel} listings right now. See used and new ${gpuLabel} price history, typical secondhand prices, and get alerted when listings appear. Tracked by GPU Poet.`,
    heading: `${gpuLabel} Price History & Availability`,
  }
}

/**
 * Builds JSON-LD for the shop page. The card, price, and compare pages already
 * emit a Product with an AggregateOffer whose `url` points *here*, but this page
 * — the one a buyer actually lands on — had none, so it was ineligible for the
 * price-range rich result those pages earn. `url` is self-referential for that
 * reason.
 */
function buildShopStructuredData(gpu: Gpu, stats: GpuPriceStats): object {
  const priceDecimals = 2
  const structuredData: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${gpu.label} ${gpu.memoryCapacityGB}GB`,
    description: gpu.summary,
    brand: { "@type": "Brand", name: extractBrandName(gpu.label) },
    category: "Graphics Card",
  }

  if (stats.representativeImageUrl) {
    structuredData.image = [
      stats.representativeImageUrl.startsWith("/")
        ? `https://gpupoet.com${stats.representativeImageUrl}`
        : stats.representativeImageUrl,
    ]
  }

  // highPrice is back deliberately, accepted to clear the Search Console
  // Product snippets warning: Google renders a range topped by our priciest
  // active listing. Scott decided this on 2026-09-20, reversing e3c8dbb; see #68.
  if (stats.activeListingCount > 0 && stats.minPrice > 0) {
    structuredData.offers = {
      "@type": "AggregateOffer",
      lowPrice: stats.minPrice.toFixed(priceDecimals),
      highPrice: stats.maxPrice.toFixed(priceDecimals),
      priceCurrency: "USD",
      offerCount: Math.floor(stats.activeListingCount),
      availability: "https://schema.org/InStock",
      url: `https://gpupoet.com/gpu/shop/${gpu.name}`,
    }
  }

  return structuredData
}

function formatUsd(value: number): string {
  return `$${Math.round(value).toLocaleString()}`
}

// revalidate the data at most every hour: https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config#revalidate
export const revalidate = 3600

type GpuParams = {
  params: Promise<{ gpuSlug: string }>
  searchParams: Promise<{ sortBy?: string }>
}

export async function generateMetadata(props: GpuParams) {
  const params = await props.params
  const { gpuSlug } = params
  log.debug({ gpuSlug }, "generateStaticMetadata for gpu")
  const gpu = await findGpu(gpuSlug)
  if (!gpu) {
    notFound()
  }
  const stats = await getPriceStats(gpuSlug)
  const { title, description } = buildShopCopy(gpu, stats)

  return {
    title,
    description,
    alternates: { canonical: `https://gpupoet.com/gpu/shop/${gpuSlug}` },
  }
}

function isValidSortKey(key: string): key is SortKey {
  return key === "price" || GpuMetricKeys.includes(key as GpuMetricKey)
}

export default async function Page(props: GpuParams) {
  const params = await props.params
  const searchParams = await props.searchParams
  const { gpuSlug } = params
  const { sortBy } = searchParams
  log.info(`Fetching cached listings for gpu ${gpuSlug} ...`)
  const gpu = await findGpu(gpuSlug)
  if (!gpu) {
    notFound()
  }
  const stats = await getPriceStats(gpuSlug)
  const allListings = await listActiveListingsForGpus([gpuSlug])
  log.info(
    `Fetching cached listings for gpu ${gpuSlug} complete. Found ${allListings.length} listings.`,
  )
  const listings = chain(allListings)
    .head(ISOMORPHIC_CONFIG.MAX_LISTINGS_PER_PAGE() as Integer<number>)
    .collect()

  const initialSortKey: SortKey =
    sortBy && isValidSortKey(sortBy) ? sortBy : "price"
  const { heading } = buildShopCopy(gpu, stats)

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildShopStructuredData(gpu, stats)),
        }}
      />
      <h1>{heading}</h1>
      <ShopLead gpu={gpu} stats={stats} />
      <Suspense fallback={<ListingsFallback />}>
        <ShopListingsWithFilters
          listings={listings.map((item) => ({
            item,
            specs: gpu,
          }))}
          initialSortKey={initialSortKey}
        />
      </Suspense>
    </main>
  )
}

/**
 * Opening paragraph for the shop page, stating the live price range, listing
 * count, and condition split in prose.
 *
 * The prior copy ("Below are active listings for the X GPU...") contained no
 * numbers, so Google had nothing quotable and pulled filter-control labels into
 * the SERP snippet instead. Competitors that rank above us on price queries
 * (Jawa's "Price Tracker" pages) all state their figures as sentences.
 */
function ShopLead({
  gpu,
  stats,
}: {
  gpu: Gpu
  stats: GpuPriceStats
}): JSX.Element {
  const specsLink = (
    <Link href={`/gpu/learn/card/${gpu.name}`}>
      {gpu.label} specifications page
    </Link>
  )

  if (stats.activeListingCount === 0) {
    return (
      <p className="lead mb-4">
        No {gpu.label} listings are active right now. Prices below are refreshed
        every 30 minutes from eBay and Amazon as inventory returns. For specs
        and benchmarks, see the {specsLink}.
      </p>
    )
  }

  const msrp = compareToMsrp(gpu, stats.minPrice)

  return (
    <p className="lead mb-4">
      The cheapest {gpu.label} listed right now is {formatUsd(stats.minPrice)}
      {msrp !== null && (
        <>
          , {formatUsd(msrp.difference)} {msrp.isUnderMsrp ? "under" : "over"}{" "}
          its {formatUsd(msrp.msrp)} launch MSRP
        </>
      )}
      . {stats.activeListingCount} listings are active, averaging{" "}
      {formatUsd(stats.avgPrice)}.
      {stats.usedMinPrice !== null && (
        <>
          {" "}
          {stats.usedListingCount} are used or refurbished, starting around{" "}
          {formatUsd(stats.usedMinPrice)}; {stats.newListingCount} are new.
        </>
      )}{" "}
      Accessory, box-only, for-parts, and suspected-scam listings are removed
      before they reach this page, so the lowest price above is a whole card you
      can actually buy — not a $99 backplate. Prices are live asking prices from
      eBay and Amazon, refreshed every 30 minutes, not sold prices. For specs
      and benchmarks, see the {specsLink}.
    </p>
  )
}

function ListingsFallback(): JSX.Element {
  return (
    <div className="d-flex justify-content-center py-4">
      <div className="spinner-border text-secondary" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
    </div>
  )
}
