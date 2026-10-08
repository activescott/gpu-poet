import { renderToStaticMarkup } from "react-dom/server"
import { GpuQuickInfo } from "./GpuQuickInfo"
import { gpuWithNotes } from "@/testing/gpuFixture"

const NOTE = "Estimated MSRP of $99,696 USD from the Cisco list price."

describe("GpuQuickInfo MSRP", () => {
  it("adds a dagger and a footnote for an estimated MSRP", () => {
    const html = renderToStaticMarkup(
      <GpuQuickInfo gpu={gpuWithNotes(["Other note.", NOTE])} />,
    )
    expect(html).toContain("MSRP: $99,696 USD<sup>†</sup>")
    expect(html).toContain(`† ${NOTE}`)
    expect(html).not.toContain("Other note.")
  })

  it("shows the MSRP alone when there is no estimate note", () => {
    const html = renderToStaticMarkup(
      <GpuQuickInfo gpu={gpuWithNotes(["Some other note."])} />,
    )
    expect(html).toContain("MSRP: $99,696 USD")
    expect(html).not.toContain("†")
  })
})
