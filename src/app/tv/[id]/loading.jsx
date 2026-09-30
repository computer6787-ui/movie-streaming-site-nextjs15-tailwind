import { DetailSkeleton } from "@/components/RouteSkeleton";

/**
 * The series detail loading boundary.
 *
 * Same silhouette as the movie page, plus `isTv` so the badge above the title
 * is a "Series" pill rather than an eyebrow. The season list below the
 * synopsis is collapsed by default, so it is not part of the reserved space --
 * the real page grows into it when the user opens a season.
 */
export default function Loading() {
  return <DetailSkeleton isTv />;
}
