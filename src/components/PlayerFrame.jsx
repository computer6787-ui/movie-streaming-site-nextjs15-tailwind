"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IconPlay } from "@/components/icons";

/**
 * The embedded player, wrapped in a loading state.
 *
 * The provider is a cross-origin iframe, so the same-origin policy means we
 * cannot read anything inside it. The <iframe> `load` event is the only
 * "the document finished" signal available from here, and it fires once the
 * player's own page and scripts have loaded — the frame is interactive by
 * then. Everything before that is a black box, which is what this fills.
 *
 * The skeleton sits ON TOP of the iframe and fades out on load, rather than
 * the iframe fading in over a skeleton behind it. Two reasons:
 *   1. The skeleton is in the server-rendered HTML, so it paints on the very
 *      first frame. Fading the iframe in instead would show a black box first
 *      and only then swap to the skeleton once JS hydrates — the exact blank
 *      screen this component exists to remove.
 *   2. It is `pointer-events-none`, so clicks always reach the player. The
 *      overlay can never swallow a click on a play button it does not own.
 *
 * Do not add `sandbox` here. The provider refuses to render inside a
 * sandboxed frame and playback fails outright (see docs/ADBLOCK.md).
 */

/**
 * Drops the overlay if the load event never arrives (blocked, offline). Without
 * this the skeleton would sit over a permanently black frame. `pointer-events-none`
 * means the player stays clickable either way -- this only stops the visuals
 * from lingering.
 */
const SAFETY_TIMEOUT_MS = 15000;

/**
 * Hide the decorative play button early so it does not overlap the real one.
 * The player iframe renders its controls within ~500ms, before the load event
 * fires. We fade just the icon once the frame is likely interactive, while
 * keeping the status text visible until the actual load completes.
 */
const ICON_FADE_DELAY_MS = 500;

export default function PlayerFrame({
  src,
  title,
  poster = null,
  label = "Loading player",
}) {
  // Starts `false` so the skeleton is present in the server-rendered HTML.
  const [loaded, setLoaded] = useState(false);
  const [iconVisible, setIconVisible] = useState(true);
  const timer = useRef(null);
  const iconTimer = useRef(null);

  const handleLoad = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (iconTimer.current) {
      clearTimeout(iconTimer.current);
      iconTimer.current = null;
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    // A new src (next episode) is a new document: show the skeleton again.
    setLoaded(false);
    setIconVisible(true);
    timer.current = setTimeout(() => setLoaded(true), SAFETY_TIMEOUT_MS);
    iconTimer.current = setTimeout(() => setIconVisible(false), ICON_FADE_DELAY_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      if (iconTimer.current) clearTimeout(iconTimer.current);
    };
  }, [src]);

  return (
    <div className="relative size-full">
      <iframe
        key={src}
        src={src}
        title={title}
        onLoad={handleLoad}
        className="size-full"
        allowFullScreen
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
        referrerPolicy="origin-when-cross-origin"
        loading="lazy"
      />

      {/* Decorative overlay. Never interactive, gone the moment it loads. */}
      <div
        data-player-skeleton=""
        aria-hidden={loaded}
        className={`pointer-events-none absolute inset-0 select-none transition-opacity duration-500 ease-out ${
          loaded ? "invisible opacity-0" : "visible opacity-100"
        }`}
      >
        {/* Poster, blurred up, or the palette gradient when there is none. */}
        {poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={poster}
            alt=""
            className="absolute inset-0 size-full scale-110 object-cover opacity-30 blur-xl"
          />
        ) : (
          /* Warm graphite, from the page's own surfaces -- the fallback must
             belong to the same palette as the room around it, not a cold one. */
          <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_0%,#1a1a1f_0%,#0e0e11_55%,#08080a_100%)]" />
        )}

        {/* Sweep of light moving across the frame. */}
        <div className="player-skeleton-sweep absolute inset-0" />

        {/* Center: pulsing play badge over the title and status. */}
        <div className="relative grid size-full place-items-center px-6">
          <div className="flex max-w-full flex-col items-center gap-3">
            <span
              className={`player-skeleton-badge grid size-14 place-items-center rounded-full border border-chit-500/25 bg-ink-900/70 text-chit-400 backdrop-blur-sm transition-opacity duration-300 ${
                iconVisible ? "opacity-100" : "opacity-0"
              }`}
            >
              <IconPlay className="size-5 translate-x-px" />
            </span>
            <p className="max-w-full truncate text-[12.5px] font-medium text-ink-300">
              {label}
            </p>
            <p
              role="status"
              aria-live="polite"
              className="flex items-center gap-1.5 text-[11px] text-ink-500"
            >
              <span className="player-skeleton-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              Connecting to the source
            </p>
          </div>
        </div>

        {/* Indeterminate progress line along the bottom edge. */}
        <div className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-ink-800">
          <div className="player-skeleton-bar h-full w-1/3 bg-gradient-to-r from-transparent via-chit-500 to-transparent" />
        </div>
      </div>

      <noscript>
        <style>{`[data-player-skeleton]{display:none!important}`}</style>
      </noscript>
    </div>
  );
}
