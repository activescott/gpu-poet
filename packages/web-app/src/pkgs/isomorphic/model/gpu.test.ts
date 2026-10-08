import { msrpNote } from "./gpu"

describe("msrpNote", () => {
  it("returns the first note starting with Estimated MSRP", () => {
    expect(
      msrpNote({
        notes: ["Unrelated.", "Estimated MSRP of $1 USD.", "Estimated MSRP 2."],
      }),
    ).toBe("Estimated MSRP of $1 USD.")
  })

  it("returns null when no note is an MSRP estimate", () => {
    expect(msrpNote({ notes: ["The MSRP is official."] })).toBeNull()
    expect(msrpNote({ notes: [] })).toBeNull()
  })
})
