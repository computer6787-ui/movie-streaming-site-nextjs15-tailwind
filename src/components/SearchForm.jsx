"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { IconClose, IconSearch } from "@/components/icons";

const TABS = [
  { id: "all", label: "All" },
  { id: "movie", label: "Movies" },
  { id: "tv", label: "Series" },
];

/**
 * Search box with a media-type filter.
 *
 * Submitting (or switching type) pushes `/search?q=...&type=...` so results are
 * server-rendered and shareable. The text is held locally while typing so we
 * do not push a history entry per keystroke; it is pushed on submit.
 */
export default function SearchForm({ autoFocus = false, initialType = "all", hideTabs = false }) {
  const router = useRouter();
  const params = useSearchParams();
  const [term, setTerm] = useState("");
  const [type, setType] = useState(initialType);

  // Keep the field in step with the URL on back/forward navigation.
  useEffect(() => {
    setTerm(params.get("q") ?? "");
    setType(params.get("type") ?? "all");
  }, [params]);

  function go(nextTerm, nextType) {
    const q = (nextTerm ?? term).trim();
    if (!q) {
      router.push("/search");
      return;
    }
    const query = new URLSearchParams({ q, type: nextType ?? type });
    router.push(`/search?${query}`);
  }

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        go();
      }}
      className="w-full"
    >
      {/* `border` for the hairline, `box-shadow` for the focus halo, so the
          two never overwrite each other. */}
      <div className="group flex items-center gap-2.5 rounded-full border border-ink-700 bg-ink-850/70 py-1.5 pr-1.5 pl-3.5 transition-[background-color,border-color,box-shadow] duration-200 ease-[var(--ease-standard)] focus-within:border-chit-500/70 focus-within:bg-ink-850 focus-within:[box-shadow:0_0_0_4px_rgba(217,162,83,0.13)]">
        <IconSearch className="size-4 shrink-0 text-ink-400 transition-colors duration-200 group-focus-within:text-chit-400" />
        <input
          type="search"
          value={term}
          autoFocus={autoFocus}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search films, series, people…"
          aria-label="Search movies and series"
          className="min-w-0 flex-1 bg-transparent py-1 text-[13.5px] text-ink-100 placeholder:text-ink-400 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {term && (
          <button
            type="button"
            onClick={() => {
              setTerm("");
              term && router.replace("/search");
            }}
            aria-label="Clear search"
            className="grid size-6 shrink-0 place-items-center rounded-full text-ink-400 transition-[background-color,color,transform] duration-200 hover:bg-ink-700 hover:text-ink-100 active:scale-90"
          >
            <IconClose className="size-3" />
          </button>
        )}
        <button
          type="submit"
          className="hidden shrink-0 rounded-full bg-chit-500 px-4 py-1.5 text-[12.5px] font-semibold text-ink-950 shadow-[0_2px_10px_-2px_rgba(217,162,83,0.45)] transition-[background-color,transform,box-shadow] duration-200 ease-[var(--ease-standard)] hover:bg-chit-400 active:scale-[0.97] sm:block"
        >
          Search
        </button>
      </div>

      {!hideTabs && (
        <div className="mt-2.5 flex items-center gap-1" role="group" aria-label="Filter results by type">
          {TABS.map((tab) => {
            const active = type === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setType(tab.id);
                  go(term, tab.id);
                }}
                aria-pressed={active}
                className={`rounded-full px-3 py-1 text-[12px] font-medium transition-[background-color,color] duration-200 ease-[var(--ease-standard)] ${
                  active ? "bg-chit-500/15 text-chit-300 ring-1 ring-chit-500/40" : "text-ink-400 hover:bg-ink-800 hover:text-ink-200"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}
    </form>
  );
}