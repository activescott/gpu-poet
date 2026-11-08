"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"

import type { JSX, KeyboardEvent } from "react"

export interface GpuOption {
  name: string
  label: string
}

interface GpuSelectorProps {
  gpuOptions: GpuOption[]
  selectedGpuSlug?: string
  otherSelectedSlug?: string
  /** Slugs to leave out of the options (e.g. every GPU already on the page). */
  excludeSlugs?: string[]
  placeholder?: string
  baseUrl?: string
  onSelect?: (slug: string) => void
}

const MIN_SEARCH_LENGTH = 0
const HIGHLIGHT_INDEX_NONE = -1

/**
 * GPU selector with autocomplete/typeahead functionality.
 * Can be used standalone (with onSelect callback) or for navigation (with baseUrl).
 */
export function GpuSelector({
  gpuOptions,
  selectedGpuSlug,
  otherSelectedSlug,
  excludeSlugs = [],
  placeholder = "Search for a GPU...",
  baseUrl,
  onSelect,
}: GpuSelectorProps): JSX.Element {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(HIGHLIGHT_INDEX_NONE)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedGpu = gpuOptions.find((gpu) => gpu.name === selectedGpuSlug)

  // Filter options: exclude the other selected GPU and filter by search
  const filteredOptions = gpuOptions
    .filter(
      (gpu) =>
        gpu.name !== otherSelectedSlug && !excludeSlugs.includes(gpu.name),
    )
    .filter(
      (gpu) =>
        search.length >= MIN_SEARCH_LENGTH &&
        gpu.label.toLowerCase().includes(search.toLowerCase()),
    )

  const handleSelect = useCallback(
    (slug: string) => {
      setSearch("")
      setIsOpen(false)
      setHighlightedIndex(HIGHLIGHT_INDEX_NONE)

      if (onSelect) {
        onSelect(slug)
      } else if (baseUrl) {
        router.push(`${baseUrl}/${slug}`)
      }
    },
    [onSelect, baseUrl, router],
  )

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true)
      }
      return
    }

    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault()
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev,
        )
        break
      }
      case "ArrowUp": {
        e.preventDefault()
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev))
        break
      }
      case "Enter": {
        e.preventDefault()
        if (
          highlightedIndex >= 0 &&
          highlightedIndex < filteredOptions.length
        ) {
          handleSelect(filteredOptions[highlightedIndex].name)
        }
        break
      }
      case "Escape": {
        setIsOpen(false)
        setHighlightedIndex(HIGHLIGHT_INDEX_NONE)
        break
      }
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setHighlightedIndex(HIGHLIGHT_INDEX_NONE)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Reset highlighted index when filtered options change
  useEffect(() => {
    setHighlightedIndex(HIGHLIGHT_INDEX_NONE)
  }, [search])

  return (
    <div ref={dropdownRef} className="position-relative">
      <div className="input-group">
        <input
          ref={inputRef}
          type="text"
          className="form-control"
          placeholder={selectedGpu ? selectedGpu.label : placeholder}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          aria-label="Search for a GPU"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls="gpu-selector-dropdown"
        />
        {selectedGpu && (
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => {
              setSearch("")
              inputRef.current?.focus()
            }}
            aria-label="Clear selection"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        )}
      </div>

      {isOpen && filteredOptions.length > 0 && (
        <ul
          id="gpu-selector-dropdown"
          className="dropdown-menu show w-100"
          style={{ maxHeight: "300px", overflowY: "auto" }}
          role="listbox"
        >
          {filteredOptions.map((gpu, index) => (
            <li key={gpu.name}>
              <button
                type="button"
                className={`dropdown-item ${index === highlightedIndex ? "active" : ""} ${gpu.name === selectedGpuSlug ? "fw-bold" : ""}`}
                onClick={() => handleSelect(gpu.name)}
                onMouseEnter={() => setHighlightedIndex(index)}
                role="option"
                aria-selected={gpu.name === selectedGpuSlug}
              >
                {gpu.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      {isOpen &&
        search.length >= MIN_SEARCH_LENGTH &&
        filteredOptions.length === 0 && (
          <div className="dropdown-menu show w-100">
            <span className="dropdown-item text-muted">No GPUs found</span>
          </div>
        )}
    </div>
  )
}
