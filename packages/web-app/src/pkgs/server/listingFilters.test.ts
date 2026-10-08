import { loadGpuFromYaml } from "@/testing/gpuFiles"
import { Listing } from "../isomorphic/model"
import { chainAsync } from "irritable-iterable"
import { createFilterForGpu, sellerFeedbackFilter } from "./listingFilters"
import { arrayToAsyncIterable } from "../isomorphic/collection"

it("should filter out backplate accessories but keep GPUs with backplate in name", async () => {
  const gpu = await loadGpuFromYaml("amd-radeon-rx-7800-xt.yaml")

  const listings: AsyncIterable<Listing> = arrayToAsyncIterable([
    // INVALID: Accessory - should be filtered out
    {
      title: "OEM Backplate For AMD Radeon RX 7800 XT 16GB Gaming Card",
      itemAffiliateWebUrl: "https://example.com",
      buyingOptions: ["FIXED_PRICE"],
      sellerFeedbackPercentage: "100",
    },
    // INVALID: Accessory with different casing - should be filtered out
    {
      title: "Custom BACKPLATE FOR Sapphire AMD Radeon RX 7800 XT 16GB",
      itemAffiliateWebUrl: "https://example.com",
      buyingOptions: ["FIXED_PRICE"],
      sellerFeedbackPercentage: "100",
    },
    // VALID: Actual GPU with "Backplate Special Edition" - should pass
    {
      title:
        "PowerColor Red Devil Radeon RX 7800 XT Backplate Special Edition AMD 16GB GDDR6",
      itemAffiliateWebUrl: "https://example.com",
      buyingOptions: ["FIXED_PRICE"],
      sellerFeedbackPercentage: "100",
    },
    // VALID: Actual GPU with "Backplate" but not "Backplate For" - should pass
    {
      title:
        "XFX Speedster MERC 310 AMD Radeon RX 7800 XT 16GB Black Edition Backplate",
      itemAffiliateWebUrl: "https://example.com",
      buyingOptions: ["FIXED_PRICE"],
      sellerFeedbackPercentage: "100",
    },
    // HACK cast for test purposes
  ] as unknown as Listing[])

  const filtered = await chainAsync(listings)
    .filter(createFilterForGpu(gpu))
    .collect()

  expect(filtered).toHaveLength(2)
  expect(filtered.map((l) => l.title)).toContain(
    "PowerColor Red Devil Radeon RX 7800 XT Backplate Special Edition AMD 16GB GDDR6",
  )
  expect(filtered.map((l) => l.title)).toContain(
    "XFX Speedster MERC 310 AMD Radeon RX 7800 XT 16GB Black Edition Backplate",
  )
})

it("should filter out box-only items", async () => {
  const gpu = await loadGpuFromYaml("amd-radeon-rx-7800-xt.yaml")

  const listings: AsyncIterable<Listing> = arrayToAsyncIterable([
    {
      title: "PowerColor Fighter AMD Radeon RX 7800 XT 16GB GDDR6 Box Only",
      itemAffiliateWebUrl: "https://example.com",
      buyingOptions: ["FIXED_PRICE"],
      sellerFeedbackPercentage: "100",
    },
    // the ONE good listing:
    {
      title: "PowerColor Fighter AMD Radeon RX 7800 XT 16GB GDDR6",
      itemAffiliateWebUrl: "https://example.com",
      buyingOptions: ["FIXED_PRICE"],
      sellerFeedbackPercentage: "100",
    },
    {
      title: "Box Only, Gigabyte Radeon 16GB Rx 7800 XT Gaming OC",
      itemAffiliateWebUrl: "https://example.com",
      buyingOptions: ["FIXED_PRICE"],
      sellerFeedbackPercentage: "100",
    },
    {
      title: "PowerColor AMD Radeon RX 7800 XT 16GB *BOX ONLY*",
      itemAffiliateWebUrl: "https://example.com",
      buyingOptions: ["FIXED_PRICE"],
      sellerFeedbackPercentage: "100",
    },
    {
      title: "AMD Radeon RX 7800 XT 16GB BOX ONLY Various brands",
      itemAffiliateWebUrl: "https://example.com",
      buyingOptions: ["FIXED_PRICE"],
      sellerFeedbackPercentage: "100",
    },
    {
      title: "AMD Radeon RX 7800 XT 16GB ** BOX ONLY",
      itemAffiliateWebUrl: "https://example.com",
      buyingOptions: ["FIXED_PRICE"],
      sellerFeedbackPercentage: "100",
    },
    {
      title: "GIGABYTE AMD Radeon RX 7800 XT 16GB GDDR5 *BOX ONLY NO GPU*",
      itemAffiliateWebUrl: "https://example.com",
      buyingOptions: ["FIXED_PRICE"],
      sellerFeedbackPercentage: "100",
    },
    {
      // Originally: "MSI NVIDIA GeForce RTX 4090 SUPRIM 24GB GDDR6X Liquid Cooler Block Only"
      title: "GIGABYTE AMD Radeon RX 7800 XT 16GB Liquid Cooler Block Only",
      itemAffiliateWebUrl: "https://example.com",
      buyingOptions: ["FIXED_PRICE"],
      sellerFeedbackPercentage: "100",
    },
    // HACK cast for test purposes
  ] as unknown as Listing[])

  const filtered = await chainAsync(listings)
    .filter(createFilterForGpu(gpu))
    .collect()

  expect(filtered).toHaveLength(1)
})

