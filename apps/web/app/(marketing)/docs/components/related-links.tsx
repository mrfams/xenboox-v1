import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui";

interface RelatedLink {
  title: string;
  href: string;
  description?: string;
}

interface RelatedLinksProps {
  title?: string;
  links: RelatedLink[];
}

export function RelatedLinks({
  title = "Related Documentation",
  links,
}: RelatedLinksProps) {
  return (
    <section>
      <h2 className="mb-4 text-2xl font-bold tracking-tight text-white">
        {title}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {links.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="group border-white/10 bg-white/5 transition-all hover:bg-white/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white transition-colors group-hover:text-indigo-300">
                      {link.title}
                    </p>
                    {link.description && (
                      <p className="mt-0.5 text-xs text-white/50">
                        {link.description}
                      </p>
                    )}
                  </div>
                  <ArrowRight className="ml-2 h-4 w-4 shrink-0 text-white/40 transition-colors group-hover:text-indigo-300" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
