"use client"

import { useRouter } from "next/navigation"
import { Gpu } from "@/pkgs/isomorphic/model"
import { msrpNote } from "@/pkgs/isomorphic/model/gpu"
import {
  GpuSpecKey,
  GpuSpecKeys,
  GpuSpecsDescription,
} from "@/pkgs/isomorphic/model/specs"
import { BenchmarkPercentile } from "./GpuBenchmarksTable"
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
  gpu1Value: number | undefined
  gpu1Percentile: number | undefined
  gpu2Value: number | undefined
  gpu2Percentile: number | undefined
}

interface PriceStats {
  minPrice: number
  avgPrice: number
  activeListingCount: number
}

interface GpuComparisonViewProps {
  gpu1: Gpu
  gpu2: Gpu
  gpu1SpecPercentages: Record<GpuSpecKey, number>
  gpu2SpecPercentages: Record<GpuSpecKey, number>
  gpu1Benchmarks: BenchmarkPercentile[]
  gpu2Benchmarks: BenchmarkPercentile[]
  benchmarkData: ComparisonBenchmarkData[]
  gpu1PriceStats: PriceStats
  gpu2PriceStats: PriceStats
  gpuOptions: GpuOption[]
}

const HIGHLIGHT_THRESHOLD = 0.05 // 5% difference to highlight winner
const GPU1_WINS = 1
const GPU2_WINS = 2
const TIE = 0

/**
 * Determines which GPU is "winning" for a given metric
 * Returns GPU1_WINS if gpu1 wins, GPU2_WINS if gpu2 wins, TIE if tie
 */
function getWinner(
  gpu1Value: number | undefined | null,
  gpu2Value: number | undefined | null,
): typeof TIE | typeof GPU1_WINS | typeof GPU2_WINS {
  if (gpu1Value === undefined || gpu1Value === null) {
    return gpu2Value !== undefined && gpu2Value !== null ? GPU2_WINS : TIE
  }
  if (gpu2Value === undefined || gpu2Value === null) return GPU1_WINS

  const diff = Math.abs(gpu1Value - gpu2Value) / Math.max(gpu1Value, gpu2Value)
  if (diff < HIGHLIGHT_THRESHOLD) return TIE

  return gpu1Value > gpu2Value ? GPU1_WINS : GPU2_WINS
}

/**
 * GPU comparison view with tabbed mobile interface and side-by-side desktop layout.
 */
