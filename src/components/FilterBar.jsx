"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { GENRES, SORTS } from "@/lib/tmdb";
import { IconClose } from "@/components/icons";

/**
 * Genre + sort filters for the browse pages.
 *
 * State lives in the URL so a filtered view can be linked and survives a
 * reload. Changing a control resets `page` - keeping the old page number with
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

  // One control vocabulary for both axes. Selected = filled accent, the
  // resting state = a flat plate, so the two are never confused at a glance.
  const chip = (active) =>
    `rounded-full px-3.5 py-1.5 text-[12.5px] font-medium whitespace-nowrap transition-[background-color,color,border-color,transform] duration-200 ease-[var(--ease-standard)] active:scale-[0.97] ${
      active
        ? "border border-chit-500/50 bg-chit-500/15 text-chit-300"
        : "border border-ink-700 bg-ink-850/60 text-ink-300 hover:border-ink-600 hover:bg-ink-800 hover:text-ink-100"
    }`;

  return (
    <div className="space-y-4">
      {/* Sort */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="eyebrow mr-1 text-ink-400">Sort</span>
        {SORTS.map((sort) => {
          const active = activeSort === sort.id;
          return (
            <button
              key={sort.id}
              type="button"
              onClick={() => apply({ sort: sort.id === "popular" ? "" : sort.id })}
              aria-pressed={active}
              className={chip(active)}
            >
              {sort.label}
            </button>
          );
        })}
      </div>

      {/* Genres */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="eyebrow mr-1 text-ink-400">Genre</span>
        <button
          type="button"
          onClick={() => apply({ genre: "" })}
          aria-pressed={activeGenre === ""}
          className={chip(activeGenre === "")}
        >
          All
        </button>

        {genres.map((genre) => {
          const active = activeGenre === String(genre.id);
          return (
            <button
              key={genre.id}
              type="button"
              onClick={() => apply({ genre: String(genre.id) })}
              aria-pressed={active}
              className={chip(active)}
            >
              {genre.name}
            </button>
          );
        })}
      </div>

      {/* Result count + clear */}
      <div className="flex min-h-6 flex-wrap items-center gap-3 text-[12px] text-ink-400">
        {typeof total === "number" && (
          <span className="tnum">
            <span className="font-semibold text-ink-200">{total.toLocaleString()}</span>{" "}
            {resultLabel}
          </span>
        )}
        {activeGenre && (
          <button
            type="button"
            onClick={() => apply({ genre: "" })}
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-ink-400 transition-colors duration-200 hover:bg-ink-800 hover:text-ink-100"
          >
            <IconClose className="size-3" />
            Clear genre
          </button>
        )}
      </div>
    </div>
  );
}