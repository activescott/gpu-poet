/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️  CRITICAL DATA RETENTION POLICY ⚠️
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * This repository manages GPU listing data with soft-delete archival.
 *
 * KEY PRINCIPLES:
 * 1. Listings are NEVER hard-deleted from the database
 * 2. Old listings are marked as archived (archived=true) but preserved forever
 * 3. Active queries filter by archived=false to show current listings
 * 4. Historical queries include ALL listings (active + archived) for price trends
 *
 * WHY THIS MATTERS:
 * - Historical price data is invaluable for tracking market trends
 * - Users rely on historical charts to make purchasing decisions
 * - Deleting archived data would break all historical analysis features
 * - Storage cost is minimal compared to the value of historical data
 *
 * NEVER DELETE ARCHIVED LISTINGS!
 * If you need to clean up data, create a new migration with extreme caution
 * and document the business justification thoroughly.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
  Listing,
  ListingWithMetric,
  ListingSource,
  parseGpu,
} from "@/pkgs/isomorphic/model"
import { createLogger } from "@/lib/logger"
import { PrismaClientWithinTransaction, prismaSingleton } from "./db"
import { omit } from "lodash"
import { GpuMetricKey } from "@/pkgs/isomorphic/model/metrics"
import { Prisma } from "@prisma/client"
import { CACHED_LISTINGS_DURATION_MS } from "../cacheConfig"
import { EPOCH } from "@/pkgs/isomorphic/duration"
import { createHash } from "crypto"

const log = createLogger("ListingRepository")

/* We keep cachedAt in the DB and it is used in the ListingRepository and in Listings */
export type CachedListing = Listing & { cachedAt: Date }

// Type for Prisma listing results that include gpu
type PrismaListingWithGpu = Prisma.ListingGetPayload<{ include: { gpu: true } }>

/**
 * Parse a Prisma listing result that includes gpu, validating JSONB fields.
 */
function parsePrismaListingWithGpu(
  listing: PrismaListingWithGpu,
): CachedListing {
  return {
    ...listing,
    source: listing.source === "amazon" ? "amazon" : "ebay",
    gpu: parseGpu(listing.gpu),
  } satisfies CachedListing
}

/**
 * Creates a hash of key fields to detect changes in listings
 */
function hashKeyFields(listing: {
  itemId: string
  priceValue: string
  title: string
  condition?: string | null
}): string {
  return createHash("md5")
    .update(
      `${listing.itemId}-${listing.priceValue}-${listing.title}-${listing.condition || ""}`,
    )
    .digest("hex")
}

/**
 * Finds the current non-archived listing by itemId.
 * NOTE: Does NOT filter on `exclude` because the DB's partial unique index
 * `one_active_per_item` enforces uniqueness on (itemId) WHERE archived=false,
 * regardless of exclude status. If we filtered on exclude=false here, we'd
 * miss excluded-but-not-archived listings and try to create duplicates.
 */
async function findNonArchivedByItemId(
  itemId: string,
  prisma: PrismaClientWithinTransaction,
  source: ListingSource = "ebay",
): Promise<{
  id: string
  version: number
  itemId: string
  priceValue: string
  title: string
  condition?: string | null
} | null> {
  return await prisma.listing.findFirst({
    where: {
      itemId,
      source,
      archived: false,
    },
    select: {
      id: true,
      version: true,
      itemId: true,
      priceValue: true,
      title: true,
      condition: true,
    },
  })
}

interface DataChangeCheckResult {
  /**
   * True if the listing data has changed and a new version should be created.
   * False if the listing (1) does not exist OR (2) exists but has not changed.
   */
  didChange: boolean
  /**
   * The current active listing, if it exists.
   */
  existingListing?: { id: string; version: number }
}

/**
 * Checks if an incoming listing should create a new version
 */
async function didListingDataChange(
  itemId: string,
  incomingListing: {
    priceValue: string
    title: string
    condition?: string | null
  },
  prisma: PrismaClientWithinTransaction,
  source: ListingSource = "ebay",
): Promise<DataChangeCheckResult> {
  const current = await findNonArchivedByItemId(itemId, prisma, source)
  if (!current) {
    return { didChange: false }
  }

  const currentHash = hashKeyFields(current)
  const incomingHash = hashKeyFields({ itemId, ...incomingListing })

  return {
    didChange: currentHash !== incomingHash,
    existingListing: { id: current.id, version: current.version },
  }
}

export async function listActiveListingsForGpus(
  gpuNames: string[],
  prisma: PrismaClientWithinTransaction = prismaSingleton,
): Promise<CachedListing[]> {
  const listings = await prisma.listing.findMany({
    where: {
      gpuName: { in: gpuNames },
      archived: false,
      exclude: false,
      source: { in: ["ebay", "amazon"] },
    },
    include: {
      gpu: true,
    },
  })
  return listings.map((listing) => parsePrismaListingWithGpu(listing))
}

export type GpuWithListings = {
  listings: CachedListing[]
  gpuName: string
}

/**
 * Returns the set of cached listings for all GPUs. Some listings may be empty.
 * NOTE: This is a useful operation since it allows pulling both a complete list of all GPUs, AND their associated listings (which may be empty).
 * If the listings are empty, the caller can then decide to fetch new listings to cache for the GPU.
 */
export async function listActiveListingsGroupedByGpu(
  includeTestGpus: boolean = false,
  prisma: PrismaClientWithinTransaction,
): Promise<GpuWithListings[]> {
  const where = {} as Prisma.gpuWhereInput
  if (!includeTestGpus) {
    where.name = { not: "test-gpu" }
  }

  const gpus = await prisma.gpu.findMany({
    where,
    include: {
      Listing: {
        where: {
          archived: false,
          exclude: false,
          source: { in: ["ebay", "amazon"] },
        },
      },
    },
  })

  const result = gpus.map((gpu) => {
    const parsedGpu = parseGpu(gpu)
    return {
      // NOTE: The returned listing doesn't have the gpu field hydrated, so we add it here
      listings: gpu.Listing.map((listing) => ({
        ...listing,
        gpu: parsedGpu,
      })) as CachedListing[],
      gpuName: gpu.name,
    }
  })
  return result
}

