/* eslint-disable */
// @ts-nocheck - ImageResponse JSX is parsed by Next.js OG runtime at build time
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f172a",
          color: "#ffffff",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 40,
          }}
        >
          <svg
            width="80"
            height="80"
            viewBox="0 0 80 80"
            fill="none"
            style={{ marginRight: 24 }}
          >
            <rect width="80" height="80" rx="16" fill="#3b82f6" />
            <path
              d="M20 40L32 52L60 24"
              stroke="white"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span
            style={{
              fontSize: 64,
              fontWeight: 700,
              letterSpacing: -2,
            }}
          >
            Xenboox
          </span>
        </div>
        <div
          style={{
            fontSize: 32,
            color: "#94a3b8",
            textAlign: "center",
            maxWidth: 900,
            lineHeight: 1.4,
          }}
        >
          AI-Native Accounting for African Businesses
        </div>
        <div
          style={{
            marginTop: 40,
            fontSize: 24,
            color: "#64748b",
          }}
        >
          xenboox.com
        </div>
      </div>
    ),
    size,
  );
}
