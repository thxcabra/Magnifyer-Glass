import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${SITE_NAME} — Pro-level NBA scouting`;

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background:
            "linear-gradient(135deg, #0a0a0a 0%, #1c1917 60%, #431407 100%)",
          color: "#fafaf9",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#f97316"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            width={56}
            height={56}
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span style={{ fontSize: 38, fontWeight: 600, letterSpacing: -0.5 }}>
            {SITE_NAME}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: 22,
              color: "#f97316",
              textTransform: "uppercase",
              letterSpacing: 6,
              fontWeight: 600,
            }}
          >
            Pro-level scouting
          </div>
          <div
            style={{
              fontSize: 78,
              lineHeight: 1.05,
              fontWeight: 600,
              letterSpacing: -1.5,
              maxWidth: 1000,
            }}
          >
            Every player. Every era. Classified.
          </div>
          <div
            style={{
              fontSize: 26,
              color: "#a8a29e",
              maxWidth: 1000,
              lineHeight: 1.4,
            }}
          >
            {`${SITE_DESCRIPTION.slice(0, 180)}…`}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
