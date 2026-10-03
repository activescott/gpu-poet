"use client"

import { useState, type JSX } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BootstrapIcon, type BootstrapIconName } from "./BootstrapIcon"

interface NavItem {
  label: string
  href: string
  icon: BootstrapIconName
  /** Override the href for active-state matching (e.g. match a category prefix instead of a specific slug) */
  activePrefix?: string
}

interface NavSection {
  label: string
  icon: BootstrapIconName
  pathPrefix: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    label: "Rankings",
    icon: "trophy",
    pathPrefix: "/gpu/ranking",
    items: [
      {
        label: "Gaming Rankings",
        href: "/gpu/ranking/gaming/3dmark-wildlife-extreme-fps-3840x2160",
        activePrefix: "/gpu/ranking/gaming",
        icon: "controller",
      },
      {
        label: "AI Rankings",
        href: "/gpu/ranking/ai/fp32-flops",
        activePrefix: "/gpu/ranking/ai",
        icon: "cpu",
      },
    ],
  },
  {
    label: "Prices",
    icon: "tags",
    pathPrefix: "/gpu/price-compare",
    items: [
      {
        label: "All GPUs",
        href: "/gpu/price-compare",
        icon: "grid",
      },
      {
        label: "Gaming Prices",
        href: "/gpu/price-compare/gaming/3dmark-wildlife-extreme-fps-3840x2160",
        activePrefix: "/gpu/price-compare/gaming",
        icon: "controller",
      },
      {
        label: "AI Prices",
        href: "/gpu/price-compare/ai/fp16-flops",
        activePrefix: "/gpu/price-compare/ai",
        icon: "cpu",
      },
    ],
  },
  {
    label: "Compare",
    icon: "arrow-left-right",
    pathPrefix: "/gpu/compare",
    items: [
      {
        label: "Compare GPUs",
        href: "/gpu/compare",
        icon: "arrow-left-right",
      },
    ],
  },
  {
    label: "Learn",
    icon: "book",
    pathPrefix: "/gpu/learn",
    items: [
      {
        label: "GPU Overview",
        href: "/gpu/learn",
        icon: "gpu-card",
      },
      {
        label: "AI & ML",
        href: "/gpu/learn/ai",
        icon: "robot",
      },
      {
        label: "FAQ",
        href: "/gpu/learn/faq",
        icon: "question-circle",
      },
    ],
  },
  {
    label: "Market Reports",
    icon: "graph-up",
    pathPrefix: "/gpu/market-report",
    items: [
      {
        label: "Market Reports",
        href: "/gpu/market-report/gpu-market-report-october-2026",
        icon: "graph-up",
      },
    ],
  },
  {
    label: "News",
    icon: "newspaper",
    pathPrefix: "/news",
    items: [
      {
        label: "Latest News",
        href: "/news",
        icon: "newspaper",
      },
    ],
  },
]

export function SiteSidebar(): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  function handleLinkClick() {
    setIsOpen(false)
  }

  const sidebarContent = (
    <nav className="site-sidebar-nav" aria-label="Site navigation">
      {navSections.map((section) => {
        const isSingleItem = section.items.length === 1

        if (isSingleItem) {
          const item = section.items[0]
          const isActive = pathname.startsWith(section.pathPrefix)
          return (
            <div key={section.label} className="site-sidebar-section">
              <Link
                href={item.href}
                className={`nav-link site-sidebar-link${isActive ? " active" : ""}`}
                onClick={handleLinkClick}
              >
                <BootstrapIcon icon={section.icon} size="xs" />
                {section.label}
              </Link>
            </div>
          )
        }

        return (
          <div key={section.label} className="site-sidebar-section">
            <div className="site-sidebar-heading">
              <BootstrapIcon icon={section.icon} size="xs" />
              {section.label}
            </div>
            <div className="nav flex-column ms-3">
              {section.items.map((item) => {
                const matchPath = item.activePrefix ?? item.href
                const pathMatches =
                  pathname === matchPath || pathname.startsWith(matchPath + "/")
                const hasSiblingMatch =
                  pathMatches &&
                  section.items.some((other) => {
                    if (other === item) return false
                    const otherMatch = other.activePrefix ?? other.href
                    return (
                      otherMatch.length > matchPath.length &&
                      (pathname === otherMatch ||
                        pathname.startsWith(otherMatch + "/"))
                    )
                  })
                const isActive = pathMatches && !hasSiblingMatch
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-link site-sidebar-link${isActive ? " active" : ""}`}
                    onClick={handleLinkClick}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })}
    </nav>
  )

  return (
    <>
      {/* Mobile toggle button */}
      <button
        type="button"
        className="site-sidebar-toggle d-md-none"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle sidebar navigation"
      >
        <BootstrapIcon icon="list" size="small" />
      </button>

      {/* Desktop sidebar */}
      <aside className="site-sidebar d-none d-md-block">{sidebarContent}</aside>

      {/* Mobile overlay */}
      {isOpen && (
        <>
          <div
            className="site-sidebar-backdrop d-md-none"
            onClick={() => setIsOpen(false)}
          />
          <aside className="site-sidebar site-sidebar-mobile d-md-none">
            <div className="site-sidebar-mobile-header">
              <span className="fw-semibold">Menu</span>
              <button
                type="button"
                className="btn-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close menu"
              />
            </div>
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  )
}