// Legacy alias for backward compatibility
export const listCachedListingsGroupedByGpu = listActiveListingsGroupedByGpu

export async function listActiveListings(
  includeTestGpus: boolean = false,
  prisma: PrismaClientWithinTransaction = prismaSingleton,
): Promise<CachedListing[]> {
  const where: Prisma.ListingWhereInput = {
    archived: false,
    exclude: false,
    source: { in: ["ebay", "amazon"] },
    ...(includeTestGpus ? {} : { gpuName: { not: "test-gpu" } }),
  }
  const listings = await prisma.listing.findMany({
    where: where,
    include: {
      gpu: true,
    },
  })
  return listings.map((listing) => parsePrismaListingWithGpu(listing))
}

// Legacy alias for backward compatibility
export const listCachedListings = listActiveListings

/**
 * Returns the date of the most recent listing row insertion across all active listings.
 * Used as lastmod for sitemap entries that depend on "when did the listing data last change?"
 *
 * Uses `createdAt` (immutable per row, set on INSERT) instead of `itemCreationDate`
 * (which is null for 100% of Amazon listings and caused this function to return EPOCH).
 */
export async function getLatestListingDate(
  prisma: PrismaClientWithinTransaction = prismaSingleton,
): Promise<Date> {
  const result = await prisma.listing.findFirst({
    where: {
      archived: false,
      exclude: false,
      source: { in: ["ebay", "amazon"] },
    },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  })
  if (!result) {
    log.error("No active listings found in the database. Returning EPOCH.")
    return EPOCH
  }
  return result.createdAt
}

/**
 * Adds or updates the specified listings in the database with versioning support.
 * Archives existing listings that have changed and creates new versions.
 * You must supply a prisma client that is already wrapped in a transaction, as this involves many queries.
 */
export async function addOrRefreshListingsForGpu(
  freshListingsFromEbay: Listing[],
  gpuName: string,
  prisma: PrismaClientWithinTransaction,
  source: ListingSource = "ebay",
): Promise<void> {
  log.info(`Processing ${source} listings for ${gpuName}...`)
  if (freshListingsFromEbay.length === 0) {
    log.warn(
      `No listings from ${source} to add or refresh for gpu ${gpuName}. Aborting attempt to cache new listings.`,
    )
    return
  }

  const cachedAt = new Date()
  const archivedAt = cachedAt
  let createdCount = 0
  let archivedCount = 0
  let noChangeCount = 0

  for (const freshListing of freshListingsFromEbay) {
    const listingData = {
      // NOTE: prisma doesn't like the hydrated gpu field in the listing, so we omit it
      ...omit(freshListing, "gpu", "source"),
      gpuName,
      source,
      cachedAt,
    }

    // Check if we need to create a new version
    const changeCheck = await didListingDataChange(
      freshListing.itemId,
      {
        priceValue: freshListing.priceValue,
        title: freshListing.title,
        condition: freshListing.condition,
      },
      prisma,
      source,
    )

    // ⚠️ IMPORTANT: `createdAt` must NEVER be passed to any `.update()` below.
    // It is the immutable "we first observed this row" anchor and is used by
    // historical queries (e.g. `getHistoricalPriceData`) via
    // `MIN("createdAt") OVER (PARTITION BY "itemId")` to determine when each
    // listing entered our dataset. Overwriting it — the way `cachedAt` gets
    // overwritten on every refresh — would silently break historical accuracy
    // across every chart on the site. Only `archived`, `archivedAt`, and
    // `cachedAt` should be mutated on existing rows.
    if (changeCheck.didChange && changeCheck.existingListing) {
      // Archive the current version so we can report on historical data
      log.info(
        `Listing ${freshListing.itemId} has changed. Archiving current version and creating a new version.`,
      )
      await prisma.listing.update({
        where: { id: changeCheck.existingListing.id },
        data: {
          archived: true,
          archivedAt,
        },
      })
      archivedCount++

      // Create new version — gets its own fresh `createdAt` via Prisma default.
      // The previous version's `createdAt` is preserved on the now-archived row,
      // which is what makes per-day historical queries possible.
      await prisma.listing.create({
        data: {
          ...listingData,
          version: changeCheck.existingListing.version + 1,
        },
      })
      createdCount++
    } else if (changeCheck.existingListing) {
      // Listing exists and hasn't changed. Update `cachedAt` (freshness signal)
      // but NEVER touch `createdAt` — see warning above.
      await prisma.listing.update({
        where: { id: changeCheck.existingListing.id },
        data: {
          cachedAt,
        },
      })
      noChangeCount++
    } else {
      // No existing listing, create new one
      log.info(
        { itemId: freshListing.itemId, gpuName },
        `Creating new listing for itemId=${freshListing.itemId} gpuName=${gpuName}`,
      )
      await prisma.listing.create({
        data: {
          ...listingData,
          version: 1,
        },
      })
      createdCount++
    }
  }

  log.info(
    `Processing listings for ${gpuName} complete. Created: ${createdCount}, Archived: ${archivedCount}, Unchanged: ${noChangeCount}`,
  )
}

/**
 * CRITICAL: Archives stale listings but NEVER deletes them from the database.
 *
 * This function marks listings older than CACHED_LISTINGS_DURATION_MS as archived
 * by setting archived=true and archivedAt timestamp. Archived listings are preserved
 * for historical price tracking and analysis.
 *
 * ⚠️ WARNING: NEVER delete archived listings! Historical queries (getHistoricalPriceData,
 * getAvailabilityTrends, etc.) rely on archived data to show price trends over time.
 * Deleting archived listings would destroy valuable historical data.
 *
 * The archive operation only affects active listing queries (which filter archived=false).
 * Historical queries intentionally include both active AND archived listings to provide
 * complete price history.
 */
