import { HomeSkeleton } from "@/components/RouteSkeleton";

/**
 * The root loading boundary, which is also the home page's.
 *
 * Home is the slowest route on the site -- four sections plus trending, six
 * TMDB requests in total -- and the one a user is most likely to click while
 * already staring at another page. The hero silhouette matters most: the real
 * page opens on a full-bleed 78-86svh frame, so a fallback that reserves that
 * space stops the header from flashing over a half-height page.
 *
 * It doubles as the safety net for every route without its own `loading.jsx`.
 * A route added later still gets real feedback instead of a frozen page.
 */
export default function Loading() {
  return <HomeSkeleton />;
}
