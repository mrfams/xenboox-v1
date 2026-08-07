"use client";

export function NewsletterForm({ compact = false }: { compact?: boolean }) {
  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className={
        compact ? "flex max-w-md gap-3" : "mx-auto mt-6 flex max-w-md gap-3"
      }
    >
      <input
        type="email"
        placeholder="you@company.com"
        required
        aria-label="Email address"
        className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition-colors focus:border-blue-400 focus:bg-white"
      />
      <button
        type="submit"
        className="shrink-0 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all duration-200 hover:bg-blue-500"
      >
        Subscribe
      </button>
    </form>
  );
}
