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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">{label}</h1>
      <p className="mt-1 text-[13px] text-ink-400">
        Filter by category, then sort by what matters to you.
      </p>

      <div className="mt-6">
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
        <p className="mt-16 text-center text-[14px] text-ink-400">
          Nothing matches those filters. Try another category.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-x-3.5 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {results.map((item) => (
            <div key={item.id} className="w-full">
              <PosterCard item={item} mediaType={type} className="w-full" />
            </div>
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

  return (
    <nav className="mt-12 flex items-center justify-center gap-1.5" aria-label="Pagination">
      <a
        href={buildHref(type, Math.max(1, page - 1), params)}
        aria-disabled={page <= 1}
        className={`rounded-lg px-3 py-1.5 text-[13px] font-medium ${
          page <= 1 ? "pointer-events-none text-ink-600" : "text-ink-300 hover:bg-ink-800"
        }`}
      >
        Prev
      </a>

      {pages[0] > 1 && <span className="px-1 text-ink-600">…</span>}

      {pages.map((p) => (
        <a
          key={p}
          href={buildHref(type, p, params)}
          aria-current={p === page ? "page" : undefined}
          className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
            p === page
              ? "bg-cine-500/15 text-cine-400 ring-1 ring-cine-500/40"
              : "text-ink-300 hover:bg-ink-800"
          }`}
        >
          {p}
        </a>
      ))}

      {pages[pages.length - 1] < totalPages && <span className="px-1 text-ink-600">…</span>}

      <a
        href={buildHref(type, Math.min(totalPages, page + 1), params)}
        aria-disabled={page >= totalPages}
        className={`rounded-lg px-3 py-1.5 text-[13px] font-medium ${
          page >= totalPages ? "pointer-events-none text-ink-600" : "text-ink-300 hover:bg-ink-800"
        }`}
      >
        Next
      </a>
    </nav>
  );
}
