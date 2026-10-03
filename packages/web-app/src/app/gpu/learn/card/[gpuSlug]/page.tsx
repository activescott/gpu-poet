import { GpuInfo, BenchmarkPercentile } from "@/pkgs/client/components/GpuInfo"
import { GpuSpecKey, GpuSpecKeys } from "@/pkgs/isomorphic/model/specs"
import { Gpu, extractBrandName } from "@/pkgs/isomorphic/model"
import {
  PERCENTILE_TOP_TIER,
  PERCENTILE_ENTRY_TIER,
} from "@/pkgs/isomorphic/model/tiers"
import {
  findGpu as findGpuWithoutCache,
  gpuSpecAsPercent,
  getAllMetricDefinitions,
  calculateAllGpuPercentilesForMetric,
  getMetricValuesBySlug,
} from "@/pkgs/server/db/GpuRepository"
import {
  getPriceStats,
  GpuPriceStats,
} from "@/pkgs/server/db/ListingRepository"
import { GpuPriceHistoryChart } from "@/pkgs/server/components/charts"
import { createLogger } from "@/lib/logger"
import { memoize } from "lodash"
import { notFound } from "next/navigation"

// revalidate the data at most every hour:
export const revalidate = 3600

const log = createLogger("learn:gpuSlug")

const findGpu = memoize(findGpuWithoutCache)

/**
 * Formats manufacturer identifier type to human-readable label for JSON-LD.
 */
function formatIdentifierTypeForSchema(type: string): string {
  const labels: Record<string, string> = {
    nvpn: "NVIDIA Part Number",
    board_id: "Board ID",
    product_sku: "Product SKU",
    opn: "AMD Ordering Part Number",
    model_number: "Model Number",
    mm_number: "Material Master Number",
    spec_code: "Spec Code",
    product_code: "Product Code",
  }
  return labels[type.toLowerCase()] || type.replaceAll("_", " ")
}

/**
 * Pros and cons data for editorial reviews.
 */
export interface ProsCons {
  positiveNotes: string[]
  negativeNotes: string[]
}

/**
 * Generates fallback spec-based statements for GPUs that don't have enough
 * percentile-based pros/cons. These are factual statements about the GPU's specs.
 */
function generateFallbackStatements(gpu: Gpu): string[] {
  const statements: string[] = []

  if (gpu.memoryCapacityGB) {
    statements.push(
      `${gpu.memoryCapacityGB}GB VRAM for model and data capacity`,
    )
  }
  if (gpu.fp32TFLOPS) {
    statements.push(`${gpu.fp32TFLOPS} TFLOPS FP32 compute performance`)
  }
  if (gpu.memoryBandwidthGBs) {
    statements.push(`${gpu.memoryBandwidthGBs} GB/s memory bandwidth`)
  }
  if (gpu.tensorCoreCount) {
    statements.push(
      `${gpu.tensorCoreCount} Tensor Cores for accelerated AI workloads`,
    )
  }

  return statements
}

/**
 * Generates pros and cons based on GPU spec and benchmark percentiles.
 * Uses tier thresholds to determine strengths (top tier) and weaknesses (entry tier).
 * Interleaves specs and benchmarks to ensure both categories are represented.
 * Falls back to factual spec statements if not enough percentile-based statements.
 */
