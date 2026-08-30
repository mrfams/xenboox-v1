import { cn } from "@/lib/utils";

export type LogoItem = {
  name: string;
  placeholder?: string;
  href?: string;
};

export function LogoCloud({
  title,
  logos,
  variant = "default",
  className,
}: {
  title?: string;
  logos: LogoItem[];
  variant?: "default" | "press" | "investor";
  className?: string;
}) {
  const sizeMap = {
    default: "h-6 text-sm font-semibold",
    press: "h-8 text-sm font-semibold",
    investor:
      "h-16 w-16 rounded-2xl border border-border/40 bg-muted/30 text-lg font-bold text-muted-foreground/30",
  };

  return (
    <div className={cn("text-center", className)}>
      {title && (
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-6">
          {title}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
        {logos.map((logo) => (
          <div
            key={logo.name}
            className={cn(
              "flex items-center gap-2 text-muted-foreground/40 hover:text-muted-foreground/60 transition-colors",
              variant === "investor" && "flex-col gap-2",
            )}
            aria-label={
              variant === "investor"
                ? `Investor: ${logo.name}`
                : `Featured in ${logo.name}`
            }
          >
            {logo.placeholder && variant === "investor" ? (
              <>
                <div
                  className={cn(
                    "flex items-center justify-center",
                    sizeMap[variant],
                  )}
                  aria-hidden="true"
                >
                  {logo.placeholder}
                </div>
                <span className="text-xs font-medium">{logo.name}</span>
              </>
            ) : logo.placeholder ? (
              <>
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50 text-[10px] font-bold text-muted-foreground/50",
                  )}
                  aria-hidden="true"
                >
                  {logo.placeholder}
                </div>
                <span
                  className={cn(
                    "tracking-tight text-muted-foreground",
                    sizeMap[variant],
                  )}
                >
                  {logo.name}
                </span>
              </>
            ) : (
              <span
                className={cn(
                  "tracking-tight text-muted-foreground/40 hover:text-muted-foreground/60 transition-colors",
                  sizeMap[variant],
                )}
              >
                {logo.name}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
