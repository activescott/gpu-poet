import { BenchmarkListing } from "./dataset"

export interface PriceRank {
  listing: BenchmarkListing
  // 1 is the cheapest: one more than the number of live listings in the same
  // GPU category priced below this one. Null when the category has no live
  // listings.
  rank: number | null
  liveCount: number
  medianPrice: number | null
  // price / medianPrice
  ratioToMedian: number | null
}

interface PriceRankSummary {
  positives: number
  // Positives whose category has at least one live listing to rank against.
  ranked: number
  inTop: number
  underMedianFraction: number
}

const HALF = 2

function median(sorted: number[]): number | null {
  if (sorted.length === 0) return null
  const mid = Math.floor(sorted.length / HALF)
  return sorted.length % HALF
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / HALF
}

/**
 * Where each positive's price falls among the live listings (negatives) of its
 * GPU, as if it were live alongside them now. The fixture has no prices from
 * the time of exclusion, so today's live listings stand in for the market.
 */
export function rankPositivesByPrice(
  listings: BenchmarkListing[],
): PriceRank[] {
  const livePrices = new Map<string, number[]>()
  for (const l of listings) {
    if (l.label !== "keep") continue
    const prices = livePrices.get(l.gpuName) ?? []
    prices.push(Number(l.priceValue))
    livePrices.set(l.gpuName, prices)
  }
  for (const prices of livePrices.values()) prices.sort((a, b) => a - b)

  return listings
    .filter((l) => l.label === "exclude")
    .map((listing) => {
      const prices = livePrices.get(listing.gpuName) ?? []
      const price = Number(listing.priceValue)
      const medianPrice = median(prices)
      return {
        listing,
        rank:
          prices.length > 0 ? prices.filter((p) => p < price).length + 1 : null,
        liveCount: prices.length,
        medianPrice,
        ratioToMedian: medianPrice ? price / medianPrice : null,
      }
    })
}

export function summarizePriceRanks(
  ranks: PriceRank[],
  topN: number,
  medianFraction: number,
): PriceRankSummary {
  return {
    positives: ranks.length,
    ranked: ranks.filter((r) => r.rank !== null).length,
    inTop: ranks.filter((r) => r.rank !== null && r.rank <= topN).length,
    underMedianFraction: ranks.filter(
      (r) => r.ratioToMedian !== null && r.ratioToMedian < medianFraction,
    ).length,
  }
}
