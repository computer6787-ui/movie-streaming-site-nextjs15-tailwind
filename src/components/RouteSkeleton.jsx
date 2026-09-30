"use client";

import { useEffect, useState } from "react";

/**
 * Route skeletons.
 *
 * These are the fallback half of the loading work (the other half is the
 * progress bar in `RouteProgress.jsx`, which covers navigations a skeleton
 * cannot predict). The rule they follow is simple: every variant copies the
 * real page's grid, spacing and fixed ratios, so when the actual content
 * replaces the skeleton the layout does not jump. A skeleton that is merely
 * "some grey rectangles" is worse than no skeleton, because it promises a shape
 * and then breaks the promise.
 *
 * Every block carries `--sk-delay` so the sweep ripples across a grid instead
 * of blinking in unison. The delays are small (40-70ms across a row) -- enough
 * to read as a direction of travel, not enough to look like a wave effect.
 *
 * All of it is `aria-hidden`, because a screen reader announcing "loading" is
 * only useful once. The single exception is the `role="status"` wrapper, which
 * carries the one announcement a user actually wants.
 */

import RouteActivity from "@/components/RouteActivity";

const GRID = "grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6";
const RAIL_W = "w-[9.5rem] sm:w-[10.5rem] lg:w-[11.5rem]";

/**
 * How long a skeleton waits before it becomes visible.
 *
 * A loading boundary mounts the instant a navigation starts, even when the
 * navigation is going to be resolved from the router cache in 20ms. Painting
 * immediately therefore guarantees a skeleton flash on every warm navigation --
 * and a flash is worse than nothing, because the eye reads it as "the page
 * changed and then changed back". It is a stutter, not progress.
 *
 * So the skeleton is held back briefly and only shown if the route is *still*
 * loading when the hold expires. Warm navigations, which are the common case
 * once intent prefetching is in place, never paint it at all.
 *
 * The number is a compromise and the reasoning is worth stating: too short and
 * a genuine 300ms wait gets no feedback at all, which reads as a dropped click;
 * too long and a genuine 400ms wait shows nothing for most of its duration,
 * which reads as a freeze. 200ms sits past the point where the user has decided
 * something is wrong, and below the point where a skeleton has been on screen
 * long enough for its own entrance animation to look deliberate.
 */
const SKELETON_DELAY = 200;

/** Staggers the sweep across a row of children. */
function delay(i, step = 70) {
  return { "--sk-delay": `${(i % 8) * step}ms` };
}

/**
 * A single poster tile, dimensionally identical to `PosterCard`: a 2:3 frame at
 * the shelf's intrinsic width, then a two-line title block beneath it.
 */
function PosterSk({ className = "", style, showMeta = true }) {
  return (
    <div className={className} style={style}>
      <div className="sk sk-poster aspect-2/3 w-full" />
      {showMeta && (
        <>
          <div className="sk mt-2.5 h-3.5 w-[85%]" />
          <div className="sk mt-2 h-2.5 w-[40%]" />
        </>
      )}
    </div>
  );
}

/** A row of posters on the horizontal shelf, matching `Rail`'s widths. */
function RailSk({ count = 7 }) {
  return (
    <div className="shelf">
      {Array.from({ length: count }, (_, i) => (
        <PosterSk key={i} className={RAIL_W} style={delay(i, 55)} />
      ))}
    </div>
  );
}

/** A grid of posters, matching the browse/search page column counts. */
function GridSk({ count = 18 }) {
  return (
    <div className={GRID}>
      {Array.from({ length: count }, (_, i) => (
        <PosterSk key={i} className="w-full" style={delay(i, 60)} />
      ))}
    </div>
  );
}

/** The `SectionHead` block above every shelf: kicker, serif title, "see all". */
function SectionHeadSk() {
  return (
    <div className="mb-1 flex items-end justify-between gap-6">
      <div className="min-w-0">
        <div className="sk h-2.5 w-16" />
        <div className="sk mt-2.5 h-5 w-44" />
      </div>
      <div className="sk mb-1 h-3.5 w-16" />
    </div>
  );
}

/** The header used by browse, search and the detail pages. */
function PageHeadSk({ title = "w-48" }) {
  return (
    <header className="pt-12 sm:pt-16">
      <div className="sk h-2.5 w-20" />
      <div className={`sk mt-3 h-9 ${title}`} />
      <div className="sk mt-4 h-3 w-full max-w-md" />
    </header>
  );
}

