/**
 * GPU Compare Landing Page with Pre-selected GPU
 *
 * Renders the compare landing page with the first GPU pre-selected.
 * URL: /gpu/compare/{gpuSlug}
 *
 * The user can then select a second GPU to compare.
 */
import { listGpus, findGpu } from "@/pkgs/server/db/GpuRepository"
import { GpuCompareLanding } from "@/pkgs/client/components/GpuCompareLanding"
import { notFound } from "next/navigation"
import { Metadata } from "next"

export const revalidate = 3600

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ gpu1Slug: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { gpu1Slug } = await params
  const gpu = await findGpu(gpu1Slug)

  if (!gpu) {
    return {
      title: "Compare GPUs | GPU Poet",
    }
  }

  return {
    title: `Compare ${gpu.label} to Another GPU | GPU Poet`,
    description: `Compare the ${gpu.label} side-by-side with another GPU. See specs, gaming benchmarks, and prices to find the best GPU for your needs.`,
  }
}

export default async function CompareWithGpuPage({ params }: PageProps) {
  const { gpu1Slug } = await params

  // Validate the GPU exists
  const gpu = await findGpu(gpu1Slug)
  if (!gpu) {
    notFound()
  }

  const allGpus = await listGpus()
  const gpuOptions = allGpus.map((g) => ({ name: g.name, label: g.label }))

  return (
    <div className="container py-4">
      <h1>Compare {gpu.label}</h1>
      <p className="lead">
        Select another GPU to compare with the {gpu.label}. See specs, gaming
        benchmarks, and prices side-by-side.
      </p>

      <GpuCompareLanding gpuOptions={gpuOptions} initialGpu1Slug={gpu1Slug} />
    </div>
  )
}
