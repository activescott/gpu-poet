import { isChunkLoadError, reloadOnceOnChunkError } from "./chunkReload"

function memoryStorage() {
  const m = new Map<string, string>()
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
  }
}

describe("chunk reload", () => {
  it("recognises chunk load errors", () => {
    expect(isChunkLoadError({ name: "ChunkLoadError" })).toBe(true)
    expect(isChunkLoadError(new Error("Loading chunk 9391 failed."))).toBe(true)
    expect(isChunkLoadError(new Error("other"))).toBe(false)
    expect(isChunkLoadError(null)).toBe(false)
  })

  it("reloads once, then not again", () => {
    const storage = memoryStorage()
    const reload = jest.fn()
    const err = { name: "ChunkLoadError" }
    expect(reloadOnceOnChunkError(err, storage, reload)).toBe(true)
    expect(reloadOnceOnChunkError(err, storage, reload)).toBe(false)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it("ignores other errors", () => {
    const reload = jest.fn()
    reloadOnceOnChunkError(new Error("x"), memoryStorage(), reload)
    expect(reload).not.toHaveBeenCalled()
  })
})
