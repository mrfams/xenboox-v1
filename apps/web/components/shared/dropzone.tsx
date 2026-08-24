"use client";

import { useState, useCallback } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  onDrop: (files: FileList) => void;
  accept?: string;
  children?: React.ReactNode;
  className?: string;
  label?: string;
};

export function Dropzone({
  onDrop,
  accept,
  children,
  className,
  label = "Drop files here",
}: Props) {
  const [dragging, setDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  }, []);
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (e.dataTransfer.files.length) onDrop(e.dataTransfer.files);
    },
    [onDrop],
  );

  return (
    <div
      role="region"
      aria-label={label}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative rounded-xl border-2 border-dashed transition-colors",
        dragging ? "border-primary bg-primary/5" : "border-border/50 bg-card",
        className,
      )}
    >
      {dragging && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 rounded-xl bg-primary/5">
          <Upload className="h-5 w-5 text-primary" aria-hidden="true" />
          <span className="text-sm font-medium text-primary">{label}</span>
        </div>
      )}
      {children}
    </div>
  );
}
