import Page from "./page"
import { findGpu } from "../../../../../../../../pkgs/server/db/GpuRepository"

jest.mock("../../../../../../../../pkgs/server/db/GpuRepository")
jest.mock("../../../../../../../../pkgs/server/db/ListingRepository")

const mockFindGpu = findGpu as jest.MockedFunction<typeof findGpu>

const props = (a: string, b: string, c: string) => ({
  params: Promise.resolve({ gpu1Slug: a, gpu2Slug: b, gpu3Slug: c }),
})

describe("/gpu/compare/[gpu1Slug]/vs/[gpu2Slug]/vs/[gpu3Slug]", () => {
  it("redirects non-alphabetical slugs to the canonical URL", async () => {
    await expect(Page(props("c", "a", "b"))).rejects.toMatchObject({
      digest: expect.stringContaining("/gpu/compare/a/vs/b/vs/c"),
    })
  })

  it("renders the 404 page for an unknown slug", async () => {
    mockFindGpu.mockResolvedValue(null)
    await expect(Page(props("a", "b", "c"))).rejects.toMatchObject({
      digest: "NEXT_HTTP_ERROR_FALLBACK;404",
    })
  })
})
