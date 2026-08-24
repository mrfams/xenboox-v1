import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  size?: number;
  showText?: boolean;
  textClassName?: string;
};

export function Logo({
  className,
  size = 32,
  showText = false,
  textClassName,
}: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="XBX"
        role="img"
      >
        <rect width="32" height="32" rx="8" fill="url(#logo-gradient)" />
        {/* XBX — uppercase premium monogram */}
        {/* X — left */}
        <path
          d="M7 7.5 L12.2 24.5"
          stroke="white"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12.2 7.5 L7 24.5"
          stroke="white"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* B — stem + two bowls */}
        <path
          d="M14 7.2 L14 24.8"
          stroke="white"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M14 7.2 H18.1 C20.2 7.2 21.7 8.9 21.7 11.4 C21.7 13.9 20.2 15.8 18.1 15.8 H14"
          stroke="white"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M14 15.8 H18.2 C20.4 15.8 21.9 17.7 21.9 20.3 C21.9 22.9 20.4 24.8 18.2 24.8 H14"
          stroke="white"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* X — right */}
        <path
          d="M20 7.5 L25.2 24.5"
          stroke="white"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M25.2 7.5 L20 24.5"
          stroke="white"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <defs>
          <linearGradient
            id="logo-gradient"
            x1="0"
            y1="0"
            x2="32"
            y2="32"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#2563eb" />
            <stop offset="1" stopColor="#4f46e5" />
          </linearGradient>
        </defs>
      </svg>
      {showText && (
        <span className={cn("text-lg font-bold tracking-tight", textClassName)}>
          Xenboox
        </span>
      )}
    </div>
  );
}
