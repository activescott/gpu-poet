import Page, { generateMetadata } from "./page"
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

  it("builds three-way metadata with a sorted canonical for any order", async () => {
    mockFindGpu.mockImplementation(
      async (slug: string) =>
        ({ name: slug, label: slug.toUpperCase() }) as never,
    )
    const meta = await generateMetadata(props("c", "a", "b"))
    expect(meta.title).toBe("C vs A vs B - GPU Comparison | GPU Poet")
    expect(meta.description).toContain("C, A, and B")
    expect(meta.alternates?.canonical).toBe(
      "https://gpupoet.com/gpu/compare/a/vs/b/vs/c",
    )
  })

  it("falls back to the generic description for an unknown slug", async () => {
    mockFindGpu.mockResolvedValue(null)
    const meta = await generateMetadata(props("a", "b", "c"))
    expect(meta.description).toBe("Compare three GPUs side-by-side.")
  })
})
