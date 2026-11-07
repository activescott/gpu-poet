import type { Metadata } from "next"
import type { ReactNode } from "react"
import Link from "next/link"
import { ReportLayout, ChartSection } from "../components"
import {
  PriceHistoryChart,
  DollarsPerFpsChart,
  DollarsPerFps4kChart,
  DollarsPerTflopChart,
  DollarsPerInt8TopChart,
  ScalperPremiumChart,
} from "@/pkgs/server/components/charts"
import { reportMetadata } from "./metadata"

export async function generateMetadata(): Promise<Metadata> {
  const {
    slug,
    title,
    description,
    author,
    tags,
    publishedAt,
    updatedAt,
    dateRange,
  } = reportMetadata

  const ogImageUrl = `https://gpupoet.com/api/images/chart/DollarsPerFpsChart?from=${dateRange.from}&to=${dateRange.to}`

  return {
    title,
    description,
    authors: { name: author },
    keywords: [...tags, "GPU prices", "market report", "GPU deals"],
    publisher: "GPU Poet",
    openGraph: {
      title,
      description,
      url: `https://gpupoet.com/gpu/market-report/${slug}`,
      type: "article",
      publishedTime: publishedAt.toISOString(),
      modifiedTime: updatedAt.toISOString(),
      authors: [author],
      tags,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
    },
    alternates: {
      canonical: `https://gpupoet.com/gpu/market-report/${slug}`,
    },
  }
}

