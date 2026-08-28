"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, Check, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

type AspectRatio = {
  label: string;
  value: number | null; // null = freeform
};

const ASPECT_RATIOS: AspectRatio[] = [
  { label: "Free", value: null },
  { label: "16:9", value: 16 / 9 },
  { label: "4:3", value: 4 / 3 },
  { label: "1:1", value: 1 },
  { label: "3:4", value: 3 / 4 },
];

type CropArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Props = {
  file: File;
  open: boolean;
  onClose: () => void;
  onCrop: (blob: Blob, previewUrl: string) => void;
  /** Max output dimension (px). Image is resized to fit within this box. 0 = no resize. */
  maxOutputSize?: number;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function clamp(val: number, min: number, max: number) {
  return Math.min(Math.max(val, min), max);
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ImageCropper({
  file,
  open,
  onClose,
  onCrop,
  maxOutputSize = 1600,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [imgSrc, setImgSrc] = useState<string>("");
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [aspect, setAspect] = useState<number | null>(null);
  const [crop, setCrop] = useState<CropArea>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [dragging, setDragging] = useState(false);
  const [dragType, setDragType] = useState<
    "move" | "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w" | null
  >(null);
  const dragStart = useRef({ x: 0, y: 0, crop: crop });

  // Load image from file
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImgSrc(url);
    loadImage(url).then((img) => {
      setImgEl(img);
      // Initialize crop to centered region
      const maxW = Math.min(img.width, 800);
      const maxH = Math.min(img.height, 600);
      const scale = Math.min(maxW / img.width, maxH / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      setCrop({
        x: (maxW - w) / 2,
        y: (maxH - h) / 2,
        width: w,
        height: h,
      });
    });
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Reset crop when aspect ratio changes
  useEffect(() => {
    if (!imgEl || !containerRef.current) return;
    const container = containerRef.current;
    const maxW = container.clientWidth;
    const maxH = container.clientHeight;
    const imgAspect = imgEl.width / imgEl.height;

    let w: number, h: number;
    if (aspect !== null) {
      if (imgAspect > aspect) {
        h = maxH;
        w = h * aspect;
      } else {
        w = maxW;
        h = w / aspect;
      }
    } else {
      w = maxW;
      h = maxH;
    }

    setCrop({
      x: (maxW - w) / 2,
      y: (maxH - h) / 2,
      width: w,
      height: h,
    });
  }, [aspect, imgEl]);

  // ── Mouse / touch drag handlers ────────────────────────────────────────

  const getPointer = (e: React.MouseEvent | React.TouchEvent) => {
    if ("touches" in e) {
      const t = e.touches[0] || e.changedTouches[0];
      return { x: t.clientX, y: t.clientY };
    }
    return { x: e.clientX, y: e.clientY };
  };

  const handlePointerDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent, type: typeof dragType) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(true);
      setDragType(type);
      dragStart.current = {
        x: getPointer(e).x,
        y: getPointer(e).y,
        crop: { ...crop },
      };
    },
    [crop],
  );

  const handlePointerMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!dragging || !dragType || !containerRef.current) return;
      e.preventDefault();

      const { x: px, y: py } = getPointer(e);
      const dx = px - dragStart.current.x;
      const dy = py - dragStart.current.y;
      const s = dragStart.current.crop;
      const container = containerRef.current;
      const maxW = container.clientWidth;
      const maxH = container.clientHeight;

      let newCrop = { ...s };

      if (dragType === "move") {
        newCrop.x = clamp(s.x + dx, 0, maxW - s.width);
        newCrop.y = clamp(s.y + dy, 0, maxH - s.height);
      } else {
        // Resize handles
        let newX = s.x,
          newY = s.y,
          newW = s.width,
          newH = s.height;

        if (dragType.includes("e")) {
          newW = clamp(s.width + dx, 40, maxW - s.x);
        }
        if (dragType.includes("w")) {
          const delta = Math.min(dx, s.width - 40);
          newX = s.x + delta;
          newW = s.width - delta;
        }
        if (dragType.includes("s")) {
          newH = clamp(s.height + dy, 40, maxH - s.y);
        }
        if (dragType.includes("n")) {
          const delta = Math.min(dy, s.height - 40);
          newY = s.y + delta;
          newH = s.height - delta;
        }

        // Enforce aspect ratio
        if (aspect !== null) {
          if (dragType === "n" || dragType === "s") {
            newW = newH * aspect;
            newX = s.x + (s.width - newW) / 2;
          } else {
            newH = newW / aspect;
            newY = s.y + (s.height - newH) / 2;
          }
        }

        newCrop = { x: newX, y: newY, width: newW, height: newH };
      }

      setCrop(newCrop);
    },
    [dragging, dragType, aspect],
  );

  const handlePointerUp = useCallback(() => {
    setDragging(false);
    setDragType(null);
  }, []);

  // Global mouse up to stop dragging outside the container
  useEffect(() => {
    if (!dragging) return;
    const up = () => handlePointerUp();
    window.addEventListener("mouseup", up);
    window.addEventListener("touchend", up);
    return () => {
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchend", up);
    };
  }, [dragging, handlePointerUp]);

  // ── Crop + output ──────────────────────────────────────────────────────

  const handleCrop = useCallback(async () => {
    if (!imgEl || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Map crop area to source image coordinates
    if (!containerRef.current) return;
    const displayW = containerRef.current.clientWidth;
    const displayH = containerRef.current.clientHeight;
    const scaleX = imgEl.width / displayW;
    const scaleY = imgEl.height / displayH;

    let outW = Math.round(crop.width * scaleX);
    let outH = Math.round(crop.height * scaleY);

    // Resize to maxOutputSize
    if (maxOutputSize > 0 && (outW > maxOutputSize || outH > maxOutputSize)) {
      const scale = Math.min(maxOutputSize / outW, maxOutputSize / outH);
      outW = Math.round(outW * scale);
      outH = Math.round(outH * scale);
    }

    canvas.width = outW;
    canvas.height = outH;

    ctx.drawImage(
      imgEl,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      outW,
      outH,
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const previewUrl = URL.createObjectURL(blob);
        onCrop(blob, previewUrl);
      },
      "image/jpeg",
      0.92,
    );
  }, [imgEl, crop, maxOutputSize, onCrop]);

  if (!open) return null;

  const handles: {
    type: typeof dragType;
    className: string;
    cursor: string;
  }[] = [
    { type: "nw", className: "top-0 left-0", cursor: "nwse-resize" },
    { type: "ne", className: "top-0 right-0", cursor: "nesw-resize" },
    { type: "sw", className: "bottom-0 left-0", cursor: "nesw-resize" },
    { type: "se", className: "bottom-0 right-0", cursor: "nwse-resize" },
    {
      type: "n",
      className: "top-0 left-1/2 -translate-x-1/2",
      cursor: "ns-resize",
    },
    {
      type: "s",
      className: "bottom-0 left-1/2 -translate-x-1/2",
      cursor: "ns-resize",
    },
    {
      type: "w",
      className: "top-1/2 left-0 -translate-y-1/2",
      cursor: "ew-resize",
    },
    {
      type: "e",
      className: "top-1/2 right-0 -translate-y-1/2",
      cursor: "ew-resize",
    },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="flex w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-900">Crop Image</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Aspect ratio selector */}
        <div className="flex items-center gap-1.5 border-b border-slate-100 px-5 py-2">
          {ASPECT_RATIOS.map((ar) => (
            <button
              key={ar.label}
              onClick={() => setAspect(ar.value)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                aspect === ar.value
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200",
              )}
            >
              {ar.label}
            </button>
          ))}
        </div>

        {/* Canvas area */}
        <div
          ref={containerRef}
          className="relative mx-5 my-4 h-[360px] overflow-hidden rounded-xl bg-slate-900"
          onMouseMove={handlePointerMove}
          onTouchMove={handlePointerMove}
        >
          {imgSrc && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={imgSrc}
              alt="Crop source"
              className="pointer-events-none h-full w-full object-contain select-none"
              draggable={false}
            />
          )}

          {/* Dimmed overlay + crop region */}
          {imgEl && (
            <>
              {/* Dark overlay outside crop */}
              <div
                className="absolute inset-0 bg-black/50"
                style={{
                  clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${crop.x}px ${crop.y}px, ${crop.x}px ${crop.y + crop.height}px, ${crop.x + crop.width}px ${crop.y + crop.height}px, ${crop.x + crop.width}px ${crop.y}px, ${crop.x}px ${crop.y}px)`,
                }}
              />

              {/* Crop region */}
              <div
                className="absolute cursor-move border-2 border-white/80"
                style={{
                  left: crop.x,
                  top: crop.y,
                  width: crop.width,
                  height: crop.height,
                }}
                onMouseDown={(e) => handlePointerDown(e, "move")}
                onTouchStart={(e) => handlePointerDown(e, "move")}
              >
                {/* Rule of thirds grid */}
                <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="border border-white/20" />
                  ))}
                </div>

                {/* Resize handles */}
                {handles.map((h) => (
                  <div
                    key={h.type}
                    className={cn(
                      "absolute h-3 w-3 rounded-sm bg-white shadow-sm",
                      h.className,
                    )}
                    style={{ cursor: h.cursor }}
                    onMouseDown={(e) => handlePointerDown(e, h.type)}
                    onTouchStart={(e) => handlePointerDown(e, h.type)}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Output size info */}
        <div className="px-5 pb-2 text-xs text-slate-500">
          {imgEl && (
            <>
              Output:{" "}
              {Math.round(
                crop.width *
                  (imgEl.width / (containerRef.current?.clientWidth ?? 1)),
              )}{" "}
              ×{" "}
              {Math.round(
                crop.height *
                  (imgEl.height / (containerRef.current?.clientHeight ?? 1)),
              )}{" "}
              px
              {maxOutputSize > 0 && ` (max ${maxOutputSize}px)`}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <RotateCcw className="h-3 w-3" />
            Cancel
          </button>
          <button
            onClick={handleCrop}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            <Check className="h-3 w-3" />
            Apply Crop
          </button>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
