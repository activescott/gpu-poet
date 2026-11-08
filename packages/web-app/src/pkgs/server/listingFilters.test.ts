import { loadGpuFromYaml } from "@/testing/gpuFiles"
import { Listing } from "../isomorphic/model"
import { chainAsync } from "irritable-iterable"
import {
  createFilterForGpu,
  createMedianPriceFloorFilter,
  isAccessoryTitle,
  isBoxOnlyTitle,
  sellerFeedbackFilter,
} from "./listingFilters"
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

it("should not filter out real listings whose packaging phrasing wasn't in the first pass (gpu-poet#92)", async () => {
  const gpu = await loadGpuFromYaml("amd-radeon-rx-7800-xt.yaml")

  const validTitles = [
    // VALID: hyphenated "Open-Box"
    "AMD Radeon RX 7800 XT 16GB GDDR6 New Open-Box",
    // VALID: preposition with an adjective between it and "box"
    "AMD Radeon RX 7800 XT 16GB GDDR6 in Retail Box",
    // VALID: "w/" abbreviation for "with"
    "AMD Radeon RX 7800 XT 16GB GDDR6 w/ Original Box",
    // VALID: "w/" with no space before "Box"
    "AMD Radeon RX 7800 XT 16GB GDDR6 w/Box",
    // VALID: packaging descriptor with no preposition at all
    "AMD Radeon RX 7800 XT 16GB GDDR6 Factory Sealed Box",
    "AMD Radeon RX 7800 XT 16GB GDDR6 Retail Box",
    // VALID: "Xbox" ends in the letters "box" but isn't a box mention at all
    "AMD Radeon RX 7800 XT 16GB GDDR6 bundled with Xbox",
    // VALID: negation - card ships without its box, re-review of gpu-poet#92
    "AMD Radeon RX 7800 XT 16GB GDDR6 No Box",
    "AMD Radeon RX 7800 XT 16GB GDDR6 Without Box",
    "AMD Radeon RX 7800 XT 16GB GDDR6 w/o Box",
    // VALID: condition/packaging descriptor in front of "box" that isn't on the packaging-descriptor list
    "AMD Radeon RX 7800 XT 16GB GDDR6 Brand New Box",
    "AMD Radeon RX 7800 XT 16GB GDDR6 Full Box",
    "AMD Radeon RX 7800 XT 16GB GDDR6 Original Packaging Box",
    "AMD Radeon RX 7800 XT 16GB GDDR6 Retail Packaging Box",
    "AMD Radeon RX 7800 XT 16GB GDDR6 Original Accessories Box",
    "AMD Radeon RX 7800 XT 16GB GDDR6 Used, Tested, Box",
  ]

  const listings: AsyncIterable<Listing> = arrayToAsyncIterable(
    validTitles.map((title) => ({
      title,
      itemAffiliateWebUrl: "https://example.com",
      buyingOptions: ["FIXED_PRICE"],
      sellerFeedbackPercentage: "100",
      // HACK cast for test purposes
    })) as unknown as Listing[],
  )

  const filtered = await chainAsync(listings)
    .filter(createFilterForGpu(gpu))
    .collect()

  expect(filtered.map((l) => l.title)).toEqual(validTitles)
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

const isNotACard = (title: string) =>
  isBoxOnlyTitle(title) || isAccessoryTitle(title)

const pricedListing = (priceValue: string) => ({
  itemId: priceValue,
  title: "AMD Radeon RX 7800 XT 16GB",
  priceValue,
})

describe("accessory and box titles (gpu-poet#122)", () => {
  it.each([
    // quoted in gpu-poet#122
    "MSI NVIDIA GeForce RTX 5060 Ti 8G GAMING TRIO OC GPU Graphics Card White **BOX**",
    "MSI NVIDIA GeForce RTX 4090 SUPRIM 24GB GDDR6X Liquid Cooler Block Only",
    "PowerColor Fighter AMD Radeon RX 7800 XT 16GB GDDR6 Box Only",
    // live on the site, unexcluded, at the time of the fix
    "AMD Radeon RX 9070 XT Steel Legend 16GB Replacement Heatsink and Fans Only",
    "NVIDIA Tesla P100 16GB HBM2 PCIe x16 GPU Accelerator CUDA, Heatsink Only",
    "Nvidia Tesla P4 8GB M4 4GB T4 16GB GPU Card graphics Cooling fan",
    "NVIDIA GeForce RTX 3090 24GB Replacement Fan",
    "NVIDIA GeForce RTX 4090 24GB Founders Edition Cooler Only",
  ])("rejects %s", (title) => {
    expect(isNotACard(title)).toBe(true)
  })

  it.each([
    // real cards from production that mention a cooler, fan or box
    "Nvidia A10G 24GB GPU GDDR6 Graphics Card Passive Cooler Tensor Accelerator",
    "Dell / Alienware OEM NVIDIA GeForce RTX 3090 24GB GDDR6X – Tested w/ Spare fan",
    "ROG Astral LC GeForce RTX 5090 32GB GDDR7 OC Edition, NVIDIA, Graphics Card, for Desktop PC, HDMI 2.1b/DisplayPort 2.1b – 360mm AIO Cooler for Optimal Performance",
    "AMD Radeon RX 6900 XT 16GB W/ HeatKiller Waterblock + Original Air cooler",
    "ASUS AMD Radeon RX 9070 XT Prime OC Triple Fan 16GB Receipt includ for manuwarra",
    "ASUS NVIDIA Dual GeForce RTX 4060 Ti 8GB GDDR6 Graphics Card-White-Very good-Box",
    "ARKN INTEL ARC PRO B60 24GB GDDR6 GRAPHICS CARD Quad DP 8357-00128 (Brown box)",
    "XFX Quicksilver AMD Radeon RX 9070 XT 16GB GDDR6 White Magnetic Air  [OPEN BOX]",
  ])("keeps %s", (title) => {
    expect(isNotACard(title)).toBe(false)
  })
})

describe("createMedianPriceFloorFilter (gpu-poet#122)", () => {
  it("drops listings under 25% of the median price", () => {
    // gpu-poet#122: box-only listings at $5 and $25 among real cards
    const listings = ["5", "25", "480", "500", "520", "540", "800"].map((p) =>
      pricedListing(p),
    )
    const floor = createMedianPriceFloorFilter(listings)
    // median 500, floor 125
    expect(listings.filter((l) => floor(l)).map((l) => l.priceValue)).toEqual([
      "480",
      "500",
      "520",
      "540",
      "800",
    ])
    expect(floor(pricedListing("125"))).toBe(true)
    expect(floor(pricedListing("124.99"))).toBe(false)
  })

  it("keeps everything when there are too few listings for a median", () => {
    const listings = ["5", "500"].map((p) => pricedListing(p))
    expect(listings.filter(createMedianPriceFloorFilter(listings))).toEqual(
      listings,
    )
  })

  it("takes the median from eBay listings only, so Amazon laptops do not raise it", () => {
    // RX 7700S: Framework modules on eBay, whole laptops on Amazon
    const ebay = ["200", "250", "280", "345"].map((p) => ({
      ...pricedListing(p),
      source: "ebay" as const,
    }))
    const amazon = ["1289", "1349", "1479", "1499", "1839"].map((p) => ({
      ...pricedListing(p),
      source: "amazon" as const,
    }))
    const floor = createMedianPriceFloorFilter([...ebay, ...amazon])
    expect(ebay.every((l) => floor(l))).toBe(true)
    expect(amazon.every((l) => floor(l))).toBe(true)
    // the same eBay median applies to an Amazon listing far below it
    expect(floor(pricedListing("50"))).toBe(false)
  })

  it("needs exactly 3 eBay listings and averages the middle two for an even count", () => {
    const three = ["100", "200", "300"].map((p) => pricedListing(p))
    expect(createMedianPriceFloorFilter(three)(pricedListing("49"))).toBe(false)
    expect(createMedianPriceFloorFilter(three)(pricedListing("50"))).toBe(true)
    const four = ["100", "200", "300", "400"].map((p) => pricedListing(p))
    // median 250, floor 62.5
    expect(createMedianPriceFloorFilter(four)(pricedListing("62"))).toBe(false)
    expect(createMedianPriceFloorFilter(four)(pricedListing("63"))).toBe(true)
  })

  it("ignores non-numeric prices in the reference and rejects them as items", () => {
    const listings = ["", "n/a", "100", "100", "100"].map((p) =>
      pricedListing(p),
    )
    const floor = createMedianPriceFloorFilter(listings)
    expect(floor(pricedListing("30"))).toBe(true)
    expect(floor(pricedListing("n/a"))).toBe(false)
  })
})
