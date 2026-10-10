import { readFile } from "node:fs/promises"
import path from "node:path"

type BenchmarkLabel = "exclude" | "keep"

export interface BenchmarkGpu {
  name: string
  label: string
  memoryCapacityGB: number
}

/**
 * A listing as it was stored in production, reduced to the fields the
 * exclusion code reads plus price for review. Seller names and URLs are left
 * out.
 */
export interface BenchmarkListing {
  itemId: string
  source: "ebay" | "amazon"
  gpuName: string
  title: string
  priceValue: string
  buyingOptions: string[]
  condition: string | null
  conditionId: string | null
  itemGroupType: string | null
  sellerFeedbackPercentage: string
  hasAffiliateUrl: boolean
  label: BenchmarkLabel
  // Set on positives: why the listing was excluded in production.
  excludeReason: string | null
}

export interface BenchmarkDataset {
  exportedAt: string
  gpus: BenchmarkGpu[]
  listings: BenchmarkListing[]
}

/**
 * A suspected label error found by review. The label in the dataset is left as
 * production recorded it; the scorer reports these separately so a reviewer
 * can decide.
 */
export interface LabelReview {
  itemId: string
  suspectedLabel: BenchmarkLabel
  note: string
}

// Relative to packages/web-app, where jest and the scripts run.
const DATASET_DIR = path.join(
  process.cwd(),
  "src/pkgs/server/exclusionBenchmark",
)
// One listing per line, so a re-export diffs line by line.
export const LISTINGS_PATH = path.join(DATASET_DIR, "listings.jsonl")
export const GPUS_PATH = path.join(DATASET_DIR, "gpus.json")
const LABEL_REVIEW_PATH = path.join(DATASET_DIR, "labelReview.json")

export async function loadDataset(): Promise<BenchmarkDataset> {
  const { exportedAt, gpus } = JSON.parse(
    await readFile(GPUS_PATH, "utf8"),
  ) as Omit<BenchmarkDataset, "listings">
  const lines = await readFile(LISTINGS_PATH, "utf8")
  const listings = lines
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as BenchmarkListing)
  return { exportedAt, gpus, listings }
}

export async function loadLabelReview(): Promise<LabelReview[]> {
  return JSON.parse(await readFile(LABEL_REVIEW_PATH, "utf8")) as LabelReview[]
}
