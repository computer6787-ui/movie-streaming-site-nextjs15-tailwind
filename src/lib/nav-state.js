"use client";

/**
 * A tiny external store that answers one question: "is a route still loading?"
 *
 * Why this exists
 * ---------------
 * The obvious way to drive a progress bar is to watch the URL and hide the bar
 * when it changes. That is wrong, and measurably so. In the App Router the
 * pathname updates as soon as the navigation is *committed* -- which is
 * noticeably earlier than the route's data has finished streaming. Keyed off
 * the URL, the bar reaches 100% and disappears while the skeleton for the new
 * page is still on screen. The bar is then a lie: it says "done" at the exact
 * moment the user is still waiting.
 *
 * The loading boundary itself is the honest signal. React mounts it for the
 * whole duration of the pending navigation and unmounts it when the content is
 * actually ready. So the boundary is what reports, and the bar merely renders
 * the answer.
 *
 * Why a module-level store and not React context
 * ----------------------------------------------
 * The reporter (`RouteActivity`) is mounted inside the loading boundary, and the
 * listener (`RouteProgress`) lives in the header. Those are siblings under the
 * root layout, not parent and child, and wrapping the whole tree in a provider
 * to move one boolean would mean re-rendering every client component on each
 * navigation. A module store with an explicit subscribe does the same job while
 * touching nothing else.
 *
 * The count, not a boolean
 * -----------------------
 * Segments resolve independently, so a single navigation can mount and unmount
 * several boundaries -- and back-to-back navigations overlap. A boolean would go
 * false the moment the first of two boundaries settled, leaving a page half
 * loaded with no bar. Counting means the last boundary to finish wins.
 *
 * Intent, and why it is a separate channel
 * ---------------------------------------
 * The boundary is the *honest* signal but it is a late one: React has to commit
 * the fallback before `RouteActivity` mounts, so the bar cannot start until then.
 * On a cold route with a heavy layout that is a visible beat of dead air between
 * the click and any feedback at all.
 *
 * So a click also reports `intent`, synchronously, before the router does
 * anything. Intent is not a claim about the future -- it is a statement that the
 * user asked for something. It starts the feedback, and it is handed over to the
 * boundary the instant the boundary reports in, so the honest signal always wins
 * once it exists. If no boundary ever mounts (a cache hit), intent is retired by
 * the URL commit instead. It is deliberately not sticky: a click that goes
 * nowhere must not strand the bar.
 */

let pending = 0;
let intentAt = 0;
let intentTimer = 0;
const listeners = new Set();

/**
 * How long a click intent may stand in for a boundary that never arrives.
 * Generous enough to cover a slow mount on a weak device, short enough that a
 * click which did not navigate cannot leave the bar creeping for long.
 */
const INTENT_TTL = 1500;

function emit() {
  for (const fn of listeners) fn({ pending, intent: intentAt > 0 });
}

/** True while any route work is in flight. Prefetching yields to real navigation. */
export function navigationBusy() {
  return pending > 0 || intentAt > 0;
}

/**
 * Called synchronously from a link press, before the router has reacted.
 * Safe to call repeatedly: the timestamp is simply moved forward.
 */
export function noteIntent() {
  intentAt = Date.now();
  if (intentTimer === 0 && typeof window !== "undefined") {
    intentTimer = window.setTimeout(retireIntent, INTENT_TTL);
  }
  emit();
}

/**
 * Hands control back to the real signal. Called when a boundary mounts, when
 * the URL commits, and when a press turns out not to be a navigation at all.
 */
export function clearIntent() {
  if (intentTimer !== 0 && typeof window !== "undefined") {
    window.clearTimeout(intentTimer);
    intentTimer = 0;
  }
  if (intentAt === 0) return;
  intentAt = 0;
  emit();
}

function retireIntent() {
  intentTimer = 0;
  if (intentAt === 0) return;
  intentAt = 0;
  emit();
}

/** Called by `RouteActivity` on mount; returns the matching cleanup. */
export function beginNavigation() {
  pending += 1;
  // The boundary is the honest signal; the click is now redundant.
  clearIntent();
  emit();
  return () => endNavigation();
}

function endNavigation() {
  // Clamp, because an unmount that runs twice must not drive the count
  // negative and strand the bar in a permanently-on state.
  pending = Math.max(0, pending - 1);
  emit();
}

/** Current count of active loading boundaries. */
export function pendingCount() {
  return pending;
}

/** Subscribe to changes; returns an unsubscribe function. */
export function subscribeToNavigation(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
