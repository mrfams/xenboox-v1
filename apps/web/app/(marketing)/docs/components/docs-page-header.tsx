import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Breadcrumb {
  label: string;
  href: string;
}

interface DocsPageHeaderProps {
  title: string;
  description: string;
  breadcrumbs?: Breadcrumb[];
  icon?: LucideIcon;
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
        <nav className="mb-4 flex items-center gap-1.5 text-sm text-white/50">
          <Link href="/docs" className="transition-colors hover:text-white">
            Docs
          </Link>
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.href} className="flex items-center gap-1.5">
              <ChevronRight className="h-3.5 w-3.5" />
              {i === breadcrumbs.length - 1 ? (
                <span className="font-medium text-white">{crumb.label}</span>
              ) : (
                <Link
                  href={crumb.href}
                  className="transition-colors hover:text-white"
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
          <div className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 text-indigo-300">
            <Icon className="h-6 w-6" />
          </div>
        )}
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-white">
            {title}
          </h1>
          <p className="mt-3 max-w-3xl text-lg text-white/55">{description}</p>
        </div>
      </div>
    </div>
  );
}
