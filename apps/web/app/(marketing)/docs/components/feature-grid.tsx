import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import type { LucideIcon } from "lucide-react";

interface Feature {
  title: string;
  description: string;
  icon?: LucideIcon;
}

interface FeatureGridProps {
  features: Feature[];
  columns?: 2 | 3 | 4;
  className?: string;
}

export function FeatureGrid({
  features,
  columns = 2,
  className,
}: FeatureGridProps) {
  const gridCols = {
    2: "md:grid-cols-2",
    3: "md:grid-cols-2 lg:grid-cols-3",
    4: "md:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={`grid gap-4 ${gridCols[columns]} ${className ?? ""}`}>
      {features.map((feature) => (
        <Card
          key={feature.title}
          className="transition-colors hover:bg-muted/30"
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {feature.icon && (
                <feature.icon className="h-5 w-5 text-primary" />
              )}
              {feature.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {feature.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
