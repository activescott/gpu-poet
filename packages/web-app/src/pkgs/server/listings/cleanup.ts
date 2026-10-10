import { createLogger } from "@/lib/logger"
import {
  listActiveListingsGroupedByGpu,
  GpuWithListings,
  CachedListing,
} from "../db/ListingRepository"
import { secondsToMilliseconds } from "../../isomorphic/duration"
import { withTransaction, PrismaClientWithinTransaction } from "../db/db"
import {
  withRetry,
  shouldRetryPrismaTransaction,
} from "@/pkgs/isomorphic/retry"
import {
  createFilterForGpu,
  isBoxOnlyTitle,
  sellerFeedbackFilter,
} from "../listingFilters"
import { EXCLUDE_REASONS, ExcludeReason } from "@/pkgs/isomorphic/model"

const log = createLogger("shop:cleanup")

const MAX_WAIT_SECONDS = 10

export interface CleanupStats {
  gpusProcessed: number
  totalListingsProcessed: number
  archivedCount: number
  totalDuration: number
  timeoutMs: number
}

/**
 * Applies listing filters to all active listings and archives those that don't pass.
 *
 * This function re-evaluates existing active listings against the current filter criteria
 * (from listingFilters.ts). Any listing that doesn't pass the filters is archived.
 *
 * Use cases:
 * - When new filters are added, this cleans up existing listings that would now be filtered
 * - Periodic cleanup to catch any listings that slipped through previous filtering
 *
 * @param timeoutMs A timeout that the function will attempt to honor. Best-effort timeout.
 */
export async function cleanupInvalidListings(
  timeoutMs: number,
): Promise<CleanupStats> {
  const start = new Date()
  log.info("starting cleanup of invalid listings...")

  const statsFinal = await withRetry(
    () =>
      withTransaction(
        async (prisma): Promise<CleanupStats> => {
          let archivedCount = 0
          let totalListingsProcessed = 0

          const gpusWithListings = await listActiveListingsGroupedByGpu(
            false,
            prisma,
          )

          log.info(
            `Processing ${gpusWithListings.length} GPUs for cleanup check`,
          )

          for (const gpuWithListings of gpusWithListings) {
            const result = await processGpuListings(gpuWithListings, prisma)
            archivedCount += result.archivedCount
            totalListingsProcessed += result.processedCount
          }

          return {
            gpusProcessed: gpusWithListings.length,
            totalListingsProcessed,
            archivedCount,
            totalDuration: Date.now() - start.getTime(),
            timeoutMs,
          }
        },
        {
          timeout: secondsToMilliseconds(timeoutMs),
          maxWait: secondsToMilliseconds(MAX_WAIT_SECONDS),
          isolationLevel: "RepeatableRead",
        },
      ),
    shouldRetryPrismaTransaction,
  )

  statsFinal.totalDuration = Date.now() - start.getTime()
  log.info(`Cleanup complete. Stats: %o`, statsFinal)

  return statsFinal
}

async function processGpuListings(
  gpuWithListings: GpuWithListings,
  prisma: PrismaClientWithinTransaction,
): Promise<{ archivedCount: number; processedCount: number }> {
  const { listings, gpuName } = gpuWithListings

  if (listings.length === 0) {
    return { archivedCount: 0, processedCount: 0 }
  }

  // Get the GPU object from the first listing to create the filter
  // All listings in this group have the same GPU
  const gpu = listings[0].gpu
  const filter = createFilterForGpu(gpu)

  let archivedCount = 0

  for (const listing of listings) {
    // Check if listing passes current filters
    if (!filter(listing)) {
      const excludeReason = detectExcludeReason(listing)
      log.warn(
        `Excluding invalid listing: ${listing.itemId} - "${listing.title}" (GPU: ${gpuName}, reason: ${excludeReason})`,
      )

      // Use updateMany with itemId + archived=false to find the unique active listing
      // (itemId is unique among active listings, but not globally due to versioning)
      await prisma.listing.updateMany({
        where: {
          itemId: listing.itemId,
          archived: false,
        },
        data: {
          exclude: true,
          excludeReason,
        },
      })
      archivedCount++
    }
  }

  if (archivedCount > 0) {
    log.warn(`Excluded ${archivedCount} invalid listings for ${gpuName}`)
  }

  return { archivedCount, processedCount: listings.length }
}

/**
 * Detects the reason why a listing should be excluded based on which filter it fails.
 * Used to set the excludeReason field for ML training purposes.
 */
function detectExcludeReason(listing: CachedListing): ExcludeReason {
  const titleLower = listing.title.toLowerCase()

  // Check for seller feedback issues first (most specific)
  if (!sellerFeedbackFilter(listing)) {
    return EXCLUDE_REASONS.LOW_FEEDBACK
  }

  // Check for SELLER_DEFINED_VARIATIONS
  if (listing.itemGroupType === "SELLER_DEFINED_VARIATIONS") {
    return EXCLUDE_REASONS.VARIATION_BUNDLE
  }

  // Check for "For parts/not working" condition
  const FOR_PARTS_NOT_WORKING = "7000"
  if (listing.conditionId === FOR_PARTS_NOT_WORKING) {
    return EXCLUDE_REASONS.FOR_PARTS
  }

  // Title-based "for parts" / "parts only" — sellers bypass conditionId but flag it in the title
  const forPartsTitleKeywords = ["parts only", "for parts"]
  if (forPartsTitleKeywords.some((kw) => titleLower.includes(kw))) {
    return EXCLUDE_REASONS.FOR_PARTS
  }

  // Check for accessory-related keywords
  const accessoryKeywords = [
    "bracket",
    "fan attachment",
    "fan adapter",
    "shroud",
    "blower fan",
    "no gpu",
    "fan kit",
    "fan for",
    "kit for",
    "cooling fan",
    "backplate for",
  ]
  if (accessoryKeywords.some((kw) => titleLower.includes(kw))) {
    return EXCLUDE_REASONS.ACCESSORY
  }

  // Check for box-only listings
  if (isBoxOnlyTitle(listing.title)) {
    return EXCLUDE_REASONS.BOX_ONLY
  }

  // Check for neutered cards
  if (titleLower.includes("neutered")) {
    return EXCLUDE_REASONS.NEUTERED
  }

  // Check for SXM socket (not PCIe)
  if (titleLower.includes("sxm") || titleLower.includes("smx")) {
    return EXCLUDE_REASONS.OTHER
  }

  // Default to OTHER for any other filter failures (like missing required keywords)
  return EXCLUDE_REASONS.OTHER
}
