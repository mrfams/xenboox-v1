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
        aria-label="Xenboox logo"
      >
        <rect width="32" height="32" rx="8" fill="url(#logo-gradient)" />
        {/* Lowercase "xbx" letterforms */}
        {/* x — left */}
        <path
          d="M6.1 9L10.4 16L6.1 23"
          stroke="white"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M10.4 9L6.1 16L10.4 23"
          stroke="white"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* b — vertical stem with a rounded bowl */}
        <path
          d="M13.1 8.5L13.1 23.5"
          stroke="white"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M13.1 12C17 12 19.5 14.2 19.5 17.5C19.5 20.8 17 23.5 13.1 23.5"
          stroke="white"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* x — right */}
        <path
          d="M21.6 9L25.9 16L21.6 23"
          stroke="white"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M25.9 9L21.6 16L25.9 23"
          stroke="white"
          strokeWidth="2.6"
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