it("should filter out box-only listings that end with a bare 'box' (gpu-poet#91)", async () => {
  const gpu = await loadGpuFromYaml("amd-radeon-rx-7800-xt.yaml")

  const listings: AsyncIterable<Listing> = arrayToAsyncIterable([
    // INVALID: reported in #91 as "RTX 5060 Ti ... White BOX" - no "only", just a color + bare "box"
    {
      title: "AMD Radeon RX 7800 XT 16GB GDDR6 White BOX",
      itemAffiliateWebUrl: "https://example.com",
      buyingOptions: ["FIXED_PRICE"],
      sellerFeedbackPercentage: "100",
    },
    // INVALID: same pattern, different color, lowercase
    {
      title: "amd radeon rx 7800 xt 16gb black box",
      itemAffiliateWebUrl: "https://example.com",
      buyingOptions: ["FIXED_PRICE"],
      sellerFeedbackPercentage: "100",
    },
    // VALID: real card, "new in box" describes condition, not the listing's contents
    {
      title: "AMD Radeon RX 7800 XT 16GB GDDR6 New In Box",
      itemAffiliateWebUrl: "https://example.com",
      buyingOptions: ["FIXED_PRICE"],
      sellerFeedbackPercentage: "100",
    },
    // VALID: real card, "open box" is a standard eBay condition
    {
      title: "AMD Radeon RX 7800 XT 16GB GDDR6 Open Box",
      itemAffiliateWebUrl: "https://example.com",
      buyingOptions: ["FIXED_PRICE"],
      sellerFeedbackPercentage: "100",
    },
    // VALID: real card, box is something it comes with
    {
      title: "AMD Radeon RX 7800 XT 16GB GDDR6 with Original Box",
      itemAffiliateWebUrl: "https://example.com",
      buyingOptions: ["FIXED_PRICE"],
      sellerFeedbackPercentage: "100",
    },
    // HACK cast for test purposes
  ] as unknown as Listing[])

  const filtered = await chainAsync(listings)
    .filter(createFilterForGpu(gpu))
    .collect()

  expect(filtered.map((l) => l.title)).toEqual([
    "AMD Radeon RX 7800 XT 16GB GDDR6 New In Box",
    "AMD Radeon RX 7800 XT 16GB GDDR6 Open Box",
    "AMD Radeon RX 7800 XT 16GB GDDR6 with Original Box",
  ])
})

it("should reject listings where GPU name only matches inside a part number", async () => {
  const gpu = await loadGpuFromYaml("nvidia-t4.yaml")

  const listings: AsyncIterable<Listing> = arrayToAsyncIterable([
    // INVALID: "T4" only appears inside part number VCGGTX980T4XPB-CG, and "16 g" would match "x16 GPU" without word boundaries
    {
      title:
        "PNY NVIDIA GeForce GTX 980 4GB GDDR5 PCIe x16 GPU P/N: VCGGTX980T4XPB-CG Tested",
      itemAffiliateWebUrl: "https://example.com",
      buyingOptions: ["FIXED_PRICE"],
      sellerFeedbackPercentage: "100",
    },
    // VALID: Actual T4 listing
    {
      title: "NVIDIA Tesla T4 16GB GDDR6 PCIe GPU Accelerator Card",
      itemAffiliateWebUrl: "https://example.com",
      buyingOptions: ["FIXED_PRICE"],
      sellerFeedbackPercentage: "100",
    },
    // HACK cast for test purposes
  ] as unknown as Listing[])

  const filtered = await chainAsync(listings)
    .filter(createFilterForGpu(gpu))
    .collect()

  expect(filtered).toHaveLength(1)
  expect(filtered[0].title).toContain("Tesla T4 16GB")
})

