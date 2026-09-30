import { WatchSkeleton } from "@/components/RouteSkeleton";

/**
 * The episode watch loading boundary.
 *
 * Deliberately identical to the movie one. A viewer stepping through episodes
 * should see the same reserved frame every time, so the page never appears to
 * change size between episodes.
 */
export default function Loading() {
  return <WatchSkeleton />;
}
