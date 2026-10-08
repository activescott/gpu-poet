import { createLogger } from "@/lib/logger"
import { Gpu, Listing } from "../isomorphic/model"

const log = createLogger("shop:listingFilters")

type LogFn = (msg: string, ...args: unknown[]) => void

/**
 * eBay-specific filter: validates affiliate link, buying options, and variation bundles.
 * Passes through for non-eBay listings.
 */
function allListingFilters(item: Listing, logFn: LogFn): boolean {
  if (item.source && item.source !== "ebay") return true
  if (typeof item.itemAffiliateWebUrl !== "string") {
    logFn(
      "item %s rejected by allListingFilters: no affiliate link",
      item.itemId,
    )
    return false
  }
  if (!item.buyingOptions.includes("FIXED_PRICE")) {
    logFn("item %s rejected by allListingFilters: not fixed price", item.itemId)
    return false
  }
  if (item.itemGroupType === "SELLER_DEFINED_VARIATIONS") {
    // some of them shove a bunch of different types of GPUs into one listing, but the listing returns the lowest price so it makes the item appear artificially cheap
    logFn(
      "item %s rejected by allListingFilters: SELLER_DEFINED_VARIATIONS",
      item.itemId,
    )
    return false
  }
  return true
}

/**
 * Filters out listings in non-working condition.
 * eBay: uses conditionId "7000" (for parts/not working).
 * Amazon: if condition is null, assume "New" (keep). If condition contains "for parts", exclude.
 */
function conditionFilter(item: Listing, logFn: LogFn): boolean {
  if (item.source === "amazon") {
    if (!item.condition) return true
    if (item.condition.toLowerCase().includes("for parts")) {
      logFn(
        "item %s rejected by conditionFilter: condition contains 'for parts'",
        item.itemId,
      )
      return false
    }
    return true
  }
  const FOR_PARTS_NOT_WORKING = "7000"
  if (item.conditionId === FOR_PARTS_NOT_WORKING) {
    logFn(
      "item %s rejected by conditionFilter: FOR_PARTS_NOT_WORKING",
      item.itemId,
    )
    return false
  }
  return true
}

type Predicate = (item: Listing) => boolean

/**
 * Creates a filter for filtering listings for the specified GPU.
 * @param logFn - Controls the log level for filter rejection messages. Pass log.info for visibility (e.g., Amazon) or log.debug for quiet (e.g., eBay).
 */
export function createFilterForGpu(
  gpu: Gpu,
  logFn: LogFn = log.debug.bind(log),
): Predicate {
  const requiredKeywordsFilter = createRequiredLabelFilter(gpu, logFn)

  return composePredicates(
    (item) => sellerFeedbackFilter(item, logFn),
    (item) => allListingFilters(item, logFn),
    (item) => conditionFilter(item, logFn),
    requiredKeywordsFilter,
    createRequireMemoryKeywordFilter(gpu, logFn),
    (item) => gpuAccessoryFilter(item, logFn),
  )
}

function createRequireMemoryKeywordFilter(gpu: Gpu, logFn: LogFn) {
  // Match memory capacity as a word boundary to avoid false positives like "x16 GPU" matching "16 g"
  const memoryPattern = new RegExp(`\\b${gpu.memoryCapacityGB}\\s?gb?\\b`, "i")
  return (item: Listing): boolean => {
    if (memoryPattern.test(item.title)) return true
    logFn(
      "item %s rejected by memoryKeywordFilter: title missing '%sGB'. Title: %s",
      item.itemId,
      gpu.memoryCapacityGB,
      item.title,
    )
    return false
  }
}

function createRequiredLabelFilter(gpu: Gpu, logFn: LogFn) {
  // Use word-boundary regex to avoid false positives like "T4" matching inside part numbers (e.g. "VCGGTX980T4XPB-CG")
  const keywordPatterns = gpu.label
    .split(" ")
    .map((word) => new RegExp(`\\b${escapeRegExp(word)}\\b`, "i"))
  return (item: Listing): boolean => {
    const title = item.title
    const matches = keywordPatterns.every((pattern) => pattern.test(title))
    if (!matches) {
      const missingKeywords = gpu.label
        .split(" ")
        .filter(
          (word) => !new RegExp(`\\b${escapeRegExp(word)}\\b`, "i").test(title),
        )
      logFn(
        "item %s rejected by requiredLabelFilter: missing keywords %o. Title: %s",
        item.itemId,
        missingKeywords,
        item.title,
      )
    }
    return matches
  }
}

function escapeRegExp(str: string): string {
  return str.replaceAll(/[$()*+.?[\\\]^{|}]/g, "\\$&")
}

