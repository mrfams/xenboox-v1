import { type ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Left: Branded hero panel */}
      <div className="relative hidden w-full flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-8 xl:p-10 lg:flex lg:w-[52%]">
        {/* Background decoration */}
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 80% 60% at 20% 80%, rgba(59, 79, 224, 0.3), transparent 60%), radial-gradient(ellipse 60% 50% at 80% 20%, rgba(15, 113, 89, 0.2), transparent 60%)",
          }}
        />

        {/* Top: Logo */}
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Logo
              size={32}
              className="transition-transform duration-200 group-hover:scale-105"
            />
            <span className="text-lg font-bold tracking-tight text-white">
              Xenboox
            </span>
          </Link>
        </div>

        {/* Center: Value proposition */}
        <div className="relative z-10 max-w-lg">
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-white lg:text-5xl">
            AI-native accounting
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              that thinks for itself
            </span>
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-300">
            Automated journal entries, reconciliations, payroll, and financial
            reporting — powered by 21 AI agents that learn your business.
          </p>

          {/* Social proof */}
          <div className="mt-10 flex items-center gap-6">
            <div className="flex -space-x-2">
              {[
                "bg-gradient-to-br from-blue-500 to-blue-600",
                "bg-gradient-to-br from-emerald-500 to-emerald-600",
                "bg-gradient-to-br from-violet-500 to-violet-600",
                "bg-gradient-to-br from-amber-500 to-amber-600",
              ].map((bg, i) => (
                <div
                  key={i}
                  className={`flex h-9 w-9 items-center justify-center rounded-full ${bg} text-xs font-bold text-white ring-2 ring-slate-900`}
                >
                  {["SC", "MO", "EJ", "AK"][i]}
                </div>
              ))}
            </div>
            <div>
              <p className="text-sm font-medium text-white">
                Trusted by 2,000+ businesses
              </p>
              <div className="mt-0.5 flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className="h-3.5 w-3.5 text-amber-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
                <span className="ml-1 text-xs text-slate-400">
                  4.9/5 average
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Feature highlights */}
        <div className="relative z-10 grid grid-cols-2 gap-4">
          {[
            {
              label: "21 AI Agents",
              desc: "Autonomous financial operations",
            },
            { label: "50+ Currencies", desc: "Real-time exchange rates" },
            { label: "99.9% Uptime", desc: "Enterprise-grade reliability" },
            { label: "SOC 2 Ready", desc: "Bank-level security" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
            >
              <p className="text-sm font-semibold text-white">{item.label}</p>
              <p className="mt-0.5 text-xs text-slate-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Form panel */}
      <div className="flex w-full items-center justify-center bg-background px-5 py-10 sm:px-8 lg:w-[48%]">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
