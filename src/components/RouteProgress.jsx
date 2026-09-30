"use client";

import { useEffect, useRef, useState } from "react";
import { subscribeToNavigation } from "@/lib/nav-state";

/**
 * The route progress bar.
 *
 * Why this exists on its own: skeletons only help when you can predict the
 * destination's layout. A dynamic route like `/movie/[id]` can resolve to a
 * page with a backdrop, a poster, a synopsis, a fact table, a cast list and a
 * recommendation rail -- and on a cold TMDB fetch that is a second or more of
 * nothing. This bar is indifferent to all of it. It says "the router is
 * working" for every transition.
 *
 * The source of truth is the loading boundary, not the URL. The pathname
 * updates as soon as a navigation commits, which is well before the new
 * route's data has finished streaming; driving the bar off the URL makes it
 * reach the end and vanish while the skeleton is still on screen. So the
 * boundary reports its own lifetime through `lib/nav-state`, and this component
 * only renders the answer. See `RouteActivity` for the other end.
 *
 * The crawl is what makes it feel honest rather than fake. A bar that animates
 * to 100% on a timer has to lie, because the router will not tell us the real
 * duration. So it creeps toward 90% and waits there, and only the boundary
 * unmounting moves it the rest of the way. A route that takes four seconds
 * shows a bar that visibly waits; a route that takes 80ms shows a flash. Both
 * are true, which is the point.
 */
export default function RouteProgress() {
  // Two independent signals, deliberately: `intent` from the click, `pending`
  // from the loading boundaries. The bar is up while either is true, and it is
  // only allowed to leave once both say the route has settled.
  const [phase, setPhase] = useState("idle"); // idle | loading | leaving

  const barRef = useRef(null);
  const value = useRef(0);
  const frame = useRef(0);
  const hideTimer = useRef(0);

  // Read inside the subscription callback, which is registered once and must
  // not re-subscribe (and re-read the store) on every state change. A ref is
  // the one way to see current state from a closure that never refreshes.
  const phaseRef = useRef("idle");
  phaseRef.current = phase;

  function write(next) {
    value.current = next;
    if (barRef.current) barRef.current.style.transform = `scaleX(${next})`;
  }

  useEffect(() => {
    const unsubscribe = subscribeToNavigation(({ pending, intent }) => {
      if (pending > 0 || intent) {
        if (phaseRef.current !== "loading") {
          window.clearTimeout(hideTimer.current);
          // A new navigation while the old one is still fading out cancels the
          // fade, so two quick clicks read as one continuous line rather than a
          // bar that blinks off and back on between them.
          if (phaseRef.current === "idle") write(0.04);
          phaseRef.current = "loading";
          setPhase("loading");
        }
        return;
      }

      // Nothing pending and no intent: the route is genuinely ready.
      if (phaseRef.current !== "loading") return;
      phaseRef.current = "leaving";
      setPhase("leaving");

      // Run the bar out to its end, then fade. Held for a beat even when it
      // finishes fast: a bar that appears and vanishes inside 60ms reads as a
      // glitch, and a bar that lingers reads as a hang. ~180ms is the shortest
      // time a user can reliably perceive as a completed action.
      hideTimer.current = window.setTimeout(
        () => {
          write(1);
          hideTimer.current = window.setTimeout(() => {
            phaseRef.current = "idle";
            setPhase("idle");
            write(0);
          }, 260);
        },
        60,
      );
    });

    return () => {
      unsubscribe();
      window.clearTimeout(hideTimer.current);
      cancelAnimationFrame(frame.current);
    };
  }, []);

  // The crawl, written straight to the DOM.
  //
  // The first version of this ran a rAF loop that called `setProgress` every
  // frame and let a CSS transition smooth the result. That is 60 React renders a
  // second to move one div, and the transition then lags the value it is
  // interpolating, so the bar visibly stutters behind its own target. Writing
  // `transform` directly is one style write per frame, no render, and no lag.
  //
  // It creeps toward 90% and waits there. The bar cannot know the real duration,
  // so completing on a timer would be a lie; only the store saying "settled"
  // moves it the rest of the way. A route that takes four seconds shows a bar
  // that visibly waits; a route that takes 80ms shows a flash. Both are true.
  useEffect(() => {
    if (phase === "idle") return;

    const tick = () => {
      if (value.current < 0.9) {
        // Asymptotic approach: the closer it gets, the slower it moves, which is
        // what stops a long wait from reading as stalled.
        write(Math.min(0.9, value.current + (0.9 - value.current) * 0.05));
      }
      frame.current = requestAnimationFrame(tick);
    };

    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [phase]);

  return (
    <div
      className="route-progress"
      data-phase={phase}
      role="progressbar"
      aria-label="Loading page"
      aria-hidden={phase === "idle"}
    >
      <div ref={barRef} className="route-progress-bar" />
    </div>
  );
}
