const RELOAD_KEY = "chunk-load-reloaded"

export function isChunkLoadError(reason: unknown): boolean {
  if (!reason || typeof reason !== "object") return false
  const { name, message } = reason as { name?: unknown; message?: unknown }
  return (
    name === "ChunkLoadError" ||
    (typeof message === "string" && /Loading chunk [\w-]+ failed/.test(message))
  )
}

/**
 * After a deploy the chunk names a stale page asks for no longer exist. Reload
 * once to pick up the new build; the sessionStorage flag stops a reload loop
 * if the chunk is genuinely unavailable.
 */
export function reloadOnceOnChunkError(
  reason: unknown,
  storage: Pick<Storage, "getItem" | "setItem">,
  reload: () => void,
): boolean {
  if (!isChunkLoadError(reason)) return false
  if (storage.getItem(RELOAD_KEY)) return false
  storage.setItem(RELOAD_KEY, "1")
  reload()
  return true
}
