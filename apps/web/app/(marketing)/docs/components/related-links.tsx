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
      <h2 className="text-2xl font-bold tracking-tight mb-4">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {links.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="group transition-all hover:bg-muted/50 hover:border-primary/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm group-hover:text-primary transition-colors">
                      {link.title}
                    </p>
                    {link.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {link.description}
                      </p>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 ml-2" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
