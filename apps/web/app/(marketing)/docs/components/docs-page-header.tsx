import Link from "next/link"
import { ChevronRight } from "lucide-react"
import type { LucideIcon } from "lucide-react"

interface Breadcrumb {
  label: string
  href: string
}

interface DocsPageHeaderProps {
  title: string
  description: string
  breadcrumbs?: Breadcrumb[]
  icon?: LucideIcon
}

export function DocsPageHeader({
  title,
  description,
  breadcrumbs,
  icon: Icon,
}: DocsPageHeaderProps) {
  return (
    <div className="mb-10">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/docs" className="transition-colors hover:text-foreground">
            Docs
          </Link>
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.href} className="flex items-center gap-1.5">
              <ChevronRight className="h-3.5 w-3.5" />
              {i === breadcrumbs.length - 1 ? (
                <span className="text-foreground font-medium">{crumb.label}</span>
              ) : (
                <Link
                  href={crumb.href}
                  className="transition-colors hover:text-foreground"
                >
                  {crumb.label}
                </Link>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex items-start gap-4">
        {Icon && (
          <div className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-6 w-6" />
          </div>
        )}
        <div>
          <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
          <p className="mt-3 text-lg text-muted-foreground max-w-3xl">
            {description}
          </p>
        </div>
      </div>
    </div>
  )
}