export default async function November2026Report(): Promise<ReactNode> {
  const { dateRange } = reportMetadata

  return (
    <ReportLayout metadata={reportMetadata}>
      <div className="lead mb-5">
        <p>
          Prices rose again in October, and more broadly than in September. Of
          the 80 GPUs with listings in both months, 65 got more expensive and 14
          got cheaper. The{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-5090">RTX 5090</Link> led the
          way: its best resale deal is $5,986, up 25% in a month and three times
          its $1,999 MSRP. The{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-3060-ti">RTX 3060 Ti</Link>{" "}
          barely moved and still leads 1440p value at $1.20/FPS. All prices here
          are best-deal pricing across eBay and Amazon (the average of the 3
          cheapest listings).
        </p>
      </div>

      <ChartSection title="1440p Gaming Best Bang for Your Buck in November 2026">
        <p className="mb-4">
          The{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-3060-ti">RTX 3060 Ti</Link>{" "}
          leads again at $1.20/FPS, up only 1% in a month when most cards rose.
          It is still 8GB. Last month I pointed to the{" "}
          <Link href="/gpu/shop/amd-radeon-rx-6800">RX 6800</Link> for 16GB. It
          rose 8% and the{" "}
          <Link href="/gpu/shop/amd-radeon-rx-6800-xt">RX 6800 XT</Link> rose
          3%, so the XT now costs only $40 more for about 19% more frames. If
          you plan to keep the card a couple of years, the 6800 XT is the one I
          would buy.
        </p>
        <DollarsPerFpsChart dateRange={dateRange} />
        <div className="alert alert-info mt-3">
          <strong>Find your GPU:</strong> Use the{" "}
          <Link href="/gpu/ranking/gaming/counter-strike-2-fps-2560x1440?filter.price[lte]=300&filter.metricValue[gte]=120">
            GPU Poet 1440p ranking page
          </Link>{" "}
          and filter by Counter-Strike 2 FPS at 1440p. Set a budget cap and a
          minimum FPS target to narrow the list to cards that fit your needs.
        </div>
      </ChartSection>

      <ChartSection title="4K Gaming Best Bang for Your Buck in November 2026">
        <p className="mb-4">
          The <Link href="/gpu/shop/amd-radeon-rx-7600">RX 7600</Link> leads
          again — an 8GB card that only ranks here because Counter-Strike 2
          barely touches memory at 4K. The{" "}
          <Link href="/gpu/shop/amd-radeon-rx-7900-xt">RX 7900 XT</Link> is 20
          cents per frame behind with 20GB, and still 34% below its original
          MSRP after a 5% rise. If you are buying for 4K, that is where I would
          put the money.
        </p>
        <DollarsPerFps4kChart dateRange={dateRange} />
        <div className="alert alert-info mt-3">
          <strong>Find your GPU:</strong> Use the{" "}
          <Link href="/gpu/ranking/gaming/counter-strike-2-fps-3840x2160?filter.price[lte]=600&filter.metricValue[gte]=120">
            GPU Poet 4K ranking page
          </Link>{" "}
          and filter by Counter-Strike 2 FPS at 4K. Set a budget cap and minimum
          FPS to find cards that can drive 4K smoothly.
        </div>
      </ChartSection>

      <ChartSection title="AI Inference Best Bang for Your Buck in November 2026">
        <p className="mb-4">
          The <Link href="/gpu/shop/intel-arc-b580">Arc B580</Link> takes the
          top spot back from the B570, which rose 16%. The Intel catch has not
          changed: far less of the open source AI stack supports OneAPI than
          CUDA. The cheapest CUDA card is still the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-3080">RTX 3080</Link> at
          $1.45, with 10GB, and the cheapest CUDA card with 12GB costs 30% more
          per TOPS. If your models fit in 10GB, I would buy the 3080. If they
          need 12GB and your stack runs on OneAPI, the B580.
        </p>
        <DollarsPerInt8TopChart dateRange={dateRange} />
        <div className="alert alert-info mt-3">
          <strong>Find your GPU:</strong> Use the{" "}
          <Link href="/gpu/ranking/ai/int8-tops?filter.memoryCapacityGB[gte]=12">
            GPU Poet INT8 TOPS ranking page
          </Link>{" "}
          and filter by minimum VRAM to ensure the models you need will fit, or
          set a budget cap to find the best inference throughput in your price
          range.
        </div>
      </ChartSection>

      <ChartSection title="LLM Training and Fine-Tuning Best Bang for Your Buck in November 2026">
        <p className="mb-4">
          The <Link href="/gpu/shop/nvidia-tesla-p100">Tesla P100</Link> leads
          at $8.4/TFLOP, up from $6.9, and it is still a 2016 card with no
          tensor cores. Behind it, 12 of the next 14 cards are AMD. The{" "}
          <Link href="/gpu/shop/amd-radeon-rx-7900-xt">RX 7900 XT</Link> is
          second with 20GB, and the{" "}
          <Link href="/gpu/shop/amd-radeon-rx-7900-xtx">RX 7900 XTX</Link> adds
          4GB for about $230 more. If you can work on ROCm, the XTX is where I
          would go for fine-tuning.
        </p>
        <DollarsPerTflopChart dateRange={dateRange} />
        <div className="alert alert-info mt-3">
          <strong>Find your GPU:</strong> Use the{" "}
          <Link href="/gpu/ranking/ai/fp32-flops?filter.memoryCapacityGB[gte]=16">
            GPU Poet FP32 TFLOPS ranking page
          </Link>{" "}
          and filter by 16GB+ VRAM to find training-capable cards. You can also
          rank by <Link href="/gpu/ranking/ai/memory-gb">total VRAM</Link> if
          model size is your primary constraint.
        </div>
      </ChartSection>

      <ChartSection title="The RTX 5090 Is Up 89% Since July">
        <p className="mb-4">
          The <Link href="/gpu/shop/nvidia-geforce-rtx-5090">5090</Link>&apos;s
          best resale deal was $3,173 in July and $5,986 in October. June plots
          lower because of two cards, $2,662 and $2,901, each $700+ under every
          other June listing — so the trend starts from July. After a $5,450
          &quot;sealed&quot; card from a one-feedback seller, which I left out,
          October&apos;s next nine ran $5,959 to $6,200. The{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-4090">RTX 4090</Link> rose
          38% since July, to 1.9 times MSRP, likely from buyers priced out of
          the 5090. If you were waiting for either to drop, both lines say
          otherwise.
        </p>
        <PriceHistoryChart
          dateRange={dateRange}
          gpus={[
            "nvidia-geforce-rtx-5090",
            "nvidia-geforce-rtx-4090",
            "nvidia-geforce-rtx-5080",
            "nvidia-geforce-rtx-5070-ti",
          ]}
        />
      </ChartSection>

      <ChartSection title="RTX 50 Premiums Over MSRP">
        <p className="mb-4">
          The <Link href="/gpu/shop/nvidia-geforce-rtx-5060">RTX 5060</Link>{" "}
          (13%) is just off the chart. The one to watch is the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-5070">RTX 5070</Link>: 1%
          over MSRP in September, 22% now. New on Amazon still costs more than
          resale on every RTX 50 card with enough listings to compare. A retail
          restock at MSRP beats both, so check Micro Center and Best Buy before
          you pay either.
        </p>
        <ScalperPremiumChart dateRange={dateRange} />
      </ChartSection>

      <ChartSection title="Other Notes">
        <ul className="mb-4">
          <li className="mb-2">
            <strong>New on Amazon versus resale.</strong> The{" "}
            <Link href="/gpu/shop/nvidia-geforce-rtx-5090">RTX 5090</Link> was
            $7,351 new on Amazon against $5,986 on resale, and new rose 40% in a
            month against 25% for resale. On the{" "}
            <Link href="/gpu/shop/nvidia-geforce-rtx-5070">5070</Link> and{" "}
            <Link href="/gpu/shop/nvidia-geforce-rtx-5070-ti">5070 Ti</Link> it
            went the other way: resale rose 20% and 17%, new about 6%. Amazon
            does not tell me a listing&apos;s condition, so treat the new
            figures loosely.
          </li>
          <li className="mb-2">
            <strong>Datacenter cards were mixed.</strong> The{" "}
            <Link href="/gpu/shop/nvidia-a10">A10</Link> fell 26% to $2,052 and
            the <Link href="/gpu/shop/nvidia-a30">A30</Link> 6% to $2,000, while
            the <Link href="/gpu/shop/nvidia-h100-pcie">H100 PCIe</Link> rose 6%
            to $30,820. The{" "}
            <Link href="/gpu/shop/nvidia-h200-nvl">H200 NVL</Link> was flat at
            about $36.5K, and three of its four cheapest October listings were
            qualification samples (QS in the title).
          </li>
          <li className="mb-2">
            <strong>Former flagship discounts kept shrinking.</strong> Against
            original MSRP the{" "}
            <Link href="/gpu/shop/amd-radeon-rx-6950-xt">RX 6950 XT</Link> is
            59% below at $452, the{" "}
            <Link href="/gpu/shop/amd-radeon-rx-6900-xt">RX 6900 XT</Link> 58%
            below at $418, and the{" "}
            <Link href="/gpu/shop/nvidia-geforce-rtx-3080-ti">RTX 3080 Ti</Link>{" "}
            57% below at $513. A month ago all three were 60% to 62% below.
          </li>
        </ul>
      </ChartSection>
    </ReportLayout>
  )
}

// Rendered per request: this route reads the database, which is not reachable
// during the Docker image build.
export const dynamic = "force-dynamic"
