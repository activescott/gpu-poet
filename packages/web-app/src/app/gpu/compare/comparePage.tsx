import { GpuSpecKey, GpuSpecKeys } from "@/pkgs/isomorphic/model/specs"
import { Gpu, extractBrandName } from "@/pkgs/isomorphic/model"
import {
  findGpu,
  gpuSpecAsPercent,
  getAllMetricDefinitions,
  calculateAllGpuPercentilesForMetric,
  getMetricValuesBySlug,
  listGpus,
} from "@/pkgs/server/db/GpuRepository"
import {
  getPriceStats,
  GpuPriceStats,
} from "@/pkgs/server/db/ListingRepository"
import { notFound, redirect } from "next/navigation"
import { GpuComparisonView } from "@/pkgs/client/components/GpuComparisonView"

/**
 * Canonical comparison URL: slugs de-duplicated and in alphabetical order, so
 * every permutation of the same GPUs maps to one URL.
 */
function canonicalSlugs(slugs: string[]): string[] {
  return [...new Set(slugs)].sort()
}

const compareUrl = (slugs: string[]) => `/gpu/compare/${slugs.join("/vs/")}`

const COUNT_WORDS: Record<number, string> = { 2: "two", 3: "three" }

/**
 * Builds JSON-LD structured data for the comparison page.
 */
const PRICE_DECIMALS = 2

function buildProductEntity(gpu: Gpu, priceStats: GpuPriceStats): object {
  const product: Record<string, unknown> = {
    "@type": "Product",
    name: `${gpu.label} ${gpu.memoryCapacityGB}GB`,
    description: gpu.summary,
    brand: {
      "@type": "Brand",
      name: extractBrandName(gpu.label),
    },
    category: "Graphics Card",
  }

  if (priceStats.activeListingCount > 0 && priceStats.minPrice > 0) {
    product.offers = {
      "@type": "AggregateOffer",
      // highPrice is back deliberately, accepted to clear the Search Console
      // Product snippets warning. Scott reversed e3c8dbb on 2026-09-20; see #68.
      lowPrice: priceStats.minPrice.toFixed(PRICE_DECIMALS),
      highPrice: priceStats.maxPrice.toFixed(PRICE_DECIMALS),
      priceCurrency: "USD",
      offerCount: Math.floor(priceStats.activeListingCount),
      availability: "https://schema.org/InStock",
      url: `https://gpupoet.com/gpu/shop/${gpu.name}`,
    }
  }

  return product
}

function buildStructuredData(gpus: Gpu[], priceStats: GpuPriceStats[]): object {
  const labels = gpus.map((g) => g.label)
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${labels.join(" vs ")} - GPU Comparison`,
    description: `Compare ${listFormat.format(labels)} specifications, benchmarks, and prices.`,
    mainEntity: gpus.map((g, i) => buildProductEntity(g, priceStats[i])),
  }
}

const listFormat = new Intl.ListFormat("en", { type: "conjunction" })

export async function compareMetadata(slugs: string[]) {
  const canonical = canonicalSlugs(slugs)
  const gpus = await Promise.all(slugs.map((s) => findGpu(s)))
  if (gpus.some((g) => !g)) {
    return {
      title: "GPU Comparison | GPU Poet",
      description: `Compare ${COUNT_WORDS[slugs.length]} GPUs side-by-side.`,
    }
  }
  const labels = (gpus as Gpu[]).map((g) => g.label)

  return {
    title: `${labels.join(" vs ")} - GPU Comparison | GPU Poet`,
    description: `Compare ${listFormat.format(labels)} specs, gaming benchmarks, and prices. Find out which GPU is better for gaming and AI/ML workloads.`,
    alternates: {
      canonical: `https://gpupoet.com${compareUrl(canonical.length === slugs.length ? slugs : canonical)}`,
    },
  }
}

async function fetchGpuData(gpuSlug: string) {
  const gpu = await findGpu(gpuSlug)
  if (!gpu) {
    notFound()
  }

  // Fetch spec percentiles
  const specPercentileEntries = await Promise.all(
    GpuSpecKeys.map(async (key) => {
      const percentile = await gpuSpecAsPercent(gpu.name, key)
      return [key, percentile] as [GpuSpecKey, number]
    }),
  )
  const gpuSpecPercentages = Object.fromEntries(
    specPercentileEntries,
  ) as Record<GpuSpecKey, number>

  // Fetch price stats
  const priceStats = await getPriceStats(gpu.name)

  return { gpu, gpuSpecPercentages, priceStats }
}

async function fetchBenchmarkData(gpuNames: string[]) {
  const allMetrics = await getAllMetricDefinitions()
  const gamingMetrics = allMetrics.filter((m) => m.category === "gaming")

  return Promise.all(
    gamingMetrics.map(async (metric) => {
      const [percentileMap, valueMap] = await Promise.all([
        calculateAllGpuPercentilesForMetric(metric.slug),
        getMetricValuesBySlug(metric.slug),
      ])
      return {
        slug: metric.slug,
        name: metric.name,
        unit: metric.unitShortest,
        values: gpuNames.map((n) => valueMap.get(n)),
        percentiles: gpuNames.map((n) => percentileMap.get(n)),
      }
    }),
  )
}

export async function renderComparePage(slugs: string[]) {
  // Redirect to the canonical URL if not alphabetical or containing repeats
  const canonical = canonicalSlugs(slugs)
  if (canonical.length === 1) {
    redirect(`/gpu/learn/card/${canonical[0]}`)
  }
  if (canonical.some((s, i) => s !== slugs[i])) {
    redirect(compareUrl(canonical))
  }

  const gpuData = await Promise.all(slugs.map((s) => fetchGpuData(s)))
  const benchmarkData = await fetchBenchmarkData(gpuData.map((d) => d.gpu.name))

  // Fetch all GPU options for selectors
  const allGpus = await listGpus()
  const gpuOptions = allGpus.map((g) => ({ name: g.name, label: g.label }))

  const structuredData = buildStructuredData(
    gpuData.map((d) => d.gpu),
    gpuData.map((d) => d.priceStats),
  )

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <GpuComparisonView
        gpus={gpuData.map((d) => ({
          gpu: d.gpu,
          specPercentages: d.gpuSpecPercentages,
          priceStats: d.priceStats,
        }))}
        benchmarkData={benchmarkData}
        gpuOptions={gpuOptions}
      />
    </>
  )
}
