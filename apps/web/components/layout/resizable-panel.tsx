"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { GripVertical } from "lucide-react";

import { cn } from "@/lib/utils";

interface ResizablePanelProps {
  children: ReactNode;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
  header?: ReactNode;
}

export function ResizablePanel({
  children,
  defaultWidth = 384,
  minWidth = 300,
  maxWidth = 600,
  isOpen,
  onToggle,
  className,
  header,
}: ResizablePanelProps) {
  const [width, setWidth] = useState(defaultWidth);
  const [isDragging, setIsDragging] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const newWidth = window.innerWidth - e.clientX;
      const clampedWidth = Math.min(Math.max(newWidth, minWidth), maxWidth);
      setWidth(clampedWidth);
    },
    [isDragging, minWidth, maxWidth],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className={cn(
        "flex flex-col border-l bg-card h-full",
        isDragging ? "select-none" : "",
        className,
      )}
      style={{ width: `${width}px`, flexShrink: 0 }}
    >
      {/* Drag Handle */}
      <div
        onMouseDown={handleMouseDown}
        className={cn(
          "absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize z-50",
          "hover:bg-primary/20 transition-colors",
          isDragging ? "bg-primary/30" : "",
        )}
      >
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <GripVertical className="h-4 w-4 text-muted-foreground/50" />
        </div>
      </div>

      {/* Header */}
      {header && (
        <div className="border-b px-4 py-3 flex items-center justify-between">
          {header}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
