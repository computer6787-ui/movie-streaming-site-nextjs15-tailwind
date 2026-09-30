"use client";

import Link from "next/link";
import { noteIntent } from "@/lib/nav-state";
import { usePrefetchOnIntent } from "@/lib/prefetch";

/** Only paths inside the app are ours to navigate. */
function isInternal(href) {
  return typeof href === "string" && href.startsWith("/") && !href.startsWith("//");
}

/**
 * The link every route in the site should use.
 *
 * It exists to close the gap between the click and the router's first reaction.
 * Three things happen in the same tick, before Next has done anything:
 *
 *   1. `noteIntent()` -- the progress bar starts now, not when React happens to
 *      commit a fallback a frame or two later.
 *   2. `prefetch()` on pointer-enter or focus -- by the time the click arrives
 *      the payload is usually already in the router cache, so the navigation
 *      resolves without a network round trip and no skeleton is ever mounted.
 *   3. The anchor gets `data-pressed` for a frame, which is the difference
 *      between "the site heard me" and "the site is thinking".
 *
 * The prefetch is what actually makes navigation feel instant; the click
 * feedback is what makes it feel *acknowledged*. Both are needed. A perfectly
 * instant transition that gives no acknowledgement reads as a dropped click.
 */
export default function IntentLink({ href, children, onClick, onPointerEnter, onFocus, ...rest }) {
  const { prefetch, onPointerEnter: onEnter, onFocus: onFocusIn, onPointerLeave } =
    usePrefetchOnIntent(href);

  function press(event) {
    // Ignore modified clicks: those open a new tab or window, so this page never
    // navigates and must not claim that it is loading.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    // `SectionHead` renders `href="#"` when a shelf has no destination. That is
    // a same-page anchor, not a route change, so announcing intent for it would
    // start a progress bar for a navigation that is never going to happen.
    if (!isInternal(href)) return;
    noteIntent();
    onClick?.(event);
  }

  function enter(event) {
    prefetch();
    onPointerEnter?.(event);
  }

  function focusIn(event) {
    // Keyboard users get the same warm cache as the pointer path.
    prefetch();
    onFocus?.(event);
  }

  return (
    <Link
      href={href}
      // `prefetch={false}` disables the viewport fan-out this component exists to
      // replace. The prefetch is ours now, on intent, at the full kind.
      prefetch={false}
      onClick={press}
      onPointerEnter={enter}
      onPointerLeave={onPointerLeave}
      onFocus={focusIn}
      {...rest}
    >
      {children}
    </Link>
  );
}