/** The filter rows on the browse page: two chip rows and a count line. */
function FilterSk() {
  const chip = "sk h-7 rounded-full";
  return (
    <div className="space-y-4">
      {[0, 1].map((row) => (
        <div key={row} className="flex flex-wrap items-center gap-2">
          <div className="sk mr-1 h-2.5 w-9" />
          {Array.from({ length: row === 0 ? 4 : 6 }, (_, i) => (
            <div key={i} className={`${chip} ${i === 0 ? "w-20" : "w-24"}`} style={delay(i, 45)} />
          ))}
        </div>
      ))}
      <div className="flex min-h-6 items-center gap-3">
        <div className="sk h-3 w-28" />
      </div>
    </div>
  );
}

/**
 * The status wrapper. `role="status"` is the accessible half; the skeleton
 * itself is hidden from assistive tech so it is never read as content.
 *
 * `RouteActivity` is the other half. It renders nothing, but its lifetime is
 * exactly this fallback's lifetime, which is what the header's progress bar
 * reads to know the route is still loading. Both halves must stay together: the
 * status wrapper is the visible/a11y contract, the activity is the signal.
 *
 * The wrapper is always present, because the progress bar depends on it and the
 * bar must never miss the start of a navigation. Only the *painting* is
 * delayed, via `data-shown`, which is what keeps a warm navigation from
 * flashing a skeleton it will not need. Two consequences worth being explicit
 * about:
 *
 *   - `aria-busy` is not announced until the hold expires, so assistive tech is
 *     not told "busy" about a page that was ready in 20ms. That is the correct
 *     trade: a live region that fires twice per navigation is worse than one that
 *     occasionally fires late.
 *   - The delay is a client-side timer, so the wrapper must be a client
 *     component. That is true of every `loading.jsx` already in this app.
 */
export function RouteSkeleton({ children, label = "Loading" }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setShown(true), SKELETON_DELAY);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div role="status" aria-live="polite" aria-busy={shown}>
      <RouteActivity />
      <span className="sr-only">{label}</span>
      {/* Kept mounted and hidden rather than unmounted: the boxes must occupy
          their space the moment they are revealed, or the reveal itself causes
          the layout jump the skeletons exist to prevent. */}
      <div aria-hidden="true" data-shown={shown ? "true" : "false"}>
        {children}
      </div>
    </div>
  );
}

/** Home: the full-bleed hero, then four shelves. */
export function HomeSkeleton() {
  return (
    <RouteSkeleton label="Loading the catalogue">
      <div className="pb-6">
        <section className="relative isolate min-h-[78svh] overflow-hidden sm:min-h-[86svh]">
          <div className="sk sk-breathe absolute inset-0 rounded-none" />
          <div className="scrim-bleed absolute inset-0" />
          <div className="scrim-left absolute inset-0" />
          <div className="shell relative flex min-h-[78svh] items-end pt-(--header-h) pb-14 sm:min-h-[86svh] sm:pb-20">
            <div className="max-w-xl">
              <div className="sk h-2.5 w-40" />
              <div className="sk mt-5 h-12 w-80 max-w-full" />
              <div className="mt-5 flex gap-3.5">
                <div className="sk h-3 w-10" />
                <div className="sk h-3 w-16" />
                <div className="sk h-3 w-12" />
              </div>
              <div className="mt-5 space-y-2.5">
                <div className="sk h-3 w-full" />
                <div className="sk h-3 w-11/12" />
                <div className="sk h-3 w-4/5" />
              </div>
              <div className="mt-7 flex flex-wrap gap-3">
                <div className="sk h-10 w-32 rounded-full" />
                <div className="sk h-10 w-28 rounded-full" />
              </div>
            </div>
          </div>
        </section>

        <div className="shell">
          {Array.from({ length: 4 }, (_, i) => (
            <section key={i} className="mt-14 sm:mt-16">
              <SectionHeadSk />
              <RailSk />
            </section>
          ))}
        </div>
      </div>
    </RouteSkeleton>
  );
}

/** Browse: page head, the filter block, a poster grid, pagination. */
export function BrowseSkeleton({ isTv = false }) {
  return (
    <RouteSkeleton label={isTv ? "Loading series" : "Loading movies"}>
      <div className="shell pt-(--header-h) pb-8">
        <PageHeadSk title={isTv ? "w-40" : "w-48"} />

        <div className="mt-8 border-y border-ink-800/80 py-5">
          <FilterSk />
        </div>

        <div className="mt-8">
          <GridSk />
        </div>

        <nav
          className="mt-16 flex flex-wrap items-center justify-center gap-1.5"
          aria-hidden="true"
        >
          <div className="sk h-9 w-14 rounded-full" />
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="sk h-9 w-9 rounded-full" style={delay(i, 50)} />
          ))}
          <div className="sk h-9 w-14 rounded-full" />
        </nav>
      </div>
    </RouteSkeleton>
  );
}

