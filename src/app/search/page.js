import Link from "next/link";
import { Suspense } from "react";
import PosterCard from "@/components/PosterCard";
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
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">Search</h1>

      <div className="mt-5 max-w-xl">
        {/* `initialType` only sets the first render; SearchForm syncs from the URL. */}
        <Suspense fallback={<div className="h-20" />}>
          <SearchForm autoFocus={!q} initialType={type} />
        </Suspense>
      </div>

      {!q && (
        <p className="mt-10 text-[13.5px] text-ink-400">
          Search across movies and series. Use the tabs to narrow to one or the other.
        </p>
      )}

      {q && data && (
        <p className="mt-6 text-[13px] text-ink-400">
          <span className="font-semibold text-ink-200">{results.length}</span>{" "}
          {results.length === 1 ? "result" : "results"} for{" "}
          <span className="font-semibold text-ink-200">{q}</span>
        </p>
      )}

      {q && data && results.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {TYPES.map((tab) => {
            const active = type === tab.id;
            const query = new URLSearchParams({ q, type: tab.id });
            return (
              <Link
                key={tab.id}
                href={`/search?${query}`}
                aria-current={active ? "true" : undefined}
                className={`rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                  active
                    ? "bg-cine-500/15 text-cine-400 ring-1 ring-cine-500/40"
                    : "bg-ink-850 text-ink-300 ring-1 ring-ink-700 hover:bg-ink-800"
                }`}
              >
                {tab.label}
                {counts[tab.id] > 0 && (
                  <span className="ml-1.5 text-[11px] text-ink-500">{counts[tab.id]}</span>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {q && data && results.length === 0 && (
        <p className="mt-12 text-center text-[14px] text-ink-400">
          Nothing found for{" "}
          <span className="font-semibold text-ink-200">{q}</span>. Try a different spelling or
          search the other type.
        </p>
      )}

      {results.length > 0 && (
        <div className="mt-7 grid grid-cols-2 gap-x-3.5 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {results.map((item) => (
            <PosterCard
              key={`${item.media_type}-${item.id}`}
              item={item}
              className="w-full"
            />
          ))}
        </div>
      )}
    </div>
  );
}
