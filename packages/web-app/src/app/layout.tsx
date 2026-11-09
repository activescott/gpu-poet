import type { Metadata, Viewport } from "next"
import "./style/style.scss"
import { SiteFooter } from "@/pkgs/client/components/SiteFooter"
import { SiteSidebar } from "@/pkgs/client/components/SiteSidebar"
import {
  AnalyticsPageView,
  AnalyticsProvider,
} from "@/pkgs/client/analytics/provider"
import { ChunkReload } from "@/pkgs/client/analytics/ChunkReload"
import { SiteHeader } from "@/pkgs/client/components/SiteHeader"
import { Alert } from "@/pkgs/client/components/Alert"
import { AffiliateDisclosureBar } from "@/pkgs/client/components/AffiliateDisclosure"
import Link from "next/link"
import { maxLength } from "@/pkgs/isomorphic/string"
import { GoogleAdsTag } from "@/pkgs/client/analytics/GoogleAdsTag"

const METADATA_MAX_TITLE_LENGTH = 70
const METADATA_MAX_DESCRIPTION_LENGTH = 160
export const metadata: Metadata = {
  title: maxLength(
    METADATA_MAX_TITLE_LENGTH,
  )`Find the best GPU for your money. - GPUPoet.com`,

  description: maxLength(
    METADATA_MAX_DESCRIPTION_LENGTH,
  )`Find the best GPU for your money with GPU Price/Performance Rankings on specifications such as Tensor Cores, memory bandwidth, FP32/FP16 FLOPs, and more.`,

  openGraph: {
    title: "Find the best GPU for your money - GPUPoet.com",
    description:
      "Find the best GPU for your money with GPU Price/Performance Rankings on specifications such as Tensor Cores, memory bandwidth, FP32/FP16 FLOPs, and more.",
    url: "https://gpupoet.com",
    siteName: "GPUPoet",
    images: [
      {
        url: "https://gpupoet.com/images/social.png",
        width: 2400,
        height: 1260,
        alt: "GPUPoet - Smart GPU Price Comparisons",
      },
    ],
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Find the best GPU for your money - GPUPoet.com",
    description:
      "Find the best GPU for your money with GPU Price/Performance Rankings on specifications such as Tensor Cores, memory bandwidth, FP32/FP16 FLOPs, and more.",
    images: ["https://gpupoet.com/images/social.png"],
  },

  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    other: [
      {
        rel: "mask-icon",
        url: "/safari-pinned-tab.svg",
        color: "#d11363",
      },
    ],
  },

  manifest: "/site.webmanifest",

  other: {
    "msapplication-TileColor": "#d11363",
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a1a" },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AnalyticsProvider>
          <SiteHeader />
          {/*
          The affiliate disclosure is last in the DOM but hoisted to the top
          visually with flex ordering, so page content — not the disclosure
          boilerplate — is the first text search engines and extractors read.
          */}
          <div className="d-flex flex-column">
            <div className="d-flex">
              <SiteSidebar />
              <main className="p-3 container-xl">
                <Alert kind="secondary">
                  I&apos;d love to hear what you think! Please{" "}
                  <Link href="/contact" className="alert-link">
                    drop me a line
                  </Link>{" "}
                  and let me know what you like and what could be better. 🙏
                </Alert>
                {children}
              </main>
            </div>
            <SiteFooter />
            <AffiliateDisclosureBar />
          </div>
        </AnalyticsProvider>
        <AnalyticsPageView />
        <ChunkReload />
        {/*
        10/11/25: A lighthouse review was to remove unused JavaScript and Google Tag
        Manager had an estimated 83.0 KiB unused. We're not using it at all and
        it's 40% of all client JS (161.8 KiB of 403.9 KiB), so removing <GoogleAdsTag /> for
        now.

        12/7/25: Adding Google Analytics tag back because it appears that organic search results were significantly negatively impacted by removing the tag.
        */}
        <GoogleAdsTag />
      </body>
    </html>
  )
}
