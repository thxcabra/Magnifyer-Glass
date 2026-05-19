"use client";

import { useState } from "react";
import Image from "next/image";

interface PlayerHeadshotProps {
  /** NBA player external_id, used to build the CDN URL */
  externalId?: string | null;
  /** Direct headshot URL from the DB; takes precedence over externalId */
  url?: string | null;
  /** Player name - used for fallback initials and alt text */
  name: string;
  size?: number;
  className?: string;
}

export function PlayerHeadshot({
  externalId,
  url,
  name,
  size = 96,
  className = "",
}: PlayerHeadshotProps) {
  const [errored, setErrored] = useState(false);

  const src =
    url ??
    (externalId
      ? `https://cdn.nba.com/headshots/nba/latest/1040x760/${externalId}.png`
      : null);

  if (!src || errored) {
    return (
      <div
        className={`bg-muted text-muted-foreground flex shrink-0 items-center justify-center rounded-full font-semibold ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.35 }}
      >
        {initials(name)}
      </div>
    );
  }

  return (
    <div
      className={`bg-muted shrink-0 overflow-hidden rounded-full ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt={name}
        width={size * 2}
        height={size * 2}
        className="size-full object-cover object-top"
        onError={() => setErrored(true)}
        unoptimized
      />
    </div>
  );
}

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
