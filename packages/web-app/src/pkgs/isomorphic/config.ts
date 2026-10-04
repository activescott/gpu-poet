// keys should be from the .env.* files
// NOTE: you must use the dot-syntax on process.env. or the keys won't be there (at least on the client)
import { PHASE_PRODUCTION_BUILD } from "next/constants"

/* eslint-disable no-magic-numbers */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production"
}

/**
 * Returns true when doing a `next build`.
 * NOTE: Based on my testing YMMV. I didn't see explicit documentation on this.
 */
export function isNextBuild(): boolean {
  return process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD
}

export const ISOMORPHIC_CONFIG = {
  PUBLIC_DOMAIN: (): string =>
    returnOrThrow("PUBLIC_DOMAIN", process.env.PUBLIC_DOMAIN),
  PUBLIC_POSTHOG_KEY: (): string =>
    returnOrThrow("PUBLIC_POSTHOG_KEY", process.env.PUBLIC_POSTHOG_KEY),
  PUBLIC_POSTHOG_HOST: (): string =>
    returnOrThrow("PUBLIC_POSTHOG_HOST", process.env.PUBLIC_POSTHOG_HOST),
  MAX_LISTINGS_PER_PAGE: (): number => 50,
}

export const SERVER_CONFIG = {
  EBAY_CLIENT_ID: (): string =>
    returnOrThrow("EBAY_CLIENT_ID", process.env.EBAY_CLIENT_ID),
  EBAY_CLIENT_SECRET: (): string =>
    returnOrThrow("EBAY_CLIENT_SECRET", process.env.EBAY_CLIENT_SECRET),
  EBAY_ENVIRONMENT: (): string =>
    returnOrThrow("EBAY_ENVIRONMENT", process.env.EBAY_ENVIRONMENT),
  EBAY_AFFILIATE_CAMPAIGN_ID: (): string =>
    returnOrThrow(
      "EBAY_AFFILIATE_CAMPAIGN_ID",
      process.env.EBAY_AFFILIATE_CAMPAIGN_ID,
    ),
  ADMIN_USERNAME: (): string =>
    returnOrThrow("ADMIN_USERNAME", process.env.ADMIN_USERNAME),
  ADMIN_PASSWORD: (): string =>
    returnOrThrow("ADMIN_PASSWORD", process.env.ADMIN_PASSWORD),
  // Optional: a second credential limited to POST /internal/api/exclude-listing.
  // Unset (either value) disables it; see middleware.ts.
  EXCLUDER_USERNAME: (): string | undefined => process.env.EXCLUDER_USERNAME,
  EXCLUDER_PASSWORD: (): string | undefined => process.env.EXCLUDER_PASSWORD,
  MAX_LISTINGS_TO_CACHE_PER_GPU: (): number => 100,
  AMAZON_SEARCHER_URL: (): string =>
    process.env.AMAZON_SEARCHER_URL || "http://amazon-searcher:3001",
  AMAZON_AFFILIATE_TAG: (): string | undefined =>
    process.env.AMAZON_AFFILIATE_TAG,
}

const returnOrThrow = (key: string, value: string | undefined): string => {
  if (!value) {
    throw new Error(`Missing environment variable ${key}`)
  }
  return value
}
