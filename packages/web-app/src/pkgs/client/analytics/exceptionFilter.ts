import type { BeforeSendFn, CaptureResult } from "posthog-js"

const EXTENSION_PROTOCOLS = [
  "chrome-extension://",
  "moz-extension://",
  "safari-extension://",
  "safari-web-extension://",
]

interface ExceptionEntry {
  type?: string
  value?: string
  stacktrace?: { frames?: { filename?: string }[] }
}

function exceptionEntries(event: CaptureResult): ExceptionEntry[] {
  const list = event.properties?.$exception_list
  return Array.isArray(list) ? (list as ExceptionEntry[]) : []
}

function messages(event: CaptureResult): string[] {
  const out = exceptionEntries(event).map((e) => e.value ?? "")
  const legacy = event.properties?.$exception_message
  if (typeof legacy === "string") out.push(legacy)
  return out
}

function frameFilenames(event: CaptureResult): string[] {
  return exceptionEntries(event).flatMap((e) =>
    (e.stacktrace?.frames ?? []).map((f) => f.filename ?? ""),
  )
}

function isFirstParty(filename: string, origin: string): boolean {
  return filename.startsWith(origin) || filename.startsWith("/")
}

/**
 * True for `$exception` events that are not caused by our code: browser
 * extensions, injected wallets (`window.ethereum`), cross-origin
 * "Script error." with no stack, or a stack with no first-party frame.
 * An exception with no stack at all is kept unless it is a bare "Script error.".
 */
export function isNoiseException(
  event: CaptureResult,
  origin: string,
): boolean {
  if (event.event !== "$exception") return false

  const texts = messages(event)
  if (texts.some((t) => t.includes("window.ethereum"))) return true

  const frames = frameFilenames(event)
  if (frames.length === 0) {
    return texts.some((t) => /^(uncaught )?script error\.?$/i.test(t.trim()))
  }
  if (frames.every((f) => EXTENSION_PROTOCOLS.some((p) => f.startsWith(p)))) {
    return true
  }
  return !frames.some((f) => isFirstParty(f, origin))
}

/** PostHog `before_send`: returning null drops the event. */
export const dropNoiseExceptions: BeforeSendFn = (event) => {
  if (!event) return event
  const origin = typeof window === "undefined" ? "" : window.location.origin
  return isNoiseException(event, origin) ? null : event
}