export async function archiveStaleListingsForGpu(
  gpuName: string,
  prisma: PrismaClientWithinTransaction = prismaSingleton,
  source: ListingSource = "ebay",
): Promise<void> {
  log.info(`Archiving stale ${source} listings for ${gpuName}`)
  const archivedAt = new Date()
  const resp = await prisma.listing.updateMany({
    where: {
      gpuName,
      source,
      archived: false,
      cachedAt: { lt: new Date(Date.now() - CACHED_LISTINGS_DURATION_MS) },
    },
    data: {
      archived: true,
      archivedAt,
    },
  })
  log.info(
    `Archiving stale listings for ${gpuName} complete. ${resp.count} archived.`,
  )
}

export type GpuPriceStats = {
  avgPrice: number
  minPrice: number
  maxPrice: number
  activeListingCount: number
  /** Count of active listings classified as used/refurbished by classifyListingCondition(). */
  usedListingCount: number
  /** Count of active listings classified as new by classifyListingCondition(). */
  newListingCount: number
  /** Average of the 3 lowest-priced used/refurbished listings, or null when usedListingCount is 0. */
  usedMinPrice: number | null
  latestListingDate: Date
  /** Image URL from a representative listing, for use in structured data */
  representativeImageUrl: string | null
}

/**
 * Classifies a raw `Listing.condition` value as "new", "used", or "unknown".
 *
 * `condition` is stored verbatim from the marketplace (eBay reports its own
 * grading strings, in several languages; Amazon defaults to "New" when it
 * reports nothing). This reads the raw value against explicit allow-lists
 * rather than treating "not New" as "used", so an unrecognized or missing
 * value returns "unknown" instead of silently landing in either bucket.
 *
 * "Open box" and its literal translations ("Aperto - mai usato",
 * "Opened – never used") are classified as "used": they represent the same
 * discounted, non-sealed condition tier as other secondhand grades, and
 * shoppers who search "open box" are treated as used-intent by this project's
 * shop-page SEO experiments.
 */
export function classifyListingCondition(
  condition: string | null | undefined,
): "new" | "used" | "unknown" {
  if (!condition) {
    return "unknown"
  }
  const normalized = condition.trim().toLowerCase()
  if (NEW_CONDITIONS.has(normalized)) {
    return "new"
  }
  if (USED_CONDITIONS.has(normalized)) {
    return "used"
  }
  return "unknown"
}

const NEW_CONDITIONS = new Set([
  "new",
  "brand new",
  "neu",
  "neu: sonstige (siehe artikelbeschreibung)",
  "nuovo",
  "neuf",
])

const USED_CONDITIONS = new Set([
  "used",
  "open box",
  "opened – never used",
  "opened - never used",
  "aperto - mai usato",
  "excellent - refurbished",
  "very good - refurbished",
  "good - refurbished",
  "sehr gut - refurbished",
  "gut - refurbished",
  "hervorragend - refurbished",
  "certified refurbished",
  "refurbished",
  "renewed",
  "molto buono - ricondizionato",
  "eccellente - ricondizionato",
  "gebraucht",
  "usato",
  "d'occasion",
  "boîte ouverte",
])

/**
 * Raw `condition` values already reported by warnUnknownConditions(), so a
 * value that matches neither allow-list is logged once per process instead of
 * on every request for every GPU that has it.
 */
const warnedUnknownConditions = new Set<string>()

/**
 * Logs each distinct `Listing.condition` value that matched neither allow-list,
 * so new marketplace grading strings can be found in the logs and added.
 * Marketplaces introduce these without notice (new locales, new refurbished
 * tiers), and an unrecognized value is counted as neither used nor new, so it
 * silently shrinks both buckets.
 */
function warnUnknownConditions(
  gpuName: string,
  unknownConditions: (string | null)[],
): void {
  for (const condition of unknownConditions) {
    const key = condition ?? "(null)"
    if (warnedUnknownConditions.has(key)) {
      continue
    }
    warnedUnknownConditions.add(key)
    log.warn(
      `Unrecognized Listing.condition ${JSON.stringify(key)} (first seen on gpu ${gpuName}). It is counted as neither used nor new. Add it to USED_CONDITIONS or NEW_CONDITIONS in ListingRepository.ts.`,
    )
  }
}

type GpuPriceStatsRow = Omit<GpuPriceStats, "representativeImageUrl"> & {
  /** Distinct raw condition values matching neither allow-list. Null when a listing has no condition. */
  unknownConditions: (string | null)[]
}

