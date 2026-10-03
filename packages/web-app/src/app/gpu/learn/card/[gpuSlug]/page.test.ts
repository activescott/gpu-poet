import Page, { generateMetadata } from "./page"
import { findGpu, getGpu } from "../../../../../pkgs/server/db/GpuRepository"

jest.mock("../../../../../pkgs/server/db/GpuRepository")
jest.mock("../../../../../pkgs/server/db/ListingRepository")
jest.mock("../../../../../pkgs/client/components/GpuInfo", () => ({
  GpuInfo: jest.fn(),
}))
jest.mock("../../../../../pkgs/server/components/charts", () => ({
  GpuPriceHistoryChart: jest.fn(),
}))

const mockFindGpu = findGpu as jest.MockedFunction<typeof findGpu>
const mockGetGpu = getGpu as jest.MockedFunction<typeof getGpu>

const NOT_FOUND_DIGEST = "NEXT_HTTP_ERROR_FALLBACK;404"

function propsFor(gpuSlug: string) {
  return { params: Promise.resolve({ gpuSlug }) }
}

describe("/gpu/learn/card/[gpuSlug] with an unknown slug", () => {
  beforeEach(() => {
    mockFindGpu.mockResolvedValue(null)
    mockGetGpu.mockRejectedValue(new Error("Gpu not found"))
  })

  it("renders the 404 page instead of throwing", async () => {
    await expect(Page(propsFor("nvidia-rtx-a4000"))).rejects.toMatchObject({
      digest: NOT_FOUND_DIGEST,
    })
  })

  it("returns 404 from generateMetadata", async () => {
    await expect(
      generateMetadata(propsFor("nvidia-rtx-a4000")),
    ).rejects.toMatchObject({ digest: NOT_FOUND_DIGEST })
  })
})
