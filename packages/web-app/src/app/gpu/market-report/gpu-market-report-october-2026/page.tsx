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
          Prices rose almost everywhere in September. Of the 81 GPUs with
          listings in both August and September, 59 got more expensive and 17
          got cheaper. Every RTX 50 card rose for a second month: the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-5090">RTX 5090</Link>&apos;s
          best resale deal is $4,795, up 23% from August and 2.4 times its
          $1,999 MSRP, and new cards on Amazon rose faster than resale on five
          of six models. The used{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-3090">RTX 3090</Link> looks
          like the month&apos;s big mover at +38%, but most of that is one
          seller&apos;s cheap batch in August, which I break down below. All
          prices here are best-deal pricing across eBay and Amazon (the average
          of the 3 cheapest listings).
        </p>
      </div>

      <ChartSection title="Resale Still Beats Retail, and the Gap Grew">
        <p className="mb-4">
          Last month I told you to check resale before buying an RTX 50 card
          new. September made that advice stronger. Here is September best-deal
          pricing next to what the same card cost new on Amazon in September and
          August, all from our own data for each calendar month:
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
                <td className="text-end">$4,795</td>
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
          5090 rose 23% either way. Treat the September new column loosely:
          there were fewer Amazon listings than in August, and the 5060 Ti
          figure rests on three of them. Amazon also does not tell me a
          listing&apos;s condition, so a used offer sold under a new card&apos;s
          title can land in that column. And none of this includes retail
          stores. A Micro Center or Best Buy restock at MSRP beats every price
          in this table, so check them before you pay either column.
        </p>
        <div className="alert alert-warning mt-3">
          <strong>What I&apos;d do:</strong> same as last month, check resale{" "}
          <em>first</em> for any RTX 50 card. If you have been holding out for
          prices to come back down, September gave no sign of it.
        </div>
        <ScalperPremiumChart dateRange={dateRange} />
        <p className="mt-3">
          Against MSRP the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-5090">5090</Link> is now 140%
          over sticker on resale, up from 95% in August. The chart shows the six
          largest premiums, so the one card missing is the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-5070">5070</Link> at $557, 1%
          over its $549 MSRP. That makes it the only RTX 50 card still within a
          few percent of list price.
        </p>
      </ChartSection>

      <ChartSection title="1440p Gaming Best Bang for Your Buck in October 2026">
        <p className="mb-4">
          The{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-3060-ti">RTX 3060 Ti</Link>{" "}
          still leads at $1.19/FPS, though it rose 11% and now costs more than
          it did in July. The next two cards are 8GB as well. The one I would
          look at is the{" "}
          <Link href="/gpu/shop/amd-radeon-rx-6800">RX 6800</Link>: 16GB for
          about $95 more, and cheaper than the 12GB{" "}
          <Link href="/gpu/shop/amd-radeon-rx-7700-xt">RX 7700 XT</Link>. The{" "}
          <Link href="/gpu/shop/amd-radeon-rx-6800-xt">RX 6800 XT</Link> is
          about $50 more again for roughly 19% more frames. If you plan to keep
          the card a couple of years, the 6800 is the one I would buy.
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
          Same trap as last month, when the 10GB{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-3080">RTX 3080</Link> topped
          this chart (see the corrections at the end). This month the{" "}
          <Link href="/gpu/shop/amd-radeon-rx-7600">RX 7600</Link> leads on cost
          per frame, but it is an 8GB card that only ranks here because
          Counter-Strike 2 barely touches memory at 4K. Modern AAA games with
          textures up will not be so kind. The{" "}
          <Link href="/gpu/shop/amd-radeon-rx-7900-xt">RX 7900 XT</Link> is four
          cents behind it with 20GB, and 37% below its original MSRP. If you are
          buying for 4K, that is still where I would put the money.
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
          27% and slipped behind the{" "}
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
          after a 9% rise. Last month I pointed to the{" "}
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

      <ChartSection title="The RTX 3090's 38% Jump Was Mostly One Seller">
        <p className="mb-4">
          On the chart the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-3090">RTX 3090</Link> jumps
          38% from August to September. Most of that is August. One seller
          listed seven HP OEM 3090s for a single day, four of them at $840 to
          $990, and those set August&apos;s best deal. Against the rest of
          August&apos;s listings, September&apos;s $1,207 is up about 10%. It is
          still the 3090&apos;s highest best deal in six months, and the{" "}
          <Link href="/gpu/shop/nvidia-geforce-rtx-3070">RTX 3070</Link> is at
          its six-month high too. If you want a used 3090, I would not wait for
          another August: it took one seller clearing stock to make it.
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
            <strong>Corrections to the last two reports.</strong> Some of the
            listings I removed this month were also in July and August, so a few
            charts on the August and September reports have changed since I
            wrote them. I wrote last month that the{" "}
            <Link href="/gpu/shop/nvidia-h200-nvl">H200 NVL</Link> had undercut
            the <Link href="/gpu/shop/nvidia-h100-pcie">H100 PCIe</Link>. That
            rested on one $15,500 listing, sold as new and sealed under a title
            that said &quot;pair&quot;, which I should have caught. Without it
            the two cost about the same in August, near $27K, and in September
            the H200 is about $36.3K against $29.2K for the H100. The five
            cheapest H200 listings in September were all qualification samples
            (QS in the title), which is worth knowing before you pay datacenter
            prices for one. I also put the{" "}
            <Link href="/gpu/shop/nvidia-geforce-rtx-5090">RTX 5090</Link> at
            63% over MSRP in August. That rested on two listings I should have
            caught: a $2,399 Founders Edition from a seller with three feedback,
            up for one day, and a $3,580 &quot;brand new&quot; card from a
            seller with one feedback. Without them, August was 95%: the best
            deal was $3,897 rather than $3,254, up 23% from July rather than
            13%, and resale beat new on Amazon by $365 rather than $1,008. That
            Founders Edition was also listed on July 31, so the August
            report&apos;s $2,873 for the 5090 is $3,173 without it, 59% over
            MSRP and up 3% from June rather than down 6%.
          </li>
          <li className="mb-2">
            <strong>Last month&apos;s gaming charts changed too.</strong> Two
            August listings with a failed fan or port came out. Without them the{" "}
            <Link href="/gpu/shop/nvidia-geforce-rtx-3060-ti">RTX 3060 Ti</Link>{" "}
            still leads 1440p, at $1.07/FPS rather than $1.05. On 4K the{" "}
            <Link href="/gpu/shop/nvidia-geforce-rtx-3070-ti">RTX 3070 Ti</Link>{" "}
            falls from first to $2.50, behind the{" "}
            <Link href="/gpu/shop/nvidia-geforce-rtx-3080">RTX 3080</Link> at
            $2.44 and the RX 7900 XT at $2.47. The 3080 is a 10GB card in the
            same trap, so the advice stands: the 7900 XT was the 4K card to buy.
          </li>
          <li className="mb-2">
            <strong>
              Among former flagships, the deepest discounts are shrinking
              slowly.
            </strong>{" "}
            Against original MSRP the{" "}
            <Link href="/gpu/shop/nvidia-geforce-rtx-3080-ti">RTX 3080 Ti</Link>{" "}
            is 62% below at $453, the{" "}
            <Link href="/gpu/shop/amd-radeon-rx-6950-xt">RX 6950 XT</Link> is
            62% below at $418, and the{" "}
            <Link href="/gpu/shop/amd-radeon-rx-6900-xt">RX 6900 XT</Link> is
            60% below at $400. All three rose a little in September, by 5%, 1%,
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
