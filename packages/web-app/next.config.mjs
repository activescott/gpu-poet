import createMDX from "@next/mdx"

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,

  // Emit browser source maps so the build can upload them to PostHog error
  // tracking (scripts/upload-sourcemaps.sh); that script deletes them from
  // the output afterwards, so they are never served publicly.
  productionBrowserSourceMaps: true,

  // Add crossorigin="anonymous" to Next's own <script> tags. Same-origin today,
  // but it keeps errors readable (no opaque "Script error.") if static assets
  // move to a CDN via assetPrefix, provided the CDN sends CORS headers.
  crossOrigin: "anonymous",

  // Transpile workspace packages that export TypeScript source files
  transpilePackages: ["@activescott/filter-items", "@activescott/ebay-client"],

  // Native modules that should not be bundled by Next.js
  // Required for chartjs-node-canvas server-side chart rendering
  serverExternalPackages: ["canvas", "chartjs-node-canvas"],

  // MDX configuration: https://nextjs.org/docs/app/building-your-application/configuring/mdx
  pageExtensions: ["mdx", "ts", "tsx"],

  // Silence Sass deprecation warnings from dependencies (Bootstrap)
  // - quietDeps: silences warnings from dependencies loaded via includePaths
  // - includePaths: allows package-style imports (e.g., "bootstrap/scss/functions")
  //   IMPORTANT: quietDeps only works for files loaded via includePaths, NOT relative imports
  // - silenceDeprecations: silences specific deprecation warnings:
  // - "legacy-js-api": old Sass JS API used by next.js
  // - "import" because that's the only way to properly import Bootstrap's Sass files without warnings right now in src/app/style/bootstrap/all.scss
  // https://sass-lang.com/documentation/js-api/interfaces/options/
  sassOptions: {
    includePaths: ["node_modules"],
    quietDeps: true,
    silenceDeprecations: ["legacy-js-api", "import"],
  },

  async rewrites() {
    return [
      // PostHog proxy moved to middleware.ts for proper X-Forwarded-For handling
      /* proxy ebay images as content blockers block them from a different domain
      images could be in https://i.ebayimg.com/thumbs/images/... or https://i.ebayimg.com/images/...
      */
      {
        source: "/ei/:path*",
        destination: "https://i.ebayimg.com/:path*",
      },
    ]
  },
  async redirects() {
    return [
      // New route structure redirects (ml/* -> gpu/*)
      // Shopping/Buy pages
      {
        source: "/ml/shop/gpu/:gpuSlug",
        destination: "/gpu/shop/:gpuSlug",
        permanent: true,
      },
      {
        source: "/ml/shop/gpu",
        destination: "/gpu/price-compare/ai/fp32-flops",
        permanent: true,
      },
      // Cost-per-performance pages (shop/performance -> price-compare/ai)
      {
        source: "/ml/shop/gpu/performance/cost-per-fp32-flops",
        destination: "/gpu/price-compare/ai/fp32-flops",
        permanent: true,
      },
      {
        source: "/ml/shop/gpu/performance/cost-per-tensor-core",
        destination: "/gpu/price-compare/ai/tensor-cores",
        permanent: true,
      },
      {
        source: "/ml/shop/gpu/performance/cost-per-fp16-flops",
        destination: "/gpu/price-compare/ai/fp16-flops",
        permanent: true,
      },
      {
        source: "/ml/shop/gpu/performance/cost-per-int8-tops",
        destination: "/gpu/price-compare/ai/int8-tops",
        permanent: true,
      },
      {
        source: "/ml/shop/gpu/performance/cost-per-memory-gb",
        destination: "/gpu/price-compare/ai/memory-gb",
        permanent: true,
      },
      {
        source: "/ml/shop/gpu/performance/cost-per-memory-bandwidth-gbs",
        destination: "/gpu/price-compare/ai/memory-bandwidth-gbs",
        permanent: true,
      },
      // Ranking pages (learn/gpu/ranking -> gpu/ranking/ai)
      {
        source: "/ml/learn/gpu/ranking/:slug",
        destination: "/gpu/ranking/ai/:slug",
        permanent: true,
      },
      {
        source: "/ml/learn/gpu/ranking",
        destination: "/gpu/ranking/ai/fp32-flops",
        permanent: true,
      },
      // Learn pages migrated to /gpu/learn/ai/*
      {
        source: "/ml/learn/faq/:slug",
        destination: "/gpu/learn/ai/faq/:slug",
        permanent: true,
      },
      {
        source: "/ml/learn/use-case/:slug",
        destination: "/gpu/learn/ai/use-case/:slug",
        permanent: true,
      },
      {
        source: "/ml/learn/models/:slug",
        destination: "/gpu/learn/ai/models/:slug",
        permanent: true,
      },
      {
        source: "/ml/learn/quantization",
        destination: "/gpu/learn/ai/quantization",
        permanent: true,
      },
      {
        source: "/ml/learn/gpu/specifications",
        destination: "/gpu/ranking/ai/fp32-flops",
        permanent: true,
      },
      {
        source: "/ml/learn/gpu/:gpuSlug",
        destination: "/gpu/learn/card/:gpuSlug",
        permanent: true,
      },
      {
        source: "/ml/learn",
        destination: "/gpu/learn/ai",
        permanent: true,
      },

      // Legacy redirects
      {
        source: "/ml/info/:path*",
        destination: "/ml/learn/:path*",
        permanent: true,
      },
      {
        source: "/ml/learn/gpu/nvidia-rtx-a5000-gpu",
        destination: "/gpu/learn/card/nvidia-rtx-a5000",
        permanent: true,
      },
      {
        source: "/ml/learn/gpu/nvidia-a10-pci-24gb",
        destination: "/gpu/learn/card/nvidia-a10",
        permanent: true,
      },
      {
        source: "/ml/learn/gpu/nvidia-a100-sxm-80gb",
        destination: "/gpu/learn/card/nvidia-a100-pcie",
        permanent: true,
      },
      {
        source: "/ml/learn/gpu/nvidia-h100-sxm-80gb",
        destination: "/gpu/learn/card/nvidia-h100-pcie",
        permanent: true,
      },
      // removed SXM cards:
      {
        source: "/ml/shop/gpu/nvidia-a100-sxm",
        destination: "/gpu/shop/nvidia-a100-pcie",
        permanent: true,
      },
      {
        source: "/ml/learn/gpu/nvidia-a100-sxm",
        destination: "/gpu/learn/card/nvidia-a100-pcie",
        permanent: true,
      },
      {
        source: "/ml/shop/gpu/nvidia-h100-sxm",
        destination: "/gpu/shop/nvidia-h100-pcie",
        permanent: true,
      },
      {
        source: "/ml/learn/gpu/nvidia-h100-sxm",
        destination: "/gpu/learn/card/nvidia-h100-pcie",
        permanent: true,
      },
      {
        // this one is an old path style (note missing /ml/learn/...) that Google Search Console found and saw as a 404.
        source: "/ml/gpu/nvidia-h100-sxm-80gb",
        destination: "/gpu/learn/card/nvidia-h100-pcie",
        permanent: true,
      },
      // Model slug renames
      {
        source: "/ml/learn/models/dlrm-v2",
        destination: "/gpu/learn/ai/models/dlrm",
        permanent: true,
      },

      // Price-compare slug migration: cost-per-* -> new DB slugs
      // AI specs
      {
        source: "/gpu/price-compare/ai/cost-per-fp32-flops",
        destination: "/gpu/price-compare/ai/fp32-flops",
        permanent: true,
      },
      {
        source: "/gpu/price-compare/ai/cost-per-fp16-flops",
        destination: "/gpu/price-compare/ai/fp16-flops",
        permanent: true,
      },
      // Alternative slug variants (tflops -> flops)
      {
        source: "/gpu/price-compare/ai/fp32-tflops",
        destination: "/gpu/price-compare/ai/fp32-flops",
        permanent: true,
      },
      {
        source: "/gpu/price-compare/ai/fp16-tflops",
        destination: "/gpu/price-compare/ai/fp16-flops",
        permanent: true,
      },
      {
        source: "/gpu/price-compare/ai/cost-per-fp32-tflops",
        destination: "/gpu/price-compare/ai/fp32-flops",
        permanent: true,
      },
      {
        source: "/gpu/price-compare/ai/cost-per-fp16-tflops",
        destination: "/gpu/price-compare/ai/fp16-flops",
        permanent: true,
      },
      {
        source: "/gpu/price-compare/ai/cost-per-tensor-core",
        destination: "/gpu/price-compare/ai/tensor-cores",
        permanent: true,
      },
      {
        source: "/gpu/price-compare/ai/cost-per-int8-tops",
        destination: "/gpu/price-compare/ai/int8-tops",
        permanent: true,
      },
      {
        source: "/gpu/price-compare/ai/cost-per-memory-gb",
        destination: "/gpu/price-compare/ai/memory-gb",
        permanent: true,
      },
      {
        source: "/gpu/price-compare/ai/cost-per-memory-bandwidth-gbs",
        destination: "/gpu/price-compare/ai/memory-bandwidth-gbs",
        permanent: true,
      },
      // Gaming benchmark slug changes:
      {
        source: "/gpu/price-compare/gaming/cost-per-counter-strike-2-fps-3840x2160",
        destination: "/gpu/price-compare/gaming/counter-strike-2-fps-3840x2160",
        permanent: true,
      },
      {
        source: "/gpu/price-compare/gaming/cost-per-counter-strike-2-fps-2560x1440",
        destination: "/gpu/price-compare/gaming/counter-strike-2-fps-2560x1440",
        permanent: true,
      },
      {
        source: "/gpu/price-compare/gaming/cost-per-counter-strike-2-fps-1920x1080",
        destination: "/gpu/price-compare/gaming/counter-strike-2-fps-1920x1080",
        permanent: true,
      },
      {
        source: "/gpu/benchmark/gaming/3dmark-wildlife-extreme-fps",
        destination: "/gpu/price-compare/gaming/3dmark-wildlife-extreme-fps-3840x2160",
        permanent: true,
      },
      {
        // Old cost-per- URL redirects to resolution-specific URL
        source: "/gpu/price-compare/gaming/cost-per-3dmark-wildlife-extreme-fps",
        destination: "/gpu/price-compare/gaming/3dmark-wildlife-extreme-fps-3840x2160",
        permanent: true,
      },
      {
        // URL without resolution redirects to 4K version
        source: "/gpu/price-compare/gaming/3dmark-wildlife-extreme-fps",
        destination: "/gpu/price-compare/gaming/3dmark-wildlife-extreme-fps-3840x2160",
        permanent: true,
      },
      // Gaming benchmark learn pages moved under /gpu/learn/
      {
        source: "/gpu/benchmark/gaming/:benchmark",
        destination: "/gpu/learn/benchmark/gaming/:benchmark",
        permanent: true,
      },

      // Quake II RTX slug rename (quake2rtx -> quake-ii-rtx)
      {
        source: "/gpu/ranking/gaming/quake2rtx-fps-1920x1080",
        destination: "/gpu/ranking/gaming/quake-ii-rtx-fps-1920x1080",
        permanent: true,
      },
      {
        source: "/gpu/ranking/gaming/quake2rtx-fps-2560x1440",
        destination: "/gpu/ranking/gaming/quake-ii-rtx-fps-2560x1440",
        permanent: true,
      },
      {
        source: "/gpu/ranking/gaming/quake2rtx-fps-3840x2160",
        destination: "/gpu/ranking/gaming/quake-ii-rtx-fps-3840x2160",
        permanent: true,
      },
      {
        source: "/gpu/price-compare/gaming/quake2rtx-fps-1920x1080",
        destination: "/gpu/price-compare/gaming/quake-ii-rtx-fps-1920x1080",
        permanent: true,
      },
      {
        source: "/gpu/price-compare/gaming/quake2rtx-fps-2560x1440",
        destination: "/gpu/price-compare/gaming/quake-ii-rtx-fps-2560x1440",
        permanent: true,
      },
      {
        source: "/gpu/price-compare/gaming/quake2rtx-fps-3840x2160",
        destination: "/gpu/price-compare/gaming/quake-ii-rtx-fps-3840x2160",
        permanent: true,
      },
      {
        source: "/gpu/learn/benchmark/gaming/quake2rtx-fps-1920x1080",
        destination: "/gpu/learn/benchmark/gaming/quake-ii-rtx-fps-1920x1080",
        permanent: true,
      },
      {
        source: "/gpu/learn/benchmark/gaming/quake2rtx-fps-2560x1440",
        destination: "/gpu/learn/benchmark/gaming/quake-ii-rtx-fps-2560x1440",
        permanent: true,
      },
      {
        source: "/gpu/learn/benchmark/gaming/quake2rtx-fps-3840x2160",
        destination: "/gpu/learn/benchmark/gaming/quake-ii-rtx-fps-3840x2160",
        permanent: true,
      },

      // FurMark GL slug rename (furmark-gl- -> furmark-gl-fps-)
      {
        source: "/gpu/price-compare/gaming/furmark-gl-1920x1080",
        destination: "/gpu/price-compare/gaming/furmark-gl-fps-1920x1080",
        permanent: true,
      },
      {
        source: "/gpu/price-compare/gaming/furmark-gl-2560x1440",
        destination: "/gpu/price-compare/gaming/furmark-gl-fps-2560x1440",
        permanent: true,
      },
      {
        source: "/gpu/learn/benchmark/gaming/furmark-gl-3840x2160",
        destination: "/gpu/learn/benchmark/gaming/furmark-gl-fps-3840x2160",
        permanent: true,
      },
      {
        source: "/gpu/learn/benchmark/gaming/furmark-gl-1920x1080",
        destination: "/gpu/learn/benchmark/gaming/furmark-gl-fps-1920x1080",
        permanent: true,
      },
      {
        source: "/gpu/ranking/gaming/furmark-gl-3840x2160",
        destination: "/gpu/ranking/gaming/furmark-gl-fps-3840x2160",
        permanent: true,
      },
    ]
  },

  // Optionally, add any other Next.js config below
}

const withMDX = createMDX({
  options: {
    remarkPlugins: ['remark-gfm'],
    rehypePlugins: [
      ['rehype-class-names', { table: 'table' }]
    ],
  },
})

// Merge MDX config with Next.js config
export default withMDX(nextConfig)
