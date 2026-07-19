"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface TocItem {
  id: string
  text: string
  level: number
}

export function TableOfContents() {
  const [items, setItems] = useState<TocItem[]>([])
  const [activeId, setActiveId] = useState<string>("")

  useEffect(() => {
    const headings = document.querySelectorAll("h2[id], h3[id], h2, h3")

    // First pass: assign IDs to headings that don't have them
    headings.forEach((h) => {
      if (!h.id && h.textContent) {
        h.id = h.textContent
          .toLowerCase()
          .replace(/[^\w\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
          .trim()
      }
    })

    // Second pass: build TOC items from headings that now have IDs
    const tocItems: TocItem[] = Array.from(headings)
      .filter((h) => h.id && h.textContent)
      .map((h) => ({
        id: h.id,
        text: h.textContent || "",
        level: h.tagName === "H2" ? 2 : 3,
      }))

    setItems(tocItems)

    // Set up intersection observer for active tracking
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      { rootMargin: "-80px 0px -80% 0px" }
    )

    const observedHeadings = document.querySelectorAll("h2, h3")
    observedHeadings.forEach((h) => observer.observe(h))

    return () => observer.disconnect()
  }, [])

  if (items.length === 0) return null

  return (
    <nav className="sticky top-24 w-56 shrink-0 hidden xl:block" aria-label="On this page">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        On this page
      </h3>
      <ul className="space-y-1.5 border-l">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault()
                const el = document.getElementById(item.id)
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "start" })
                  // Update URL hash without scrolling
                  history.pushState(null, "", `#${item.id}`)
                }
              }}
              className={cn(
                "block text-sm transition-colors hover:text-foreground",
                item.level === 3 ? "pl-6" : "pl-3",
                activeId === item.id
                  ? "border-l-2 border-primary text-foreground font-medium -ml-px"
                  : "text-muted-foreground border-l-2 border-transparent -ml-px"
              )}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