export async function getPriceStats(
  gpuName: string,
  prisma: PrismaClientWithinTransaction = prismaSingleton,
): Promise<GpuPriceStats> {
  // minPrice is calculated as the average of the 3 lowest priced listings
  // (or fewer if less than 3 listings exist) to provide a more stable price indicator
  const usedConditions = [...USED_CONDITIONS]
  const newConditions = [...NEW_CONDITIONS]
  const result = (await prisma.$queryRaw`
    SELECT
      AVG("priceValue"::float) as "avgPrice",
      (SELECT AVG(price) FROM (
        SELECT "priceValue"::float as price
        FROM "Listing"
        WHERE "gpuName" = ${gpuName} AND "archived" = false AND "exclude" = false AND "source" IN ('ebay', 'amazon')
        ORDER BY "priceValue"::float ASC
        LIMIT 3
      ) lowest_three) as "minPrice",
      MAX("priceValue"::float) as "maxPrice",
      COUNT(*)::float as "activeListingCount",
      COUNT(*) FILTER (
        WHERE LOWER(TRIM("condition")) = ANY(${usedConditions}::text[])
      )::float as "usedListingCount",
      COUNT(*) FILTER (
        WHERE LOWER(TRIM("condition")) = ANY(${newConditions}::text[])
      )::float as "newListingCount",
      (SELECT AVG(price) FROM (
        SELECT "priceValue"::float as price
        FROM "Listing"
        WHERE "gpuName" = ${gpuName} AND "archived" = false AND "exclude" = false AND "source" IN ('ebay', 'amazon')
          AND LOWER(TRIM("condition")) = ANY(${usedConditions})
        ORDER BY "priceValue"::float ASC
        LIMIT 3
      ) lowest_three_used) as "usedMinPrice",
      MAX("itemCreationDate") as "latestListingDate",
      COALESCE(
        ARRAY_AGG(DISTINCT "condition") FILTER (
          WHERE "condition" IS NULL
            OR (
              LOWER(TRIM("condition")) <> ALL(${usedConditions}::text[])
              AND LOWER(TRIM("condition")) <> ALL(${newConditions}::text[])
            )
        ),
        '{}'
      ) as "unknownConditions"
    FROM "Listing"
  WHERE
    "gpuName" = ${gpuName}
    AND "archived" = false
    AND "exclude" = false
    AND "source" IN ('ebay', 'amazon')
  ;`) as GpuPriceStatsRow[]

  if (result.length === 0) {
    log.error(`No price stats found for gpu ${gpuName}`)
    return {
      avgPrice: 0,
      minPrice: 0,
      maxPrice: 0,
      activeListingCount: 0,
      usedListingCount: 0,
      newListingCount: 0,
      usedMinPrice: null,
      latestListingDate: EPOCH,
      representativeImageUrl: null,
    }
  }

  const { unknownConditions, ...stats } = result[0]
  warnUnknownConditions(gpuName, unknownConditions)

  // Get a representative image from the most recent active listing
  const listingWithImage = await prisma.listing.findFirst({
    where: {
      gpuName: gpuName,
      archived: false,
      exclude: false,
      source: { in: ["ebay", "amazon"] },
    },
    select: { thumbnailImageUrl: true },
    orderBy: { itemCreationDate: "desc" },
  })

  return {
    ...stats,
    representativeImageUrl: listingWithImage?.thumbnailImageUrl ?? null,
  }
}

/**
 * Maps Prisma TypeScript field names to actual database column names.
 * Currently no spec fields use @map, so this just returns the field name.
 * Kept for future flexibility if needed.
 */
function prismaFieldToDbColumn(fieldName: GpuMetricKey): string {
  return fieldName
}

/**
 * DEPRECATED: Use listingsByCostPerformanceBySlug instead.
 *
 * This function queries GPU table fields directly, which requires hardcoded
 * field mappings. The new function uses GpuMetricValue table instead.
 *
 * @deprecated Will be removed when GPU table benchmark fields are removed
 */
export async function topNListingsByCostPerformance(
  spec: GpuMetricKey,
  n: number,
  prisma: PrismaClientWithinTransaction = prismaSingleton,
  { minMemoryGB = 0 }: { minMemoryGB?: number } = {},
): Promise<Listing[]> {
  const dbColumnName = prismaFieldToDbColumn(spec)
  const specFieldName = Prisma.raw(`"gpu"."${dbColumnName}"`)

  type ListingWithGpu = Prisma.$ListingPayload["scalars"] &
    Prisma.$gpuPayload["scalars"]
  const result = await prisma.$queryRaw<ListingWithGpu[]>(Prisma.sql`
    SELECT
      *
    FROM "Listing"
    INNER JOIN "gpu" ON "Listing"."gpuName" = "gpu"."name"
    WHERE "Listing"."archived" = false
      AND "Listing"."exclude" = false
      AND "Listing"."source" IN ('ebay', 'amazon')
      AND ${specFieldName} IS NOT NULL
      AND ${specFieldName} > 0
      AND "gpu"."memoryCapacityGB" >= ${minMemoryGB}
    ORDER BY ("Listing"."priceValue"::float / ${specFieldName}::float)
    LIMIT ${n}
  `)

  return result.map((row: ListingWithGpu): Listing => {
    // Map database column names back to Prisma field names
    // This is needed because raw SQL returns DB column names, but we use Prisma field names
    if (dbColumnName !== spec) {
      // If the DB column name differs from the Prisma field name (e.g., 3dmarkWildLifeExtremeFps vs threemarkWildLifeExtremeFps)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(row as any)[spec] = (row as any)[dbColumnName]
    }

    // Construct the Listing object with all fields explicitly mapped
    // We explicitly construct the gpu object from the flattened row data
    const listing: Listing = {
      // Listing fields
      itemId: row.itemId,
      title: row.title,
      priceValue: row.priceValue,
      priceCurrency: row.priceCurrency,
      buyingOptions: row.buyingOptions,
      imageUrl: row.imageUrl,
      adultOnly: row.adultOnly,
      itemHref: row.itemHref,
      leafCategoryIds: row.leafCategoryIds,
      listingMarketplaceId: row.listingMarketplaceId,
      sellerUsername: row.sellerUsername,
      sellerFeedbackPercentage: row.sellerFeedbackPercentage,
      sellerFeedbackScore: row.sellerFeedbackScore,
      condition: row.condition,
      conditionId: row.conditionId,
      itemAffiliateWebUrl: row.itemAffiliateWebUrl,
      thumbnailImageUrl: row.thumbnailImageUrl,
      epid: row.epid,
      itemCreationDate: row.itemCreationDate,
      itemLocationCountry: row.itemLocationCountry,
      itemGroupType: row.itemGroupType,
      source: row.source === "amazon" ? "amazon" : "ebay",
      cachedAt: row.cachedAt,
      // GPU object with all specs and benchmarks
      gpu: parseGpu({
        // Required fields
        name: row.name,
        label: row.label,
        gpuArchitecture: row.gpuArchitecture,
        supportedHardwareOperations: row.supportedHardwareOperations,
        summary: row.summary,
        references: row.references,
        lastModified: row.lastModified,
        // Optional fields - accessing via index signature since raw SQL flattens the result
        series: (row as Record<string, unknown>).series as
          | string
          | null
          | undefined,
        supportedCUDAComputeCapability:
          row.supportedCUDAComputeCapability ?? undefined,
        maxTDPWatts: row.maxTDPWatts ?? undefined,
        releaseDate: row.releaseDate ?? undefined,
        // All GPU metrics
        fp32TFLOPS: row.fp32TFLOPS,
        tensorCoreCount: row.tensorCoreCount,
        fp16TFLOPS: row.fp16TFLOPS,
        int8TOPS: row.int8TOPS,
        memoryCapacityGB: row.memoryCapacityGB,
        memoryBandwidthGBs: row.memoryBandwidthGBs,
        // MSRP and notes
        msrpUSD: row.msrpUSD ?? undefined,
        notes: row.notes ?? [],
      }),
    }

    return listing
  })
}

