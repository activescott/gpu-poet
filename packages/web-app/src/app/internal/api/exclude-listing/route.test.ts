import { POST } from "./route"
import { excludeListingForDataQuality } from "../../../../pkgs/server/db/ListingRepository"

jest.mock("../../../../pkgs/server/db/ListingRepository")

const mockExcludeListingForDataQuality =
  excludeListingForDataQuality as jest.MockedFunction<
    typeof excludeListingForDataQuality
  >

function postRequest(body: unknown) {
  return new Request("http://localhost/internal/api/exclude-listing", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

describe("/internal/api/exclude-listing", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("POST", () => {
    it("excludes the listing and returns the updated count", async () => {
      mockExcludeListingForDataQuality.mockResolvedValueOnce(2)

      const response = await POST(
        postRequest({ itemId: "item-123", reason: "accessory" }),
      )
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        itemId: "item-123",
        reason: "accessory",
        updatedCount: 2,
      })
      expect(mockExcludeListingForDataQuality).toHaveBeenCalledWith(
        "item-123",
        "accessory",
      )
    })

    it("returns 404 when no listing matches the itemId", async () => {
      mockExcludeListingForDataQuality.mockResolvedValueOnce(0)

      const response = await POST(
        postRequest({ itemId: "missing-item", reason: "accessory" }),
      )
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toMatch(/missing-item/)
    })

    it("returns 400 when itemId is missing", async () => {
      const response = await POST(postRequest({ reason: "accessory" }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toMatch(/itemId/)
      expect(mockExcludeListingForDataQuality).not.toHaveBeenCalled()
    })

    it("returns 400 when reason is invalid", async () => {
      const response = await POST(
        postRequest({ itemId: "item-123", reason: "not-a-real-reason" }),
      )
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toMatch(/reason/)
      expect(mockExcludeListingForDataQuality).not.toHaveBeenCalled()
    })

    it("returns 500 when the repository call throws", async () => {
      mockExcludeListingForDataQuality.mockRejectedValueOnce(
        new Error("db error"),
      )

      const response = await POST(
        postRequest({ itemId: "item-123", reason: "accessory" }),
      )
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe("Failed to exclude listing")
    })
  })
})
