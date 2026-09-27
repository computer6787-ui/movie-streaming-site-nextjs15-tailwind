import Link from "next/link";
import { IMG, kindOf, scoreOf, titleOf, yearOf } from "@/lib/tmdb";
import { IconStar, IconTv } from "@/components/icons";

/**
 * The poster tile used by every grid on the site.
 *
 * `item` is a TMDB movie or TV object. `mediaType` is only needed for the
 * endpoints that omit `media_type` (discover results), so callers pass it
 * explicitly there. `className` lets a grid override the intrinsic width that
 * the horizontal shelves rely on.
 */
export default function PosterCard({ item, mediaType, className = "", priority = false }) {
  const kind = mediaType ?? kindOf(item);
  const href = kind === "tv" ? `/tv/${item.id}` : `/movie/${item.id}`;
  const title = titleOf(item);
  const year = yearOf(item);
  const score = scoreOf(item);
  const poster = IMG.poster(item.poster_path);

  return (
    <Link
      href={href}
      className={`group relative block shrink-0 ${
        className || "w-[9.5rem] sm:w-[10.5rem] lg:w-[11.5rem]"
      }`}
      aria-label={`${title}${year ? `, ${year}` : ""}`}
    >
      <div className="card-hover relative aspect-2/3 overflow-hidden rounded-xl bg-ink-800 ring-1 ring-ink-700/60 group-hover:ring-2 group-hover:ring-chit-500/70 group-hover:shadow-[0_10px_30px_-8px_rgba(0,0,0,0.85)]">
        {poster ? (
          <img
            src={poster}
            alt=""
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center p-2 text-center text-[11px] text-ink-400">
            {title}
          </div>
        )}

        {/* Scrim: keeps the badges legible over any artwork. */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/85 via-transparent to-ink-950/25" />

        {kind === "tv" && (
          <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-md bg-ink-950/80 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-chit-400 backdrop-blur-sm">
            <IconTv className="size-3" />
            SERIES
          </span>
        )}

        {score && (
          <span className="absolute top-1.5 right-1.5 inline-flex items-center gap-0.5 rounded-md bg-ink-950/80 px-1.5 py-0.5 text-[11px] font-semibold text-gold-400 backdrop-blur-sm">
            <IconStar className="size-2.5" />
            {score}
          </span>
        )}
      </div>

      <h3 className="mt-2 line-clamp-2 text-[12.5px] leading-snug font-medium text-ink-200 transition-colors group-hover:text-white">
        {title}
      </h3>
      {year && <p className="mt-0.5 text-[11px] text-ink-400">{year}</p>}
    </Link>
  );
}

/** A labelled row of posters that scrolls horizontally on small screens. */
export function Shelf({ title, href, items, mediaType }) {
  if (!items?.length) return null;

  return (
    <section className="mt-10">
      <div className="mb-3.5 flex items-end justify-between gap-4 px-1">
        <h2 className="text-[15px] font-semibold tracking-tight text-ink-100">{title}</h2>
        {href && (
          <Link
            href={href}
            className="shrink-0 text-[12px] font-medium text-chit-400 transition-colors hover:text-chit-300"
          >
            See all →
          </Link>
        )}
      </div>
      <div className="shelf px-1">
        {items.map((item) => (
          <PosterCard key={`${item.id}-${item.media_type ?? mediaType}`} item={item} mediaType={mediaType} />
        ))}
      </div>
    </section>
  );
}
