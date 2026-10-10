import { Gpu } from "@/pkgs/isomorphic/model"
import { msrpNote } from "@/pkgs/isomorphic/model/gpu"
import { HardwarePrecisions } from "@/pkgs/isomorphic/model/specs"
import { BootstrapIcon } from "./BootstrapIcon"

import type { JSX } from "react"

interface GpuQuickInfoProps {
  gpu: Gpu
}

/**
 * Formats a release date string (e.g., "2022-10-12") to a human-readable format.
 */
function formatReleaseDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

/**
 * Formats MSRP as a currency string with USD suffix.
 */
function formatMsrp(msrpUSD: number): string {
  return `$${msrpUSD.toLocaleString()} USD`
}

/**
 * Displays quick info about a GPU: release date, MSRP, architecture,
 * hardware-accelerated GEMM operations, and CUDA compute capability.
 * Reusable in both individual GPU pages and comparison views.
 */
export function GpuQuickInfo({ gpu }: GpuQuickInfoProps): JSX.Element {
  const estimatedMsrpNote = msrpNote(gpu)
  return (
    <>
      <ul>
        {gpu.releaseDate && (
          <li>Release Date: {formatReleaseDate(gpu.releaseDate)}</li>
        )}
        {gpu.msrpUSD && (
          <li>
            MSRP: {formatMsrp(gpu.msrpUSD)}
            {estimatedMsrpNote && <sup>†</sup>}
          </li>
        )}
        <li>GPU Architecture: {gpu.gpuArchitecture}</li>
        <li>
          Hardware-Accelerated{" "}
          <abbr title="Generalized Matrix Multiplication">GEMM</abbr>{" "}
          Operations:
          <div className="d-flex flex-row flex-wrap">
            {HardwarePrecisions.map((precision) => {
              const supported =
                gpu.supportedHardwareOperations.includes(precision)
              const title = supported ? "supported" : "not supported"
              const icon = supported ? "check-circle" : "dash-circle"
              const colorClass = supported ? "text-success" : "text-warning"

              return (
                <span
                  key={precision}
                  className={`mx-2 my-1 text-nowrap fs-6 ${colorClass}`}
                >
                  <abbr title={title}>
                    <BootstrapIcon icon={icon} size="xs" alt={title} />
                  </abbr>{" "}
                  {precision}
                </span>
              )
            })}
          </div>
        </li>
        <li>
          CUDA Compute Capability{" "}
          <span className={`mx-2 my-1 text-nowrap fs-6`}>
            <abbr title="CUDA Compute Capability refers to the version of the CUDA libraries that the card supports. For the purposes of Machine Learning some notable versions are 5.3 where 16-bit floating point (FP16) operations were introduced and 8.0 where the so-called 'brain floating point' (BF16) was introduced which is a floating point type optimized for machine learning. CUDA is only available for NVIDIA GPUs.">
              <BootstrapIcon icon="info-circle" size="xs" />
            </abbr>
          </span>
          : {gpu.supportedCUDAComputeCapability ?? "n/a"}{" "}
        </li>
      </ul>
      {gpu.msrpUSD && estimatedMsrpNote && (
        <p className="small text-muted">† {estimatedMsrpNote}</p>
      )}
    </>
  )
}
