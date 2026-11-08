"use client"

import { useRouter } from "next/navigation"
import { Gpu } from "@/pkgs/isomorphic/model"
import { msrpNote } from "@/pkgs/isomorphic/model/gpu"
import {
  GpuSpecKey,
  GpuSpecKeys,
  GpuSpecsDescription,
} from "@/pkgs/isomorphic/model/specs"
import { GpuQuickInfo } from "./GpuQuickInfo"
import { GpuSelector, GpuOption } from "./GpuSelector"
import { PercentileProgressBar, NoDataBar } from "./PercentileProgressBar"
import { FormatCurrency } from "./FormatCurrency"
import { BootstrapIcon } from "./BootstrapIcon"
import Link from "next/link"

import type { JSX } from "react"

interface ComparisonBenchmarkData {
  slug: string
  name: string
  unit: string
  /** One entry per compared GPU, in the same order as `gpus`. */
  values: (number | undefined)[]
  percentiles: (number | undefined)[]
}

interface PriceStats {
  minPrice: number
  avgPrice: number
  activeListingCount: number
}

interface ComparedGpu {
  gpu: Gpu
  specPercentages: Record<GpuSpecKey, number>
  priceStats: PriceStats
}

interface GpuComparisonViewProps {
  /** Two or three GPUs, in URL (alphabetical) order. */
  gpus: ComparedGpu[]
  benchmarkData: ComparisonBenchmarkData[]
  gpuOptions: GpuOption[]
}

const HIGHLIGHT_THRESHOLD = 0.05 // 5% difference to highlight winner
const MAX_GPUS = 3
const GRID_COLUMNS = 12
const PERCENT = 100
const LABEL_COLUMN_PERCENT = 25

/**
 * Index of the GPU "winning" a metric: the highest value, if it beats every
 * other present value by the highlight threshold. -1 means no winner.
 */
function getWinner(values: (number | undefined | null)[]): number {
  let best = -1
  for (const [i, v] of values.entries()) {
    if (v !== undefined && v !== null && (best < 0 || v > values[best]!)) {
      best = i
    }
  }
  if (best < 0) return -1
  const bestValue = values[best]!
  const clear = values.every(
    (v, i) =>
      i === best ||
      v === undefined ||
      v === null ||
      (bestValue - v) / bestValue >= HIGHLIGHT_THRESHOLD,
  )
  return clear ? best : -1
}

/**
 * GPU comparison view of two or three GPUs side by side. Tables scroll
 * horizontally and the cards stack on narrow screens.
 */
