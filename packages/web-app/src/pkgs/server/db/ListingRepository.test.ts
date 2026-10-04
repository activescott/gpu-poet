import {
  excludeListingForDataQuality,
  getLatestListingDate,
  getPriceStats,
  topNListingsByCostPerformance,
} from "./ListingRepository"
import { PrismaClientWithinTransaction } from "./db"

function mockPrisma(count: number) {
  return {
    listing: {
      updateMany: jest.fn().mockResolvedValue({ count }),
    },
  } as unknown as PrismaClientWithinTransaction
}

describe("excludeListingForDataQuality", () => {
  it("excludes all rows for the itemId regardless of archived status", async () => {
    const prisma = mockPrisma(2)

    const count = await excludeListingForDataQuality(
      "item-123",
      "backplate",
      prisma,
    )

    expect(prisma.listing.updateMany).toHaveBeenCalledWith({
      where: { itemId: "item-123" },
      data: { exclude: true, excludeReason: "backplate" },
    })
    expect(count).toBe(2)
  })

  it("returns 0 when no listing matches the itemId", async () => {
    const prisma = mockPrisma(0)

    const count = await excludeListingForDataQuality(
      "missing-item",
      "backplate",
      prisma,
    )

    expect(count).toBe(0)
  })
})

describe("getPriceStats", () => {
  it.skip("should return a number", async () => {
    const result = await getPriceStats("nvidia-a100-pcie")
    console.log("result:", result)
    const props = ["avgPrice", "minPrice", "activeListingCount"]
    for (const prop of props) {
      expect(result).toHaveProperty(prop)
    }
    expect(result.avgPrice).toBeGreaterThan(0)
    expect(result.minPrice).toBeGreaterThan(0)
    expect(result.activeListingCount).toBeGreaterThan(0)
    expect(result.latestListingDate).toBeInstanceOf(Date)
  })
})

describe("topNListingsByCostPerformance", () => {
  it.skip("should return listings", async () => {
    const listings = await topNListingsByCostPerformance("fp32TFLOPS", 3)
    console.log("top n listings:", listings)
    expect(listings).toHaveLength(3)
  })
})

describe("getLatestListingDate", () => {
  it.skip("should return latest listing date", async () => {
    const result = await getLatestListingDate()
    console.log("latest listing date:", result)
    expect(result).toBeInstanceOf(Date)
  })
})
