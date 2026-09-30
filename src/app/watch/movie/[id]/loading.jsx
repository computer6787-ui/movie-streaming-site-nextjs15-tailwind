import { WatchSkeleton } from "@/components/RouteSkeleton";

/**
 * The movie watch loading boundary.
 *
 * Reserved up to the 16:9 frame and the mobile sizing override, so the player
 * lands at exactly the height it will occupy. The frame itself is a dark
 * breathing block rather than a poster: the real PlayerFrame shows a poster
 * only briefly, then the cross-origin iframe takes over, so promising a poster
 * here would be a lie that resolves twice.
 */
export default function Loading() {
  return <WatchSkeleton />;
}
