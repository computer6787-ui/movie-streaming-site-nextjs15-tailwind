import Link from "next/link";
import { IMG, kindOf, scoreOf, titleOf, yearOf } from "@/lib/tmdb";
import { IconChevronRight, IconPlay, IconStar, IconTv } from "@/components/icons";
import Rail from "@/components/Rail";

/**
 * The poster tile used by every grid and rail on the site.
 *
 * `item` is a TMDB movie or TV object. `mediaType` is only needed for the
 * endpoints that omit `media_type` (discover results), so callers pass it
 * explicitly there. `className` lets a grid override the intrinsic width that
 * the horizontal shelves rely on.
 *
 * The tile is a fixed-ratio frame; the artwork scales *inside* it on hover, so
 * lifting the card never resizes the layout box or shifts its neighbours.
 */
export default function PosterCard({
  item,
  mediaType,
  className = "",
  priority = false,
  showMeta = true,
}) {
  const kind = mediaType ?? kindOf(item);
  const href = kind === "tv" ? `/tv/${item.id}` : `/movie/${item.id}`;
  const title = titleOf(item);
  const year = yearOf(item);
  const score = scoreOf(item);
  const poster = IMG.poster(item.poster_path);

  return (
    <Link
      href={href}
      className={`group block ${className || "w-[9.5rem] sm:w-[10.5rem] lg:w-[11.5rem]"}`}
      aria-label={`${title}${year ? `, ${year}` : ""}`}
    >
      {/* Hairline via `border`, not `ring`: both write `box-shadow`, so
          combining them would silently drop one. This way `box-shadow` is
          free for elevation alone. */}
      <div
        className="card-lift relative aspect-2/3 overflow-hidden rounded-[14px] border border-ink-700/80 bg-ink-850 [box-shadow:var(--elev-2)] transition-[border-color,box-shadow] duration-200 ease-[var(--ease-standard)] group-hover:border-chit-500/45 group-hover:[box-shadow:var(--elev-3)]"
      >
        {poster ? (
          <img
            src={poster}
            alt=""
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            className="poster-img size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center p-3 text-center text-[11px] leading-snug text-ink-400">
            {title}
          </div>
        )}

        {/* Scrim: keeps the badges legible over any artwork. */}
        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-ink-950/85 via-ink-950/10 to-ink-950/35" />

        {/* A warm follow-spot that only appears on hover, under the play cue. */}
        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-chit-600/25 to-transparent opacity-0 transition-opacity duration-300 ease-[var(--ease-standard)] group-hover:opacity-100" />

        {kind === "tv" && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-md bg-ink-950/75 px-1.5 py-0.5 text-[9.5px] font-semibold tracking-[0.08em] text-ink-200 uppercase backdrop-blur-sm">
            <IconTv className="size-2.5 text-chit-400" />
            Series
          </span>
        )}

        {score && (
          <span className="absolute top-2 right-2 inline-flex items-center gap-0.5 rounded-md bg-ink-950/75 px-1.5 py-0.5 text-[10.5px] font-semibold text-gold-300 tabular-nums backdrop-blur-sm">
            <IconStar className="size-2.5" />
            {score}
          </span>
        )}

        {/* Play cue: the whole card is the link, so this is decorative only. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 grid place-items-center opacity-0 transition-opacity duration-300 ease-[var(--ease-standard)] group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          <span className="grid size-11 place-items-center rounded-full bg-ink-950/55 text-ink-100 ring-1 ring-white/25 backdrop-blur-md">
            <IconPlay className="size-4 translate-x-px" />
          </span>
        </span>
      </div>

      {showMeta && (
        <>
          <h3 className="clamp-2 mt-2.5 text-[12.5px] leading-snug font-medium text-ink-200 transition-colors duration-200 group-hover:text-ink-100">
            {title}
          </h3>
          {year && <p className="mt-0.5 text-[11px] text-ink-400 tabular-nums">{year}</p>}
        </>
      )}
    </Link>
  );
}
/**
 * The section heading used above every rail.
 *
 * An eyebrow line (the row's kicker) over a serif title, with a quiet
 * "see all" affordance on the right. The hairline under it is the only
 * horizontal rule in the system, and it is deliberately very low contrast.
 */
export function SectionHead({ title, kicker, href, cta = "See all" }) {
  return (
    <div className="mb-1 flex items-end justify-between gap-6">
      <div className="min-w-0">
        {kicker && <p className="eyebrow text-chit-600">{kicker}</p>}
        <h2 className="display mt-1 text-[22px] text-ink-100 sm:text-[26px]">
          <Link href={href ?? "#"} className="transition-colors duration-200 hover:text-chit-300">
            {title}
          </Link>
        </h2>
      </div>

      {href && (
        <Link
          href={href}
          className="group/cta mb-1 flex shrink-0 items-center gap-1.5 text-[12.5px] font-medium text-ink-300 transition-colors duration-200 ease-[var(--ease-standard)] hover:text-chit-400"
        >
          {cta}
          <span className="inline-block transition-transform duration-300 ease-[var(--ease-emphasised)] group-hover/cta:translate-x-1">
            <IconChevronRight className="size-3.5" />
          </span>
        </Link>
      )}
    </div>
  );
}

/** A labelled row of posters that scrolls horizontally on small screens. */
export function Shelf({ title, href, items, mediaType, kicker }) {
  if (!items?.length) return null;

  return (
    <section className="mt-14 sm:mt-16">
      <SectionHead title={title} kicker={kicker} href={href} />
      <Rail>
        {items.map((item) => (
          <PosterCard key={`${item.id}-${item.media_type ?? mediaType}`} item={item} mediaType={mediaType} />
        ))}
      </Rail>
    </section>
  );
}