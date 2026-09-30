import Link from "next/link";
import { Suspense } from "react";
import IntentLink from "@/components/IntentLink";
import PosterCard from "@/components/PosterCard";
import Reveal from "@/components/Reveal";
import SearchForm from "@/components/SearchForm";
import { search } from "@/lib/tmdb";

// Search results change constantly; do not cache them for an hour.
export const dynamic = "force-dynamic";

const TYPES = [
  { id: "all", label: "All" },
  { id: "movie", label: "Movies" },
  { id: "tv", label: "Series" },
];

export async function generateMetadata({ searchParams }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  return { title: q ? `Search: ${q}` : "Search" };
}

export default async function SearchPage({ searchParams }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const rawType = typeof sp.type === "string" ? sp.type : "all";
  const type = TYPES.some((t) => t.id === rawType) ? rawType : "all";

  const data = q ? await search(q, type).catch(() => null) : null;
  const results = data?.results ?? [];

  // Count each kind so the tabs can show what the filter will yield.
  const counts = { all: results.length, movie: 0, tv: 0 };
  for (const item of data?.results ?? []) {
    if (item.media_type === "movie") counts.movie += 1;
    if (item.media_type === "tv") counts.tv += 1;
  }
  if (type !== "all") {
    // TMDB filters server-side, so the unfiltered totals are not available
    // here. Only the active view is meaningful; show its own count.
    counts.all = results.length;
    counts[type] = results.length;
    // The other tab's count would be zero-but-unknown, not a real "no results".
    // Clear it so the tab renders bare rather than lying with a 0.
    counts[type === "movie" ? "tv" : "movie"] = 0;
  }

  return (
    <div className="shell pt-(--header-h) pb-10">
      <header className="pt-12 sm:pt-16">
        <p className="eyebrow text-chit-600">The archive</p>
        <h1 className="display mt-2 text-[32px] text-ink-100 sm:text-[44px]">Search</h1>
        <p className="prose-measure mt-3 text-[13.5px] text-ink-400">
          Every movie and series in the catalogue, one field. Narrow to one or the
          other with the tabs below.
        </p>
      </header>

      {/* The field sits on the page, not tucked in a card: it is the primary
          action of this route. */}
      <div className="mt-8 max-w-2xl">
        {/* `initialType` only sets the first render; SearchForm syncs from the URL. */}
        <Suspense fallback={<div className="h-14" />}>
          <SearchForm autoFocus={!q} initialType={type} />
        </Suspense>
      </div>

      {q && data && (
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-b border-ink-800/80 pb-3">
          <p className="text-[12.5px] text-ink-400">
            <span className="font-medium text-ink-200 tnum">{results.length}</span>{" "}
            {results.length === 1 ? "result" : "results"} for{" "}
            <span className="font-medium text-ink-200">&ldquo;{q}&rdquo;</span>
          </p>

          {/* Segmented control. Counts are omitted on a filtered view: TMDB
              filters server-side, so the unfiltered totals are not available
              and a number here would be a lie. */}
          <div
            className="flex items-center gap-1 rounded-full border border-ink-800 bg-ink-900/60 p-1"
            role="group"
            aria-label="Filter results by type"
          >
            {TYPES.map((tab) => {
              const active = type === tab.id;
              const count = counts[tab.id];
              const query = new URLSearchParams({ q, type: tab.id });
              return (
                <IntentLink
                  key={tab.id}
                  href={`/search?${query}`}
                  aria-current={active ? "true" : undefined}
                  prefetch
                  className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-[background-color,color] duration-200 ease-[var(--ease-standard)] ${
                    active
                      ? "bg-ink-800 text-ink-100 [box-shadow:var(--elev-1)]"
                      : "text-ink-400 hover:bg-ink-850 hover:text-ink-200"
                  }`}
                >
                  {tab.label}
                  {count > 0 && (
                    <span className="ml-1.5 text-[11px] text-ink-500 tnum">{count}</span>
                  )}
                </IntentLink>
              );
            })}
          </div>
        </div>
      )}

      {q && data && results.length > 0 && (
        <Reveal className="mt-8 grid grid-cols-2 gap-x-3.5 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {results.map((item) => (
            <PosterCard key={`${item.media_type}-${item.id}`} item={item} className="w-full" />
          ))}
        </Reveal>
      )}

      {q && data && results.length === 0 && (
        <div className="plate mt-10 rounded-2xl px-6 py-14 text-center">
          <p className="display text-[22px] text-ink-200">Nothing found</p>
          <p className="prose-measure mx-auto mt-2 text-[13.5px] text-ink-400">
            No titles match{" "}
            <span className="text-ink-200">&ldquo;{q}&rdquo;</span> in{" "}
            {type === "all" ? "movies or series" : type === "movie" ? "movies" : "series"}. Try
            a different spelling, or switch tabs to check the other one.
          </p>
        </div>
      )}

      {!q && (
        <div className="mt-12 grid gap-3 sm:grid-cols-3">
          {TYPES.filter((t) => t.id !== "all").map((tab) => (
            <IntentLink
              key={tab.id}
              href={`/browse/${tab.id}`}
              className="group plate rounded-xl px-5 py-4 transition-[border-color,transform] duration-200 ease-[var(--ease-standard)] hover:-translate-y-0.5 hover:border-ink-600"
            >
              <p className="text-[13.5px] font-medium text-ink-100 transition-colors duration-200 group-hover:text-chit-300">
                Browse all {tab.label.toLowerCase()}
              </p>
              <p className="mt-1 text-[12px] text-ink-400">
                Filter by genre, year, rating and sort order.
              </p>
            </IntentLink>
          ))}
        </div>
      )}
    </div>
  );
}