export function GpuComparisonView({
  gpus,
  benchmarkData,
  gpuOptions,
}: GpuComparisonViewProps): JSX.Element {
  const router = useRouter()
  const slugs = gpus.map((g) => g.gpu.name)
  const colClass = `col-md-${GRID_COLUMNS / gpus.length}`
  const labelWidth = `${LABEL_COLUMN_PERCENT}%`
  const colWidth = `${(PERCENT - LABEL_COLUMN_PERCENT) / gpus.length}%`

  const goTo = (newSlugs: string[]) =>
    router.push(`/gpu/compare/${[...newSlugs].sort().join("/vs/")}`)

  const handleChange = (index: number, slug: string) =>
    goTo(slugs.map((s, i) => (i === index ? slug : s)))

  return (
    <div className="container-fluid px-0">
      {/* Header with GPU selectors */}
      <div className="row mb-4">
        <div className="col-12">
          <h1 className="h2 mb-3">
            {gpus.map((g) => g.gpu.label).join(" vs ")}
          </h1>
          <p className="text-muted">
            Compare specifications, gaming benchmarks, and prices for these{" "}
            {gpus.length === MAX_GPUS ? "three" : "two"} GPUs.
          </p>
        </div>
      </div>

      {/* GPU Selectors */}
      <div className="row mb-4 g-3">
        {gpus.map(({ gpu }, i) => (
          <div className={colClass} key={gpu.name}>
            <label className="form-label fw-bold">{gpu.label}</label>
            <GpuSelector
              gpuOptions={gpuOptions}
              selectedGpuSlug={gpu.name}
              otherSelectedSlug={slugs.find((s) => s !== gpu.name)}
              placeholder={`Change GPU ${i + 1}...`}
              onSelect={(slug) => handleChange(i, slug)}
            />
          </div>
        ))}
        {gpus.length < MAX_GPUS && (
          <div className={colClass}>
            <label className="fw-bold mb-2">Add a third GPU</label>
            <GpuSelector
              gpuOptions={gpuOptions}
              otherSelectedSlug={slugs[0]}
              placeholder="Add a third GPU..."
              onSelect={(slug) => goTo([...slugs, slug])}
            />
          </div>
        )}
      </div>

      {/* Side-by-side comparison */}
      <div>
        {/* Quick Info Comparison */}
        <div className="row mb-4 g-3">
          {gpus.map(({ gpu, priceStats }) => (
            <div className={colClass} key={gpu.name}>
              <div className="card h-100">
                <div className="card-header bg-primary text-white">
                  <h3 className="h5 mb-0">{gpu.label}</h3>
                </div>
                <div className="card-body">
                  <GpuQuickInfo gpu={gpu} />
                  <PricingInfo gpu={gpu} priceStats={priceStats} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Specs Comparison Table */}
        <h2 className="h4 mt-4">Specifications Comparison</h2>
        <div className="table-responsive">
          <table className="table table-hover">
            <thead>
              <tr>
                <th style={{ width: labelWidth }}>Specification</th>
                {gpus.map(({ gpu }) => (
                  <th key={gpu.name} style={{ width: colWidth }}>
                    {gpu.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {GpuSpecKeys.map((key) => {
                const specDesc = GpuSpecsDescription[key]
                const winner = getWinner(gpus.map(({ gpu }) => gpu[key]))

                return (
                  <tr key={key}>
                    <td className="fw-bold">{specDesc.label}</td>
                    {gpus.map(({ gpu, specPercentages }, i) => {
                      const value = gpu[key]
                      const percentile = specPercentages[key]
                      return (
                        <td key={gpu.name}>
                          {value !== null &&
                          value !== undefined &&
                          percentile !== null &&
                          percentile !== undefined ? (
                            <PercentileProgressBar
                              percentile={percentile}
                              value={value}
                              unit={specDesc.unitShortest}
                              isWinner={winner === i}
                            />
                          ) : (
                            <NoDataBar />
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Benchmarks Comparison Table */}
        {benchmarkData.length > 0 && (
          <>
            <h2 className="h4 mt-4">Gaming Benchmarks Comparison</h2>
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th style={{ width: labelWidth }}>Benchmark</th>
                    {gpus.map(({ gpu }) => (
                      <th key={gpu.name} style={{ width: colWidth }}>
                        {gpu.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {benchmarkData.map((benchmark) => {
                    const winner = getWinner(benchmark.values)

                    return (
                      <tr key={benchmark.slug}>
                        <td className="fw-bold">{benchmark.name}</td>
                        {gpus.map(({ gpu }, i) => {
                          const value = benchmark.values[i]
                          const percentile = benchmark.percentiles[i]
                          return (
                            <td key={gpu.name}>
                              {value !== undefined &&
                              percentile !== undefined ? (
                                <PercentileProgressBar
                                  percentile={percentile}
                                  value={value}
                                  unit={benchmark.unit}
                                  isWinner={winner === i}
                                />
                              ) : (
                                <NoDataBar />
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Displays pricing information for a GPU
 */
function PricingInfo({
  gpu,
  priceStats,
}: {
  gpu: Gpu
  priceStats: PriceStats
}): JSX.Element {
  const estimatedMsrpNote = msrpNote(gpu)
  return (
    <div className="mb-3">
      <h4 className="h6 mb-2">
        <BootstrapIcon icon="tag" size="small" /> Pricing
      </h4>
      {priceStats.activeListingCount > 0 ? (
        <ul className="mb-0 list-unstyled">
          <li className="d-flex align-items-center gap-1">
            <strong>Lowest Price:</strong>{" "}
            <Link
              href={`/gpu/shop/${gpu.name}`}
              className="d-inline-flex align-items-center gap-1"
            >
              <FormatCurrency
                currencyValue={priceStats.minPrice}
                forceInteger={true}
              />
              <BootstrapIcon icon="box-arrow-up-right" size="xs" />
            </Link>
          </li>
          <li>
            <strong>Average Price:</strong>{" "}
            <FormatCurrency
              currencyValue={priceStats.avgPrice}
              forceInteger={true}
            />
          </li>
          <li>
            <strong>Active Listings:</strong> {priceStats.activeListingCount}
          </li>
        </ul>
      ) : (
        <p className="text-muted mb-0">No listings currently available</p>
      )}
      {gpu.msrpUSD && (
        <p className="mb-0 mt-2 small text-muted">
          MSRP: ${gpu.msrpUSD.toLocaleString()}
          {estimatedMsrpNote && <sup>†</sup>}
        </p>
      )}
    </div>
  )
}
