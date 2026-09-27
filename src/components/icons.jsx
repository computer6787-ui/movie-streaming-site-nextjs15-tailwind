/**
 * Inline SVG icons.
 *
 * The project has no icon dependency, and adding one for ~12 glyphs is not
 * worth the install. Each is a plain 24px stroke path so they inherit
 * `currentColor` and size from the surrounding text.
 */

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  viewBox: "0 0 24 24",
  "aria-hidden": true,
};

export function IconSearch({ className = "size-4" }) {
  return (
    <svg {...base} className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function IconPlay({ className = "size-4" }) {
  return (
    <svg {...base} fill="currentColor" stroke="none" className={className}>
      <path d="M8 5.5v13l11-6.5z" />
    </svg>
  );
}

export function IconStar({ className = "size-3.5" }) {
  return (
    <svg {...base} fill="currentColor" stroke="currentColor" strokeWidth={1} className={className}>
      <path d="M12 3.6l2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8z" />
    </svg>
  );
}

export function IconFilter({ className = "size-4" }) {
  return (
    <svg {...base} className={className}>
      <path d="M3 5h18M6 12h12M10 19h4" />
    </svg>
  );
}

export function IconGrid({ className = "size-4" }) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function IconChevronRight({ className = "size-4" }) {
  return (
    <svg {...base} className={className}>
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

export function IconArrowLeft({ className = "size-4" }) {
  return (
    <svg {...base} className={className}>
      <path d="M19 12H5m0 0 6-6m-6 6 6 6" />
    </svg>
  );
}

export function IconClose({ className = "size-4" }) {
  return (
    <svg {...base} className={className}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function IconCalendar({ className = "size-3.5" }) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

export function IconClock({ className = "size-3.5" }) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

/** The series glyph used on cards and detail pages. */
export function IconTv({ className = "size-3.5" }) {
  return (
    <svg {...base} className={className}>
      <rect x="2" y="7" width="20" height="13" rx="2" />
      <path d="m8 3 4 4 4-4" />
    </svg>
  );
}
