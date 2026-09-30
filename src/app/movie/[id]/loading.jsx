import { DetailSkeleton } from "@/components/RouteSkeleton";

/**
 * The movie detail loading boundary.
 *
 * A cold `/movie/[id]` is the worst case on the site: the backdrop, the
 * detail payload, the cast and the "more like this" rail all resolve before
 * anything streams, so this fallback is what the user sees for the whole wait.
 *
 * The detail silhouette reserves the poster column and the two-thirds/one-third
 * split of the lower body, so the real page lands without a reflow. The
 * `isTv` flag only affects the badge above the title -- a film shows an
 * eyebrow there, a series shows a "Series" pill.
 */
export default function Loading() {
  return <DetailSkeleton />;
}
