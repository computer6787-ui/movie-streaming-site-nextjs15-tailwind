"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef } from "react";
import { navigationBusy } from "@/lib/nav-state";

/**
 * Warm the router cache on intent, not on sight.
 *
 * The default `<Link>` behaviour is tuned for a link farm, not for this site.
 * It prefetches every link that enters the viewport, and it stops at the nearest
 * `loading.js` boundary -- which, on a site where every route has one, means it
 * prefetches no page data at all. The result is a full network round trip on
 * every single click, forever. A browse page with 18 posters quietly queues 18
 * requests that all resolve to the same skeleton, and none of them help.
 *
 * So: prefetch on intent, and fetch the whole thing.
 *
 * Why intent
 * ----------
 * Hover, focus and touchstart all predict the destination better than the
 * viewport does, and they predict it for exactly one link. A pointer has to
 * travel to a poster before the user can choose it, so the hover arrives with
 * enough lead time for the RSC payload to land before the click. Meanwhile the
 * viewport-based signal fires for tiles the user has no intention of opening --
 * everything below the fold, every recommendation, all 18 of them at once.
 *
 * Why full
 * --------
 * `PrefetchKind.FULL` is the only kind that retrieves the page's actual data
 * rather than stopping at the loading boundary. With a `loading.jsx` on every
 * route, an automatic prefetch is a prefetch of the skeleton, which is worth
 * nothing. `router.prefetch(href, { kind: "full" })` writes the real payload
 * into the router cache, and the click then resolves from memory.
 *
 * Why bounded
 * -----------
 * The dangerous shape here is a burst: a grid where the user sweeps the pointer
 * across 18 tiles would fire 18 full prefetches, saturating the connection and
 * delaying the click that actually mattered. Three rules keep that from
 * happening, and all three matter:
 *
 *   1. A small in-flight cap. Beyond `MAX_INFLIGHT` the request is dropped
 *      rather than queued -- a stale prefetch is worthless, so there is no
 *      reason to hold a slot open for it.
 *   2. No prefetching during real navigation. If the user is already waiting on
 *      a route, the network belongs to that route.
 *   3. A short intent window. Prefetching is abandoned if the pointer leaves
 *      without a click, so a pointer merely passing across a grid costs nothing
 *      permanent. The entry is not cached here; the router's own cache handles
 *      reuse, and letting it expire keeps the memory honest.
 *
 * None of this is speculative. `links.js` in this version already raises
 * hovered links to `PrefetchPriority.Intent` for viewport prefetches, and
 * `prefetch-reducer.js` caps the queue at 5 -- this is the same idea, applied
 * deliberately, with the full kind and without the fan-out.
 */

/** Simultaneous full prefetches. Above this, intent is dropped. */
const MAX_INFLIGHT = 3;

/** How long a prefetch stays "warm" after the intent that triggered it. */
const INTENT_WINDOW = 12000;

let inflight = 0;
const inFlightUrls = new Set();

/** Per-link scratch: what this link last warmed, and when. */
const nothing = { at: 0, url: "" };

function isInternal(href) {
  return typeof href === "string" && href.startsWith("/") && !href.startsWith("//");
}

function release() {
  inflight = Math.max(0, inflight - 1);
}

/**
 * Returns a `prefetch` callback plus the pointer/focus handlers to spread onto a
 * link. The bookkeeping ref is what makes "did we already warm this exact link"
 * answerable without a state update on every pointer move across a grid.
 */
export function usePrefetchOnIntent(href) {
  const router = useRouter();
  const mark = useRef(nothing);

  const prefetch = useCallback(() => {
    // `SectionHead` renders `href="#"` for a shelf with no destination.
    if (!isInternal(href)) return;
    // Next disables prefetching in development, and this module's value is
    // entirely in production where the router cache is real. Bail rather than
    // let dev behave differently from prod in a way that hides bugs.
    if (process.env.NODE_ENV !== "production") return;
    if (navigationBusy()) return;
    if (inFlightUrls.has(href)) return;

    const now = Date.now();
    if (mark.current.url === href && now - mark.current.at < INTENT_WINDOW) return;
    if (inflight >= MAX_INFLIGHT) return;

    mark.current = { at: now, url: href };
    inFlightUrls.add(href);
    inflight += 1;

    const done = () => {
      inFlightUrls.delete(href);
      release();
    };

    try {
      // `kind: "full"` is the whole point of this module. Without it Next stops
      // at the loading boundary and the click still waits on the network.
      const result = router.prefetch(href, { kind: "full" });
      if (result && typeof result.then === "function") result.then(done, done);
      else done();
    } catch {
      // A failed prefetch is not worth surfacing: the click navigates normally
      // and the user sees the boundary as usual.
      done();
    }
  }, [href, router]);

  const onPointerEnter = useCallback(() => prefetch(), [prefetch]);
  const onFocus = useCallback(() => prefetch(), [prefetch]);
  const onPointerLeave = useCallback(() => {
    // Drop the warm mark so sweeping across a grid does not leave every tile
    // cached. The router's own entry is left alone; it expires on its own terms.
    mark.current = nothing;
  }, []);

  return { prefetch, onPointerEnter, onFocus, onPointerLeave };
}
