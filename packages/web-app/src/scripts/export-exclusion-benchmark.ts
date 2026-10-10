import { writeFile } from "node:fs/promises"
import { PrismaClient } from "@prisma/client"
import {
  BenchmarkDataset,
  BenchmarkGpu,
  BenchmarkListing,
  GPUS_PATH,
  LISTINGS_PATH,
} from "../pkgs/server/exclusionBenchmark/dataset"

// Reads only. Point POSTGRES_PRISMA_URL at a read-only role on the production
// database, then run from packages/web-app:
//   npx tsx src/scripts/export-exclusion-benchmark.ts && npx prettier --write src/pkgs/server/exclusionBenchmark/gpus.json

type Row = Omit<BenchmarkListing, "label" | "hasAffiliateUrl"> & {
  itemAffiliateWebUrl: string
}

const JSON_INDENT = 2

async function main() {
  const prisma = new PrismaClient()

  // Positives: every listing ever excluded, one row per itemId (the latest).
  // Exclusions apply to all rows of an itemId, so archived rows count.
  const excluded = await prisma.$queryRaw<Row[]>`
    SELECT DISTINCT ON ("itemId")
      "itemId", source, "gpuName", title, "priceValue", "buyingOptions",
      condition, "conditionId", "itemGroupType", "sellerFeedbackPercentage",
      "itemAffiliateWebUrl", "excludeReason"
    FROM "Listing"
    WHERE exclude = true
    ORDER BY "itemId", "cachedAt" DESC`

  // Negatives: what is live on the site now.
  const live = await prisma.$queryRaw<Row[]>`
    SELECT
      "itemId", source, "gpuName", title, "priceValue", "buyingOptions",
      condition, "conditionId", "itemGroupType", "sellerFeedbackPercentage",
      "itemAffiliateWebUrl", "excludeReason"
    FROM "Listing"
    WHERE archived = false AND exclude = false
    ORDER BY "itemId"`

  const excludedIds = new Set(excluded.map((r) => r.itemId))
  for (const r of live.filter((r) => excludedIds.has(r.itemId))) {
    console.warn(
      `${r.itemId} is live and was excluded before; kept as a positive only: ${r.title}`,
    )
  }

  const toListing =
    (label: BenchmarkListing["label"]) =>
    ({ itemAffiliateWebUrl, ...r }: Row): BenchmarkListing => ({
      ...r,
      hasAffiliateUrl: Boolean(itemAffiliateWebUrl),
      label,
    })
  const listings = [
    ...excluded.map(toListing("exclude")),
    ...live.filter((r) => !excludedIds.has(r.itemId)).map(toListing("keep")),
  ]

  const gpuNames = [...new Set(listings.map((l) => l.gpuName))].sort()
  const gpus = await prisma.$queryRaw<BenchmarkGpu[]>`
    SELECT name, label, "memoryCapacityGB"
    FROM gpu
    WHERE name = ANY(${gpuNames})
    ORDER BY name`
  await prisma.$disconnect()

  const header: Omit<BenchmarkDataset, "listings"> = {
    exportedAt: new Date().toISOString(),
    gpus,
  }
  await writeFile(GPUS_PATH, JSON.stringify(header, null, JSON_INDENT) + "\n")
  await writeFile(
    LISTINGS_PATH,
    listings.map((l) => JSON.stringify(l) + "\n").join(""),
  )
  console.log(
    `wrote ${excluded.length} excluded and ${listings.length - excluded.length} live listings to ${LISTINGS_PATH}`,
  )
}

/* eslint-disable unicorn/prefer-top-level-await -- tsx runs this file as CommonJS */
main().catch((error) => {
  console.error(error)
  /* eslint-disable unicorn/no-process-exit -- because this is a CLI script */
  process.exit(1)
})
