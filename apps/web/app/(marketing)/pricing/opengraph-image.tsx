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
          Simple, transparent pricing
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
          Start free with 1 AI agent. Upgrade when you need the full team.
        </div>

        {/* Pricing Tiers */}
        <div
          style={{
            display: "flex",
            gap: 24,
            marginTop: 40,
          }}
        >
          {[
            { name: "Free", price: "$0", color: "#64748b" },
            { name: "Starter", price: "$29", color: "#3b82f6", popular: true },
            { name: "Business", price: "$79", color: "#10b981" },
            { name: "Enterprise", price: "Custom", color: "#8b5cf6" },
          ].map((tier) => (
            <div
              key={tier.name}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "20px 32px",
                borderRadius: 16,
                border: tier.popular
                  ? "2px solid #3b82f6"
                  : "1px solid #334155",
                background: tier.popular
                  ? "rgba(59, 130, 246, 0.1)"
                  : "rgba(30, 41, 59, 0.5)",
              }}
            >
              <div style={{ fontSize: 18, color: "#94a3b8", marginBottom: 8 }}>
                {tier.name}
              </div>
              <div style={{ fontSize: 36, fontWeight: 700, color: tier.color }}>
                {tier.price}
              </div>
              {tier.popular && (
                <div
                  style={{
                    fontSize: 12,
                    color: "#3b82f6",
                    marginTop: 8,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  Most Popular
                </div>
              )}
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
          xenboox.com/pricing
        </div>
      </div>
    ),
    size,
  );
}
