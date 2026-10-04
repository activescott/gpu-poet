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

export default async function September2026Report(): Promise<ReactNode> {
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
          Last month I wrote that the RTX 50{" "}
          <Link href="/gpu/learn/why-gpus-are-so-expensive">scalper tax</Link>{" "}
          had mostly lifted. That did not last, though as you will see, what
          replaced it is not really scalping either. In August every single RTX
          50 card got more expensive, from the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-5090">5090</Link> (up 13% to
          $3,254) down to the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-5060">5060</Link> (up 16% to
          $298). But here is the part that actually changes how you should shop:
          for the first time since I started publishing these, the resale market
          is the <em>cheap</em> option. Every RTX 50 card in this report&apos;s
          data costs less secondhand than the same card costs new. All prices
          here are best-deal pricing across eBay and Amazon (the average of the
          3 cheapest listings).
        </p>
      </div>

      <ChartSection title="The Advice Just Inverted: Resale Beats Retail">
        <p className="mb-4">
          I normally end the RTX 50 section with a warning to go check
          Microcenter or Newegg before you pay an eBay seller&apos;s premium.
          That warning is now reversed. Here is August best-deal pricing next to
          what the same card cost new on Amazon in August, both from our own
          data:
        </p>
        <div className="table-responsive mb-4">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>GPU</th>
                <th className="text-end">MSRP</th>
                <th className="text-end">Best resale deal (Aug)</th>
                <th className="text-end">New on Amazon (Aug)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <Link href="/gpu/shop/nvidia-geforce-rtx-5090">RTX 5090</Link>
                </td>
                <td className="text-end">$1,999</td>
                <td className="text-end">$3,254</td>
                <td className="text-end">$4,262</td>
              </tr>
              <tr>
                <td>
                  <Link href="/gpu/shop/nvidia-geforce-rtx-5080">RTX 5080</Link>
                </td>
                <td className="text-end">$999</td>
                <td className="text-end">$1,039</td>
                <td className="text-end">$1,245</td>
              </tr>
              <tr>
                <td>
                  <Link href="/gpu/shop/nvidia-geforce-rtx-5070-ti">
                    RTX 5070 Ti
                  </Link>
                </td>
                <td className="text-end">$749</td>
                <td className="text-end">$849</td>
                <td className="text-end">$914</td>
              </tr>
              <tr>
                <td>
                  <Link href="/gpu/shop/nvidia-geforce-rtx-5070">RTX 5070</Link>
                </td>
                <td className="text-end">$549</td>
                <td className="text-end">$539</td>
                <td className="text-end">$735</td>
              </tr>
              <tr>
                <td>
                  <Link href="/gpu/shop/nvidia-geforce-rtx-5060-ti">
                    RTX 5060 Ti (16GB)
                  </Link>
                </td>
                <td className="text-end">$429</td>
                <td className="text-end">$507</td>
                <td className="text-end">$584</td>
              </tr>
              <tr>
                <td>
                  <Link href="/gpu/shop/nvidia-geforce-rtx-5060">RTX 5060</Link>
                </td>
                <td className="text-end">$299</td>
                <td className="text-end">$298</td>
                <td className="text-end">$357</td>
              </tr>
              <tr>
                <td>
                  <Link href="/gpu/shop/nvidia-geforce-rtx-5050">RTX 5050</Link>
                </td>
                <td className="text-end">$249</td>
                <td className="text-end">$268</td>
                <td className="text-end">$307</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mb-4">
          Resale wins on all seven. On the 5090 it wins by $1,008, which is 24%
          off the price of buying the same card new. Both columns are August,
          both use the same method (the average of the 3 cheapest listings), so
          this is a like-for-like comparison rather than one of those
          apples-to-oranges price screenshots. The one thing I would not
          overclaim: I can tell an Amazon listing is new, but I cannot always
          tell whether the seller is Amazon itself or a third party on their
          marketplace, so read that column as &quot;what a new one cost on
          Amazon&quot; rather than as a manufacturer&apos;s storefront price.
          For what it is worth, an independent price tracker had these same
          cards within a few percent of my numbers.
          <sup>
            <a href="#note-1">1</a>
          </sup>{" "}
          The cause is not{" "}
          <Link href="/gpu/learn/why-gpus-are-so-expensive">scalping</Link> this
          time, it is the memory market: AI datacenter demand has made GDDR7
          scarce enough that Nvidia is reportedly allocating it by revenue per
          gigabyte, with no new consumer generation expected until late 2027 at
          the earliest.
          <sup>
            <a href="#note-1">1</a>
          </sup>{" "}
          New stock repriced upward to match, and the used market, full of cards
          bought at 2025 prices, has not caught up yet.
        </p>
        <div className="alert alert-warning mt-3">
          <strong>What I&apos;d do:</strong> if you need a current-gen card,
          check resale <em>first</em> now, which is the opposite of the advice I
          gave in July. And if you are on the fence about upgrading at all,
          nothing in this data suggests waiting gets you a better price.
        </div>
        <ScalperPremiumChart dateRange={dateRange} />
        <p className="mt-3">
          Measured against MSRP the chart still tells a grim story: the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-5090">5090</Link> sits 63%
          over sticker, the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-5060-ti">5060 Ti</Link> 18%
          over, and the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-5070-ti">5070 Ti</Link> 13%
          over. The chart shows the six largest premiums, which means the one
          card that came in under MSRP does not appear on it: the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-5070">5070</Link> at $539, 2%
          below its $549 sticker, and that is the entire below-MSRP list.
          Honestly, MSRP is becoming a historical footnote for this generation
          rather than a price anyone can pay.
        </p>
      </ChartSection>

      <ChartSection title="1440p Gaming Best Bang for Your Buck in September 2026">
        <p className="mb-4">
          The cheapest route to good 1440p frames is the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-3060-ti">RTX 3060 Ti</Link>{" "}
          at $1.05/FPS, and it is cheaper than last month. Of course the catch
          is memory. At only 8GB, newer releases slow if you turn textures up.
          For about $140 more, the{" "}
          <Link href="/gpu/shop/amd-radeon-rx-6800-xt">RX 6800 XT</Link> gets
          you to 16GB, and the{" "}
          <Link href="/gpu/shop/amd-radeon-rx-7800-xt">RX 7800 XT</Link> is the
          faster of the two if you can stretch to $412. Both cost more per
          frame, but if you expect to keep the card a couple of years, that is
          where I would put the money.
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

      <ChartSection title="4K Gaming Best Bang for Your Buck in September 2026">
        <p className="mb-4">
          The top of this chart is a trap. The{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-3070-ti">RTX 3070 Ti</Link>{" "}
          wins on cost per frame at $2.40, but it only wins because
          Counter-Strike 2 is light on memory where modern AAA 4K games with
          textures up are not. I would take the{" "}
          <Link href="/gpu/shop/amd-radeon-rx-7900-xt">RX 7900 XT</Link> at
          $2.47 instead: near enough the same cost per frame, 20GB behind it,
          and 38% below its original MSRP. If $558 is too much, the{" "}
          <Link href="/gpu/shop/amd-radeon-rx-7800-xt">RX 7800 XT</Link> is the
          cheapest card here with real memory behind it.
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

      <ChartSection title="AI Inference Best Bang for Your Buck in September 2026">
        <p className="mb-4">
          Intel leads on paper. The{" "}
          <Link href="/gpu/shop/intel-arc-b580">Arc B580</Link> tops the chart
          at $1.03 per INT8 TOP, and the catch is not the hardware. OneAPI and
          IPEX-LLM work, but far less of the open source AI stack assumes them
          than assumes CUDA, and you will feel that on the day something does
          not build. The safe path got cheaper this month: the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-3070">RTX 3070</Link> fell
          16% to $1.09/TOP, the cheapest CUDA throughput on the board. Both are
          8 to 12GB cards though, and the cheapest 16GB option is the{" "}
          <Link href="/gpu/shop/amd-radeon-rx-9060-xt">RX 9060 XT</Link> at
          $1.84. Once a model does not fit, the rate stops mattering.
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

      <ChartSection title="LLM Training and Fine-Tuning Best Bang for Your Buck in September 2026">
        <p className="mb-4">
          Ignore the winner. The{" "}
          <Link href="/gpu/shop/nvidia-tesla-p100">Tesla P100</Link> takes the
          chart at $6.1/TFLOP on real listings I checked, but it is a 2016
          datacenter card with no tensor cores and thinning framework support.
          Buy it as a cheap experiment, not as a training rig. The practical
          leader is the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-4080">RTX 4080</Link> at
          $8.0/TFLOP even after rising 7% in August, and Blackwell charges 15 to
          20% more per TFLOP if you want FP4. All of them are 16GB. If capacity
          is the real constraint, the{" "}
          <Link href="/gpu/shop/nvidia-a30">NVIDIA A30</Link> is the outlier
          worth knowing: 24GB of HBM2 at $9.8/TFLOP, roughly what a 5080 costs.
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

      <ChartSection title="New Silicon Up, Used RTX 30 Series Down">
        <p className="mb-4">
          Sort August by architecture and the split is clean. All twelve
          current-gen cards I track were flat or up, and most of the RTX 40
          series followed. The used{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-3070">RTX 3070</Link> went
          the other way, down 16%, and the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-3090">RTX 3090</Link> with
          it. It is not a universal rule, since the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-3080-ti">RTX 3080 Ti</Link>{" "}
          rose 10%, but the mechanism is worth understanding: the memory crunch
          reprices anything still being manufactured, while five-year-old cards
          are priced by how many people happen to be selling them. Only one of
          those two things is on your side right now.
        </p>
        <PriceHistoryChart
          dateRange={dateRange}
          gpus={[
            "nvidia-geforce-rtx-5080",
            "nvidia-geforce-rtx-4080",
            "nvidia-geforce-rtx-3090",
            "nvidia-geforce-rtx-3070",
          ]}
        />
      </ChartSection>

      <ChartSection title="Other Notes">
        <ul className="mb-4">
          <li className="mb-2">
            <strong>
              The used RTX 30 and RX 6000 series are still the deepest
              discounts.
            </strong>{" "}
            Against original MSRP the{" "}
            <Link href="/gpu/shop/nvidia-geforce-rtx-3070">RTX 3070</Link> is
            65% below at $177, the{" "}
            <Link href="/gpu/shop/nvidia-geforce-rtx-3080-ti">RTX 3080 Ti</Link>{" "}
            is 64% below at $432, and the{" "}
            <Link href="/gpu/shop/amd-radeon-rx-6950-xt">RX 6950 XT</Link> is
            62% below at $415. Depth of discount is not the same as direction,
            though: only the 3070 is still falling. The 3080 Ti rose 10% and the
            6950 XT rose 3% in August, so a big number next to MSRP does not
            mean the card is getting cheaper.
          </li>
          <li className="mb-2">
            <strong>Datacenter: the H200 is undercutting the H100.</strong> The{" "}
            <Link href="/gpu/shop/nvidia-h200-nvl">H200 NVL</Link> best deal
            fell 18% to about $23.2K while the{" "}
            <Link href="/gpu/shop/nvidia-h100-pcie">H100 PCIe</Link> eased 6% to
            about $26.0K, so the newer card is now the cheaper one. Take it with
            salt: we saw 31 distinct H200 listings and only 10 H100 listings
            that month, and at those volumes a couple of sellers move the whole
            number. Going the other way, the{" "}
            <Link href="/gpu/shop/nvidia-a100-pcie">A100 PCIe</Link> rose 12% to
            $12.6K and the <Link href="/gpu/shop/nvidia-a10">A10</Link> rose 20%
            to $2.8K.
          </li>
          <li className="mb-2">
            <strong>Still gathering input on a memory-aware ranking.</strong>{" "}
            Last month I asked what VRAM thresholds and workloads matter to you,
            because $/TOP and $/TFLOP treat an 8GB card and a 24GB card as
            interchangeable. The 3070 topping the CUDA inference value list on
            8GB is exactly the case where that breaks down. If you buy GPUs for
            AI, tell me what you need on the{" "}
            <Link href="/contact">contact page</Link>.
          </li>
        </ul>
      </ChartSection>

      <hr className="mt-5 mb-3" />
      <p className="small text-body-secondary" id="note-1">
        <strong>1.</strong> Cross-check and memory-allocation reporting:{" "}
        <a
          href="https://www.tomshardware.com/pc-components/gpus/lowest-gpu-prices-tracking"
          target="_blank"
          rel="noopener noreferrer"
        >
          Tom&apos;s Hardware GPU Price Index
        </a>
        . Their best US prices for the RTX 5090, 5080, 5070 Ti, 5060 Ti, 5060,
        and 5050 all landed within about 6% of my new-on-Amazon figures for the
        same period. All other prices in this report are GPU Poet&apos;s own
        data.
      </p>
    </ReportLayout>
  )
}

// Rendered per request: this route reads the database, which is not reachable
// during the Docker image build.
export const dynamic = "force-dynamic"
