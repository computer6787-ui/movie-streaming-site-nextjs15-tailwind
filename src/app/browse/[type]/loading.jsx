"use client";

import { usePathname } from "next/navigation";
import { BrowseSkeleton } from "@/components/RouteSkeleton";

/**
 * The browse loading boundary.
 *
 * The one detail worth copying from the real page is the filter block: it sits
 * between the heading and the grid, separated by a hairline, and it is a fixed
 * height because the chip rows wrap. Skipping it would let the grid jump up
 * once the real chips arrive.
 *
 * Why this is a client component reading `usePathname` rather than an async
 * server component awaiting `params`: `loading.jsx` has no guaranteed `params`
 * during static generation, so destructuring it throws and takes the build with
 * it. The path is always available -- during the prerender of
 * `/browse/movie` `usePathname` returns exactly that path -- so it is the
 * reliable source. The cost is one extra client boundary, which for a static
 * fallback costs nothing.
 */
export default function Loading() {
  const pathname = usePathname() ?? "";
  // "/browse/tv".split("/")[2] -> "tv". Anything unrecognised falls back to
  // the films variant, which is the default catalogue anyway.
  const isTv = pathname.split("/")[2] === "tv";

  return <BrowseSkeleton isTv={isTv} />;
}
