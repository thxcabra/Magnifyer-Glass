import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fff4ea",
          borderRadius: 7,
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#e36c04"
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          width={22}
          height={22}
        >
          <circle cx="13.5" cy="10.5" r="7" />
          <line x1="8.55" y1="15.45" x2="2.8" y2="21.2" />
          <path d="M9.9 8.2 A4 4 0 0 1 12.2 6.5" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
