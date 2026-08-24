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
          d="M6.5 7.5 L11.5 24.5"
          stroke="white"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M11.5 7.5 L6.5 24.5"
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
          d="M14 7.2 H17.8 C19.6 7.2 21 8.9 21 11.4 C21 13.9 19.6 15.8 17.8 15.8 H14"
          stroke="white"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M14 15.8 H17.9 C19.8 15.8 21.2 17.7 21.2 20.3 C21.2 22.9 19.8 24.8 17.9 24.8 H14"
          stroke="white"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* X — right */}
        <path
          d="M20.8 7.5 L25.8 24.5"
          stroke="white"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M25.8 7.5 L20.8 24.5"
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
