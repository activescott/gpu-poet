import { ItemSummary } from "@activescott/ebay-client"
import { z } from "zod"
import { Gpu } from "./gpu"

export type ListingSource = "ebay" | "amazon"

export interface Listing {
  itemId: string
  title: string
  priceValue: string
  priceCurrency: string
  buyingOptions: string[]
  imageUrl: string
  adultOnly: boolean
  itemHref: string
  leafCategoryIds: string[]
  // have seen results from ebay where listingMarketplaceId is not present
  // string | null because prisma :/
  listingMarketplaceId?: string | null
  sellerUsername: string
  sellerFeedbackPercentage: string
  sellerFeedbackScore: number
  condition: string | null
  conditionId: string | null
  itemAffiliateWebUrl: string
  thumbnailImageUrl: string
  epid: string
  itemCreationDate?: Date | null
  // string | null because prisma :/
  itemLocationCountry?: string | null
  gpu: Gpu
  // string | null because prisma :/
  itemGroupType?: string | "SELLER_DEFINED_VARIATIONS" | null
  excludeReason?: string | null
  source?: ListingSource
  cachedAt?: Date
}

/**
 * Extended listing type that includes the metric value from GpuMetricValue.
 * Used by queries that join with GpuMetricValue to get dynamic metric data.
 */
export interface ListingWithMetric extends Listing {
  /** The metric value from GpuMetricValue table for the queried metric slug */
  metricValue: number
}

export function convertEbayItemToListing(
  listing: ItemSummary,
  gpu: Gpu,
): Listing {
  return {
    itemId: listing.itemId,
    title: listing.title,
    priceValue: listing.price.value,
    priceCurrency: listing.price.currency,
    buyingOptions: listing.buyingOptions,
    // listing.image is documented as required, but I've seen it null
    imageUrl: listing.image ? proxyImageUrl(listing.image.imageUrl) : "",
    adultOnly: listing.adultOnly,
    itemHref: listing.itemHref,
    leafCategoryIds: listing.leafCategoryIds,
    listingMarketplaceId: listing.listingMarketplaceId,
    sellerUsername: listing.seller.username,
    sellerFeedbackPercentage: listing.seller.feedbackPercentage,
    sellerFeedbackScore: listing.seller.feedbackScore,
    condition: listing.condition ?? null,
    conditionId: listing.conditionId ?? null,
    itemAffiliateWebUrl: listing.itemAffiliateWebUrl ?? "",
    thumbnailImageUrl: listing.thumbnailImages?.length
      ? proxyImageUrl(listing.thumbnailImages[0].imageUrl)
      : "",
    epid: listing.epid ?? "",
    itemCreationDate: listing.itemCreationDate,
    gpu,
    itemLocationCountry: listing.itemLocation?.country,
    itemGroupType: listing.itemGroupType,
  }
}
function proxyImageUrl(imageUrl: string): string {
  const EBAY_IMAGE_PROXY_PATH = "/ei/"
  const EBAY_IMAGE_HOST = /^https:\/\/i.ebayimg.com\//
  return imageUrl.replace(EBAY_IMAGE_HOST, EBAY_IMAGE_PROXY_PATH)
}

/**
 * Common reasons for excluding a listing from all queries.
 * These listings are data quality issues, not legitimate GPU listings.
 * Preserved for potential ML training to detect similar issues.
 *
 * Usage: When setting excludeReason on a listing, use one of these values.
 * The values are stored as strings in the database for flexibility.
 */
export const EXCLUDE_REASONS = {
  /** GPU accessory like backplate, bracket, fan, shroud */
  ACCESSORY: "accessory",
  /** Empty box only, no GPU included */
  BOX_ONLY: "box_only",
  /** Modified/neutered card with reduced specs */
  NEUTERED: "neutered",
  /** Suspected scam or fraudulent listing */
  SCAM: "scam",
  /** Seller-defined variations bundle (price misleading) */
  VARIATION_BUNDLE: "variation_bundle",
  /** For parts/not working condition */
  FOR_PARTS: "for_parts",
  /** Low seller feedback (< 90%) */
  LOW_FEEDBACK: "low_feedback",
  /** Bulk sale listing with multiple GPUs (e.g., "8x RTX 5090") */
  BULK_SALE: "bulk_sale",
  /** Incorrectly matched GPU (e.g. listing was for a GTX 980, and was matched as a T4) */
  MISMATCHED_GPU: "mismatched_gpu",
  /** Priced under 25% of the GPU model's median listing price */
  BELOW_MEDIAN_PRICE: "below_median_price",
  /** Other data quality issue */
  OTHER: "other",
} as const

export type ExcludeReason =
  (typeof EXCLUDE_REASONS)[keyof typeof EXCLUDE_REASONS]

export const AmazonSearchResultSchema = z.object({
  asin: z.string(),
  title: z.string(),
  price: z.number().nullable(),
  mainImageUrl: z.string().nullable(),
  condition: z.string().nullable(),
  brand: z.string().nullable(),
  reviewRating: z.number().nullable(),
  reviewCount: z.number().nullable(),
  isBulkDeal: z.boolean(),
  productUrl: z.string(),
  affiliateUrl: z.string(),
})

export type AmazonSearchResult = z.infer<typeof AmazonSearchResultSchema>

export const AmazonSearchResponseSchema = z.object({
  results: z.array(AmazonSearchResultSchema),
})

export type AmazonSearchResponse = z.infer<typeof AmazonSearchResponseSchema>

export function convertAmazonResultToListing(
  result: AmazonSearchResult,
  gpu: Gpu,
): Listing {
  return {
    itemId: result.asin,
    title: result.title,
    priceValue: result.price === null ? "0" : String(result.price),
    priceCurrency: "USD",
    buyingOptions: ["FIXED_PRICE"],
    imageUrl: result.mainImageUrl ?? "",
    adultOnly: false,
    itemHref: result.productUrl,
    leafCategoryIds: [],
    listingMarketplaceId: "AMAZON_US",
    sellerUsername: "Amazon",
    sellerFeedbackPercentage: "100",
    sellerFeedbackScore: 1000,
    // amazon-searcher always populates this (see its parser.ts), so the
    // fallback is defensive; null rather than "New" so an absent value is
    // classified as unknown instead of silently counted as new.
    condition: result.condition ?? null,
    conditionId: null,
    itemAffiliateWebUrl: result.affiliateUrl,
    thumbnailImageUrl: result.mainImageUrl ?? "",
    epid: "",
    itemCreationDate: null,
    gpu,
    itemLocationCountry: "US",
    itemGroupType: null,
    source: "amazon",
  }
}
