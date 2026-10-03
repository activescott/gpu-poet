import { parseDateRange, previousYearMonth } from "./types"

describe("parseDateRange", () => {
  it("returns the UTC calendar month", () => {
    const { startDate, endDate } = parseDateRange("2026-01")
    expect(startDate.toISOString()).toBe("2026-01-01T00:00:00.000Z")
    expect(endDate.toISOString()).toBe("2026-01-31T23:59:59.999Z")
  })

  it("is unaffected by a DST change inside the month", () => {
    const { startDate, endDate } = parseDateRange("2026-03")
    expect(startDate.toISOString()).toBe("2026-03-01T00:00:00.000Z")
    expect(endDate.toISOString()).toBe("2026-03-31T23:59:59.999Z")
  })
})

describe("previousYearMonth", () => {
  it("wraps January to December of the prior year", () => {
    expect(previousYearMonth("2026-01")).toBe("2025-12")
  })

  it("is unaffected by a DST change in either month", () => {
    expect(previousYearMonth("2026-03")).toBe("2026-02")
    expect(previousYearMonth("2026-04")).toBe("2026-03")
    expect(previousYearMonth("2026-11")).toBe("2026-10")
  })
})
