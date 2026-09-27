"use client";

/**
 * The address bar.
 *
 * Handles both URLs and search queries, shows a secure-site indicator, a live
 * loading state, a clear button, and an accent glow on focus. Suggestions come
 * from local history/bookmarks only — nothing is sent anywhere.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Globe, Lock, Search, Star, X, CornerDownLeft, TriangleAlert } from "lucide-react";
import { useBrowserStore } from "@/lib/store/useBrowserStore";
import { isSecure, parseInput, prettyUrl } from "@/lib/browser/url";
import { getEngine } from "@/lib/search/engines";
import { useTransitions } from "@/components/ui/Motion";
import { Favicon } from "@/components/ui/Favicon";
import { Button } from "@/components/ui/Button";

export interface Suggestion {
  kind: "url" | "search" | "history" | "bookmark";
  value: string;
  title: string;
  url: string;
}

interface Props {
  tabId: string;
  url: string;
  status: "idle" | "loading" | "ready" | "error";
  compact?: boolean;
}

export function AddressBar({ tabId, url, status, compact }: Props) {
  const navigate = useBrowserStore((s) => s.navigate);
  const searchEngine = useBrowserStore((s) => s.settings.searchEngine);
  const searchInAddressBar = useBrowserStore((s) => s.settings.searchInAddressBar);
  const history = useBrowserStore((s) => s.history);
  const bookmarks = useBrowserStore((s) => s.bookmarks);
  const addBookmark = useBrowserStore((s) => s.addBookmark);
  const removeBookmark = useBrowserStore((s) => s.removeBookmark);

  const [value, setValue] = useState(url);
  const [focused, setFocused] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const { fast, soft, enabled } = useTransitions();

  // Keep the field in sync with the tab unless the user is actively editing.
  useEffect(() => {
    if (!focused) setValue(url);
  }, [url, focused]);

  const isBookmarked = useMemo(() => bookmarks.some((b) => b.url === url), [bookmarks, url]);

  const suggestions = useMemo<Suggestion[]>(() => {
    const q = value.trim().toLowerCase();
    if (!q || !focused) return [];

    const parsed = parseInput(value, searchInAddressBar);
    const primary: Suggestion[] = [];

    if (parsed.kind === "url" && parsed.url) {
      primary.push({ kind: "url", value: parsed.url, title: parsed.url, url: parsed.url });
    } else if (parsed.kind === "search" && parsed.query) {
      primary.push({ kind: "search", value: parsed.query, title: `Search for “${parsed.query}”`, url: "" });
    }

    const seen = new Set(primary.map((s) => s.url || s.value));
    const matches: Suggestion[] = [];

    for (const b of bookmarks) {
      if (seen.has(b.url)) continue;
      if (b.title.toLowerCase().includes(q) || b.url.toLowerCase().includes(q)) {
        matches.push({ kind: "bookmark", value: b.url, title: b.title, url: b.url });
        seen.add(b.url);
      }
      if (matches.length >= 4) break;
    }

    for (const h of history) {
      if (seen.has(h.url)) continue;
      if (h.title.toLowerCase().includes(q) || h.url.toLowerCase().includes(q)) {
        matches.push({ kind: "history", value: h.url, title: h.title, url: h.url });
        seen.add(h.url);
      }
      if (matches.length >= 8) break;
    }

    return [...primary, ...matches];
  }, [value, focused, history, bookmarks, searchInAddressBar]);

  const commit = useCallback(
    (raw?: string) => {
      const input = (raw ?? value).trim();
      navigate(tabId, input);
      setFocused(false);
      setHighlight(-1);
      inputRef.current?.blur();
    },
    [navigate, tabId, value],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit(suggestions[highlight]?.url || suggestions[highlight]?.value);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setValue(url);
      setFocused(false);
      setHighlight(-1);
      inputRef.current?.blur();
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!suggestions.length) return;
      setHighlight((h) => {
        const next = e.key === "ArrowDown" ? h + 1 : h - 1;
        return next < 0 ? suggestions.length - 1 : next >= suggestions.length ? 0 : next;
      });
    }
  };

  const secure = url ? isSecure(url) : false;
  const parsed = useMemo(() => parseInput(value, true), [value]);
  const willSearch = parsed.kind === "search" && !!parsed.query;

  return (
    <div className="relative flex-1 min-w-0">
      <motion.div
        className="group relative flex h-[var(--bar-h)] items-center gap-2 rounded-xl border px-2.5 transition-colors duration-200"
        style={{
          background: "var(--bg-surface)",
          borderColor: focused
            ? "color-mix(in oklab, var(--accent-from) 45%, transparent)"
            : "var(--border-subtle)",
          boxShadow: focused ? "var(--shadow-md)" : "var(--shadow-sm)",
        }}
        animate={enabled ? { scale: focused ? 1.004 : 1 } : undefined}
        transition={fast}
      >
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
          title={
            url
              ? secure
                ? "Connection is encrypted (https)"
                : "Not a secure connection (http)"
              : "No site loaded"
          }
        >
          {url ? (
            secure ? (
              <Lock className="h-3.5 w-3.5 text-emerald-500" strokeWidth={2.4} />
            ) : (
              <TriangleAlert className="h-3.5 w-3.5 text-amber-500" strokeWidth={2.2} />
            )
          ) : (
            <Globe className="h-3.5 w-3.5 text-muted" strokeWidth={2} />
          )}
        </span>

        <input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setHighlight(-1);
          }}
          onFocus={(e) => {
            setFocused(true);
            e.target.select();
          }}
          onBlur={() => window.setTimeout(() => setFocused(false), 120)}
          onKeyDown={onKeyDown}
          placeholder="Search or enter address"
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          aria-label="Address and search bar"
          className={`min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted ${
            focused || value ? "text-[var(--fg-primary)]" : "text-[var(--fg-secondary)]"
          }`}
        />

        <AnimatePresence initial={false}>
          {status === "loading" && (
            <motion.span
              className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-[var(--border-strong)] border-t-transparent"
              animate={enabled ? { rotate: 360 } : undefined}
              transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
            />
          )}
        </AnimatePresence>

        {value.length > 0 && (
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Clear address"
            onClick={() => {
              setValue("");
              inputRef.current?.focus();
            }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}

        {url && (
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={isBookmarked ? "Remove bookmark" : "Bookmark this page"}
            onClick={() =>
              isBookmarked
                ? removeBookmark(bookmarks.find((b) => b.url === url)!.id)
                : addBookmark({ url })
            }
          >
            <Star className={`h-3.5 w-3.5 ${isBookmarked ? "fill-amber-400 text-amber-400" : ""}`} />
          </Button>
        )}
      </motion.div>

      <AnimatePresence>
        {focused && suggestions.length > 0 && (
          <motion.div
            initial={enabled ? { opacity: 0, y: -6, scale: 0.99 } : false}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={enabled ? { opacity: 0, y: -6, scale: 0.99 } : { opacity: 0 }}
            transition={soft}
            className="absolute top-[calc(100%+6px)] left-0 right-0 z-50 overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] shadow-[var(--shadow-lg)]"
          >
            <ul className="max-h-[320px] overflow-y-auto py-1">
              {suggestions.map((s, i) => (
                <li key={`${s.kind}-${s.value}-${i}`}>
                  <button
                    type="button"
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => commit(s.url || s.value)}
                    className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                      i === highlight ? "bg-[var(--bg-hover)]" : ""
                    }`}
                  >
                    {s.kind === "search" ? (
                      <Search className="h-3.5 w-3.5 shrink-0 text-muted" />
                    ) : (
                      <Favicon url={s.url} size={14} />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-[var(--fg-primary)]">{s.title}</span>
                      {s.kind === "url" && (
                        <span className="block truncate text-[11px] text-muted">Jump to {prettyUrl(s.url)}</span>
                      )}
                    </span>
                    {i === highlight && <CornerDownLeft className="h-3 w-3 shrink-0 text-muted" />}
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t border-[var(--border-subtle)] px-3 py-1.5 text-[10.5px] text-muted">
              <span>Search with {getEngine(searchEngine).name}</span>
              <span className="flex items-center gap-1.5">
                {willSearch && <ArrowRight className="h-3 w-3" />}
                {willSearch ? "Enter to search" : "Enter to open"}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
