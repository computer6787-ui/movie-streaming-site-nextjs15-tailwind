"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Staged scroll-in animation.
 *
 * A single shared IntersectionObserver flips `data-shown` on each child when
 * it enters the viewport. Every child uses the same observer, so a page with
 * 40 posters still only costs one observer.
 *
 * The contract is that this component owns both halves of the pair: it stamps
 * `reveal` + `data-reveal` onto the children it renders, and it observes
 * exactly that attribute. Callers never add either by hand.
 *
 * Why not pure CSS `animation`? Because the entrance should fire once, on
 * entry, and must not replay when an element merely re-enters from below. The
 * observer gives that for free.
 *
 * The `mounted` flag is what makes the whole thing safe: `.reveal` starts at
 * `opacity: 0`, so anything that fails to reach `data-shown` would be
 * invisible. Pre-hydration we render children plainly and untouched, and if
 * this never hydrates at all (no JS, or an error), the markup is still the
 * unmarked original -- visible.
 */
export default function Reveal({ children, as: Tag = "div", className = "", step = 60, ...rest }) {
  const ref = useRef(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Keyed on `mounted`: the targets only exist on the second render, so an
  // empty-dependency effect would observe a detached node and never fire.
  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const targets = Array.from(root.querySelectorAll("[data-reveal]"));
    if (targets.length === 0) return;

    const showAll = () => targets.forEach((el) => el.setAttribute("data-shown", "true"));

    // No IO, or the reader asked for less movement: reveal everything at once.
    // The CSS reduced-motion block also neutralises the transition, so this
    // lands as an instant, non-animated appearance.
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced || typeof IntersectionObserver === "undefined") {
      showAll();
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-shown", "true");
          io.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.01 },
    );

    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [mounted]);

  // Pre-hydration the observer cannot run, so render children plainly.
  if (!mounted) {
    return (
      <Tag className={className} {...rest}>
        {children}
      </Tag>
    );
  }

  return (
    <Tag ref={ref} className={className} {...rest}>
      {Array.isArray(children)
        ? children.map((child, i) => {
            if (!child || typeof child !== "object" || !("props" in child)) return child;
            return {
              ...child,
              props: {
                ...child.props,
                "data-reveal": "",
                className: `${child.props.className ?? ""} reveal`.trim(),
                style: { ...(child.props.style ?? {}), "--reveal-delay": `${i * step}ms` },
              },
            };
          })
        : children}
    </Tag>
  );
}
