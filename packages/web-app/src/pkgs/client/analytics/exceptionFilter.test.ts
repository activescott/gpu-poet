import type { CaptureResult } from "posthog-js"
import { dropNoiseExceptions, isNoiseException } from "./exceptionFilter"

const ORIGIN = "https://gpupoet.com"

function exception(value: string, filenames: string[] = []): CaptureResult {
  return {
    uuid: "u",
    event: "$exception",
    properties: {
      $exception_list: [
        {
          type: "TypeError",
          value,
          stacktrace: { frames: filenames.map((filename) => ({ filename })) },
        },
      ],
    },
  }
}

describe("isNoiseException", () => {
  it.each([
    ["chrome extension frames", ["chrome-extension://abc/inject.js"]],
    ["firefox extension frames", ["moz-extension://abc/inject.js"]],
    ["safari extension frames", ["safari-extension://abc/inject.js"]],
    ["third-party only frames", ["https://cdn.example.com/x.js"]],
  ])("drops %s", (_name, frames) => {
    expect(isNoiseException(exception("boom", frames), ORIGIN)).toBe(true)
  })

  it("drops window.ethereum errors even with a first-party frame", () => {
    const e = exception(
      "undefined is not an object (evaluating 'window.ethereum.selectedAddress = undefined')",
      [`${ORIGIN}/_next/static/chunks/a.js`],
    )
    expect(isNoiseException(e, ORIGIN)).toBe(true)
  })

  it("drops a bare Script error. with no stack", () => {
    expect(isNoiseException(exception("Script error."), ORIGIN)).toBe(true)
  })

  it("keeps an exception with a first-party frame", () => {
    const e = exception("boom", [
      "chrome-extension://abc/inject.js",
      `${ORIGIN}/_next/static/chunks/a.js`,
    ])
    expect(isNoiseException(e, ORIGIN)).toBe(false)
  })

  it("keeps a stackless exception that is not Script error.", () => {
    expect(isNoiseException(exception("something else"), ORIGIN)).toBe(false)
  })

  it("keeps Script error. when it has a first-party frame", () => {
    const e = exception("Script error.", [`${ORIGIN}/a.js`])
    expect(isNoiseException(e, ORIGIN)).toBe(false)
  })

  it("keeps non-exception events", () => {
    const e: CaptureResult = {
      uuid: "u",
      event: "$pageview",
      properties: { $current_url: "chrome-extension://x" },
    }
    expect(isNoiseException(e, ORIGIN)).toBe(false)
  })
})

describe("dropNoiseExceptions", () => {
  it("returns null for noise and the event otherwise", () => {
    const noise = exception("Script error.")
    const real = exception("boom", ["/a.js"])
    expect(dropNoiseExceptions(noise)).toBeNull()
    expect(dropNoiseExceptions(real)).toBe(real)
  })
})
