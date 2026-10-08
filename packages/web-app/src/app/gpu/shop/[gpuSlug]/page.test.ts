import { gpuWithNotes } from "@/testing/gpuFixture"
import Page, { generateMetadata } from "./page"
import { findGpu } from "../../../../pkgs/server/db/GpuRepository"
import {
  getPriceStats,
  listActiveListingsForGpus,
} from "../../../../pkgs/server/db/ListingRepository"

jest.mock("../../../../pkgs/server/db/GpuRepository")
jest.mock("../../../../pkgs/server/db/ListingRepository")

const mockFindGpu = findGpu as jest.MockedFunction<typeof findGpu>

const NOT_FOUND_DIGEST = "NEXT_HTTP_ERROR_FALLBACK;404"

function propsFor(gpuSlug: string) {
  return {
    params: Promise.resolve({ gpuSlug }),
    searchParams: Promise.resolve({}),
  }
}

describe("/gpu/shop/[gpuSlug] with an unknown slug", () => {
  beforeEach(() => {
    mockFindGpu.mockResolvedValue(null)
  })

  it("renders the 404 page instead of throwing", async () => {
    await expect(Page(propsFor("nvidia-rtx-a4000"))).rejects.toMatchObject({
      digest: NOT_FOUND_DIGEST,
    })
    expect(listActiveListingsForGpus).not.toHaveBeenCalled()
  })

  it("returns 404 from generateMetadata", async () => {
    await expect(
      generateMetadata(propsFor("nvidia-rtx-a4000")),
    ).rejects.toMatchObject({ digest: NOT_FOUND_DIGEST })
    expect(getPriceStats).not.toHaveBeenCalled()
  })
})

describe("/gpu/shop/[gpuSlug] metadata MSRP clause", () => {
  const stats = {
    avgPrice: 30_000,
    minPrice: 28_000,
    maxPrice: 35_000,
    activeListingCount: 5,
    usedListingCount: 0,
    newListingCount: 5,
    usedMinPrice: null,
    latestListingDate: new Date(),
    representativeImageUrl: null,
  }

  beforeEach(() => {
    ;(getPriceStats as jest.Mock).mockResolvedValue(stats)
  })

  it("leaves the MSRP out of the description for an estimated MSRP", async () => {
    mockFindGpu.mockResolvedValue(
      gpuWithNotes(["Estimated MSRP of $99,696 USD from the Cisco list."]),
    )
    const { description } = await generateMetadata(propsFor("nvidia-h100-pcie"))
    expect(description).not.toContain("MSRP")
  })

  it("keeps the MSRP clause when the MSRP is not estimated", async () => {
    mockFindGpu.mockResolvedValue(gpuWithNotes([]))
    const { description } = await generateMetadata(propsFor("nvidia-h100-pcie"))
    expect(description).toContain("under the $99,696 MSRP")
  })
})
