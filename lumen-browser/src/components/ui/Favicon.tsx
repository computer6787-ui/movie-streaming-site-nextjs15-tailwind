"use client";

/**
 * Favicon with a graceful, honest fallback.
 *
 * We optimistically point <img> at the site's own /favicon.ico. If the site has
 * none, the browser fires `onError` and we render a generated monogram. We
 * never report a blocked or missing icon as anything it isn't.
 */

import { memo, useState } from "react";
import { faviconFor, hueForHost, initialFor, markFaviconFailed, rememberFavicon } from "@/lib/browser/favicon";

interface Props {
  url: string;
  size?: number;
  className?: string;
}

export const Favicon = memo(function Favicon({ url, size = 16, className = "" }: Props) {
  const [failed, setFailed] = useState(false);
  const src = url ? faviconFor(url) : undefined;
  const showImg = src && !failed;

  if (!showImg) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-[4px] font-semibold shrink-0 ${className}`}
        style={{
          width: size,
          height: size,
          fontSize: Math.max(9, size * 0.62),
          background: `hsl(${hueForHost(url)} 62% 52% / 0.16)`,
          color: `hsl(${hueForHost(url)} 70% 45%)`,
        }}
        aria-hidden
      >
        {initialFor(url)}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      width={size}
      height={size}
      alt=""
      className={`shrink-0 rounded-[3px] object-contain ${className}`}
      onLoad={() => rememberFavicon(url, src)}
      onError={() => {
        markFaviconFailed(url);
        setFailed(true);
      }}
    />
  );
});
