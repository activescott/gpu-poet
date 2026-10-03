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

export default async function October2026Report(): Promise<ReactNode> {
  const { dateRange } = reportMetadata

  return (
    <ReportLayout metadata={reportMetadata}>
      <div className="lead mb-5">
        <p>
          Last month I said the used RTX 30 series was the one corner of the
          market still getting cheaper. September undid that. The{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-3090">RTX 3090</Link> jumped
          38% to $1,207 and the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-3070">RTX 3070</Link> rose
          24%, both to their highest prices in six months. It was not just them:
          of the 81 GPUs with listings in both August and September, 59 got more
          expensive and 17 got cheaper. RTX 50 rose for a second straight month,
          and new cards on Amazon rose faster than used ones. All prices here
          are best-deal pricing across eBay and Amazon (the average of the 3
          cheapest listings).
        </p>
      </div>

      <ChartSection title="Resale Still Beats Retail, and the Gap Grew">
        <p className="mb-4">
          Last month I told you to check resale before buying an RTX 50 card
          new. September made that advice stronger. Here is September best-deal
          pricing next to what the same card cost new on Amazon in September and
          August, all from our own data:
        </p>
        <div className="table-responsive mb-4">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>GPU</th>
                <th className="text-end">MSRP</th>
                <th className="text-end">Best resale deal (Sep)</th>
                <th className="text-end">New on Amazon (Sep)</th>
                <th className="text-end">New on Amazon (Aug)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <Link href="/gpu/shop/nvidia-geforce-rtx-5090">RTX 5090</Link>
                </td>
                <td className="text-end">$1,999</td>
                <td className="text-end">$4,058</td>
                <td className="text-end">$5,258</td>
                <td className="text-end">$4,262</td>
              </tr>
              <tr>
                <td>
                  <Link href="/gpu/shop/nvidia-geforce-rtx-5080">RTX 5080</Link>
                </td>
                <td className="text-end">$999</td>
                <td className="text-end">$1,233</td>
                <td className="text-end">$1,623</td>
                <td className="text-end">$1,245</td>
              </tr>
              <tr>
                <td>
                  <Link href="/gpu/shop/nvidia-geforce-rtx-5070-ti">
                    RTX 5070 Ti
                  </Link>
                </td>
                <td className="text-end">$749</td>
                <td className="text-end">$895</td>
                <td className="text-end">$1,212</td>
                <td className="text-end">$914</td>
              </tr>
              <tr>
                <td>
                  <Link href="/gpu/shop/nvidia-geforce-rtx-5070">RTX 5070</Link>
                </td>
                <td className="text-end">$549</td>
                <td className="text-end">$557</td>
                <td className="text-end">$835</td>
                <td className="text-end">$735</td>
              </tr>
              <tr>
                <td>
                  <Link href="/gpu/shop/nvidia-geforce-rtx-5060-ti">
                    RTX 5060 Ti (16GB)
                  </Link>
                </td>
                <td className="text-end">$429</td>
                <td className="text-end">$600</td>
                <td className="text-end">$875</td>
                <td className="text-end">$584</td>
              </tr>
              <tr>
                <td>
                  <Link href="/gpu/shop/nvidia-geforce-rtx-5060">RTX 5060</Link>
                </td>
                <td className="text-end">$299</td>
                <td className="text-end">$328</td>
                <td className="text-end">$440</td>
                <td className="text-end">$357</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mb-4">
          New on Amazon rose on all six, and on five of them faster than resale
          did. The 5070 Ti is the clearest case: up 33% new against 5% used. The
          5090 rose about a quarter either way, and its best resale deal is now
          more than twice MSRP. One caveat: Amazon does not tell me a
          listing&apos;s condition, so a used offer sold under a new card&apos;s
          title can land in that column. Read it as what the featured offer on
          Amazon cost, which is usually new.
        </p>
        <div className="alert alert-warning mt-3">
          <strong>What I&apos;d do:</strong> same as last month, check resale{" "}
          <em>first</em> for any RTX 50 card. If you have been holding out for
          prices to come back down, September gave no sign of it.
        </div>
        <ScalperPremiumChart dateRange={dateRange} />
        <p className="mt-3">
          Against MSRP the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-5090">5090</Link> is now 103%
          over sticker, up from 63% in August. The chart shows the six largest
          premiums, so the one card missing is the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-5070">5070</Link> at $557, 1%
          over its $549 MSRP. That makes it the only RTX 50 card still within a
          few percent of list price.
        </p>
      </ChartSection>

      <ChartSection title="1440p Gaming Best Bang for Your Buck in October 2026">
        <p className="mb-4">
          The{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-3060-ti">RTX 3060 Ti</Link>{" "}
          still leads at $1.19/FPS, though it rose 14% and now costs more than
          it did in July. The next two cards are 8GB as well, so the one I would
          look at is the{" "}
          <Link href="/gpu/shop/amd-radeon-rx-7700-xt">RX 7700 XT</Link>: 12GB,
          21 cents more per frame, and one of the few cards that got cheaper in
          September. For about $15 more, the{" "}
          <Link href="/gpu/shop/amd-radeon-rx-6800-xt">RX 6800 XT</Link> gets
          you 16GB. If you plan to keep the card a couple of years, that is the
          one I would buy.
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

      <ChartSection title="4K Gaming Best Bang for Your Buck in October 2026">
        <p className="mb-4">
          Same trap as last month, now with two cards in it. The{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-3070-ti">RTX 3070 Ti</Link>{" "}
          and <Link href="/gpu/shop/amd-radeon-rx-7600">RX 7600</Link> lead on
          cost per frame, but both are 8GB cards that only rank here because
          Counter-Strike 2 barely touches memory at 4K. Modern AAA games with
          textures up will not be so kind. The{" "}
          <Link href="/gpu/shop/amd-radeon-rx-7900-xt">RX 7900 XT</Link> sits a
          few cents behind them with 20GB, and 37% below its original MSRP. If
          you are buying for 4K, that is still where I would put the money.
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

      <ChartSection title="AI Inference Best Bang for Your Buck in October 2026">
        <p className="mb-4">
          The <Link href="/gpu/shop/intel-arc-b570">Arc B570</Link> takes the
          top spot from its sibling at $1.03 per INT8 TOP, with the same Intel
          catch: far less of the open source AI stack assumes OneAPI than
          assumes CUDA. Last month&apos;s cheap CUDA pick, the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-3070">RTX 3070</Link>, rose
          24% and slipped behind the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-3080">RTX 3080</Link>, which
          has 2GB more memory. The first 16GB card is the{" "}
          <Link href="/gpu/shop/amd-radeon-rx-9070-xt">RX 9070 XT</Link> at
          $1.67, on ROCm. If your models fit in 10GB, I would buy the 3080.
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

      <ChartSection title="LLM Training and Fine-Tuning Best Bang for Your Buck in October 2026">
        <p className="mb-4">
          The <Link href="/gpu/shop/nvidia-tesla-p100">Tesla P100</Link> leads
          again at $6.9/TFLOP, but it is a 2016 datacenter card with no tensor
          cores: a cheap experiment, not a training rig. The practical pick is
          still the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-4080">RTX 4080</Link>, even
          after an 11% rise. Last month I pointed to the{" "}
          <Link href="/gpu/shop/nvidia-a30">A30</Link> for 24GB. It rose 31%,
          and the{" "}
          <Link href="/gpu/shop/amd-radeon-rx-7900-xtx">RX 7900 XTX</Link> now
          edges it per TFLOP with the same 24GB. On ROCm, that is the cheaper
          route. If you need CUDA, the A30 is still the only 24GB card here.
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

      <ChartSection title="August's Used RTX 30 Dip Was Only a Dip">
        <p className="mb-4">
          A month ago this looked like a trend. Now it looks like one cheap
          month. The{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-3090">RTX 3090</Link> and{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-3070">RTX 3070</Link> both
          finished September at their highest best-deal price in six months,
          while the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-3060-ti">3060 Ti</Link> and{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-3080">3080</Link> recovered
          but stayed below April. My guess for the 3090 is memory: it is the
          cheapest GeForce card with 24GB, which is what local AI buyers want.
          If you were waiting on a used 3090, August was the window.
        </p>
        <PriceHistoryChart
          dateRange={dateRange}
          gpus={[
            "nvidia-geforce-rtx-3090",
            "nvidia-geforce-rtx-3070",
            "nvidia-geforce-rtx-3060-ti",
            "nvidia-geforce-rtx-3080",
          ]}
        />
      </ChartSection>

      <ChartSection title="Other Notes">
        <ul className="mb-4">
          <li className="mb-2">
            <strong>A correction on the H200.</strong> Last month I wrote that
            the <Link href="/gpu/shop/nvidia-h200-nvl">H200 NVL</Link> had
            undercut the{" "}
            <Link href="/gpu/shop/nvidia-h100-pcie">H100 PCIe</Link>. That
            rested on one $15,500 listing, sold as new and sealed under a title
            that said &quot;pair&quot;, which I should have caught. Without it
            the H200 was still the pricier card in August, and in September it
            is about $36.3K against $29.2K for the H100. The three cheapest H200
            listings in September were all qualification samples (QS in the
            title), which is worth knowing before you pay datacenter prices for
            one.
          </li>
          <li className="mb-2">
            <strong>
              The deepest discounts are still old flagships, and they are
              shrinking slowly.
            </strong>{" "}
            Against original MSRP the{" "}
            <Link href="/gpu/shop/nvidia-geforce-rtx-3080-ti">RTX 3080 Ti</Link>{" "}
            is 62% below at $450, the{" "}
            <Link href="/gpu/shop/amd-radeon-rx-6950-xt">RX 6950 XT</Link> is
            62% below at $418, and the{" "}
            <Link href="/gpu/shop/amd-radeon-rx-6900-xt">RX 6900 XT</Link> is
            60% below at $400. All three rose a little in September, by 4%, 1%,
            and 2%.
          </li>
        </ul>
      </ChartSection>
    </ReportLayout>
  )
}

// Rendered per request: this route reads the database, which is not reachable
// during the Docker image build.
export const dynamic = "force-dynamic"
