import { notFound } from "next/navigation";
import { Suspense } from "react";
import FilterBar from "@/components/FilterBar";
import PosterCard from "@/components/PosterCard";
import { discover } from "@/lib/tmdb";

export const revalidate = 3600;

/** Only two catalogues exist; anything else is a 404. */
function normaliseType(raw) {
  if (raw === "movie" || raw === "movies") return "movie";
  if (raw === "tv" || raw === "series" || raw === "shows") return "tv";
  return null;
}

export function generateStaticParams() {
  return [{ type: "movie" }, { type: "tv" }];
}

export async function generateMetadata({ params }) {
  const { type: raw } = await params;
  const type = normaliseType(raw);
  if (!type) return {};
  return {
    title: type === "tv" ? "Series" : "Movies",
    description:
      type === "tv"
        ? "Browse series by genre, sorted by popularity, rating or newest."
        : "Browse movies by genre, sorted by popularity, rating or newest.",
  };
}

export default async function BrowsePage({ params, searchParams }) {
  const { type: raw } = await params;
  const type = normaliseType(raw);
  if (!type) notFound();

  const sp = await searchParams;
  const genre = typeof sp.genre === "string" ? sp.genre : "";
  const sort = typeof sp.sort === "string" ? sp.sort : "popular";
  const page = Math.max(1, Number(sp.page) || 1);

  const data = await discover(type, { genre, sortId: sort, page });
  const results = data.results ?? [];

  const isTv = type === "tv";
  const label = isTv ? "Series" : "Movies";

  return (
    <div className="shell pt-(--header-h) pb-8">
      <header className="pt-12 sm:pt-16">
        <p className="eyebrow text-chit-600">Browse</p>
        <h1 className="display mt-2 text-4xl text-ink-100 sm:text-5xl">{label}</h1>
        <p className="mt-3 max-w-md text-[13.5px] leading-relaxed text-ink-400">
          Filter by category, then sort by what matters to you.
        </p>
      </header>

      <div className="mt-8 border-y border-ink-800/80 py-5">
        {/* FilterBar reads filters from the URL via useSearchParams. */}
        <Suspense fallback={<div className="h-32" />}>
          <FilterBar
            mediaType={type}
            total={data.total_results}
            resultLabel={isTv ? "series" : "movies"}
          />
        </Suspense>
      </div>

      {results.length === 0 ? (
        <EmptyState isTv={isTv} />
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {results.map((item) => (
            <PosterCard key={item.id} item={item} mediaType={type} className="w-full" />
          ))}
        </div>
      )}

      {results.length > 0 && (data.total_pages ?? 1) > 1 && (
        <Pagination
          type={type}
          page={page}
          totalPages={Math.min(data.total_pages, 500)}
          params={sp}
        />
      )}
    </div>
  );
}

function EmptyState({ isTv }) {
  return (
    <div className="mt-20 flex flex-col items-center text-center">
      <div className="grid size-14 place-items-center rounded-full border border-ink-700 bg-ink-850/60">
        <span className="font-display text-2xl text-ink-500">&mdash;</span>
      </div>
      <p className="mt-5 font-display text-2xl text-ink-200">Nothing here</p>
      <p className="mt-2 max-w-xs text-[13px] leading-relaxed text-ink-400">
        No {isTv ? "series" : "movies"} match those filters. Try another category.
      </p>
    </div>
  );
}

function buildHref(type, page, params) {
  const next = new URLSearchParams();
  if (typeof params.genre === "string" && params.genre) next.set("genre", params.genre);
  if (typeof params.sort === "string" && params.sort && params.sort !== "popular") {
    next.set("sort", params.sort);
  }
  if (page > 1) next.set("page", String(page));
  const query = next.toString();
  return query ? `/browse/${type}?${query}` : `/browse/${type}`;
}

function Pagination({ type, page, totalPages, params }) {
  // Show a narrow window around the current page rather than every number.
  const pages = [];
  for (let p = Math.max(1, page - 2); p <= Math.min(totalPages, page + 2); p += 1) {
    pages.push(p);
  }

  const base =
    "rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-[background-color,color,border-color] duration-200 ease-[var(--ease-standard)]";

  return (
    <nav className="mt-16 flex flex-wrap items-center justify-center gap-1.5" aria-label="Pagination">
      <a
        href={buildHref(type, Math.max(1, page - 1), params)}
        aria-disabled={page <= 1}
        className={`${base} ${
          page <= 1
            ? "pointer-events-none border border-ink-800 text-ink-500"
            : "border border-ink-700 text-ink-300 hover:border-ink-600 hover:bg-ink-800 hover:text-ink-100"
        }`}
      >
        Prev
      </a>

      {pages[0] > 1 && <span className="px-1 text-ink-500">&hellip;</span>}

      {pages.map((p) => (
        <a
          key={p}
          href={buildHref(type, p, params)}
          aria-current={p === page ? "page" : undefined}
          className={`${base} tabular-nums ${
            p === page
              ? "border border-chit-500/50 bg-chit-500/15 text-chit-300"
              : "border border-ink-700 text-ink-300 hover:border-ink-600 hover:bg-ink-800 hover:text-ink-100"
          }`}
        >
          {p}
        </a>
      ))}

      {pages[pages.length - 1] < totalPages && <span className="px-1 text-ink-500">&hellip;</span>}

      <a
        href={buildHref(type, Math.min(totalPages, page + 1), params)}
        aria-disabled={page >= totalPages}
        className={`${base} ${
          page >= totalPages
            ? "pointer-events-none border border-ink-800 text-ink-500"
            : "border border-ink-700 text-ink-300 hover:border-ink-600 hover:bg-ink-800 hover:text-ink-100"
        }`}
      >
        Next
      </a>
    </nav>
  );
}