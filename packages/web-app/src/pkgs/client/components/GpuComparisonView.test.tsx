import { renderToStaticMarkup } from "react-dom/server"
import { AddThirdGpu } from "./AddThirdGpu"
import { GpuComparisonView, getWinner } from "./GpuComparisonView"
import { gpuWithNotes } from "@/testing/gpuFixture"

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }))
const selectorProps: Record<string, unknown>[] = []
jest.mock("./GpuSelector", () => ({
  GpuSelector: (p: Record<string, unknown>) => {
    selectorProps.push(p)
    return null
  },
}))

const NOTE = "Estimated MSRP of $99,696 USD from the Cisco list price."
const stats = { minPrice: 1, avgPrice: 2, activeListingCount: 3 }

describe("GpuComparisonView MSRP footnote", () => {
  it("prints the estimate note once per GPU column", () => {
    const gpu = gpuWithNotes([NOTE])
    const html = renderToStaticMarkup(
      <GpuComparisonView
        gpus={[
          { gpu, specPercentages: {} as never, priceStats: stats },
          { gpu, specPercentages: {} as never, priceStats: stats },
        ]}
        benchmarkData={[]}
        gpuOptions={[]}
      />,
    )
    expect(html.split(`† ${NOTE}`)).toHaveLength(3)
  })
})

const named = (name: string) => ({ ...gpuWithNotes([]), name, label: name })

describe("GpuComparisonView with three GPUs", () => {
  it("renders a column per GPU and no add-GPU selector", () => {
    const html = renderToStaticMarkup(
      <GpuComparisonView
        gpus={["aa", "bb", "cc"].map((n) => ({
          gpu: named(n),
          specPercentages: {} as never,
          priceStats: stats,
        }))}
        benchmarkData={[]}
        gpuOptions={[]}
      />,
    )
    expect(html).toContain("aa vs bb vs cc")
    expect(html.match(/col-md-4/g)).toHaveLength(6)
    expect(html).not.toContain("Add a third GPU")
  })
})

describe("GpuComparisonView add-third selector", () => {
  it("excludes every GPU already on the page and navigates to three", () => {
    selectorProps.length = 0
    const html = renderToStaticMarkup(
      <GpuComparisonView
        gpus={["aa", "bb"].map((n) => ({
          gpu: named(n),
          specPercentages: {} as never,
          priceStats: stats,
        }))}
        benchmarkData={[]}
        gpuOptions={[]}
      />,
    )
    expect(html).toContain('aria-label="Add a third GPU"')
    expect(html).toContain('title="Add a third GPU"')
    // slim strip for md+, full-width bar for phones; no always-open selector
    expect(html).toContain("d-none d-md-block")
    expect(html).toContain("d-md-none")
    expect(
      selectorProps.some((p) => p.placeholder === "Add a third GPU..."),
    ).toBe(false)
    const change = selectorProps.find(
      (p) => p.placeholder === "Change GPU 1...",
    )
    expect(change?.excludeSlugs).toEqual(["bb"])
  })
})

describe("getWinner", () => {
  it("picks the leader only when it clears every other value by 5%", () => {
    expect(getWinner([100, 80, 60])).toBe(0)
    expect(getWinner([60, 100, 80])).toBe(1)
  })
  it("has no winner when the top two are within 5%", () => {
    expect(getWinner([100, 98, 50])).toBe(-1)
  })
  it("ignores missing values", () => {
    expect(getWinner([undefined, 100, 50])).toBe(1)
    expect(getWinner([undefined, undefined, undefined])).toBe(-1)
  })
})

describe("AddThirdGpu", () => {
  const render = (variant: "strip" | "bar", defaultOpen: boolean) => {
    selectorProps.length = 0
    return renderToStaticMarkup(
      <AddThirdGpu
        variant={variant}
        defaultOpen={defaultOpen}
        gpuOptions={[]}
        excludeSlugs={["aa", "bb"]}
        onSelect={jest.fn()}
      />,
    )
  }
  it.each(["strip", "bar"] as const)("%s is a labelled button, closed", (v) => {
    const html = render(v, false)
    expect(html).toContain('aria-label="Add a third GPU"')
    expect(html).toContain('title="Add a third GPU"')
    expect(html).toContain('aria-expanded="false"')
    expect(selectorProps).toHaveLength(0)
  })
  it("bar shows visible text; strip only the +", () => {
    expect(render("bar", false)).toContain("+</span><span")
    expect(render("strip", false)).not.toContain("ms-1")
  })
  it.each(["strip", "bar"] as const)(
    "%s opens the selector excluding page GPUs",
    (v) => {
      render(v, true)
      expect(selectorProps[0]?.excludeSlugs).toEqual(["aa", "bb"])
    },
  )
})
