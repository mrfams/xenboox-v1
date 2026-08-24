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
            viewBox="0 0 32 32"
            fill="none"
            style={{ marginRight: 24 }}
            aria-label="XBX"
          >
            <rect width="80" height="80" rx="16" fill="#3b82f6" />
            <g
              transform="scale(2.5)"
              stroke="white"
              strokeWidth="1.12"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6.5 7.5 L11.5 24.5" />
              <path d="M11.5 7.5 L6.5 24.5" />
              <path d="M14 7.2 L14 24.8" />
              <path d="M14 7.2 H17.8 C19.6 7.2 21 8.9 21 11.4 C21 13.9 19.6 15.8 17.8 15.8 H14" />
              <path d="M14 15.8 H17.9 C19.8 15.8 21.2 17.7 21.2 20.3 C21.2 22.9 19.8 24.8 17.9 24.8 H14" />
              <path d="M20.8 7.5 L25.8 24.5" />
              <path d="M25.8 7.5 L20.8 24.5" />
            </g>
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
