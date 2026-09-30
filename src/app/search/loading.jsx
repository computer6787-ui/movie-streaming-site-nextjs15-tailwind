import { SearchSkeleton } from "@/components/RouteSkeleton";

/**
 * The search loading boundary.
 *
 * Search is `force-dynamic`, so it has no prerendered shell to fall back on and
 * blocks on every keystroke-driven navigation. Without this the field would
 * vanish and the page would simply sit there, which is the exact complaint this
 * whole change exists to fix.
 */
export default function Loading() {
  return <SearchSkeleton />;
}