function generateProsCons(
  gpu: Gpu,
  gpuSpecPercentages: Record<GpuSpecKey, number>,
  gpuBenchmarkPercentiles: BenchmarkPercentile[],
): ProsCons {
  const specPros: string[] = []
  const specCons: string[] = []
  const benchmarkPros: string[] = []
  const benchmarkCons: string[] = []

  // Spec labels for human-readable output
  const specLabels: Record<GpuSpecKey, string> = {
    fp32TFLOPS: "FP32 compute performance",
    fp16TFLOPS: "FP16 compute performance",
    tensorCoreCount: "tensor core count",
    memoryCapacityGB: "memory capacity",
    memoryBandwidthGBs: "memory bandwidth",
    int8TOPS: "INT8 inference performance",
    fp8TFLOPS: "FP8 matrix performance",
    fp4TFLOPS: "FP4 matrix performance",
  }

  const percentMultiplier = 100

  // Analyze spec percentiles
  for (const [key, percentile] of Object.entries(gpuSpecPercentages)) {
    if (Number.isNaN(percentile)) continue
    const label = specLabels[key as GpuSpecKey]
    if (!label) continue

    if (percentile >= PERCENTILE_TOP_TIER) {
      const topPercent = Math.round((1 - percentile) * percentMultiplier)
      specPros.push(`Excellent ${label} (top ${topPercent}% of GPUs)`)
    } else if (percentile <= PERCENTILE_ENTRY_TIER) {
      specCons.push(`Lower ${label} compared to other GPUs`)
    }
  }

  // Analyze gaming benchmarks (only top-tier as pros, entry-tier as cons)
  for (const benchmark of gpuBenchmarkPercentiles) {
    if (benchmark.percentile === undefined) continue
    if (benchmark.percentile >= PERCENTILE_TOP_TIER) {
      const topPercent = Math.round(
        (1 - benchmark.percentile) * percentMultiplier,
      )
      benchmarkPros.push(
        `Strong ${benchmark.name} performance (top ${topPercent}% of GPUs)`,
      )
    } else if (benchmark.percentile <= PERCENTILE_ENTRY_TIER) {
      benchmarkCons.push(`Below average ${benchmark.name} performance`)
    }
  }

  // Interleave specs and benchmarks to ensure both categories are represented
  // Take up to 2 from each category for a max of 4 total
  const maxPerCategory = 2
  const positiveNotes = [
    ...specPros.slice(0, maxPerCategory),
    ...benchmarkPros.slice(0, maxPerCategory),
  ]
  const negativeNotes = [
    ...specCons.slice(0, maxPerCategory),
    ...benchmarkCons.slice(0, maxPerCategory),
  ]

  // If not enough statements for a valid review, add fallback spec-based statements
  const minRequiredStatements = 2
  const totalStatements = positiveNotes.length + negativeNotes.length
  if (totalStatements < minRequiredStatements) {
    const fallbackStatements = generateFallbackStatements(gpu)
    const needed = minRequiredStatements - totalStatements
    positiveNotes.push(...fallbackStatements.slice(0, needed))
  }

  return { positiveNotes, negativeNotes }
}

/**
 * Builds JSON-LD structured data for the GPU product page.
 * Uses Schema.org Product schema to help search engines understand the page content.
 */
function buildStructuredData(
  gpu: Gpu,
  priceStats: GpuPriceStats,
  prosCons: ProsCons,
): object {
  const structuredData: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${gpu.label} ${gpu.memoryCapacityGB}GB`,
    description: gpu.summary,
    brand: {
      "@type": "Brand",
      name: extractBrandName(gpu.label),
    },
    category: "Graphics Card",
  }

  // Add release date if available
  if (gpu.releaseDate) {
    structuredData.releaseDate = gpu.releaseDate
  }

  // Add image if available from listings (for rich results display)
  if (priceStats.representativeImageUrl) {
    // Convert relative proxy URL to absolute URL via gpupoet.com
    const absoluteImageUrl = priceStats.representativeImageUrl.startsWith("/")
      ? `https://gpupoet.com${priceStats.representativeImageUrl}`
      : priceStats.representativeImageUrl
    structuredData.image = [absoluteImageUrl]
  }

  // Add manufacturer identifiers as SKU, MPN, and additionalProperty
  if (gpu.manufacturerIdentifiers && gpu.manufacturerIdentifiers.length > 0) {
    const firstId = gpu.manufacturerIdentifiers[0]
    structuredData.sku = firstId.value
    structuredData.mpn = firstId.value

    structuredData.additionalProperty = gpu.manufacturerIdentifiers.map(
      (id) => ({
        "@type": "PropertyValue",
        name: formatIdentifierTypeForSchema(id.type),
        value: id.value,
      }),
    )
  }

  // Add AggregateOffer with pricing data
  const priceDecimalPlaces = 2
  if (priceStats.activeListingCount > 0 && priceStats.minPrice > 0) {
    structuredData.offers = {
      "@type": "AggregateOffer",
      // highPrice is back deliberately: it renders a range topped by our
      // priciest listing, accepted to clear the Search Console Product
      // snippets warning. Scott reversed e3c8dbb on 2026-09-20; see #68.
      lowPrice: priceStats.minPrice.toFixed(priceDecimalPlaces),
      highPrice: priceStats.maxPrice.toFixed(priceDecimalPlaces),
      priceCurrency: "USD",
      offerCount: Math.floor(priceStats.activeListingCount),
      availability: "https://schema.org/InStock",
      url: `https://gpupoet.com/gpu/shop/${gpu.name}`,
    }
  }

  // Add editorial review with pros/cons
  const totalStatements =
    prosCons.positiveNotes.length + prosCons.negativeNotes.length
  const minStatements = 2
  if (totalStatements >= minStatements) {
    const review: Record<string, unknown> = {
      "@type": "Review",
      author: {
        "@type": "Person",
        name: "Scott Willeke",
      },
      reviewBody: gpu.summary,
    }

    if (prosCons.positiveNotes.length > 0) {
      review.positiveNotes = {
        "@type": "ItemList",
        itemListElement: prosCons.positiveNotes.map((note, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: note,
        })),
      }
    }

    if (prosCons.negativeNotes.length > 0) {
      review.negativeNotes = {
        "@type": "ItemList",
        itemListElement: prosCons.negativeNotes.map((note, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: note,
        })),
      }
    }

    structuredData.review = review
  }

  // Add third-party products as related products
  if (gpu.thirdPartyProducts && gpu.thirdPartyProducts.length > 0) {
    structuredData.isRelatedTo = gpu.thirdPartyProducts.map((product) => ({
      "@type": "Product",
      name: product.productName,
      sku: product.identifier,
      manufacturer: {
        "@type": "Organization",
        name: product.company,
      },
    }))
  }

  return structuredData
}

