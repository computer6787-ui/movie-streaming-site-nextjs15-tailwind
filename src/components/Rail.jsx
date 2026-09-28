"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A horizontally scrolling rail with a right-edge fade that only appears when
 * there is genuinely more content off-screen.
 *
 * The `.shelf` class does the scrolling; this component only measures it. The
 * `scrollend` event is used where supported (it is not in Safari < 18), with
 * a debounced `scroll` listener as the fallback, because firing per scroll
 * frame is what makes naive edge-fades flicker.
 */
export default function Rail({ children, className = "" }) {
  const ref = useRef(null);
  const [overflow, setOverflow] = useState(false);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setOverflow(el.scrollWidth - el.clientWidth - el.scrollLeft > 8);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    measure();

    // Recompute once late webfonts/images have settled the intrinsic widths.
    const settle = setTimeout(measure, 400);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    for (const img of el.querySelectorAll("img")) ro.observe(img);

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);

    return () => {
      clearTimeout(settle);
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  return (
    <div className="rail-fade" data-overflow={overflow}>
      <div ref={ref} className={`shelf ${className}`}>
        {children}
      </div>
    </div>
  );
}