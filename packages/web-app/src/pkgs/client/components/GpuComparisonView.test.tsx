import { renderToStaticMarkup } from "react-dom/server"
import { GpuComparisonView } from "./GpuComparisonView"
import { gpuWithNotes } from "@/testing/gpuFixture"

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }))
jest.mock("./GpuSelector", () => ({ GpuSelector: () => null }))

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
