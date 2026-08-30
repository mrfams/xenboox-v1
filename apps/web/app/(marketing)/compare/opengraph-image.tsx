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
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          color: "#ffffff",
          fontFamily: "Inter, sans-serif",
          padding: 60,
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: 12,
              background: "#3b82f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 20,
              fontSize: 28,
              fontWeight: 700,
              color: "#ffffff",
            }}
          >
            XBX
          </div>
          <span style={{ fontSize: 48, fontWeight: 700, letterSpacing: -1 }}>
            Xenboox
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            textAlign: "center",
            marginBottom: 20,
            letterSpacing: -1,
          }}
        >
          Compare Xenboox vs Competitors
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            color: "#94a3b8",
            textAlign: "center",
            maxWidth: 800,
            lineHeight: 1.4,
          }}
        >
          See how AI-native automation compares to traditional accounting
          software.
        </div>

        {/* Competitors */}
        <div
          style={{
            display: "flex",
            gap: 40,
            marginTop: 40,
          }}
        >
          {[
            { name: "QuickBooks", color: "#2ca01c" },
            { name: "Xero", color: "#13b5ea" },
            { name: "FreshBooks", color: "#0075dd" },
            { name: "Wave", color: "#1a1aff" },
          ].map((competitor) => (
            <div
              key={competitor.name}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "16px 24px",
                borderRadius: 12,
                border: "1px solid #334155",
                background: "rgba(30, 41, 59, 0.5)",
              }}
            >
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 600,
                  color: competitor.color,
                }}
              >
                {competitor.name}
              </div>
            </div>
          ))}
        </div>

        {/* URL */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            fontSize: 20,
            color: "#64748b",
          }}
        >
          xenboox.com/compare
        </div>
      </div>
    ),
    size,
  );
}
