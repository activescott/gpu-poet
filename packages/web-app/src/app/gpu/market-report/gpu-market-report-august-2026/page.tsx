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

export default async function August2026Report(): Promise<ReactNode> {
  const { dateRange } = reportMetadata

  return (
    <ReportLayout metadata={reportMetadata}>
      <div className="alert alert-secondary mb-5">
        <strong>Editor&apos;s note:</strong> Some of the listings behind this
        report&apos;s charts were later excluded for data quality, which changed
        the numbers below. See the{" "}
        <Link href="/gpu/market-report/gpu-market-report-october-2026#corrections">
          corrections in the October 2026 report
        </Link>{" "}
        for what changed.
      </div>

      <div className="lead mb-5">
        <p>
          The headline in July is that the RTX 50-series scalper tax (the resale
          markup over MSRP that inflated street prices during the launch
          scramble) has mostly lifted. The{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-5080">5080</Link> ($959),{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-5070">5070</Link> ($507),{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-5060">5060</Link> ($258), and{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-5050">5050</Link> ($250) all
          sit at or below MSRP now, and only the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-5090">5090</Link> still
          carries a large premium (about 44% over its $1,999 sticker), and even
          that eased slightly from June. Cheaper isn&apos;t the same as smarter,
          though: the 5060 and 5050 ship with just 8GB of VRAM, so you&apos;re
          buying a current-gen GPU that runs out of memory before it runs out of
          horsepower &mdash; a poor bet in 2026. The 5080 is the only card below
          the 5090 here with 16GB, and the 5090&apos;s premium at least buys the
          one genuinely uncompromised card in the stack (32GB). The other
          surprise is that June&apos;s across-the-board price slide did not
          continue. It split by tier: the priciest cards eased (the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-4080">RTX 4080</Link> fell
          13%) while the mid-range firmed up (the{" "}
          <Link href="/gpu/shop/amd-radeon-rx-6800-xt">RX 6800 XT</Link> jumped
          22%, the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-3060">RTX 3060</Link> rose
          16%, and the <Link href="/gpu/shop/amd-radeon-rx-9070">RX 9070</Link>{" "}
          climbed 14%). So if you&apos;ve been waiting for the mid-range to keep
          falling, June may well have been the floor. Below I break down the
          best bang for your buck by use case, using July&apos;s best-deal
          pricing across eBay and Amazon (average of the 3 cheapest listings).
        </p>
      </div>

      <ChartSection title="Where's the RTX 3090? A Note on Memory-Aware Value">
        <p className="mb-4">
          A personal favorite of mine is the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-3090">RTX 3090</Link>, the
          24GB Ampere flagship. It never appears in any of the rankings below,
          and July&apos;s data shows why. Its best deal landed at{" "}
          <strong>$990</strong> (34% under its $1,499 MSRP), which sounds
          fantastic until you notice the 3 cheapest are fleeting &mdash; the
          bulk of listings sit in the $1,200&ndash;1,600 range &mdash; and that
          the price is <strong>rising, not falling</strong> (up 3.6% month over
          month, from $956 in June). It&apos;s riding the same older-card
          firming as the{" "}
          <Link href="/gpu/shop/amd-radeon-rx-6800-xt">RX 6800 XT</Link> and{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-3060">RTX 3060</Link>.
        </p>
        <p className="mb-4">
          On cost-per-compute it simply loses. Even at the $990 best deal it
          works out to about{" "}
          <Link href="/gpu/price-compare/ai/int8-tops">
            <strong>$3.47 per INT8 TOP</strong> (285 dense TOPS)
          </Link>{" "}
          and{" "}
          <Link href="/gpu/price-compare/ai/fp32-flops">
            <strong>$27.80 per FP32 TFLOP</strong> (35.6 TFLOPS)
          </Link>{" "}
          &mdash; see the full cost-per-compute rankings for yourself &mdash;
          both roughly 2&ndash;3&times; the leaders and well off the bottom of
          the charts, where the{" "}
          <Link href="/gpu/shop/intel-arc-b570">Arc B570</Link> ($1.00/TOP) and{" "}
          <Link href="/gpu/shop/nvidia-tesla-p100">Tesla P100</Link>{" "}
          ($6.80/TFLOP) sit. The 3090&apos;s one genuine edge is the axis none
          of these charts reward: 24GB of VRAM.
        </p>
        <h3 className="h5 mt-4 mb-3">The missing memory-aware ranking</h3>
        <p className="mb-4">
          And that&apos;s the honest limitation of this report. Ranking by{" "}
          $/FPS, $/INT8 TOP, and $/TFLOP is easy to compute and hard to argue
          with, but it treats a 8GB card and a 24GB card as interchangeable so
          long as the throughput-per-dollar matches. For AI inference and
          training, memory capacity is often the thing that decides whether a
          model runs at all &mdash; so a card that looks &quot;expensive&quot;
          on $/TOP can be the only affordable option once your model needs the
          VRAM. I don&apos;t want to settle that with my own bias toward the
          3090; I&apos;d rather settle it with data. We&apos;re planning a
          memory-aware value ranking &mdash; something that weighs cost against
          both compute <em>and</em> usable VRAM for real inference and training
          workloads &mdash; and we want to build it around how you actually
          choose. If you buy GPUs for AI, tell us what capacity thresholds and
          workloads matter to you on the{" "}
          <Link href="/contact">contact page</Link>. Your feedback will shape
          the metric.
        </p>
      </ChartSection>

      <ChartSection title="1440p Gaming Best Bang for Your Buck in August 2026">
        <p className="mb-4">
          The{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-3060-ti">RTX 3060 Ti</Link>{" "}
          leads at $1.13/FPS in Counter-Strike 2 @ 1440p ($200 best deal, 177
          FPS, 8GB), just ahead of the{" "}
          <Link href="/gpu/shop/amd-radeon-rx-7600">RX 7600</Link> at $1.18/FPS
          ($189, 160 FPS, 8GB). Both are 8GB cards, so you&apos;ll be managing
          texture settings in newer titles. If you want headroom without the 8GB
          ceiling, the{" "}
          <Link href="/gpu/shop/amd-radeon-rx-7700-xt">RX 7700 XT</Link> at
          $1.38/FPS ($340, 246 FPS, 12GB) is the pick: same $/FPS as the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-3080">RTX 3080</Link> ($305,
          222 FPS, 10GB) but with more VRAM and a newer architecture. One thing
          to note: several of these cards ticked up in July, so if you want one,
          the best prices may already be fading rather than falling further.
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

      <ChartSection title="4K Gaming Best Bang for Your Buck in August 2026">
        <p className="mb-4">
          The <Link href="/gpu/shop/amd-radeon-rx-7600">RX 7600</Link> ($189, 88
          FPS, 8GB) wins raw $/FPS at $2.15 in Counter-Strike 2 @ 4K, but 8GB
          isn&apos;t enough for 4K in 2026. The number holds in CS2; newer
          titles will hit the VRAM wall hard. The practical pick is the{" "}
          <Link href="/gpu/shop/amd-radeon-rx-7900-xt">RX 7900 XT</Link> at
          $2.40/FPS ($542, 226 FPS, 20GB), which also sits 40% below its $899
          MSRP. If 10GB is enough for you, the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-3080">RTX 3080</Link> at
          $2.50/FPS ($305, 122 FPS, 10GB) is the cheapest way onto the 4K board.
          And if you can stretch the budget, the{" "}
          <Link href="/gpu/shop/amd-radeon-rx-7900-xtx">RX 7900 XTX</Link> at
          $2.92/FPS ($781, 268 FPS, 24GB) gives you the most VRAM and headroom
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

      <ChartSection title="AI Inference Best Bang for Your Buck in August 2026">
        <p className="mb-4">
          Intel leads the inference chart in July. The{" "}
          <Link href="/gpu/shop/intel-arc-b570">Arc B570</Link> ($202, 203 TOPS,
          10GB) tops it at $1.00/INT8 TOP, with the{" "}
          <Link href="/gpu/shop/intel-arc-b580">Arc B580</Link> ($241, 233 TOPS,
          12GB) right behind at $1.03/TOP. The catch is software: Intel&apos;s
          OneAPI/IPEX-LLM stack works but is far less common than CUDA across
          open source AI, ML, and scientific libraries. If you want the
          known-good NVIDIA path, the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-3080">RTX 3080</Link> ($305,
          238 TOPS, 10GB) at $1.28/TOP and the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-3070">RTX 3070</Link> ($210,
          163 TOPS, 8GB) at $1.29/TOP are the next-best deals. For more VRAM
          headroom, the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-3080-ti">RTX 3080 Ti</Link>{" "}
          ($393, 273 TOPS, 12GB) at $1.44/TOP is the cheapest 12GB card on the
          chart, the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-4070-ti">RTX 4070 Ti</Link>{" "}
          ($535, 321 TOPS, 12GB) at $1.67/TOP offers the same VRAM on newer Ada
          silicon, and the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-4080">RTX 4080</Link> ($730,
          390 TOPS, 16GB) at $1.87/TOP is the cheapest 16GB card on the chart.
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

      <ChartSection title="LLM Training and Fine-Tuning Best Bang for Your Buck in August 2026">
        <p className="mb-4">
          On raw $/TFLOP, the{" "}
          <Link href="/gpu/shop/nvidia-tesla-p100">Tesla P100</Link> ($72, 10.6
          TFLOPS, 16GB) wins at $6.8, but it&apos;s a 2016 datacenter card with
          no tensor cores and limited modern framework support. For real-world
          training, the practical leader this month is the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-4080">RTX 4080</Link> at
          $7.5/TFLOP ($730, 97.4 TFLOPS, 16GB): Ada tensor cores, well-supported
          in every framework, and it fell 13% in July as the high end cooled. It
          edges out the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-4080-super">
            RTX 4080 Super
          </Link>{" "}
          ($882, 104.5 TFLOPS) at $8.4 and the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-5080">RTX 5080</Link> ($959,
          112.6 TFLOPS) at $8.5, which gets you Blackwell and FP4 support if you
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

      <ChartSection title="A Bifurcated Market: The Top Cools, the Middle Firms Up">
        <p className="mb-4">
          This is the story of the month, and it&apos;s not the one I expected
          after June. Roughly as many cards rose as fell, but they split cleanly
          by price tier. The expensive cards came down: the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-4080">RTX 4080</Link> fell
          13% to $730 and the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-3080-ti">RTX 3080 Ti</Link>{" "}
          kept drifting lower. The cheaper cards firmed up: the{" "}
          <Link href="/gpu/shop/amd-radeon-rx-6800-xt">RX 6800 XT</Link> bounced
          22% off June&apos;s bottom to $332, the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-3060">RTX 3060</Link> rose
          16%, and the <Link href="/gpu/shop/amd-radeon-rx-9070">RX 9070</Link>{" "}
          rose 14%. If you&apos;ve been waiting for the mid-range to keep
          falling, that bet looks weaker now: June may well have been the floor,
          and the deals are slowly firming rather than deepening.
        </p>
        <PriceHistoryChart
          dateRange={dateRange}
          gpus={[
            "nvidia-geforce-rtx-4080",
            "nvidia-geforce-rtx-3080-ti",
            "amd-radeon-rx-6800-xt",
            "nvidia-geforce-rtx-3060",
            "amd-radeon-rx-9070",
          ]}
        />
      </ChartSection>

      <ChartSection title="RTX 50 Series: Premiums Cool, Only the 5090 Carries a Real Tax">
        <p className="mb-4">
          The RTX 50 scalper tax has mostly lifted. The{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-5060">5060</Link> ($258,
          -14%), <Link href="/gpu/shop/nvidia-geforce-rtx-5070">5070</Link>{" "}
          ($507, -8%), and{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-5080">5080</Link> ($959, -4%)
          all sit below MSRP, and the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-5050">5050</Link> ($250) is
          right at it. The{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-5070-ti">5070 Ti</Link>{" "}
          ($807, +8% over MSRP) and{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-5060-ti">5060 Ti</Link>{" "}
          ($478, +11%) carry only a small premium, and both actually rose
          month-over-month along with the rest of the mid-range. The one card
          still carrying a real tax is the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-5090">5090</Link> at $2,873,
          about 44% over its $1,999 MSRP. Even that eased slightly (down 6% from
          June), so the direction is right. The 5090 is also the one RTX 50 card
          that is genuinely hard to buy at MSRP through retail, so its premium
          is more real than most; for everything else near sticker, retail stock
          at Microcenter, Best Buy, and Newegg often beats resale, so check
          there too.
        </p>
        <ScalperPremiumChart dateRange={dateRange} />
      </ChartSection>

      <ChartSection title="Other Notes">
        <ul className="mb-4">
          <li className="mb-2">
            <strong>
              Used Ampere and RDNA2 are still the deepest discounts.
            </strong>{" "}
            Measured against original MSRP, the{" "}
            <Link href="/gpu/shop/amd-radeon-rx-6900-xt">RX 6900 XT</Link> is
            70% below at $297, the{" "}
            <Link href="/gpu/shop/nvidia-geforce-rtx-3080-ti">RTX 3080 Ti</Link>{" "}
            is 67% below at $393, and the{" "}
            <Link href="/gpu/shop/nvidia-geforce-rtx-3070">RTX 3070</Link> is
            58% below at $210. These remain the best value on the board, but
            note that several used cards firmed up in July rather than falling
            further, so don&apos;t count on them getting cheaper.
          </li>
          <li className="mb-2">
            <strong>Datacenter pricing was noisy in both directions.</strong>{" "}
            The <Link href="/gpu/shop/nvidia-h100-pcie">H100 PCIe</Link>{" "}
            best-deal fell 15% to around $27.7K, but the{" "}
            <Link href="/gpu/shop/nvidia-a100-pcie">A100 PCIe</Link> jumped 25%
            and the <Link href="/gpu/shop/nvidia-a10">A10</Link> rose 31% the
            same month. Datacenter GPUs trade in tiny volumes on the resale
            market, so treat any single-month move as noise, not a trend.
          </li>
          <li className="mb-2">
            <strong>Intel Arc is the inference value play.</strong> The{" "}
            <Link href="/gpu/shop/intel-arc-b570">B570</Link> and{" "}
            <Link href="/gpu/shop/intel-arc-b580">B580</Link> lead the $/INT8
            TOP chart, both right around $1.00/TOP. The catch is still the
            software stack, but if you&apos;re willing to wrestle with IPEX-LLM,
            Intel gives you more INT8 throughput per dollar than any NVIDIA
            card.
          </li>
        </ul>
      </ChartSection>
    </ReportLayout>
  )
}

// Rendered per request: this route reads the database, which is not reachable
// during the Docker image build.
export const dynamic = "force-dynamic"
