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
          Accounting Should Work Everywhere
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
          Multi-currency, multi-entity, multi-jurisdiction from day one.
        </div>

        {/* Stats */}
        <div
          style={{
            display: "flex",
            gap: 60,
            marginTop: 40,
          }}
        >
          {[
            { value: "50+", label: "Businesses" },
            { value: "50+", label: "Currencies" },
            { value: "99.9%", label: "Uptime SLA" },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: 48, fontWeight: 700, color: "#3b82f6" }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 18, color: "#94a3b8" }}>{stat.label}</div>
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
          xenboox.com/about
        </div>
      </div>
    ),
    size,
  );
}
