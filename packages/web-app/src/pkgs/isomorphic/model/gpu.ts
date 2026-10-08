import { stripIndents } from "common-tags"
import { z } from "zod"
import { GpuSpecsSchema, HardwarePrecisions } from "./specs"

// Manufacturer identifiers (NVPN, OPN, board_id, product_sku, etc.)
const ManufacturerIdentifierSchema = z.object({
  type: z.string(),
  value: z.string(),
})
export type ManufacturerIdentifier = z.infer<
  typeof ManufacturerIdentifierSchema
>

// Third-party products from OEMs, AIBs (Add-In Board partners), and system integrators
const ThirdPartyProductSchema = z.object({
  company: z.string(),
  productName: z.string(),
  identifier: z.string(),
  identifierType: z.enum(["part_number", "sku", "model_number"]),
})
export type ThirdPartyProduct = z.infer<typeof ThirdPartyProductSchema>

// GPU market segment categories
const GpuCategorySchema = z.enum(["gaming", "workstation", "datacenter"])

export const GpuSchema = z
  .object({
    name: z.string(),
    label: z.string(),
    series: z.string().optional().nullable(),
    // GPU market segment: "gaming" (consumer), "workstation" (professional), "datacenter" (enterprise/AI)
    category: GpuCategorySchema.optional().nullable(),
    gpuArchitecture: z.string(),
    supportedHardwareOperations: z.array(z.enum(HardwarePrecisions))
      .describe(stripIndents`
      A list of the supported precisions for hardware-accelerated generalized
      matrix multiplication operations (GEMM). Each value indicates a precision
      that is supported. In most cases this won't matter that much as the result
      will be reflected in OPS specs such as @see GpuSpecs.fp32TFLOPS or @see
      GpuSpecs.fp32TFLOPS. However, in some cases such as BF16, it may be less
      than clear that the GPU does or does not support the precision in those
      operations. For example, the Turing and Volta Nvidia architectures support
      FP16, but not BF16.`),
    // .. | nullable because prisma seems to require it for optional fields :/
    supportedCUDAComputeCapability: z.number().optional().nullable(),
    summary: z.string(),
    references: z.array(z.string()),
    // .. | nullable because prisma seems to require it for optional fields :/
    maxTDPWatts: z.number().optional().nullable(),
    releaseDate: z.string().optional().nullable(),
    // lastModified comes as a string from YAML but as Date from Prisma
    // Using coerce to handle both cases
    lastModified: z.coerce.date(),
    // Manufacturer's Suggested Retail Price in USD
    msrpUSD: z.number().optional().nullable(),
    // Notes about the GPU specs (e.g., MSRP sources, calculation explanations)
    notes: z.array(z.string()).optional().default([]),
    // Manufacturer identifiers (NVPN, OPN, board_id, etc.)
    manufacturerIdentifiers: z
      .array(ManufacturerIdentifierSchema)
      .optional()
      .nullable(),
    // Third-party product information (Dell, ASUS, etc.)
    thirdPartyProducts: z.array(ThirdPartyProductSchema).optional().nullable(),
  })
  .extend(GpuSpecsSchema.shape)

export type Gpu = z.infer<typeof GpuSchema>

/**
 * Parse and validate a GPU object (typically from Prisma) through the Zod schema.
 * This validates JSONB fields (manufacturerIdentifiers, thirdPartyProducts) and
 * ensures the data matches the expected Gpu type.
 */
export function parseGpu(data: unknown): Gpu {
  return GpuSchema.parse(data)
}

/**
 * Returns the note explaining an estimated MSRP (the first note starting
 * "Estimated MSRP"), or null when the GPU's MSRP is not an estimate. Callers
 * show it as a footnote wherever the MSRP is displayed.
 */
export function msrpNote(gpu: Pick<Gpu, "notes">): string | null {
  return gpu.notes.find((note) => note.startsWith("Estimated MSRP")) ?? null
}

/**
 * Extracts the brand name from a GPU label for use as a Schema.org Brand
 * (e.g. "NVIDIA GeForce RTX 4090" -> "NVIDIA"), normalizing the casing of the
 * three vendors whose labels are not already title-cased.
 */
export function extractBrandName(label: string): string {
  const brand = label.split(" ")[0]
  if (brand.toUpperCase() === "AMD") return "AMD"
  if (brand.toUpperCase() === "NVIDIA") return "NVIDIA"
  if (brand.toUpperCase() === "INTEL") return "Intel"
  return brand
}
