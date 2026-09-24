"use client";
import { useState } from "react";
export function UserAvatar({
  src,
  name,
  size = 32,
}: {
  src?: string | null;
  name: string;
  size?: number;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  return (
    <span
      className="user-avatar"
      style={{ width: size, height: size, fontSize: Math.max(12, size / 3) }}
    >
      {src && failed !== src ? (
        // Authenticated image URLs must be requested directly with the viewer's cookie.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={`Аватар: ${name}`}
          width={size}
          height={size}
          onError={() => setFailed(src)}
        />
      ) : (
        <span aria-label={name}>
          {name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((n) => n[0])
            .join("")
            .toUpperCase() || "?"}
        </span>
      )}
    </span>
  );
}
