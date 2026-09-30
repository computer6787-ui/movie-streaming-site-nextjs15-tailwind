"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import SearchForm from "@/components/SearchForm";
import RouteProgress from "@/components/RouteProgress";
import IntentLink from "@/components/IntentLink";
import { IconClose, IconGrid, IconSearch } from "@/components/icons";

/**
 * The one media-type switcher. "All" is the mixed catalogue on the home page;
 * the other two are the two TMDB discovers. The search page keeps its own
 * type tabs, but the bar does not: two switches for the same axis, stacked
 * under a fixed-height header, is how you get a row of pills hanging halfway
 * out of the nav.
 */
const NAV = [
  { href: "/", label: "All" },
  { href: "/browse/movie", label: "Movies" },
  { href: "/browse/tv", label: "Series" },
];

/**
 * The top chrome.
 *
 * Three states, one bar: transparent at the top of the page (so hero artwork
 * runs to the very top edge like a printed poster), solid once scrolled past
 * the fold, and a full sheet on small screens.
 */
export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock the page behind the drawer, and close it on Escape.
  useEffect(() => {
    if (!drawer) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && setDrawer(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [drawer]);

  // Which switcher entry owns the current path.
  //
  //   /                     -> All
  //   /browse/movie, /movie  -> Movies   (detail pages too)
  //   /browse/tv,    /tv     -> Series
  //
  // Player routes are matched by their first real segment, so a watch page
  // still lights up the catalogue it belongs to instead of going blank.
  function currentKey() {
    if (pathname === "/") return "/";
    if (pathname.startsWith("/watch/")) {
      // "/watch/tv/1399/1/2".split("/") -> ["", "watch", "tv", ...], so the
      // type is slot 2. Slot 3 is the media id, which is never "tv" anyway.
      const type = pathname.split("/")[2];
      return type === "tv" ? "/browse/tv" : "/browse/movie";
    }
    if (pathname.startsWith("/movie")) return "/browse/movie";
    if (pathname.startsWith("/tv")) return "/browse/tv";
    if (pathname === "/browse" || pathname.startsWith("/browse/")) return pathname;
    return null;
  }

  // `null` means no entry owns this page (/search, /adblock) -- nothing lights.
  const current = currentKey();
  const isCurrent = (href) => href === current;

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color] duration-500 ease-[var(--ease-standard)] ${
          scrolled || drawer
            ? "border-b border-ink-800/80 bg-ink-950/85 backdrop-blur-xl"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        <div className="shell flex h-(--header-h) items-center gap-4">
          <IntentLink href="/" className="group flex shrink-0 items-center gap-2.5" aria-label="Chitralipi home">
            <span className="grid size-8 place-items-center rounded-[10px] bg-linear-to-br from-chit-300 via-chit-500 to-chit-600 text-ink-950 shadow-[0_2px_10px_-2px_rgba(217,162,83,0.5)] transition-transform duration-300 ease-[var(--ease-emphasised)] group-hover:scale-105">
              <IconGrid className="size-4.5" />
            </span>
            <span className="font-display text-[19px] leading-none tracking-tight text-ink-100">
              Chitralipi
            </span>
          </IntentLink>

          {/* Desktop: inline search. Mobile: the icon routes to /search.
              SearchForm reads useSearchParams, so it needs a Suspense
              boundary or every page that renders this header fails to
              prerender.

              `hideTabs` matters here. The bar is a fixed h-(--header-h) row
              that centres its children; without it SearchForm also renders a
              second line of type pills, which overflows the bar and hangs
              halfway out of the nav. The switcher lives in the nav instead. */}
          <div className="hidden min-w-0 flex-1 justify-center md:flex">
            <div className="w-full max-w-md">
              <Suspense fallback={<div className="h-9" />}>
                <SearchForm hideTabs />
              </Suspense>
            </div>
          </div>

          <nav className="ml-auto flex shrink-0 items-center gap-1 md:ml-0">
            {NAV.map((item) => {
              const current = isCurrent(item.href);
              return (
                <IntentLink
                  key={item.href}
                  href={item.href}
                  aria-current={current ? "page" : undefined}
                  className={`rounded-lg px-3 py-2 text-[13px] font-medium transition-colors duration-200 ease-[var(--ease-standard)] ${
                    current
                      ? "bg-ink-800/80 text-ink-100"
                      : "text-ink-400 hover:bg-ink-800/70 hover:text-ink-100"
                  }`}
                >
                  {item.label}
                </IntentLink>
              );
            })}

            <IntentLink
              href="/search"
              className="rounded-lg p-2 text-ink-300 transition-colors duration-200 hover:bg-ink-800/70 hover:text-ink-100 md:hidden"
              aria-label="Search"
            >
              <IconSearch className="size-4.5" />
            </IntentLink>

            <button
              type="button"
              onClick={() => setDrawer((v) => !v)}
              className="rounded-lg p-2 text-ink-200 transition-colors duration-200 hover:bg-ink-800/70 md:hidden"
              aria-label={drawer ? "Close menu" : "Open menu"}
              aria-expanded={drawer}
            >
              {drawer ? <IconClose className="size-5" /> : <MenuIcon className="size-5" />}
            </button>
          </nav>
        </div>

        {/* The route progress bar. Inside the fixed header so it is always on
            screen and never takes part in layout: it is absolutely positioned
            against the bar's own bottom edge.

            No Suspense boundary is needed here, unlike SearchForm above. The
            bar subscribes to the loading boundaries rather than reading the
            router, so it has no static-generation bailout to opt out of. */}
        <RouteProgress />
      </header>

      {/* Small-screen sheet. Rendered after the bar so it stacks above. */}
      <div
        className={`fixed inset-0 z-40 md:hidden ${drawer ? "" : "pointer-events-none"}`}
        aria-hidden={!drawer}
      >
        <button
          type="button"
          tabIndex={drawer ? 0 : -1}
          onClick={() => setDrawer(false)}
          aria-label="Close menu"
          className={`absolute inset-0 bg-ink-950/70 backdrop-blur-sm transition-opacity duration-300 ease-[var(--ease-standard)] ${
            drawer ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          className={`absolute inset-x-0 top-(--header-h) border-b border-ink-800 bg-ink-950/95 px-(--gutter) pb-8 pt-5 backdrop-blur-xl transition-all duration-300 ease-[var(--ease-emphasised)] ${
            drawer ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0"
          }`}
        >
          <nav className="flex flex-col" aria-label="Mobile">
            {NAV.map((item) => {
              const current = isCurrent(item.href);
              return (
                <IntentLink
                  key={item.href}
                  href={item.href}
                  onClick={() => setDrawer(false)}
                  aria-current={current ? "page" : undefined}
                  className={`flex items-center justify-between border-b border-ink-800/70 py-4 font-display text-2xl transition-colors ${
                    current ? "text-chit-400" : "text-ink-100 hover:text-chit-400"
                  }`}
                >
                  {item.label}
                  {current && <span className="size-1.5 rounded-full bg-chit-500" />}
                </IntentLink>
              );
            })}
            <IntentLink
              href="/search"
              onClick={() => setDrawer(false)}
              className="border-b border-ink-800/70 py-4 font-display text-2xl text-ink-100 transition-colors hover:text-chit-400"
            >
              Search
            </IntentLink>
          </nav>
          <p className="mt-6 text-[11.5px] leading-relaxed text-ink-400">
            Metadata &amp; artwork from TMDB. Not endorsed or certified by TMDB.
          </p>
        </div>
      </div>
    </>
  );
}

/** Two strokes. Mirrors the 2px rhythm of the bar. */
function MenuIcon({ className = "size-5" }) {
  return (
    <svg
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
    >
      <path d="M4 8h16M4 16h16" />
    </svg>
  );
}