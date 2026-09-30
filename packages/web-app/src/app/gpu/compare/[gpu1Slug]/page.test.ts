import Page, { generateMetadata } from "./page"
import {
  findGpu,
  getGpu,
  listGpus,
} from "../../../../pkgs/server/db/GpuRepository"

jest.mock("../../../../pkgs/server/db/GpuRepository")

const mockFindGpu = findGpu as jest.MockedFunction<typeof findGpu>
const mockGetGpu = getGpu as jest.MockedFunction<typeof getGpu>

const NOT_FOUND_DIGEST = "NEXT_HTTP_ERROR_FALLBACK;404"

function propsFor(gpu1Slug: string) {
  return { params: Promise.resolve({ gpu1Slug }) }
}

describe("/gpu/compare/[gpu1Slug] with an unknown slug", () => {
  beforeEach(() => {
    mockFindGpu.mockResolvedValue(null)
    mockGetGpu.mockRejectedValue(new Error("Gpu not found"))
  })

  it("renders the 404 page instead of throwing", async () => {
    await expect(Page(propsFor("nvidia-rtx-a4000"))).rejects.toMatchObject({
      digest: NOT_FOUND_DIGEST,
    })
    expect(listGpus).not.toHaveBeenCalled()
  })

  it("returns the generic title from generateMetadata", async () => {
    await expect(
      generateMetadata(propsFor("nvidia-rtx-a4000")),
    ).resolves.toEqual({ title: "Compare GPUs | GPU Poet" })
  })
})
