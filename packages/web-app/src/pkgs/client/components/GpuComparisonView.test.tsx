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
        gpu1={gpu}
        gpu2={gpu}
        gpu1SpecPercentages={{} as never}
        gpu2SpecPercentages={{} as never}
        gpu1Benchmarks={[]}
        gpu2Benchmarks={[]}
        benchmarkData={[]}
        gpu1PriceStats={stats}
        gpu2PriceStats={stats}
        gpuOptions={[]}
      />,
    )
    expect(html.split(`† ${NOTE}`)).toHaveLength(3)
  })
})
