import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_ALT = "Nibbo — затишна домашня CRM для родини";

export function ogShareImageResponse() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          paddingLeft: 72,
          paddingRight: 72,
          background: "linear-gradient(135deg, #fff7ed 0%, #fce7f3 38%, #ede9fe 72%, #faf5ff 100%)",
          fontFamily: "system-ui, -apple-system, Segoe UI, Helvetica, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 28,
          }}
        >
          <div
            style={{
              width: 108,
              height: 108,
              borderRadius: 30,
              background: "linear-gradient(135deg, #fb7185 0%, #a78bfa 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 58, fontWeight: 800, color: "#ffffff" }}>N</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ fontSize: 78, fontWeight: 800, color: "#1c1917", letterSpacing: -2 }}>Nibbo</span>
            <span style={{ fontSize: 32, fontWeight: 600, color: "#44403c", maxWidth: 920, lineHeight: 1.35 }}>
              Tasks, family calendar, budget, notes, meals & shopping — your cozy home hub in one place.
            </span>
          </div>
        </div>
        <div style={{ marginTop: 48, fontSize: 26, fontWeight: 600, color: "#7c3aed" }}>nibbo.space</div>
      </div>
    ),
    { ...OG_SIZE }
  );
}