const nonGpuKeywords = [
  "bracket",
  "fan attachment",
  "fan adapter",
  "shroud",
  "blower fan",
  "NO GPU",
  "fan kit",
  "fan for",
  "kit for",
  // Filtering out SXM sockets because people usually are going to want PCIe
  "SXM",
  // surprisingly, many people misspell SXM as SMX in listing titles:
  "SMX",
  // I've seen some cards in china that read "neutered 4GB" apparently indicating that the card has been modified to have less memory than it originally had:
  "neutered",
  // e.g. "For Nvidia Tesla P4 8GB M4 4GB T4 16GB L4 24GB A2 GPU Card graphics Cooling fan"
  "Cooling fan",
  // e.g. "OEM Backplate For EVGA NVIDIA GeForce RTX 3060 XC 12GB Gaming Card" - $4.99 accessory
  "Backplate For",
  // Sellers sometimes list non-working cards with normal conditionId but flag "PARTS ONLY" / "for parts" in the title
  "parts only",
  "for parts",
].map((word) => word.toLowerCase())

// Keywords that always mean the listing is just the empty box/cooler block, no card included.
const boxOnlyKeywords = [
  // e.g. "PowerColor Fighter AMD Radeon RX 7800 XT 16GB GDDR6 Box Only" which only includes the box but has all other specs
  "box only",
  // e.g. "Original GIGABYTE Empty box package for AMD radeon RX 7800 XT 16GB"
  "empty box",
  // e.g. "MSI NVIDIA GeForce RTX 4090 SUPRIM 24GB GDDR6X Liquid Cooler Block Only"
  "block only",
  "card only",
]

// Sellers often skip "only" altogether and just end the title with "box", usually preceded by a color
// or generic descriptor (e.g. "...RTX 5060 Ti 16GB...White BOX", gpu-poet#91). Real listings that mention
// a box in passing instead use an inclusion preposition ("in", "with", "w/") and/or a packaging-condition
// descriptor ("retail", "original", "factory sealed", "open") before it, so a title that *ends* with a
// bare "box" and doesn't match one of those legitimate shapes is box-only.
const packagingDescriptor =
  "(?:factory\\s+sealed|retail|original|sealed|unopened|oem)"
const legitBoxMentionPattern = new RegExp(
  `\\b(?:in|with|w\\/?)\\s*(?:the\\s+)?(?:${packagingDescriptor}\\s+)?box\\b` +
    `|\\b${packagingDescriptor}\\s+box\\b` +
    `|\\bopen[\\s-]?box\\b`,
  "i",
)
const trailingBoxPattern = /\bbox\b\s*[!"'*.-]*$/i

export function isBoxOnlyTitle(title: string): boolean {
  const lower = title.toLowerCase()
  if (boxOnlyKeywords.some((keyword) => lower.includes(keyword))) {
    return true
  }
  return trailingBoxPattern.test(lower) && !legitBoxMentionPattern.test(lower)
}

function gpuAccessoryFilter(item: Listing, logFn: LogFn): boolean {
  if (isBoxOnlyTitle(item.title)) {
    logFn(
      "item %s rejected by gpuAccessoryFilter: box-only title. Title: %s",
      item.itemId,
      item.title,
    )
    return false
  }
  const matched = nonGpuKeywords.find((keyword) =>
    item.title.toLowerCase().includes(keyword),
  )
  if (matched) {
    logFn(
      "item %s rejected by gpuAccessoryFilter: matched keyword '%s'. Title: %s",
      item.itemId,
      matched,
      item.title,
    )
    return false
  }
  return true
}

/**
 * eBay-specific filter: requires seller feedback >= 90%.
 * Passes through for non-eBay listings (Amazon search results don't include seller info).
 */
export function sellerFeedbackFilter(
  item: Pick<
    Listing,
    "sellerFeedbackPercentage" | "itemAffiliateWebUrl" | "source" | "itemId"
  >,
  logFn: LogFn = log.debug.bind(log),
): boolean {
  if (item.source && item.source !== "ebay") return true
  // filter out sellers with <90% feedback
  const MINIMUM_FEEDBACK_PERCENTAGE = 90
  if (
    item.sellerFeedbackPercentage &&
    Number.parseInt(item.sellerFeedbackPercentage) >=
      MINIMUM_FEEDBACK_PERCENTAGE
  ) {
    return true
  }
  logFn(
    "item %s rejected by sellerFeedbackFilter: feedback %s%%",
    item.itemId,
    item.sellerFeedbackPercentage,
  )
  return false
}

function composePredicates(...predicates: Predicate[]): Predicate {
  return (item: Listing) => {
    return predicates.every((predicate) => predicate(item))
  }
}
