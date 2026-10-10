import { BenchmarkListing, LabelReview } from "./dataset"

export interface Verdict {
  exclude: boolean
  // Which rule (or model) made the call, for the report.
  reason?: string
}

/**
 * Anything that decides whether listings should be excluded. Takes the whole
 * set at once so a model-backed classifier can batch its calls.
 */
export interface Classifier {
  name: string
  classify(listings: BenchmarkListing[]): Promise<Verdict[]>
}

export interface ScoredListing {
  listing: BenchmarkListing
  verdict: Verdict
  review?: LabelReview
}

interface Counts {
  truePositives: number
  falsePositives: number
  falseNegatives: number
  trueNegatives: number
}

export interface Score extends Counts {
  total: number
  positives: number
  negatives: number
  precision: number
  recall: number
  // Predicted exclude, labeled keep: a real card dropped from the site.
  falseRejects: ScoredListing[]
  // Labeled exclude, predicted keep: a bad listing left on the site.
  misses: ScoredListing[]
  // Recall per production excludeReason.
  byReason: Record<string, { positives: number; caught: number }>
  // Every listing a reviewer suspects is mislabeled, with the verdict it got.
  suspectedLabelErrors: ScoredListing[]
}

export function score(
  listings: BenchmarkListing[],
  verdicts: Verdict[],
  reviews: LabelReview[] = [],
): Score {
  if (listings.length !== verdicts.length) {
    throw new Error(
      `got ${verdicts.length} verdicts for ${listings.length} listings`,
    )
  }
  const reviewByItemId = new Map(reviews.map((r) => [r.itemId, r]))
  const counts: Counts = {
    truePositives: 0,
    falsePositives: 0,
    falseNegatives: 0,
    trueNegatives: 0,
  }
  const falseRejects: ScoredListing[] = []
  const misses: ScoredListing[] = []
  const suspectedLabelErrors: ScoredListing[] = []
  const byReason: Score["byReason"] = {}

  for (const [i, listing] of listings.entries()) {
    const scored: ScoredListing = {
      listing,
      verdict: verdicts[i],
      review: reviewByItemId.get(listing.itemId),
    }
    const actual = listing.label === "exclude"
    const predicted = scored.verdict.exclude
    if (actual && predicted) counts.truePositives++
    if (!actual && predicted) {
      counts.falsePositives++
      falseRejects.push(scored)
    }
    if (actual && !predicted) {
      counts.falseNegatives++
      misses.push(scored)
    }
    if (!actual && !predicted) counts.trueNegatives++
    if (actual) {
      const reason = (listing.excludeReason ?? "unknown").toLowerCase()
      byReason[reason] ??= { positives: 0, caught: 0 }
      byReason[reason].positives++
      if (predicted) byReason[reason].caught++
    }
    if (scored.review) suspectedLabelErrors.push(scored)
  }

  const predictedPositives = counts.truePositives + counts.falsePositives
  const positives = counts.truePositives + counts.falseNegatives
  return {
    ...counts,
    total: listings.length,
    positives,
    negatives: listings.length - positives,
    precision: predictedPositives
      ? counts.truePositives / predictedPositives
      : 0,
    recall: positives ? counts.truePositives / positives : 0,
    falseRejects,
    misses,
    byReason,
    suspectedLabelErrors,
  }
}
