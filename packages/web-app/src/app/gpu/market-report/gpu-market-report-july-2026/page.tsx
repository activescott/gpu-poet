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

export default async function July2026Report(): Promise<ReactNode> {
  const { dateRange } = reportMetadata

  return (
    <ReportLayout metadata={reportMetadata}>
      <div className="lead mb-5">
        <p>
          June was a buyer&apos;s market. Prices fell across the board:
          mainstream cards dropped roughly 20% month-over-month (the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-3080-ti">RTX 3080 Ti</Link>{" "}
          went from $517 to $407, the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-4070">RTX 4070</Link> from
          $525 to $419, the{" "}
          <Link href="/gpu/shop/amd-radeon-rx-6800-xt">RX 6800 XT</Link> from
          $316 to $272). Two things came out of that. First, the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-5090">RTX 5090</Link> resale
          premium cooled from 83% above MSRP in May to 68% in June. Second, used
          Ampere and RDNA2 cards hit their best value yet, led by the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-3060-ti">RTX 3060 Ti</Link>{" "}
          at $1.13/FPS for 1440p. Below I break down the best bang for your buck
          by use case, using June&apos;s best-deal pricing across eBay and
          Amazon (average of the 3 cheapest listings).
        </p>
      </div>

      <p className="small text-muted mb-5">
        <strong>Correction, 2026-11-05:</strong> This report originally said the
        RTX 5090 premium fell to 52% above MSRP in June. One June listing, a
        $2,900.67 card from a seller with 4 feedback and a &quot;READ
        DESCRIPTION&quot; title, was likely a scam and is now left out of the
        figures. With it removed, June&apos;s 5090 best deal is $3,352, which is
        68% above MSRP.
      </p>

      <ChartSection title="1440p Gaming Best Bang for Your Buck in July 2026">
        <p className="mb-4">
          The{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-3060-ti">RTX 3060 Ti</Link>{" "}
          leads at $1.13/FPS in Counter-Strike 2 @ 1440p ($200 best deal, 177
          FPS, 8GB). That&apos;s the best 1440p value I&apos;ve tracked. Right
          behind it, two cards tie at $1.16/FPS: the{" "}
          <Link href="/gpu/shop/amd-radeon-rx-6800-xt">RX 6800 XT</Link> ($272,
          235 FPS, 16GB) and the{" "}
          <Link href="/gpu/shop/amd-radeon-rx-7600">RX 7600</Link> ($186, 160
          FPS, 8GB). If you want headroom, the 6800 XT is the pick of the three:
          same $/FPS as the 7600 but with 16GB of VRAM and a lot more raw
          performance. The{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-3080">RTX 3080</Link> at
          $1.33/FPS ($295, 222 FPS, 10GB) rounds out the top tier.
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

      <ChartSection title="4K Gaming Best Bang for Your Buck in July 2026">
        <p className="mb-4">
          The <Link href="/gpu/shop/amd-radeon-rx-7600">RX 7600</Link> ($186, 88
          FPS, 8GB) wins raw $/FPS at $2.12 in Counter-Strike 2 @ 4K, but 8GB is
          not viable for 4K in 2026. The score holds in CS2, but newer titles
          will hit the VRAM wall. The practical pick is the{" "}
          <Link href="/gpu/shop/amd-radeon-rx-7900-xt">RX 7900 XT</Link> at
          $2.31/FPS ($522, 226 FPS, 20GB), which also happens to sit 42% below
          its $899 MSRP. The{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-3080">RTX 3080</Link> at
          $2.42/FPS ($295, 122 FPS, 10GB) is the cheapest way onto the board if
          10GB is enough for you. If you can stretch the budget, the{" "}
          <Link href="/gpu/shop/amd-radeon-rx-7900-xtx">RX 7900 XTX</Link> at
          $2.79/FPS ($747, 268 FPS, 24GB) gives you the most VRAM and headroom
          in the top tier.
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

      <ChartSection title="AI Inference Best Bang for Your Buck in July 2026">
        <p className="mb-4">
          Intel still owns the top of the inference chart. The{" "}
          <Link href="/gpu/shop/intel-arc-b570">Arc B570</Link> ($215, 203 TOPS,
          10GB) leads at $1.06/INT8 TOP, with the{" "}
          <Link href="/gpu/shop/intel-arc-b580">Arc B580</Link> ($248, 233 TOPS,
          12GB) right behind at $1.07/TOP. The catch is still software:
          Intel&apos;s OneAPI/IPEX-LLM stack works but is far less common than
          CUDA across open source AI, ML, and scientific libraries. If you want
          the known-good NVIDIA path, the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-3070">RTX 3070</Link> ($200,
          163 TOPS, 8GB) at $1.23/TOP and the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-3080">RTX 3080</Link> ($295,
          238 TOPS, 10GB) at $1.24/TOP are the next-best deals. For more VRAM
          headroom, the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-4070-ti">RTX 4070 Ti</Link>{" "}
          ($532, 321 TOPS, 12GB) at $1.66/TOP is the cleanest 12GB option, and
          the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-4070-ti-super">
            RTX 4070 Ti Super
          </Link>{" "}
          ($698, 353 TOPS, 16GB) at $1.98/TOP is the cheapest 16GB card on the
          chart.
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

      <ChartSection title="LLM Training and Fine-Tuning Best Bang for Your Buck in July 2026">
        <p className="mb-4">
          On raw $/TFLOP, the{" "}
          <Link href="/gpu/shop/nvidia-tesla-p100">Tesla P100</Link> ($57, 10.6
          TFLOPS, 16GB) wins at $5.4, but it&apos;s a 2016 datacenter card with
          no tensor cores and limited modern framework support. For real-world
          training, the practical leader is the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-5070-ti">RTX 5070 Ti</Link>{" "}
          at $8.2/TFLOP ($720, 87.9 TFLOPS, 16GB). It edges out the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-5080">RTX 5080</Link> ($933,
          112.6 TFLOPS) at $8.3 and the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-4080">RTX 4080</Link> ($837,
          97.4 TFLOPS) at $8.6, and gives you Blackwell with FP4 support if you
          plan to fine-tune at low precision. All three are 16GB cards, so if
          model size is your constraint, look higher up the VRAM ladder instead.
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

      <ChartSection title="The June Slide: Six-Month Price Trend">
        <p className="mb-4">
          Here&apos;s the broad story in one picture. Almost everything I track
          fell in June, and the six-month lines show it clearly. The{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-3080">RTX 3080</Link> and{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-4070">RTX 4070</Link> have
          been grinding down for months and both stepped lower again. The{" "}
          <Link href="/gpu/shop/amd-radeon-rx-6800-xt">RX 6800 XT</Link> and{" "}
          <Link href="/gpu/shop/amd-radeon-rx-9070">RX 9070</Link> did the same.
          This is what a normalizing market looks like: no single dramatic
          crash, just steady downward pressure across generations as supply
          catches up with demand. If you&apos;ve been waiting to buy, the trend
          is finally on your side.
        </p>
        <PriceHistoryChart
          dateRange={dateRange}
          gpus={[
            "nvidia-geforce-rtx-3080",
            "nvidia-geforce-rtx-4070",
            "amd-radeon-rx-6800-xt",
            "nvidia-geforce-rtx-3080-ti",
            "amd-radeon-rx-9070",
          ]}
        />
      </ChartSection>

      <ChartSection title="RTX 50 Series: 5090 Premium Cools, Everything Else Near or Below MSRP">
        <p className="mb-4">
          The <Link href="/gpu/shop/nvidia-geforce-rtx-5090">5090</Link> premium
          cooled from 83% above MSRP in May to 68% in June ($3,352 best deal).
          It&apos;s still the one Blackwell card carrying a real scalper tax,
          but the direction is finally right. Everything else in the lineup is
          at or below sticker: the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-5070-ti">5070 Ti</Link>{" "}
          ($720, -4%),{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-5070">5070</Link> ($518,
          -6%), <Link href="/gpu/shop/nvidia-geforce-rtx-5080">5080</Link>{" "}
          ($933, -7%), and{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-5060">5060</Link> ($270,
          -10%) all sit under MSRP, while the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-5060-ti">5060 Ti</Link>{" "}
          ($441, +3%) and{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-5050">5050</Link> ($263, +6%)
          are within a few percent of it. For the cards near MSRP, retail stock
          at Microcenter, Best Buy, and Newegg often beats resale, so check
          there too.
        </p>
        <ScalperPremiumChart dateRange={dateRange} />
      </ChartSection>

      <ChartSection title="Other Notes">
        <ul className="mb-4">
          <li className="mb-2">
            <strong>Used Ampere and RDNA2 are on fire-sale.</strong> The{" "}
            <Link href="/gpu/shop/nvidia-geforce-rtx-3080-ti">RTX 3080 Ti</Link>{" "}
            is 66% below its original MSRP at $407, the{" "}
            <Link href="/gpu/shop/amd-radeon-rx-6900-xt">RX 6900 XT</Link> is
            63% below at $371, and the{" "}
            <Link href="/gpu/shop/nvidia-geforce-rtx-3070">RTX 3070</Link> is
            60% below at $200. If you don&apos;t need the latest architecture,
            last-gen used cards are the value story of the summer.
          </li>
          <li className="mb-2">
            <strong>RX 9070 dropped back below MSRP.</strong> The{" "}
            <Link href="/gpu/shop/amd-radeon-rx-9070">RX 9070</Link> fell 18%
            MoM to $465, which is 15% under its $549 MSRP, reversing last
            month&apos;s spike. The{" "}
            <Link href="/gpu/shop/amd-radeon-rx-9070-xt">RX 9070 XT</Link>{" "}
            ($607) sits right at its $599 MSRP, and the{" "}
            <Link href="/gpu/shop/amd-radeon-rx-9060-xt">RX 9060 XT</Link>{" "}
            ($373) is a touch above its $350 sticker. As always with new-gen
            cards, check retail stock, which has been improving.
          </li>
          <li className="mb-2">
            <strong>H100 whipsawed back up.</strong> Last month the{" "}
            <Link href="/gpu/shop/nvidia-h100-pcie">H100 PCIe</Link> resale
            price dipped to around $19K. In June it bounced 69% back to around
            $32.7K. Datacenter GPUs trade in tiny volumes on the resale market,
            so treat single-month moves like this as noise, not a trend.
          </li>
          <li className="mb-2">
            <strong>Intel Arc remains the inference value play.</strong> The{" "}
            <Link href="/gpu/shop/intel-arc-b570">B570</Link> and{" "}
            <Link href="/gpu/shop/intel-arc-b580">B580</Link> still lead the
            $/INT8 TOP chart. The catch is still the software stack, but if
            you&apos;re willing to wrestle with IPEX-LLM, Intel gives you more
            INT8 throughput per dollar than any NVIDIA card.
          </li>
        </ul>
      </ChartSection>
    </ReportLayout>
  )
}

// Rendered per request: this route reads the database, which is not reachable
// during the Docker image build.
export const dynamic = "force-dynamic"