type GpuParams = {
  params: Promise<{ gpuSlug: string }>
}

export async function generateMetadata(props: GpuParams) {
  const params = await props.params
  const { gpuSlug } = params
  log.debug({ gpuSlug }, "generateStaticMetadata for gpu")
  const gpu = await findGpu(gpuSlug)
  if (!gpu) {
    notFound()
  }

  const title = `${gpu.label} ${gpu.memoryCapacityGB}GB Specs, Benchmarks & Pricing`
  const description = `${gpu.label} specifications, gaming benchmarks, and price comparisons. Find the best deals on this GPU.`
  const url = `https://gpupoet.com/gpu/learn/card/${gpuSlug}`

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
          alt: `${gpu.label} GPU specs and benchmarks`,
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

export default async function Page(props: GpuParams) {
  const params = await props.params
  const { gpuSlug } = params
  const gpu = await findGpu(gpuSlug)
  if (!gpu) {
    notFound()
  }
  const mapPercentages = new Map<GpuSpecKey, number>()

  for (const key of GpuSpecKeys) {
    mapPercentages.set(key, await gpuSpecAsPercent(gpu.name, key))
  }
  const gpuSpecPercentages = Object.fromEntries(mapPercentages) as Record<
    GpuSpecKey,
    number
  >

  // Fetch gaming benchmark data
  const allMetrics = await getAllMetricDefinitions()
  const gamingMetrics = allMetrics.filter((m) => m.category === "gaming")

  const benchmarkData: BenchmarkPercentile[] = await Promise.all(
    gamingMetrics.map(async (metric) => {
      const [percentileMap, valueMap] = await Promise.all([
        calculateAllGpuPercentilesForMetric(metric.slug),
        getMetricValuesBySlug(metric.slug),
      ])
      return {
        slug: metric.slug,
        name: metric.name,
        unit: metric.unitShortest,
        value: valueMap.get(gpu.name),
        percentile: percentileMap.get(gpu.name),
        collectedSamples: metric.collectedSamples,
      }
    }),
  )

  // Filter to only benchmarks that have data for this GPU
  const gpuBenchmarkPercentiles = benchmarkData.filter(
    (b) => b.value !== undefined && b.percentile !== undefined,
  )

  const listings = await getPriceStats(gpu.name)
  const prosCons = generateProsCons(
    gpu,
    gpuSpecPercentages,
    gpuBenchmarkPercentiles,
  )
  const structuredData = buildStructuredData(gpu, listings, prosCons)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <GpuInfo
        gpu={gpu}
        minimumPrice={listings.minPrice}
        activeListingCount={listings.activeListingCount}
        gpuSpecPercentages={gpuSpecPercentages}
        gpuBenchmarkPercentiles={gpuBenchmarkPercentiles}
        prosCons={prosCons}
      >
        {/* Price History Chart - rendered before References */}
        <section className="mt-5">
          <h2 className="h4 mb-3">Price History</h2>
          <GpuPriceHistoryChart gpuName={gpu.name} gpuLabel={gpu.label} />
        </section>
      </GpuInfo>
    </>
  )
}
