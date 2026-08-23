"use client";

import { useState, useEffect } from "react";
import { X, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const NPS_STORAGE_KEY = "xenboox-nps-last-shown";
const NPS_DISMISSED_KEY = "xenboox-nps-dismissed";
const SHOW_INTERVAL_DAYS = 90; // quarterly

const labels: Record<number, string> = {
  0: "Not at all likely",
  1: "Not at all likely",
  2: "Not at all likely",
  3: "Unlikely",
  4: "Unlikely",
  5: "Neutral",
  6: "Neutral",
  7: "Likely",
  8: "Likely",
  9: "Very likely",
  10: "Very likely",
};

function getScoreColor(score: number): string {
  if (score >= 9)
    return "bg-emerald-500 hover:bg-emerald-600 ring-emerald-500/30";
  if (score >= 7) return "bg-blue-500 hover:bg-blue-600 ring-blue-500/30";
  if (score >= 5) return "bg-amber-500 hover:bg-amber-600 ring-amber-500/30";
  return "bg-red-500 hover:bg-red-600 ring-red-500/30";
}

function getScoreCategory(score: number): "promoter" | "passive" | "detractor" {
  if (score >= 9) return "promoter";
  if (score >= 7) return "passive";
  return "detractor";
}

export function NpsSurvey() {
  const [open, setOpen] = useState(false);
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Check if we should show the survey
    const lastShown = localStorage.getItem(NPS_STORAGE_KEY);
    const dismissed = localStorage.getItem(NPS_DISMISSED_KEY);

    if (dismissed === "true") return;

    if (lastShown) {
      const daysSince =
        (Date.now() - parseInt(lastShown)) / (1000 * 60 * 60 * 24);
      if (daysSince < SHOW_INTERVAL_DAYS) return;
    }

    // Show after 30 seconds of session time
    const timer = setTimeout(() => {
      setOpen(true);
      localStorage.setItem(NPS_STORAGE_KEY, String(Date.now()));
    }, 30_000);

    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setOpen(false);
    localStorage.setItem(NPS_DISMISSED_KEY, "true");
  };

  const submit = async () => {
    if (selectedScore === null) return;
    setSubmitting(true);

    try {
      await fetch("/api/nps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score: selectedScore,
          category: getScoreCategory(selectedScore),
          comment: comment.trim() || undefined,
        }),
      });
      setSubmitted(true);
      // Auto-close after 2 seconds
      setTimeout(() => setOpen(false), 2000);
    } catch {
      // Silently fail — don't annoy the user
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={dismiss}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-border shadow-2xl overflow-hidden"
          >
            {/* Close button */}
            <button
              type="button"
              onClick={dismiss}
              aria-label="Close survey"
              className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors z-10"
            >
              <X className="h-4 w-4" />
            </button>

            {submitted ? (
              /* Success state */
              <div className="p-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 mx-auto mb-4">
                  <Star className="h-6 w-6 text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  Thank you!
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your feedback helps us build a better product.
                </p>
              </div>
            ) : (
              /* Survey form */
              <div className="p-6 sm:p-8">
                <h3 className="text-lg font-semibold text-foreground">
                  How likely are you to recommend Xenboox?
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your feedback helps us improve.
                </p>

                {/* Score buttons */}
                <div className="mt-6 grid grid-cols-11 gap-1.5">
                  {Array.from({ length: 11 }, (_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedScore(i)}
                      className={`h-10 rounded-lg text-sm font-medium transition-all duration-150 ${
                        selectedScore === i
                          ? `${getScoreColor(i)} text-white ring-2 scale-110 shadow-lg`
                          : "bg-muted text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {i}
                    </button>
                  ))}
                </div>

                {/* Labels */}
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>Not at all likely</span>
                  <span>Very likely</span>
                </div>

                {/* Selected score label */}
                {selectedScore !== null && (
                  <p className="mt-3 text-sm font-medium text-foreground text-center">
                    {labels[selectedScore]}
                  </p>
                )}

                {/* Comment */}
                {selectedScore !== null && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Any comments? (optional)
                    </label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder={
                        selectedScore >= 9
                          ? "What do you love most?"
                          : selectedScore >= 7
                            ? "What could we improve?"
                            : "What's not working for you?"
                      }
                      rows={3}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none resize-none"
                    />
                  </div>
                )}

                {/* Submit */}
                <button
                  type="button"
                  onClick={submit}
                  disabled={selectedScore === null || submitting}
                  className="mt-4 w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Submitting..." : "Submit feedback"}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
