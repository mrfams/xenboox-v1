"use client";

import { useCallback, useRef } from "react";
import { toast } from "sonner";

export function useUndo<T>(opts: {
  message: string;
  onUndo: (payload: T) => void | Promise<void>;
}) {
  const lastRef = useRef<T | null>(null);

  const pushUndo = useCallback(
    (payload: T) => {
      lastRef.current = payload;
      toast.success(opts.message, {
        action: {
          label: "Undo",
          onClick: async () => {
            const data = lastRef.current;
            if (data) await opts.onUndo(data);
          },
        },
        duration: 5000,
      });
    },
    [opts],
  );

  const undo = useCallback(async () => {
    const data = lastRef.current;
    if (data) await opts.onUndo(data);
  }, [opts]);

  return { pushUndo, undo };
}
