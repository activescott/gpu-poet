"use client"
import { useEffect, type JSX } from "react"
import { reloadOnceOnChunkError } from "@/pkgs/client/chunkReload"

/** Reloads the page once when a code-split chunk fails to load after a deploy. */
export function ChunkReload(): JSX.Element {
  useEffect(() => {
    const handle = (reason: unknown) => {
      try {
        reloadOnceOnChunkError(reason, window.sessionStorage, () =>
          window.location.reload(),
        )
      } catch {
        // sessionStorage can be unavailable (privacy mode); skip the reload.
      }
    }
    const onError = (e: ErrorEvent) => handle(e.error)
    const onRejection = (e: PromiseRejectionEvent) => handle(e.reason)
    window.addEventListener("error", onError)
    window.addEventListener("unhandledrejection", onRejection)
    return () => {
      window.removeEventListener("error", onError)
      window.removeEventListener("unhandledrejection", onRejection)
    }
  }, [])
  return <></>
}