/**
 * Returns top N listings ordered by cost per performance using GpuMetricValue.
 *
 * This is the new implementation that uses the dynamic GpuMetricValue table
 * instead of hardcoded GPU table fields. It allows querying any metric
 * (spec or benchmark) by its slug without requiring schema changes.
 *
 * @param metricSlug - The metric slug (e.g., "fp32-flops", "counter-strike-2-fps-3840x2160")
 * @param n - Number of listings to return
 * @param prisma - Prisma client
 * @returns Listings ordered by cost/performance (lowest $/metric first)
 */
export async function listingsByCostPerformanceBySlug(
  metricSlug: string,
  limit?: number,
  prisma: PrismaClientWithinTransaction = prismaSingleton,
): Promise<ListingWithMetric[]> {
  // Query listings for this metric, sorted by cost/performance ratio.
  // When no limit is specified, all listings are returned so client-side
  // filters work correctly — a top-N cutoff would exclude high-memory or
  // expensive GPUs that don't rank well on cost/performance but are still
  // relevant when filtered.
  const limitClause =
    limit === undefined ? Prisma.empty : Prisma.sql`LIMIT ${limit}`
  const result = await prisma.$queryRaw<
    (Prisma.$ListingPayload["scalars"] &
      Prisma.$gpuPayload["scalars"] & { metricValue: number })[]
  >(Prisma.sql`
    SELECT
      l.*,
      g.*,
      mv."value" as "metricValue"
    FROM "Listing" l
    INNER JOIN "gpu" g ON l."gpuName" = g."name"
    INNER JOIN "GpuMetricValue" mv ON g."name" = mv."gpuName"
    WHERE l."archived" = false
      AND l."exclude" = false
      AND l."source" IN ('ebay', 'amazon')
      AND mv."metricSlug" = ${metricSlug}
      AND mv."value" > 0
    ORDER BY (l."priceValue"::float / mv."value"::float)
    ${limitClause}
  `)

  return result.map((row): ListingWithMetric => {
    // Construct the ListingWithMetric object with all fields explicitly mapped
    const listing: ListingWithMetric = {
      // Listing fields
      itemId: row.itemId,
      title: row.title,
      priceValue: row.priceValue,
      priceCurrency: row.priceCurrency,
      buyingOptions: row.buyingOptions,
      imageUrl: row.imageUrl,
      adultOnly: row.adultOnly,
      itemHref: row.itemHref,
      leafCategoryIds: row.leafCategoryIds,
      listingMarketplaceId: row.listingMarketplaceId,
      sellerUsername: row.sellerUsername,
      sellerFeedbackPercentage: row.sellerFeedbackPercentage,
      sellerFeedbackScore: row.sellerFeedbackScore,
      condition: row.condition,
      conditionId: row.conditionId,
      itemAffiliateWebUrl: row.itemAffiliateWebUrl,
      thumbnailImageUrl: row.thumbnailImageUrl,
      epid: row.epid,
      itemCreationDate: row.itemCreationDate,
      itemLocationCountry: row.itemLocationCountry,
      itemGroupType: row.itemGroupType,
      source: row.source === "amazon" ? "amazon" : "ebay",
      cachedAt: row.cachedAt,
      // The metric value from GpuMetricValue for the queried metric slug
      metricValue: row.metricValue,
      // GPU object - note: we include legacy fields for backwards compatibility
      // but the metric value is retrieved from GpuMetricValue, not GPU table
      gpu: parseGpu({
        // Required fields
        name: row.name,
        label: row.label,
        gpuArchitecture: row.gpuArchitecture,
        supportedHardwareOperations: row.supportedHardwareOperations,
        summary: row.summary,
        references: row.references,
        lastModified: row.lastModified,
        // Optional fields
        series: (row as Record<string, unknown>).series as
          | string
          | null
          | undefined,
        supportedCUDAComputeCapability:
          row.supportedCUDAComputeCapability ?? undefined,
        maxTDPWatts: row.maxTDPWatts ?? undefined,
        releaseDate: row.releaseDate ?? undefined,
        // GPU spec metrics from the GPU table
        fp32TFLOPS: row.fp32TFLOPS,
        tensorCoreCount: row.tensorCoreCount,
        fp16TFLOPS: row.fp16TFLOPS,
        int8TOPS: row.int8TOPS,
        memoryCapacityGB: row.memoryCapacityGB,
        memoryBandwidthGBs: row.memoryBandwidthGBs,
        // MSRP and notes
        msrpUSD: row.msrpUSD ?? undefined,
        notes: row.notes ?? [],
      }),
    }

    return listing
  })
}

// New types for historical data analysis
export interface PriceHistoryPoint {
  date: Date
  lowestAvgPrice: number
  medianPrice: number
  listingCount: number
}

