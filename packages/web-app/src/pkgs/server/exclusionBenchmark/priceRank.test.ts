import { BenchmarkListing } from "./dataset"
import { rankPositivesByPrice, summarizePriceRanks } from "./priceRank"

function listing(
  itemId: string,
  label: BenchmarkListing["label"],
  priceValue: string,
  gpuName = "amd-radeon-rx-7800-xt",
): BenchmarkListing {
  return {
    itemId,
    source: "ebay",
    gpuName,
    title: "AMD Radeon RX 7800 XT 16GB",
    priceValue,
    buyingOptions: ["FIXED_PRICE"],
    condition: null,
    conditionId: null,
    itemGroupType: null,
    sellerFeedbackPercentage: "100",
    hasAffiliateUrl: true,
    label,
    excludeReason: label === "exclude" ? "box_only" : null,
  }
}

it("ranks positives against the live listings of their GPU", () => {
  const ranks = rankPositivesByPrice([
    listing("live1", "keep", "400.00"),
    listing("live2", "keep", "500.00"),
    listing("live3", "keep", "600.00"),
    listing("live4", "keep", "700.00"),
    listing("other", "keep", "50.00", "nvidia-geforce-rtx-5090"),
    listing("cheap", "exclude", "40.00"),
    listing("mid", "exclude", "550.00"),
    listing("orphan", "exclude", "10.00", "amd-radeon-pro-w7500"),
  ])

  expect(
    ranks.map(({ listing, rank, liveCount, medianPrice, ratioToMedian }) => ({
      itemId: listing.itemId,
      rank,
      liveCount,
      medianPrice,
      ratioToMedian,
    })),
  ).toEqual([
    {
      itemId: "cheap",
      rank: 1,
      liveCount: 4,
      medianPrice: 550,
      ratioToMedian: 40 / 550,
    },
    {
      itemId: "mid",
      rank: 3,
      liveCount: 4,
      medianPrice: 550,
      ratioToMedian: 1,
    },
    {
      itemId: "orphan",
      rank: null,
      liveCount: 0,
      medianPrice: null,
      ratioToMedian: null,
    },
  ])
  expect(summarizePriceRanks(ranks, 2, 0.5)).toEqual({
    positives: 3,
    ranked: 2,
    inTop: 1,
    underMedianFraction: 1,
  })
})
