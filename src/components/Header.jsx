import Link from "next/link";
import { Suspense } from "react";
import SearchForm from "@/components/SearchForm";
import { IconGrid, IconSearch } from "@/components/icons";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-ink-700/70 bg-ink-950/85 backdrop-blur-xl">
      <div className="mx-auto flex h-(--header-h) max-w-7xl items-center gap-3 px-4 sm:gap-5 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-[15px] font-bold tracking-tight"
        >
          <span className="grid size-7 place-items-center rounded-lg bg-linear-to-br from-cine-500 to-cine-600 text-ink-950">
            <IconGrid className="size-4" />
          </span>
          <span className="text-ink-100">Cinescope</span>
        </Link>

        {/* Desktop: inline search. Mobile: the icon links to /search.
            SearchForm reads useSearchParams, so it needs a Suspense boundary
            or every page that renders this header fails to prerender. */}
        <div className="hidden flex-1 justify-center sm:flex">
          <div className="w-full max-w-xl">
            <Suspense fallback={<div className="h-9" />}>
              <SearchForm />
            </Suspense>
          </div>
        </div>

        <nav className="ml-auto flex shrink-0 items-center gap-1 sm:ml-0">
          <Link
            href="/browse/movie"
            className="rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-ink-300 transition-colors hover:bg-ink-800 hover:text-ink-100 sm:px-3"
          >
            Movies
          </Link>
          <Link
            href="/browse/tv"
            className="rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-ink-300 transition-colors hover:bg-ink-800 hover:text-ink-100 sm:px-3"
          >
            Series
          </Link>
          <Link
            href="/search"
            className="rounded-lg p-2 text-ink-300 transition-colors hover:bg-ink-800 hover:text-ink-100 sm:hidden"
            aria-label="Search"
          >
            <IconSearch className="size-4.5" />
          </Link>
        </nav>
      </div>
    </header>
  );
}