export function GpuComparisonView({
  gpu1,
  gpu2,
  gpu1SpecPercentages,
  gpu2SpecPercentages,
  benchmarkData,
  gpu1PriceStats,
  gpu2PriceStats,
  gpuOptions,
}: GpuComparisonViewProps): JSX.Element {
  const router = useRouter()

  const handleGpu1Change = (slug: string) => {
    const [first, second] = [slug, gpu2.name].sort()
    router.push(`/gpu/compare/${first}/vs/${second}`)
  }

  const handleGpu2Change = (slug: string) => {
    const [first, second] = [gpu1.name, slug].sort()
    router.push(`/gpu/compare/${first}/vs/${second}`)
  }

  return (
    <div className="container-fluid px-0">
      {/* Header with GPU selectors */}
      <div className="row mb-4">
        <div className="col-12">
          <h1 className="h2 mb-3">
            {gpu1.label} vs {gpu2.label}
          </h1>
          <p className="text-muted">
            Compare specifications, gaming benchmarks, and prices for these two
            GPUs.
          </p>
        </div>
      </div>

      {/* GPU Selectors */}
      <div className="row mb-4 g-3">
        <div className="col-md-6">
          <label className="form-label fw-bold">{gpu1.label}</label>
          <GpuSelector
            gpuOptions={gpuOptions}
            selectedGpuSlug={gpu1.name}
            otherSelectedSlug={gpu2.name}
            placeholder="Change GPU 1..."
            onSelect={handleGpu1Change}
          />
        </div>
        <div className="col-md-6">
          <label className="form-label fw-bold">{gpu2.label}</label>
          <GpuSelector
            gpuOptions={gpuOptions}
            selectedGpuSlug={gpu2.name}
            otherSelectedSlug={gpu1.name}
            placeholder="Change GPU 2..."
            onSelect={handleGpu2Change}
          />
        </div>
      </div>

      {/* Side-by-side comparison */}
      <div>
        {/* Quick Info Comparison */}
        <div className="row mb-4">
          <div className="col-md-6">
            <div className="card h-100">
              <div className="card-header bg-primary text-white">
                <h3 className="h5 mb-0">{gpu1.label}</h3>
              </div>
              <div className="card-body">
                <GpuQuickInfo gpu={gpu1} />
                <PricingInfo gpu={gpu1} priceStats={gpu1PriceStats} />
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card h-100">
              <div className="card-header bg-primary text-white">
                <h3 className="h5 mb-0">{gpu2.label}</h3>
              </div>
              <div className="card-body">
                <GpuQuickInfo gpu={gpu2} />
                <PricingInfo gpu={gpu2} priceStats={gpu2PriceStats} />
              </div>
            </div>
          </div>
        </div>

        {/* Specs Comparison Table */}
        <h2 className="h4 mt-4">Specifications Comparison</h2>
        <div className="table-responsive">
          <table className="table table-hover">
            <thead>
              <tr>
                <th style={{ width: "25%" }}>Specification</th>
                <th style={{ width: "37.5%" }}>{gpu1.label}</th>
                <th style={{ width: "37.5%" }}>{gpu2.label}</th>
              </tr>
            </thead>
            <tbody>
              {GpuSpecKeys.map((key) => {
                const spec1Value = gpu1[key]
                const spec2Value = gpu2[key]
                const percentile1 = gpu1SpecPercentages[key]
                const percentile2 = gpu2SpecPercentages[key]
                const specDesc = GpuSpecsDescription[key]
                const winner = getWinner(spec1Value, spec2Value)

                return (
                  <tr key={key}>
                    <td className="fw-bold">{specDesc.label}</td>
                    <td>
                      {spec1Value !== null &&
                      spec1Value !== undefined &&
                      percentile1 !== null &&
                      percentile1 !== undefined ? (
                        <PercentileProgressBar
                          percentile={percentile1}
                          value={spec1Value}
                          unit={specDesc.unitShortest}
                          isWinner={winner === GPU1_WINS}
                        />
                      ) : (
                        <NoDataBar />
                      )}
                    </td>
                    <td>
                      {spec2Value !== null &&
                      spec2Value !== undefined &&
                      percentile2 !== null &&
                      percentile2 !== undefined ? (
                        <PercentileProgressBar
                          percentile={percentile2}
                          value={spec2Value}
                          unit={specDesc.unitShortest}
                          isWinner={winner === GPU2_WINS}
                        />
                      ) : (
                        <NoDataBar />
                      )}
                    </td>
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
                    <th style={{ width: "25%" }}>Benchmark</th>
                    <th style={{ width: "37.5%" }}>{gpu1.label}</th>
                    <th style={{ width: "37.5%" }}>{gpu2.label}</th>
                  </tr>
                </thead>
                <tbody>
                  {benchmarkData.map((benchmark) => {
                    const winner = getWinner(
                      benchmark.gpu1Value,
                      benchmark.gpu2Value,
                    )

                    return (
                      <tr key={benchmark.slug}>
                        <td className="fw-bold">{benchmark.name}</td>
                        <td>
                          {benchmark.gpu1Value !== undefined &&
                          benchmark.gpu1Percentile !== undefined ? (
                            <PercentileProgressBar
                              percentile={benchmark.gpu1Percentile}
                              value={benchmark.gpu1Value}
                              unit={benchmark.unit}
                              isWinner={winner === GPU1_WINS}
                            />
                          ) : (
                            <NoDataBar />
                          )}
                        </td>
                        <td>
                          {benchmark.gpu2Value !== undefined &&
                          benchmark.gpu2Percentile !== undefined ? (
                            <PercentileProgressBar
                              percentile={benchmark.gpu2Percentile}
                              value={benchmark.gpu2Value}
                              unit={benchmark.unit}
                              isWinner={winner === GPU2_WINS}
                            />
                          ) : (
                            <NoDataBar />
                          )}
                        </td>
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
      {gpu.msrpUSD && estimatedMsrpNote && (
        <p className="mb-0 mt-1 small text-muted">† {estimatedMsrpNote}</p>
      )}
    </div>
  )
}
