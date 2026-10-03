import { NextRequest } from "next/server"
import { GET } from "./route"
import { findGpu, getGpu } from "../../../../../pkgs/server/db/GpuRepository"
import { getGpuPriceHistoryConfig } from "../../../../../pkgs/server/components/charts"

jest.mock("../../../../../pkgs/server/db/GpuRepository")
jest.mock("../../../../../pkgs/server/charts", () => ({
  composeChartImage: jest.fn(),
}))
jest.mock("../../../../../pkgs/server/components/charts", () => ({
  getGpuPriceHistoryConfig: jest.fn(),
}))

const mockFindGpu = findGpu as jest.MockedFunction<typeof findGpu>
const mockGetGpu = getGpu as jest.MockedFunction<typeof getGpu>

describe("/api/images/chart/GpuPriceHistoryChart with an unknown gpu", () => {
  beforeEach(() => {
    mockFindGpu.mockResolvedValue(null)
    mockGetGpu.mockRejectedValue(new Error("Gpu not found"))
  })

  it("returns 404", async () => {
    const response = await GET(
      new NextRequest(
        "http://localhost/api/images/chart/GpuPriceHistoryChart?gpu=nvidia-rtx-a4000",
      ),
    )
    expect(response.status).toBe(404)
    expect(getGpuPriceHistoryConfig).not.toHaveBeenCalled()
  })
})