describe("sellerFeedbackFilter", () => {
  it("should filter out sellers with <90% feedback", async () => {
    const listings = [
      {
        itemId: "v1|186889393298|0",
        title: "NVIDIA Tesla H100 80GB PCIe 5.0 Deep Learning GPU",
        leafCategoryIds: ["27386"],
        categories: [],
        image: {
          imageUrl:
            "https://i.ebayimg.com/images/g/Se8AAOSw-fpniwuO/s-l225.jpg",
        },
        price: {
          value: "878.99",
          currency: "USD",
        },
        itemHref:
          "https://api.ebay.com/buy/browse/v1/item/v1%7C186889393298%7C0",
        sellerFeedbackPercentage: "0.0",
        sellerFeedbackScore: 0,
        condition: "New",
        conditionId: "1000",
      },
      {
        itemId: "v1|bbb|1",
        //sellerFeedbackPercentage: "0.0", // NOTE: NO field at all
        sellerFeedbackScore: 0,
      },
      {
        itemId: "v1|ccc|1",
        sellerFeedbackPercentage: "100.0",
        sellerFeedbackScore: 0,
      },
      {
        itemId: "v1|ddd|1",
        sellerFeedbackPercentage: "99.0",
        sellerFeedbackScore: 0,
      },
      {
        itemId: "v1|aaa|1",
        sellerFeedbackPercentage: "0.0",
        sellerFeedbackScore: 0,
      },
      {
        itemId: "v1|eee|1",
        sellerFeedbackPercentage: "89.99",
        sellerFeedbackScore: 0,
      },
    ] as Partial<Listing>[]

    // note cast from Partial<Listing> to Listing for testing purposes:
    const listingsIterable = arrayToAsyncIterable(
      listings,
    ) as AsyncIterable<Listing>
    const filtered = await chainAsync(listingsIterable)
      .filter((l) => sellerFeedbackFilter(l))
      .collect()
    expect(filtered).toHaveLength(2)
    const ids = filtered.map((item) => item.itemId)
    expect(ids).toContainEqual("v1|ccc|1")
    expect(ids).toContainEqual("v1|ddd|1")
  })

  it("should be included in compose", async () => {
    const listings = [
      {
        title: "PowerColor Fighter AMD Radeon RX 7800 XT 16GB GDDR6",
        itemAffiliateWebUrl: "https://example.com",
        buyingOptions: ["FIXED_PRICE"],
        sellerFeedbackPercentage: "75.0",
      },
      {
        title: "PowerColor Fighter AMD Radeon RX 7800 XT 16GB GDDR6",
        itemAffiliateWebUrl: "https://example.com",
        buyingOptions: ["FIXED_PRICE"],
        sellerFeedbackPercentage: "99.9",
      },
    ]

    const gpu = await loadGpuFromYaml("amd-radeon-rx-7800-xt.yaml")
    const listingsIterable = arrayToAsyncIterable(
      listings,
    ) as AsyncIterable<Listing>

    createFilterForGpu(gpu)
    const filtered = await chainAsync(listingsIterable)
      .filter(createFilterForGpu(gpu))
      .collect()

    expect(filtered).toHaveLength(1)
    expect(filtered[0]).toHaveProperty("sellerFeedbackPercentage", "99.9")
  })
})

it("should filter out 'parts only' and 'for parts' title patterns", async () => {
  const gpu = await loadGpuFromYaml("amd-radeon-rx-7800-xt.yaml")

  const listings: AsyncIterable<Listing> = arrayToAsyncIterable([
    {
      title: "AMD Radeon RX 7800 XT 16GB PARTS ONLY",
      itemAffiliateWebUrl: "https://example.com",
      buyingOptions: ["FIXED_PRICE"],
      sellerFeedbackPercentage: "100",
    },
    {
      title: "AMD Radeon RX 7800 XT 16GB - for parts or repair",
      itemAffiliateWebUrl: "https://example.com",
      buyingOptions: ["FIXED_PRICE"],
      sellerFeedbackPercentage: "100",
    },
    {
      title: "PowerColor Fighter AMD Radeon RX 7800 XT 16GB GDDR6",
      itemAffiliateWebUrl: "https://example.com",
      buyingOptions: ["FIXED_PRICE"],
      sellerFeedbackPercentage: "100",
    },
    // HACK cast for test purposes
  ] as unknown as Listing[])

  const filtered = await chainAsync(listings)
    .filter(createFilterForGpu(gpu))
    .collect()

  expect(filtered).toHaveLength(1)
  expect(filtered[0].title).toBe(
    "PowerColor Fighter AMD Radeon RX 7800 XT 16GB GDDR6",
  )
})
