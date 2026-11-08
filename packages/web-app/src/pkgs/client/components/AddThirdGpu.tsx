"use client"

import { useState } from "react"
import { GpuSelector, GpuOption } from "./GpuSelector"

import type { JSX } from "react"

const ADD_THIRD_LABEL = "Add a third GPU"

interface AddThirdGpuProps {
  gpuOptions: GpuOption[]
  /** GPUs already on the page; they are not offered. */
  excludeSlugs: string[]
  onSelect: (slug: string) => void
  /** "strip": slim "+" at the far right (md+). "bar": full-width button (phones). */
  variant: "strip" | "bar"
  defaultOpen?: boolean
}

/**
 * A "+" control that opens the GPU selector for a third GPU. The strip variant
 * is a narrow column that does not take a third column's width; the selector
 * opens in a popover beside it. The bar variant sits under the stacked cards.
 */
export function AddThirdGpu({
  gpuOptions,
  excludeSlugs,
  onSelect,
  variant,
  defaultOpen = false,
}: AddThirdGpuProps): JSX.Element {
  const [open, setOpen] = useState(defaultOpen)
  const [tip, setTip] = useState(false)
  const strip = variant === "strip"

  const selector = open && (
    <div
      className={
        strip
          ? "position-absolute top-0 end-100 me-2 bg-body border rounded shadow p-2"
          : "mt-2"
      }
      style={strip ? { width: "16rem", zIndex: 1050 } : undefined}
    >
      <GpuSelector
        gpuOptions={gpuOptions}
        excludeSlugs={excludeSlugs}
        placeholder={`${ADD_THIRD_LABEL}...`}
        onSelect={onSelect}
      />
    </div>
  )

  return (
    <div
      className={
        strip
          ? "d-none d-md-block position-relative flex-shrink-0 h-100"
          : "d-md-none mb-4"
      }
      style={strip ? { width: "2.5rem" } : undefined}
    >
      <button
        type="button"
        className={
          strip
            ? "btn btn-outline-secondary h-100 w-100 fs-4 p-0"
            : "btn btn-outline-secondary w-100"
        }
        aria-label={ADD_THIRD_LABEL}
        title={ADD_THIRD_LABEL}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setTip(true)}
        onMouseLeave={() => setTip(false)}
        onFocus={() => setTip(true)}
        onBlur={() => setTip(false)}
      >
        <span aria-hidden="true">+</span>
        {!strip && <span className="ms-1">{ADD_THIRD_LABEL}</span>}
      </button>
      {strip && tip && !open && (
        <div
          aria-hidden="true"
          className="position-absolute top-0 end-100 me-2 px-2 py-1 rounded bg-dark text-white small text-nowrap"
          style={{ zIndex: 1050 }}
        >
          {ADD_THIRD_LABEL}
        </div>
      )}
      {selector}
    </div>
  )
}
