import { NextResponse } from "next/server"
import { excludeListingForDataQuality } from "@/pkgs/server/db/ListingRepository"
import { EXCLUDE_REASONS } from "@/pkgs/isomorphic/model/listing"
import { createLogger } from "@/lib/logger"
import { AUTH_USER_HEADER } from "@/middleware"

const log = createLogger("internal:api:exclude-listing")

const validReasons = new Set(Object.values(EXCLUDE_REASONS))

export async function POST(request: Request) {
  const excludedBy = request.headers.get(AUTH_USER_HEADER) ?? "unknown"
  try {
    const body = await request.json()
    const { itemId, reason } = body

    if (!itemId || typeof itemId !== "string") {
      return NextResponse.json(
        { error: "itemId is required and must be a string" },
        { status: 400 },
      )
    }

    if (!reason || !validReasons.has(reason)) {
      return NextResponse.json(
        {
          error: `reason must be one of: ${[...validReasons].join(", ")}`,
        },
        { status: 400 },
      )
    }

    await excludeListingForDataQuality(itemId, reason)

    log.info(
      { excludedBy },
      `Manually excluded listing ${itemId} with reason: ${reason}`,
    )

    return NextResponse.json({ success: true, itemId, reason })
  } catch (error) {
    log.error({ err: error }, "Error excluding listing")
    return NextResponse.json(
      { error: "Failed to exclude listing" },
      { status: 500 },
    )
  }
}

// Rendered per request: this route reads the database, which is not reachable
// during the Docker image build.
export const dynamic = "force-dynamic"