export interface MonthlyPriceStats {
  gpuName: string
  monthYear: string
  avgPrice: number
  minPrice: number
  maxPrice: number
  activeListingCount: number
  priceVolatility: number
}

export interface AvailabilityStats {
  date: Date
  availableListings: number
  uniqueSellers: number
  avgDaysListed: number
}

export interface VolatilityStats {
  gpuName: string
  volatilityScore: number
  priceRange: number
  versionCount: number
}

/**
 * Gets historical price data for a GPU over the specified number of months.
 *
 * TEMPORAL CORRECTNESS — READ BEFORE MODIFYING:
 *
 * This query determines "which listings were active on day D" using each
 * version's `createdAt` (immutable per row) and `archivedAt` (set when a
 * version is superseded or the listing disappears).  A listing version is
 * considered active on day D when:
 *
 *   createdAt < D + 1 day AND (archivedAt IS NULL OR archivedAt >= D)
 *
 * `DISTINCT ON ("itemId")` with `ORDER BY COALESCE(archivedAt, infinity)` picks
 * exactly one version per listing per day — the one whose end-of-life is
 * closest to D from above — which is the version that was live on D.
 *
 * DO NOT switch this back to filtering by `DATE_TRUNC('day', cachedAt)`:
 * `cachedAt` is overwritten on every scrape refresh, so any "day bucket"
 * keyed on it only contains listings we happened to re-observe that day,
 * which is a tiny biased subsample of the actual active population.  This
 * was the long-standing bug fixed on 2026-04-16; see
 * gpu-poet-data/specs/listing-historical-accuracy/plan.md.
 *
 * This query intentionally includes BOTH active and archived listings to
 * provide complete historical price data.  Do NOT add an archived=false
 * filter — archived listings are essential for historical analysis.
 */
export async function getHistoricalPriceData(
  gpuName: string,
  months: number,
  prisma: PrismaClientWithinTransaction = prismaSingleton,
): Promise<PriceHistoryPoint[]> {
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - months)

  const result = await prisma.$queryRaw<PriceHistoryPoint[]>`
    WITH days AS (
      SELECT DATE_TRUNC('day', generate_series(${startDate}::timestamp, NOW(), '1 day'::interval))::date AS day
    ),
    active_versions AS (
      SELECT DISTINCT ON (d.day, l."itemId")
        d.day,
        l."itemId",
        l."priceValue"::float AS price
      FROM days d
      CROSS JOIN "Listing" l
      WHERE l."gpuName" = ${gpuName}
        AND l."exclude" = false
        AND l."source" IN ('ebay', 'amazon')
        AND l."createdAt" < d.day + INTERVAL '1 day'
        AND (l."archivedAt" IS NULL OR l."archivedAt" >= d.day)
      ORDER BY d.day, l."itemId", COALESCE(l."archivedAt", 'infinity'::timestamp) ASC
    ),
    daily_stats AS (
      SELECT
        day AS "date",
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price) AS "medianPrice",
        COUNT(*)::float AS "listingCount"
      FROM active_versions
      GROUP BY day
    ),
    daily_lowest AS (
      SELECT day, AVG(price) AS "lowestAvgPrice"
      FROM (
        SELECT day, price, ROW_NUMBER() OVER (PARTITION BY day ORDER BY price ASC) AS rn
        FROM active_versions
      ) ranked
      WHERE rn <= 3
      GROUP BY day
    )
    SELECT
      s."date",
      COALESCE(l."lowestAvgPrice", s."medianPrice") AS "lowestAvgPrice",
      s."medianPrice",
      s."listingCount"
    FROM daily_stats s
    LEFT JOIN daily_lowest l ON l.day = s."date"
    WHERE s."listingCount" > 0
    ORDER BY s."date"
  `

  return result
}

/**
 * Gets monthly averages for multiple GPUs for a specific month.
 *
 * Temporal correctness: uses createdAt + archivedAt to determine "listings
 * active at some point during the month", with DISTINCT ON ("itemId") so
 * each listing contributes one price. See getHistoricalPriceData for the
 * full rationale.
 */
export async function getMonthlyAverages(
  gpuNames: string[],
  monthYear: string, // Format: "2024-01"
  prisma: PrismaClientWithinTransaction = prismaSingleton,
): Promise<MonthlyPriceStats[]> {
  const [year, month] = monthYear.split("-").map(Number)
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0)

  const result = await prisma.$queryRaw<
    Omit<MonthlyPriceStats, "priceVolatility">[]
  >`
    WITH active_versions AS (
      SELECT DISTINCT ON (l."itemId") l."gpuName", l."priceValue"::float AS price
      FROM "Listing" l
      WHERE l."gpuName" = ANY(${gpuNames})
        AND l."exclude" = false
        AND l."source" IN ('ebay', 'amazon')
        AND l."createdAt" < ${endDate}::timestamp + INTERVAL '1 day'
        AND (l."archivedAt" IS NULL OR l."archivedAt" >= ${startDate})
      ORDER BY l."itemId", l."priceValue"::float ASC
    )
    SELECT
      "gpuName",
      ${monthYear} as "monthYear",
      AVG(price) as "avgPrice",
      MIN(price) as "minPrice",
      MAX(price) as "maxPrice",
      COUNT(*)::float as "activeListingCount"
    FROM active_versions
    GROUP BY "gpuName"
  `

  const volatilityResults = await prisma.$queryRaw<
    { gpuName: string; priceVolatility: number }[]
  >`
    WITH active_versions AS (
      SELECT DISTINCT ON (l."itemId") l."gpuName", l."priceValue"::float AS price
      FROM "Listing" l
      WHERE l."gpuName" = ANY(${gpuNames})
        AND l."exclude" = false
        AND l."source" IN ('ebay', 'amazon')
        AND l."createdAt" < ${endDate}::timestamp + INTERVAL '1 day'
        AND (l."archivedAt" IS NULL OR l."archivedAt" >= ${startDate})
      ORDER BY l."itemId", l."priceValue"::float ASC
    )
    SELECT
      "gpuName",
      CASE
        WHEN AVG(price) > 0
        THEN STDDEV(price) / AVG(price)
        ELSE 0
      END as "priceVolatility"
    FROM active_versions
    GROUP BY "gpuName"
  `

  const volatilityMap = new Map(
    volatilityResults.map((v) => [v.gpuName, v.priceVolatility]),
  )

  return result.map((stat) => ({
    ...stat,
    priceVolatility: volatilityMap.get(stat.gpuName) || 0,
  }))
}

