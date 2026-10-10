import { BenchmarkListing, loadDataset, loadLabelReview } from "./dataset"
import { createRulesClassifier } from "./rulesClassifier"
import { score } from "./score"

function listing(
  itemId: string,
  label: BenchmarkListing["label"],
  excludeReason: string | null = null,
): BenchmarkListing {
  return {
    itemId,
    source: "ebay",
    gpuName: "amd-radeon-rx-7800-xt",
    title: "AMD Radeon RX 7800 XT 16GB",
    priceValue: "500",
    buyingOptions: ["FIXED_PRICE"],
    condition: null,
    conditionId: null,
    itemGroupType: null,
    sellerFeedbackPercentage: "100",
    hasAffiliateUrl: true,
    label,
    excludeReason,
  }
}

it("counts false rejects and misses against the labels", () => {
  const listings = [
    listing("tp", "exclude", "box_only"),
    listing("fn", "exclude", "SCAM"),
    listing("fp", "keep"),
    listing("tn1", "keep"),
    listing("tn2", "keep"),
  ]
  const result = score(
    listings,
    [
      { exclude: true },
      { exclude: false },
      { exclude: true },
      { exclude: false },
      { exclude: false },
    ],
    [{ itemId: "tn1", suspectedLabel: "exclude", note: "looks like a box" }],
  )

  expect(result).toMatchObject({
    total: 5,
    positives: 2,
    negatives: 3,
    truePositives: 1,
    falsePositives: 1,
    falseNegatives: 1,
    trueNegatives: 2,
    precision: 0.5,
    recall: 0.5,
    byReason: {
      box_only: { positives: 1, caught: 1 },
      scam: { positives: 1, caught: 0 },
    },
  })
  expect(result.falseRejects.map((s) => s.listing.itemId)).toEqual(["fp"])
  expect(result.misses.map((s) => s.listing.itemId)).toEqual(["fn"])
  expect(result.suspectedLabelErrors.map((s) => s.listing.itemId)).toEqual([
    "tn1",
  ])
})

it("rejects a verdict list that does not line up with the listings", () => {
  expect(() => score([listing("a", "keep")], [])).toThrow()
})

it("loads the fixture and scores it with the rules", async () => {
  const dataset = await loadDataset()
  const reviews = await loadLabelReview()
  const listingIds = new Set(dataset.listings.map((l) => l.itemId))
  expect(reviews.filter((r) => !listingIds.has(r.itemId))).toEqual([])

  const verdicts = await createRulesClassifier(dataset.gpus).classify(
    dataset.listings,
  )
  const result = score(dataset.listings, verdicts, reviews)
  expect(result.total).toBe(dataset.listings.length)
  expect(result.suspectedLabelErrors).toHaveLength(reviews.length)
})