/** Search: page head, the field, then results. */
export function SearchSkeleton() {
  return (
    <RouteSkeleton label="Loading results">
      <div className="shell pt-(--header-h) pb-10">
        <PageHeadSk title="w-44" />

        <div className="mt-8 max-w-2xl">
          <div className="sk h-14 w-full rounded-xl" />
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-b border-ink-800/80 pb-3">
          <div className="sk h-3.5 w-40" />
          <div className="sk h-9 w-48 rounded-full" />
        </div>

        <div className="mt-8">
          <GridSk count={12} />
        </div>
      </div>
    </RouteSkeleton>
  );
}

/** Movie and series detail: the poster/title hero, then synopsis + facts. */
export function DetailSkeleton({ isTv = false }) {
  return (
    <RouteSkeleton label={isTv ? "Loading series details" : "Loading movie details"}>
      <div className="shell pt-(--header-h) pb-10">
        <div className="relative">
          <div className="sk absolute inset-0 -z-10 rounded-none opacity-40" />
          <div className="scrim-bleed absolute inset-0 -z-10" />
          <div className="scrim-left absolute inset-0 -z-10" />

          <div className="enter grid gap-7 pt-12 pb-8 sm:pt-16 sm:pb-10 md:grid-cols-[12rem_1fr] md:gap-9 md:pb-14">
            <div className="w-36 sm:w-44 md:w-full">
              <div className="sk sk-poster aspect-2/3 w-full" />
            </div>

            <div className="min-w-0 self-end">
              {isTv ? (
                <div className="sk h-6 w-20 rounded-full" />
              ) : (
                <div className="sk h-2.5 w-24" />
              )}
              <div className="sk mt-4 h-10 w-2/3 max-w-md" />
              <div className="sk mt-4 h-3.5 w-40" />
              <div className="mt-5 flex flex-wrap gap-3.5">
                <div className="sk h-3 w-12" />
                <div className="sk h-3 w-14" />
                <div className="sk h-3 w-16" />
              </div>
              <div className="mt-5 flex flex-wrap gap-1.5">
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="sk h-6 w-16 rounded-full" style={delay(i, 60)} />
                ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <div className="sk h-11 w-36 rounded-xl" />
                <div className="sk h-11 w-24 rounded-xl" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-3 lg:gap-12">
          <div className="lg:col-span-2">
            <div className="sk h-2.5 w-20" />
            <div className="mt-4 space-y-2.5">
              {Array.from({ length: 6 }, (_, i) => (
                <div
                  key={i}
                  className="sk h-3"
                  style={{ width: `${100 - i * 7}%`, ...delay(i, 40) }}
                />
              ))}
            </div>
          </div>

          <aside className="space-y-8">
            <div className="plate rounded-xl p-5">
              {Array.from({ length: 4 }, (_, i) => (
                <div
                  key={i}
                  className="flex justify-between gap-4 border-b border-ink-800/80 py-2.5 first:pt-0 last:border-b-0 last:pb-0"
                >
                  <div className="sk h-3 w-16" style={delay(i, 50)} />
                  <div className="sk h-3 w-24" style={delay(i, 50)} />
                </div>
              ))}
            </div>

            <div>
              <div className="sk h-2.5 w-12" />
              <ul className="mt-4 space-y-3">
                {Array.from({ length: 5 }, (_, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="sk size-9 shrink-0 rounded-full" style={delay(i, 45)} />
                    <div className="min-w-0 flex-1">
                      <div className="sk h-3 w-2/3" style={delay(i, 45)} />
                      <div className="sk mt-2 h-2.5 w-1/2" style={delay(i, 45)} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </RouteSkeleton>
  );
}

/** Watch: the title row, then the player frame. */
export function WatchSkeleton() {
  return (
    <RouteSkeleton label="Loading the player">
      <div className="shell pt-(--header-h) pb-10">
        <div className="flex flex-wrap items-end justify-between gap-4 pt-10 sm:pt-14">
          <div className="min-w-0">
            <div className="sk h-3.5 w-32" />
            <div className="sk mt-3 h-8 w-72 max-w-full" />
            <div className="sk mt-3 h-3 w-12" />
          </div>
          <div className="sk h-2.5 w-28" />
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="sk h-3.5 w-56" />
          <div className="sk h-9 w-40 rounded-lg" />
        </div>

        <div className="mobile-player-container mt-2 aspect-video w-full overflow-hidden rounded-2xl border border-ink-800 bg-black [box-shadow:var(--elev-4)]">
          <div className="sk sk-breathe size-full rounded-none" />
        </div>

        <div className="mt-8">
          <div className="sk h-2.5 w-20" />
          <div className="mt-4 space-y-2.5">
            {Array.from({ length: 3 }, (_, i) => (
              <div
                key={i}
                className="sk h-3"
                style={{ width: `${100 - i * 12}%`, ...delay(i, 40) }}
              />
            ))}
          </div>
        </div>
      </div>
    </RouteSkeleton>
  );
}