/**
 * Gets availability trends for a GPU over the specified number of months.
 *
 * Temporal correctness: uses createdAt + archivedAt to determine "listings
 * active on each day", with DISTINCT ON ("itemId") per day. See
 * getHistoricalPriceData for the full rationale.
 */
export async function getAvailabilityTrends(
  gpuName: string,
  months: number,
  prisma: PrismaClientWithinTransaction = prismaSingleton,
): Promise<AvailabilityStats[]> {
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - months)

  const result = await prisma.$queryRaw<AvailabilityStats[]>`
    WITH days AS (
      SELECT DATE_TRUNC('day', generate_series(${startDate}::timestamp, NOW(), '1 day'::interval))::date AS day
    ),
    active_versions AS (
      SELECT DISTINCT ON (d.day, l."itemId")
        d.day,
        l."itemId",
        l."sellerUsername",
        EXTRACT(EPOCH FROM (d.day - l."itemCreationDate"::date)) / 86400 AS days_listed
      FROM days d
      CROSS JOIN "Listing" l
      WHERE l."gpuName" = ${gpuName}
        AND l."exclude" = false
        AND l."source" IN ('ebay', 'amazon')
        AND l."createdAt" < d.day + INTERVAL '1 day'
        AND (l."archivedAt" IS NULL OR l."archivedAt" >= d.day)
        AND l."itemCreationDate" IS NOT NULL
      ORDER BY d.day, l."itemId", COALESCE(l."archivedAt", 'infinity'::timestamp) ASC
    )
    SELECT
      day AS "date",
      COUNT(DISTINCT "itemId")::float AS "availableListings",
      COUNT(DISTINCT "sellerUsername")::float AS "uniqueSellers",
      AVG(days_listed)::float AS "avgDaysListed"
    FROM active_versions
    GROUP BY day
    ORDER BY day
  `

  return result
}

/**
 * Gets price volatility statistics for a GPU over the specified number of months.
 *
 * Temporal correctness: uses createdAt + archivedAt to determine "listings
 * active at some point during the window". See getHistoricalPriceData for
 * the full rationale.
 */
export async function getPriceVolatility(
  gpuName: string,
  months: number,
  prisma: PrismaClientWithinTransaction = prismaSingleton,
): Promise<VolatilityStats> {
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - months)

  const result = await prisma.$queryRaw<VolatilityStats[]>`
    WITH active_versions AS (
      SELECT DISTINCT ON (l."itemId") l."priceValue"::float AS price, l."version"
      FROM "Listing" l
      WHERE l."gpuName" = ${gpuName}
        AND l."exclude" = false
        AND l."source" IN ('ebay', 'amazon')
        AND l."createdAt" < NOW()
        AND (l."archivedAt" IS NULL OR l."archivedAt" >= ${startDate})
      ORDER BY l."itemId", COALESCE(l."archivedAt", 'infinity'::timestamp) ASC
    )
    SELECT
      ${gpuName} as "gpuName",
      CASE
        WHEN AVG(price) > 0
        THEN STDDEV(price) / AVG(price)
        ELSE 0
      END as "volatilityScore",
      (MAX(price) - MIN(price)) as "priceRange",
      COUNT(DISTINCT "version")::float as "versionCount"
    FROM active_versions
  `

  return (
    result[0] || {
      gpuName,
      volatilityScore: 0,
      priceRange: 0,
      versionCount: 0,
    }
  )
}

/**
 * Lists archived listings for a GPU within a date range
 */
export async function listArchivedListings(
  gpuName: string,
  startDate: Date,
  endDate: Date,
  prisma: PrismaClientWithinTransaction = prismaSingleton,
): Promise<CachedListing[]> {
  const listings = await prisma.listing.findMany({
    where: {
      gpuName,
      archived: true,
      archivedAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      gpu: true,
    },
    orderBy: {
      archivedAt: "desc",
    },
  })

  return listings.map((listing) => parsePrismaListingWithGpu(listing))
}

/**
 * Gets the version history for a specific listing itemId
 */
export async function getListingVersionHistory(
  itemId: string,
  prisma: PrismaClientWithinTransaction = prismaSingleton,
): Promise<CachedListing[]> {
  const listings = await prisma.listing.findMany({
    where: {
      itemId,
    },
    include: {
      gpu: true,
    },
    orderBy: {
      version: "desc",
    },
  })

  return listings.map((listing) => parsePrismaListingWithGpu(listing))
}

// ═══════════════════════════════════════════════════════════════════════════
// DATA QUALITY EXCLUSION METHODS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Excludes a listing for data quality issues.
 * Unlike archive, excluded listings are omitted from ALL queries including historical.
 * The listing is preserved for potential ML training to detect similar issues.
 *
 * Applies to every row for this itemId, archived or not — historical reports
 * read archived rows too, so an exclusion that only touched the active row
 * would leave a data-quality issue in the historical data.
 *
 * @param itemId - The eBay item ID of the listing to exclude
 * @param reason - The reason for exclusion (see EXCLUDE_REASONS in listing.ts)
 * @param prisma - Prisma client
 * @returns The number of rows updated
 */
