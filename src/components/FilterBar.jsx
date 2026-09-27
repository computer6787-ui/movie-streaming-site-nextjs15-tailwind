"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { GENRES, SORTS } from "@/lib/tmdb";
import { IconClose, IconFilter } from "@/components/icons";

/**
 * Genre + sort filters for the browse pages.
 *
 * State lives in the URL so a filtered view can be linked and survives a
 * reload. Changing a control resets `page` — keeping the old page number with
 * new filters lands you on an empty grid.
 */
export default function FilterBar({ mediaType, total, resultLabel = "titles" }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const genres = GENRES[mediaType] ?? [];
  const activeGenre = params.get("genre") ?? "";
  const activeSort = params.get("sort") ?? "popular";

  function apply(updates) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value) next.delete(key);
      else next.set(key, value);
    }
    next.delete("page"); // new filters => start from page 1
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <div className="space-y-4">
      {/* Sort */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-ink-400 uppercase">
          <IconFilter className="size-3.5" />
          Sort
        </span>
        {SORTS.map((sort) => {
          const active = activeSort === sort.id;
          return (
            <button
              key={sort.id}
              type="button"
              onClick={() => apply({ sort: sort.id === "popular" ? "" : sort.id })}
              aria-pressed={active}
              className={`rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                active
                  ? "bg-chit-500/15 text-chit-400 ring-1 ring-chit-500/40"
                  : "bg-ink-850 text-ink-300 ring-1 ring-ink-700 hover:bg-ink-800 hover:text-ink-100"
              }`}
            >
              {sort.label}
            </button>
          );
        })}
      </div>

      {/* Genres */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => apply({ genre: "" })}
          aria-pressed={activeGenre === ""}
          className={`rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
            activeGenre === ""
              ? "bg-chit-500/15 text-chit-400 ring-1 ring-chit-500/40"
              : "bg-ink-850 text-ink-300 ring-1 ring-ink-700 hover:bg-ink-800 hover:text-ink-100"
          }`}
        >
          All genres
        </button>

        {genres.map((genre) => {
          const active = activeGenre === String(genre.id);
          return (
            <button
              key={genre.id}
              type="button"
              onClick={() => apply({ genre: String(genre.id) })}
              aria-pressed={active}
              className={`rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                active
                  ? "bg-chit-500/15 text-chit-400 ring-1 ring-chit-500/40"
                  : "bg-ink-850 text-ink-300 ring-1 ring-ink-700 hover:bg-ink-800 hover:text-ink-100"
              }`}
            >
              {genre.name}
            </button>
          );
        })}
      </div>

      {/* Result count + clear */}
      <div className="flex min-h-6 items-center gap-3 text-[12px] text-ink-400">
        {typeof total === "number" && (
          <span>
            <span className="font-semibold text-ink-200">{total.toLocaleString()}</span>{" "}
            {resultLabel}
          </span>
        )}
        {activeGenre && (
          <button
            type="button"
            onClick={() => apply({ genre: "" })}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-100"
          >
            <IconClose className="size-3" />
            Clear genre
          </button>
        )}
      </div>
    </div>
  );
}
