"use client";

import { useState } from "react";

type BlogImageProps = {
  src: string;
  alt: string;
  className?: string;
};

/**
 * Lazy-loaded blog image with a blur placeholder.
 *
 * Uses a tiny 20×12 inline base64 JPEG as the initial `src` — the browser
 * scales it up with `filter: blur(20px)` while the real image loads.
 * Once `onLoad` fires the blur is removed and the full image fades in.
 */
const BLUR_DATA_URL =
  "data:image/jpeg;base64,/9j/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMCwsKCwsMEBEQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AKwA//9k=";

export function BlogImage({ src, alt, className = "" }: BlogImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <span className={`relative block overflow-hidden ${className}`}>
      {/* Blur placeholder — shown until the real image loads */}
      <img
        src={BLUR_DATA_URL}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover scale-150"
        style={{ filter: "blur(20px)", transition: "opacity 0.4s" }}
      />
      {/* Real image */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className="absolute inset-0 h-full w-full object-cover"
        style={{
          opacity: loaded ? 1 : 0,
          transition: "opacity 0.4s ease-out",
        }}
      />
    </span>
  );
}
