import {
  convertAmazonResultToListing,
  AmazonSearchResponseSchema,
  type Listing,
} from "@/pkgs/isomorphic/model"
import { getGpu } from "../db/GpuRepository"
import { PrismaClientWithinTransaction } from "../db/db"
import {
  addOrRefreshListingsForGpu,
  archiveStaleListingsForGpu,
  recordSearchAttempt,
} from "../db/ListingRepository"
import { createFilterForGpu } from "../listingFilters"
import { createLogger } from "@/lib/logger"
import { SERVER_CONFIG } from "@/pkgs/isomorphic/config"

const log = createLogger("shop:listings:amazon")

const isProduction = process.env.NODE_ENV === "production"

if (isProduction && !process.env.AMAZON_AFFILIATE_TAG) {
  log.error(
    "AMAZON_AFFILIATE_TAG is not set — Amazon product links will not include an affiliate tag. Set it in the app-creds secret.",
  )
}

/**
 * Fetches new listings from the amazon-searcher service for the specified GPU and caches them.
 * @returns The newly cached listings.
 */
export async function cacheAmazonListingsForGpu(
  gpuName: string,
  prisma: PrismaClientWithinTransaction,
): Promise<Listing[]> {
  const start = Date.now()
  const gpu = await getGpu(gpuName)

  const searcherUrl = SERVER_CONFIG.AMAZON_SEARCHER_URL()
  const affiliateTag = SERVER_CONFIG.AMAZON_AFFILIATE_TAG()

  if (isProduction && !affiliateTag) {
    log.warn(
      { gpu: gpuName },
      "Searching Amazon without affiliate tag — revenue not tracked for this search",
    )
  }

  log.info(`Searching Amazon for ${gpuName} via ${searcherUrl}`)

  const response = await fetch(`${searcherUrl}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      searchQuery: gpu.label,
      affiliateTag,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Amazon searcher returned ${response.status}: ${errorBody}`)
  }

  const json: unknown = await response.json()
  const parsed = AmazonSearchResponseSchema.parse(json)

  log.info(
    `Fetched ${parsed.results.length} results from Amazon for ${gpuName}`,
  )

  // Filter out results with no price and convert to Listing objects
  let listings = parsed.results
    .filter((r) => r.price !== null)
    .map((r) => convertAmazonResultToListing(r, gpu))

  // Apply filters (each filter self-selects based on source)
  // Use info-level logging for Amazon so filter rejections are visible in production
  const filter = createFilterForGpu(gpu, log.info.bind(log))
  listings = listings.filter((listing) => filter(listing))

  log.info(`After filtering: ${listings.length} Amazon listings for ${gpuName}`)

  await addOrRefreshListingsForGpu(listings, gpuName, prisma, "amazon")
  await archiveStaleListingsForGpu(gpuName, prisma, "amazon")
  await recordSearchAttempt(gpuName, "amazon", listings.length, prisma)

  const duration = Date.now() - start
  log.info(`Caching Amazon listings for ${gpuName} completed in ${duration}ms`)
  return listings
}
