import { NextRequest, NextResponse } from "next/server"
import { SERVER_CONFIG } from "@/pkgs/isomorphic/config"
import { createLogger } from "@/lib/logger"

const log = createLogger("middleware")

const POSTHOG_INGESTION_HOST = "https://us.i.posthog.com"

const EXCLUDE_LISTING_PATH = "/internal/api/exclude-listing"

// Set by this middleware on every authenticated request, overwriting any
// value a client sent, so the exclude-listing route can log who acted
// without trusting a client-supplied header.
export const AUTH_USER_HEADER = "x-internal-auth-user"

// eslint-disable-next-line import/no-unused-modules -- Next.js middleware convention
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/a/")) {
    return handlePostHogProxy(request)
  }
  return handleInternalAuth(request)
}

/**
 * Proxy PostHog ingestion requests, forwarding the real client IP via
 * X-Forwarded-For so PostHog can geo-locate visitors correctly.
 * Replaces the next.config.mjs rewrite which lost the client IP.
 */
async function handlePostHogProxy(request: NextRequest): Promise<Response> {
  const pathname = request.nextUrl.pathname.replace(/^\/a/, "")
  const search = request.nextUrl.search
  const destination = `${POSTHOG_INGESTION_HOST}${pathname}${search}`

  const headers = new Headers(request.headers)
  // Traefik sets X-Forwarded-For with the real client IP; forward it to PostHog.
  const clientIp = request.headers.get("x-forwarded-for") ?? "unknown"
  headers.set("X-Forwarded-For", clientIp)
  // Remove host header so it isn't sent as the K8s internal hostname
  headers.delete("host")

  return fetch(destination, {
    method: request.method,
    headers,
    body: request.method === "GET" ? undefined : request.body,
    // @ts-expect-error -- duplex is required for streaming request bodies in Node but not in the TS types yet
    duplex: "half",
  })
}

// Constant-time string comparison so a mismatch doesn't return faster for an
// early wrong character, which would let an attacker time their way to a
// valid credential.
function constantTimeEqual(a: string, b: string): boolean {
  const maxLength = Math.max(a.length, b.length)
  let diff = a.length === b.length ? 0 : 1
  for (let i = 0; i < maxLength; i++) {
    const charA = a.codePointAt(i) ?? 0
    const charB = b.codePointAt(i) ?? 0
    diff |= charA ^ charB
  }
  return diff === 0
}

function credentialsMatch(
  providedUsername: string,
  providedPassword: string,
  username: string,
  password: string,
): boolean {
  return (
    constantTimeEqual(providedUsername, username) &&
    constantTimeEqual(providedPassword, password)
  )
}

function unauthorized(): NextResponse {
  return new NextResponse("Unauthorized", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Internal"' },
  })
}

function allow(request: NextRequest, username: string): NextResponse {
  const headers = new Headers(request.headers)
  headers.set(AUTH_USER_HEADER, username)
  return NextResponse.next({ request: { headers } })
}

function handleInternalAuth(request: NextRequest) {
  let adminUsername: string
  let adminPassword: string
  try {
    adminUsername = SERVER_CONFIG.ADMIN_USERNAME()
    adminPassword = SERVER_CONFIG.ADMIN_PASSWORD()
  } catch (error) {
    log.error({ err: error }, "Internal auth middleware configuration error")
    return new NextResponse("Internal Server Error", { status: 500 })
  }

  const authHeader = request.headers.get("authorization")
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return unauthorized()
  }

  const base64Credentials = authHeader.slice("Basic ".length)
  let decoded: string
  try {
    decoded = atob(base64Credentials)
  } catch {
    return unauthorized()
  }

  const separatorIndex = decoded.indexOf(":")
  if (separatorIndex === -1) {
    return unauthorized()
  }

  const providedUsername = decoded.slice(0, separatorIndex)
  const providedPassword = decoded.slice(separatorIndex + 1)

  if (
    credentialsMatch(
      providedUsername,
      providedPassword,
      adminUsername,
      adminPassword,
    )
  ) {
    return allow(request, providedUsername)
  }

  // The excluder credential is optional; unset means disabled. Treating an
  // empty value as unset too keeps an empty password from ever matching.
  const excluderUsername = SERVER_CONFIG.EXCLUDER_USERNAME()
  const excluderPassword = SERVER_CONFIG.EXCLUDER_PASSWORD()
  const excluderConfigured = !!excluderUsername && !!excluderPassword

  if (
    excluderConfigured &&
    credentialsMatch(
      providedUsername,
      providedPassword,
      excluderUsername,
      excluderPassword,
    )
  ) {
    const isExcludeListingRequest =
      request.method === "POST" &&
      request.nextUrl.pathname === EXCLUDE_LISTING_PATH
    if (!isExcludeListingRequest) {
      return new NextResponse("Forbidden", { status: 403 })
    }
    return allow(request, providedUsername)
  }

  return unauthorized()
}

// eslint-disable-next-line import/no-unused-modules -- Next.js middleware convention
export const config = {
  matcher: ["/internal/:path*", "/a/:path*"],
}
