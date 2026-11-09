"use client"
import { posthog } from "posthog-js"
import { PostHogProvider } from "posthog-js/react"
import { usePathname, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState, type JSX } from "react"
import { useConfigApi } from "@/pkgs/client/hooks/useConfigApi"
import { dropNoiseExceptions } from "./exceptionFilter"
import { createClientLogger } from "@/lib/clientLogger"

const log = createClientLogger("analytics:provider")

// Posthog+NextJS: https://posthog.com/docs/libraries/next-js?tab=App+router

export function AnalyticsPageView(): JSX.Element {
  /* 
  Suspense is used to give next.js a boundary for rendering client-side-components. Outside of the boundary the components can still be rendered server side:
  See https://nextjs.org/docs/app/building-your-application/rendering/server-components#dynamic-functions and https://nextjs.org/docs/messages/deopted-into-client-rendering
  */
  return (
    <Suspense>
      <AnalyticsPageViewInner />
    </Suspense>
  )
}

function AnalyticsPageViewInner(): JSX.Element {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (pathname) {
      let url = window.origin + pathname
      if (searchParams && searchParams.toString()) {
        url = url + `?${searchParams.toString()}`
      }

      posthog.capture("$pageview", {
        $current_url: url,
      })

      return () => {
        // Capture page leave event when component unmounts or route changes
        // NOTE: This isn't in the Posthog docs, but it seems needed, and without it I am receiving warnings in the posthog console about missing page leave events.
        posthog.capture("$pageleave", {
          $current_url: url,
        })
      }
    } else {
      log.error("AnalyticsPageView: no pathname")
    }
  }, [pathname, searchParams])

  return <></>
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const { config, loading, error } = useConfigApi()
  const [posthogInitialized, setPosthogInitialized] = useState(false)

  useEffect(() => {
    if (config && !posthogInitialized && typeof window !== "undefined") {
      try {
        posthog.init(config.posthogKey, {
          api_host: config.posthogHost,
          capture_pageview: false, // Disable automatic pageview capture, as we capture manually
          before_send: dropNoiseExceptions,
        })
        setPosthogInitialized(true)
        log.debug("PostHog initialized with config from API")
      } catch (error_) {
        log.error("Failed to initialize PostHog:", error_)
      }
    }
  }, [config, posthogInitialized])

  useEffect(() => {
    if (error) {
      log.error("Failed to load config for analytics:", error)
    }
  }, [error])

  // Don't render PostHogProvider until we have config and PostHog is initialized
  if (loading || !config || !posthogInitialized) {
    return <>{children}</>
  }

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}
