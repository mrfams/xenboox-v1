"use client";

/**
 * Generic share button (Web Share API with clipboard fallback).
 * The label comes from the caller — never hardcode "Role" into a generic
 * component (it's used for job postings, reports, etc.).
 */
export function ShareButton({
  title,
  label = "Share",
}: {
  title: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        if (navigator.share) {
          navigator.share({
            title,
            url: window.location.href,
          });
        } else {
          navigator.clipboard.writeText(window.location.href);
        }
      }}
      className="inline-flex h-12 items-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50"
    >
      {label}
    </button>
  );
}
