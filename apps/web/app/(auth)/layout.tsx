import { type ReactNode } from "react";
// import Link from "next/link"; // Unused while hero panel is commented out
// import { Logo } from "@/components/ui/logo"; // Unused while hero panel is commented out

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[100dvh]">
      {/* Left: Branded hero panel — COMMENTED OUT for redesign
      <div className="relative hidden w-full flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-8 xl:p-10 lg:flex lg:w-[52%]">
        ...
      </div>
      */}

      {/* Form panel — full width, vertically centered, fits on screen */}
      <div className="flex w-full items-center justify-center bg-background px-5 py-6 sm:px-8">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
