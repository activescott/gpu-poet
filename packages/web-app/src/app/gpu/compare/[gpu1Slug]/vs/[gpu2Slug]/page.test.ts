import Page, { generateMetadata } from "./page"
import { findGpu, getGpu } from "../../../../../../pkgs/server/db/GpuRepository"
import { getPriceStats } from "../../../../../../pkgs/server/db/ListingRepository"

jest.mock("../../../../../../pkgs/server/db/GpuRepository")
jest.mock("../../../../../../pkgs/server/db/ListingRepository")

const mockFindGpu = findGpu as jest.MockedFunction<typeof findGpu>
const mockGetGpu = getGpu as jest.MockedFunction<typeof getGpu>

const NOT_FOUND_DIGEST = "NEXT_HTTP_ERROR_FALLBACK;404"

function propsFor(gpu1Slug: string, gpu2Slug: string) {
  return { params: Promise.resolve({ gpu1Slug, gpu2Slug }) }
}

describe("/gpu/compare/[gpu1Slug]/vs/[gpu2Slug] with an unknown slug", () => {
  beforeEach(() => {
    mockFindGpu.mockResolvedValue(null)
    mockGetGpu.mockRejectedValue(new Error("Gpu not found"))
  })

  it("renders the 404 page instead of throwing", async () => {
    await expect(
      Page(propsFor("amd-mi50-32gb", "nvidia-rtx-a4000")),
    ).rejects.toMatchObject({ digest: NOT_FOUND_DIGEST })
    expect(getPriceStats).not.toHaveBeenCalled()
  })

  it("returns the generic title from generateMetadata", async () => {
    await expect(
      generateMetadata(propsFor("amd-mi50-32gb", "nvidia-rtx-a4000")),
    ).resolves.toEqual({
      title: "GPU Comparison | GPU Poet",
      description: "Compare two GPUs side-by-side.",
    })
  })

  it("does not report a database error as 404", async () => {
    const dbError = new Error("connection refused")
    mockFindGpu.mockRejectedValue(dbError)
    mockGetGpu.mockRejectedValue(dbError)
    await expect(
      Page(propsFor("amd-mi50-32gb", "nvidia-rtx-a4000")),
    ).rejects.toBe(dbError)
  })
})
