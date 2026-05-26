import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION_PT, SITE_NAME } from "@/lib/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${SITE_NAME} — NBA ao vivo, em português`;

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
            "linear-gradient(135deg, #262422 0%, #2b241e 55%, #4a2a0c 100%)",
          color: "#fff4ea",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 76,
              height: 76,
              borderRadius: 20,
              background: "#fff4ea",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#e36c04"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              width={48}
              height={48}
            >
              <circle cx="13.5" cy="10.5" r="7" />
              <line x1="8.55" y1="15.45" x2="2.8" y2="21.2" />
              <path d="M9.9 8.2 A4 4 0 0 1 12.2 6.5" />
            </svg>
          </div>
          <span style={{ fontSize: 40, fontWeight: 700, letterSpacing: -0.5 }}>
            {SITE_NAME}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              fontSize: 22,
              color: "#e58b3c",
              textTransform: "uppercase",
              letterSpacing: 8,
              fontWeight: 700,
            }}
          >
            NBA · ao vivo
          </div>
          <div
            style={{
              fontSize: 76,
              lineHeight: 1.05,
              fontWeight: 700,
              letterSpacing: -1.5,
              maxWidth: 1000,
            }}
          >
            Tudo da NBA, em português.
          </div>
          <div
            style={{
              fontSize: 26,
              color: "#acacac",
              maxWidth: 1000,
              lineHeight: 1.4,
            }}
          >
            {SITE_DESCRIPTION_PT}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