export async function excludeListingForDataQuality(
  itemId: string,
  reason: string,
  prisma: PrismaClientWithinTransaction = prismaSingleton,
): Promise<number> {
  const { count } = await prisma.listing.updateMany({
    where: {
      itemId,
    },
    data: {
      exclude: true,
      excludeReason: reason,
    },
  })
  log.info(`Excluded listing ${itemId} for data quality issue: ${reason}`)
  return count
}

/**
 * Lists excluded listings for analysis/ML training.
 * Supports filtering by reason and GPU name, with pagination.
 *
 * @param options - Filter and pagination options
 * @param prisma - Prisma client
 * @returns Excluded listings and total count
 */
export async function listExcludedListings(
  options: {
    reason?: string
    gpuName?: string
    limit?: number
    offset?: number
  } = {},
  prisma: PrismaClientWithinTransaction = prismaSingleton,
): Promise<{ listings: CachedListing[]; total: number }> {
  const DEFAULT_LIMIT = 100
  const { reason, gpuName, limit = DEFAULT_LIMIT, offset = 0 } = options

  const where: Prisma.ListingWhereInput = {
    exclude: true,
    ...(reason ? { excludeReason: reason } : {}),
    ...(gpuName ? { gpuName } : {}),
  }

  const [listings, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      include: {
        gpu: true,
      },
      orderBy: {
        cachedAt: "desc",
      },
      take: limit,
      skip: offset,
    }),
    prisma.listing.count({ where }),
  ])

  return {
    listings: listings.map((listing) => parsePrismaListingWithGpu(listing)),
    total,
  }
}

/**
 * Gets summary stats of excluded listings by reason.
 * Useful for monitoring data quality issues over time.
 *
 * @param prisma - Prisma client
 * @returns Array of reason/count pairs, sorted by count descending
 */
export async function getExclusionStats(
  prisma: PrismaClientWithinTransaction = prismaSingleton,
): Promise<{ reason: string; count: number }[]> {
  const result = await prisma.$queryRaw<{ reason: string; count: bigint }[]>`
    SELECT
      COALESCE("excludeReason", 'unknown') as "reason",
      COUNT(*)::bigint as "count"
    FROM "Listing"
    WHERE "exclude" = true
    GROUP BY "excludeReason"
    ORDER BY "count" DESC
  `

  return result.map((row) => ({
    reason: row.reason,
    count: Number(row.count),
  }))
}

/**
 * Searches active (non-archived, non-excluded) listings by title.
 */
export async function searchActiveListings(
  query: string,
  options: { limit?: number; offset?: number } = {},
  prisma: PrismaClientWithinTransaction = prismaSingleton,
): Promise<{ listings: CachedListing[]; total: number }> {
  const DEFAULT_LIMIT = 50
  const { limit = DEFAULT_LIMIT, offset = 0 } = options

  const where: Prisma.ListingWhereInput = {
    archived: false,
    exclude: false,
    source: "ebay",
    title: {
      contains: query,
      mode: "insensitive",
    },
  }

  const [listings, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      include: {
        gpu: true,
      },
      orderBy: {
        cachedAt: "desc",
      },
      take: limit,
      skip: offset,
    }),
    prisma.listing.count({ where }),
  ])

  return {
    listings: listings.map((listing) => parsePrismaListingWithGpu(listing)),
    total,
  }
}

/**
 * Finds the GPU most in need of a search for the given source.
 * Uses GpuSearchHistory to track when each GPU was last searched, so GPUs
 * that return 0 results aren't re-searched every run.
 *
 * Priority: GPUs never searched for this source first (oldest GPU name),
 * then GPUs whose last search is older than the staleness threshold.
 *
 * // TODO: After validating this approach for Amazon, consider using it for eBay too
 * // to avoid re-searching obscure GPUs that consistently return 0 eBay results.
 */
export async function findMostStaleGpuForSource(
  source: ListingSource,
  staleThresholdMs: number,
  prisma: PrismaClientWithinTransaction = prismaSingleton,
): Promise<string | null> {
  const staleThreshold = new Date(Date.now() - staleThresholdMs)

  // First, find GPUs that have never been searched for this source
  const neverSearched = await prisma.$queryRaw<{ name: string }[]>`
    SELECT g."name"
    FROM "gpu" g
    WHERE g."name" != 'test-gpu'
      AND NOT EXISTS (
        SELECT 1 FROM "GpuSearchHistory" h
        WHERE h."gpuName" = g."name"
          AND h."source" = ${source}
      )
    ORDER BY g."name" ASC
    LIMIT 1
  `

  if (neverSearched.length > 0) {
    return neverSearched[0].name
  }

  // Then, find the GPU with the oldest searchedAt for this source
  const staleGpus = await prisma.$queryRaw<
    { gpuName: string; searchedAt: Date }[]
  >`
    SELECT "gpuName", "searchedAt"
    FROM "GpuSearchHistory"
    WHERE "source" = ${source}
      AND "searchedAt" < ${staleThreshold}
    ORDER BY "searchedAt" ASC
    LIMIT 1
  `

  if (staleGpus.length > 0) {
    return staleGpus[0].gpuName
  }

  return null
}

/**
 * Records that a search was attempted for a GPU on a given source.
 * Upserts into GpuSearchHistory so we track the attempt even when 0 results pass filters.
 */
export async function recordSearchAttempt(
  gpuName: string,
  source: ListingSource,
  resultCount: number,
  prisma: PrismaClientWithinTransaction = prismaSingleton,
): Promise<void> {
  await prisma.gpuSearchHistory.upsert({
    where: {
      gpuName_source: { gpuName, source },
    },
    update: {
      searchedAt: new Date(),
      resultCount,
    },
    create: {
      gpuName,
      source,
      searchedAt: new Date(),
      resultCount,
    },
  })
}
