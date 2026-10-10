import {
  BenchmarkListing,
  loadDataset,
  loadLabelReview,
} from "../pkgs/server/exclusionBenchmark/dataset"
import { createRulesClassifier } from "../pkgs/server/exclusionBenchmark/rulesClassifier"
import {
  score,
  Score,
  ScoredListing,
} from "../pkgs/server/exclusionBenchmark/score"

// Scores the listing-exclusion rules against the fixture and prints a markdown
// report. Run from packages/web-app:
//   LOG_LEVEL=silent npx tsx src/scripts/exclusion-benchmark.ts

const PERCENT = 100
const pct = (n: number) => `${(n * PERCENT).toFixed(1)}%`
const cell = (s: string | null | undefined) => (s ?? "").replaceAll("|", "\\|")

function table(rows: ScoredListing[], withReview = false): string {
  if (rows.length === 0) return "None.\n"
  return [
    `| itemId | gpu | price | label | production reason | rules verdict | title |${withReview ? " review note |" : ""}`,
    `|---|---|---|---|---|---|---|${withReview ? "---|" : ""}`,
    ...rows.map(
      ({ listing, verdict, review }) =>
        `| ${cell(listing.itemId)} | ${listing.gpuName} | ${listing.priceValue} | ${listing.label} | ${cell(listing.excludeReason)} | ${verdict.exclude ? `exclude (${verdict.reason})` : "keep"} | ${cell(listing.title)} |${review ? ` ${cell(review.note)} |` : ""}`,
    ),
    "",
  ].join("\n")
}

function summary(result: Score): string {
  return `| | |
|---|---|
| precision | ${pct(result.precision)} (${result.truePositives} of ${result.truePositives + result.falsePositives} rejected listings are labeled exclude) |
| recall | ${pct(result.recall)} (${result.truePositives} of ${result.positives} listings labeled exclude are rejected) |
| true positives | ${result.truePositives} |
| false rejects | ${result.falsePositives} |
| misses | ${result.falseNegatives} |
| true negatives | ${result.trueNegatives} |
`
}

async function main() {
  const dataset = await loadDataset()
  const reviews = await loadLabelReview()
  const classifier = createRulesClassifier(dataset.gpus)
  const verdicts = await classifier.classify(dataset.listings)
  const result = score(dataset.listings, verdicts, reviews)

  // The same verdicts scored as if every suspected label error were confirmed.
  const suspectedLabel = new Map(
    reviews.map((r) => [r.itemId, r.suspectedLabel]),
  )
  const relabeled: BenchmarkListing[] = dataset.listings.map((l) => ({
    ...l,
    label: suspectedLabel.get(l.itemId) ?? l.label,
  }))
  const reviewed = score(relabeled, verdicts)

  console.log(`# Exclusion benchmark: ${classifier.name}

Dataset exported ${dataset.exportedAt}: ${result.positives} excluded listings (positives), ${result.negatives} live listings (negatives). ${reviews.length} listings are flagged as suspected label errors.

## Against production labels

${summary(result)}
## If every suspected label error is confirmed

${summary(reviewed)}
## Recall by production exclude reason

| reason | caught | of |
|---|---|---|
${Object.entries(result.byReason)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([reason, r]) => `| ${reason} | ${r.caught} | ${r.positives} |`)
  .join("\n")}

## False rejects (live listings the rules reject)

${table(result.falseRejects)}
## Misses (excluded listings the rules keep)

${table(result.misses)}
## Suspected label errors

Scored above with production's label; the review note says what the label probably should be.

${table(result.suspectedLabelErrors, true)}`)
}

/* eslint-disable unicorn/prefer-top-level-await -- tsx runs this file as CommonJS */
main().catch((error) => {
  console.error(error)
  /* eslint-disable unicorn/no-process-exit -- because this is a CLI script */
  process.exit(1)
})
