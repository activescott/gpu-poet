import { NextRequest, NextResponse } from "next/server"
import { middleware, AUTH_USER_HEADER } from "./middleware"
import { SERVER_CONFIG } from "@/pkgs/isomorphic/config"

jest.mock("./pkgs/isomorphic/config", () => ({
  SERVER_CONFIG: {
    ADMIN_USERNAME: jest.fn(),
    ADMIN_PASSWORD: jest.fn(),
    EXCLUDER_USERNAME: jest.fn(),
    EXCLUDER_PASSWORD: jest.fn(),
  },
}))

const mockConfig = SERVER_CONFIG as jest.Mocked<typeof SERVER_CONFIG>

const ADMIN_USERNAME = "admin"
const ADMIN_PASSWORD = "admin-secret"
const EXCLUDER_USERNAME = "excluder"
const EXCLUDER_PASSWORD = "excluder-secret"

function basicAuthHeader(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`
}

function requestFor(
  path: string,
  method: string,
  authHeader?: string,
): NextRequest {
  return new NextRequest(`http://internal.example${path}`, {
    method,
    headers: authHeader ? { authorization: authHeader } : undefined,
  })
}

// Internal-path requests never hit the async PostHog proxy branch, so this
// is always a NextResponse, not a Promise.
function runMiddleware(request: NextRequest): NextResponse {
  return middleware(request) as NextResponse
}

describe("middleware internal auth", () => {
  beforeEach(() => {
    mockConfig.ADMIN_USERNAME.mockReturnValue(ADMIN_USERNAME)
    mockConfig.ADMIN_PASSWORD.mockReturnValue(ADMIN_PASSWORD)
    mockConfig.EXCLUDER_USERNAME.mockReturnValue(EXCLUDER_USERNAME)
    mockConfig.EXCLUDER_PASSWORD.mockReturnValue(EXCLUDER_PASSWORD)
  })

  it("allows the admin credential on the exclude-listing route", () => {
    const response = runMiddleware(
      requestFor(
        "/internal/api/exclude-listing",
        "POST",
        basicAuthHeader(ADMIN_USERNAME, ADMIN_PASSWORD),
      ),
    )
    expect(response.status).not.toBe(401)
    expect(response.status).not.toBe(403)
  })

  it("allows the admin credential on other internal routes", () => {
    const response = runMiddleware(
      requestFor(
        "/internal/api/some-other-route",
        "GET",
        basicAuthHeader(ADMIN_USERNAME, ADMIN_PASSWORD),
      ),
    )
    expect(response.status).not.toBe(401)
    expect(response.status).not.toBe(403)
  })

  it("allows the excluder credential on POST /internal/api/exclude-listing", () => {
    const response = runMiddleware(
      requestFor(
        "/internal/api/exclude-listing",
        "POST",
        basicAuthHeader(EXCLUDER_USERNAME, EXCLUDER_PASSWORD),
      ),
    )
    expect(response.status).not.toBe(401)
    expect(response.status).not.toBe(403)
  })

  it("forwards the excluder's username in the auth user header, not a client-supplied value", () => {
    const request = requestFor(
      "/internal/api/exclude-listing",
      "POST",
      basicAuthHeader(EXCLUDER_USERNAME, EXCLUDER_PASSWORD),
    )
    request.headers.set(AUTH_USER_HEADER, "spoofed")
    const response = runMiddleware(request)
    const overrideHeaders = response.headers.get(
      "x-middleware-override-headers",
    )
    expect(overrideHeaders).toContain(AUTH_USER_HEADER)
    expect(
      response.headers.get(`x-middleware-request-${AUTH_USER_HEADER}`),
    ).toBe(EXCLUDER_USERNAME)
  })

  it("rejects the excluder credential with 403 on other internal routes", () => {
    const response = runMiddleware(
      requestFor(
        "/internal/api/some-other-route",
        "GET",
        basicAuthHeader(EXCLUDER_USERNAME, EXCLUDER_PASSWORD),
      ),
    )
    expect(response.status).toBe(403)
  })

  it("rejects the excluder credential with 403 on exclude-listing via GET", () => {
    const response = runMiddleware(
      requestFor(
        "/internal/api/exclude-listing",
        "GET",
        basicAuthHeader(EXCLUDER_USERNAME, EXCLUDER_PASSWORD),
      ),
    )
    expect(response.status).toBe(403)
  })

  it("rejects a wrong password with 401", () => {
    const response = runMiddleware(
      requestFor(
        "/internal/api/exclude-listing",
        "POST",
        basicAuthHeader(EXCLUDER_USERNAME, "wrong-password"),
      ),
    )
    expect(response.status).toBe(401)
  })

  it("rejects a wrong admin password with 401", () => {
    const response = runMiddleware(
      requestFor(
        "/internal/api/some-other-route",
        "GET",
        basicAuthHeader(ADMIN_USERNAME, "wrong-password"),
      ),
    )
    expect(response.status).toBe(401)
  })

  it("disables the excluder credential entirely when unset", () => {
    // eslint-disable-next-line unicorn/no-useless-undefined -- mockReturnValue requires an argument
    mockConfig.EXCLUDER_USERNAME.mockReturnValue(undefined)
    // eslint-disable-next-line unicorn/no-useless-undefined -- mockReturnValue requires an argument
    mockConfig.EXCLUDER_PASSWORD.mockReturnValue(undefined)

    const response = runMiddleware(
      requestFor(
        "/internal/api/exclude-listing",
        "POST",
        basicAuthHeader(EXCLUDER_USERNAME, EXCLUDER_PASSWORD),
      ),
    )
    expect(response.status).toBe(401)
  })

  it("never lets an empty excluder password through, even if configured as empty", () => {
    mockConfig.EXCLUDER_USERNAME.mockReturnValue(EXCLUDER_USERNAME)
    mockConfig.EXCLUDER_PASSWORD.mockReturnValue("")

    const response = runMiddleware(
      requestFor(
        "/internal/api/exclude-listing",
        "POST",
        basicAuthHeader(EXCLUDER_USERNAME, ""),
      ),
    )
    expect(response.status).toBe(401)
  })

  it("returns 401 with no Authorization header", () => {
    const response = runMiddleware(
      requestFor("/internal/api/exclude-listing", "POST"),
    )
    expect(response.status).toBe(401)
  })

  it("returns 500 if admin config is missing, without ever authenticating", () => {
    mockConfig.ADMIN_USERNAME.mockImplementation(() => {
      throw new Error("Missing environment variable ADMIN_USERNAME")
    })
    const response = runMiddleware(
      requestFor(
        "/internal/api/exclude-listing",
        "POST",
        basicAuthHeader(EXCLUDER_USERNAME, EXCLUDER_PASSWORD),
      ),
    )
    expect(response.status).toBe(500)
  })
})
