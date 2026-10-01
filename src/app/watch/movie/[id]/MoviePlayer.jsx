"use client";

import { useState, useEffect } from "react";
import PlayerFrame from "@/components/PlayerFrame";
import ProviderSwitcher from "@/components/ProviderSwitcher";
import { movieEmbedUrl } from "@/lib/embed";
import { getDefaultProvider, getProvider } from "@/lib/providers";

const STORAGE_KEY = "cinescope-provider";

export default function MoviePlayer({ tmdbId, title, poster }) {
  const [provider, setProvider] = useState(getDefaultProvider().id);
  const [isClient, setIsClient] = useState(false);

  // Load saved provider from localStorage
  useEffect(() => {
    setIsClient(true);
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setProvider(saved);
    }
  }, []);

  const handleProviderChange = (newProvider) => {
    setProvider(newProvider);
    localStorage.setItem(STORAGE_KEY, newProvider);
  };

  const src = movieEmbedUrl(tmdbId, provider);
  const providerData = getProvider(provider);

  return (
    <>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[13px] font-medium text-amber-400/90 animate-pulse">
          <svg 
            className="size-4 shrink-0" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
            />
          </svg>
          <span>
            Not working? Try switching provider
          </span>
        </p>
        
        {isClient && (
          <ProviderSwitcher
            currentProvider={provider}
            onChange={handleProviderChange}
          />
        )}
      </div>

      <div className="mobile-player-container mt-2 aspect-video w-full overflow-hidden rounded-2xl border border-ink-800 bg-black [box-shadow:var(--elev-4)]">
        {src ? (
          <PlayerFrame
            src={src}
            title={title}
            poster={poster}
            label={`Loading ${title}`}
            provider={providerData}
          />
        ) : (
          <div className="grid size-full place-items-center p-6 text-center text-[13px] text-ink-400">
            This title cannot be played right now.
          </div>
        )}
      </div>

      {/* Ad blocking notice */}
      <div className="mt-6 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
        <div className="flex items-start gap-3">
          <svg 
            className="size-5 shrink-0 text-amber-400 mt-0.5" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
            strokeWidth={2}
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
            />
          </svg>
          <div className="flex-1 min-w-0">
            <h3 className="text-[13px] font-semibold text-amber-300 mb-1">
              Getting popup ads or redirects?
            </h3>
            <p className="text-[12px] leading-relaxed text-amber-200/80 mb-2">
              Third-party players inject ads that redirect you away. We can&apos;t block them directly due to browser security.
            </p>
            <button
              type="button"
              onClick={() => handleProviderChange("cinesrc")}
              className="group mb-3 flex w-full items-center justify-between gap-2 rounded-md border border-amber-500/25 bg-amber-500/10 px-2.5 py-1.5 text-left text-[11.5px] leading-relaxed text-amber-300 transition-all duration-200 hover:border-amber-400/40 hover:bg-amber-500/20 hover:text-amber-200 active:scale-[0.99]"
            >
              <span className="flex items-center gap-1.5">
                <span className="shrink-0 text-amber-400">⚡</span>
                <span>
                  <span className="font-medium text-amber-200">Tip:</span> Switch to{" "}
                  <strong className="font-semibold text-amber-100 underline decoration-amber-400/60 underline-offset-2">
                    CineSrc
                  </strong>{" "}
                  &mdash; defaultly protected by Chitralipi Blocker to vaporize popups &amp; redirects!
                </span>
              </span>
              {provider === "cinesrc" ? (
                <span className="shrink-0 rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-300">
                  Active
                </span>
              ) : (
                <span className="shrink-0 rounded bg-amber-500/30 px-1.5 py-0.5 text-[10px] font-semibold text-amber-200 group-hover:bg-amber-500/40">
                  Select
                </span>
              )}
            </button>
            <a 
              href="/adblock"
              className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/20 px-3 py-1.5 text-[11px] font-medium text-amber-300 transition-all duration-200 hover:bg-amber-500/30 hover:text-amber-200"
            >
              <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              Install Ad Blocker (Free)
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
