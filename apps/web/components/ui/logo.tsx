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
        {/* First X - left side */}
        <path
          d="M5 7L10 16L5 25"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M10 7L5 16L10 25"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* B without vertical stem - middle (two bumps only) */}
        <path
          d="M14 7C14 7 17.5 7 19 9C20.5 11 20.5 13 19 15C17.5 17 14 17 14 17"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M14 17C14 17 18 17 20 19C22 21 22 23.5 20 25C18 27 14 27 14 27"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Second X - right side */}
        <path
          d="M22 17L27 25"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M27 17L22 25"
          stroke="white"
          strokeWidth="2"
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
