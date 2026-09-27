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
 * Submitting (or switching type) pushes `/search?q=…&type=…` so results are
 * server-rendered and shareable. The text is held locally while typing so we
 * do not push a history entry per keystroke; it is pushed on submit.
 */
export default function SearchForm({ autoFocus = false, initialType = "all" }) {
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
      <div className="flex items-center gap-2 rounded-xl border border-ink-700 bg-ink-850/80 px-3 py-1.5 transition-colors focus-within:border-cine-500/70 focus-within:bg-ink-850">
        <IconSearch className="size-4 shrink-0 text-ink-400" />
        <input
          type="search"
          value={term}
          autoFocus={autoFocus}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search movies and series…"
          aria-label="Search movies and series"
          className="min-w-0 flex-1 bg-transparent py-1 text-[13.5px] text-ink-100 placeholder:text-ink-500 focus:outline-none"
        />
        {term && (
          <button
            type="button"
            onClick={() => {
              setTerm("");
              term && router.replace("/search");
            }}
            aria-label="Clear search"
            className="shrink-0 rounded-md p-1 text-ink-400 transition-colors hover:bg-ink-700 hover:text-ink-100"
          >
            <IconClose className="size-3.5" />
          </button>
        )}
        <button
          type="submit"
          className="hidden shrink-0 rounded-lg bg-cine-500 px-3 py-1.5 text-[12.5px] font-semibold text-ink-950 transition-colors hover:bg-cine-400 sm:block"
        >
          Search
        </button>
      </div>

      <div className="mt-2 flex items-center gap-1.5" role="group" aria-label="Filter results by type">
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
              className={`rounded-lg px-2.5 py-1 text-[12px] font-medium transition-colors ${
                active
                  ? "bg-cine-500/15 text-cine-400 ring-1 ring-cine-500/40"
                  : "text-ink-400 hover:bg-ink-800 hover:text-ink-200"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </form>
  );
}
