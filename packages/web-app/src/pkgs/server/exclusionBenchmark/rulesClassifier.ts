import { Gpu, Listing } from "../../isomorphic/model"
import { createFilterForGpu } from "../listingFilters"
import { BenchmarkGpu, BenchmarkListing } from "./dataset"
import { Classifier, Verdict } from "./score"

/**
 * The deterministic filters in listingFilters.ts, the same ones ingest and the
 * cleanup job apply.
 */
export function createRulesClassifier(gpus: BenchmarkGpu[]): Classifier {
  const gpuByName = new Map(gpus.map((g) => [g.name, g]))
  return {
    name: "rules",
    async classify(listings: BenchmarkListing[]): Promise<Verdict[]> {
      return listings.map((listing) => {
        const gpu = gpuByName.get(listing.gpuName)
        if (!gpu) throw new Error(`no gpu ${listing.gpuName} in dataset`)
        let reason: string | undefined
        // The filters log one "rejected by <filter>" line for the rule that failed.
        const filter = createFilterForGpu(gpu as Gpu, (msg: string) => {
          reason ??= /rejected by (\w+)/.exec(msg)?.[1] ?? msg
        })
        return { exclude: !filter(toListing(listing, gpu)), reason }
      })
    },
  }
}

function toListing(listing: BenchmarkListing, gpu: BenchmarkGpu): Listing {
  // HACK cast: the filters read only the fields copied here
  return {
    itemId: listing.itemId,
    source: listing.source,
    title: listing.title,
    priceValue: listing.priceValue,
    buyingOptions: listing.buyingOptions,
    condition: listing.condition,
    conditionId: listing.conditionId,
    itemGroupType: listing.itemGroupType,
    sellerFeedbackPercentage: listing.sellerFeedbackPercentage,
    itemAffiliateWebUrl: listing.hasAffiliateUrl
      ? "https://example.com"
      : undefined,
    gpu,
  } as unknown as Listing
}
