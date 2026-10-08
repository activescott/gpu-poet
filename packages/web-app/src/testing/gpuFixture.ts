import type { Gpu } from "@/pkgs/isomorphic/model"

export function gpuWithNotes(notes: string[]): Gpu {
  return {
    name: "nvidia-h100-pcie",
    label: "NVIDIA H100 PCIe",
    gpuArchitecture: "Hopper",
    supportedHardwareOperations: [],
    msrpUSD: 99_696,
    notes,
  } as unknown as Gpu
}
