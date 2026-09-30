import Link from "next/link";
import { homeSections, trending, titleOf, yearOf, kindOf, IMG } from "@/lib/tmdb";
import { Shelf } from "@/components/PosterCard";
import { IconChevronRight, IconPlay, IconStar } from "@/components/icons";

export const revalidate = 3600;

export default async function Home() {
  // The hero and the rows are independent, so fetch them together.
  const [sections, trendingData] = await Promise.all([homeSections(), trending("all")]);

  const [hero] = trendingData.results ?? [];
  // w1280, not "original". The hero is full-bleed so it does want a large
  // image, but for this artwork TMDB's original is ~950 KB against ~126 KB at
  // w1280: 87% of the bytes are thrown away for pixels the object-cover crop
  // and the two scrims never show. w780 would be visibly soft at hero size.
  // IMG.backdrop already defaults to w1280; stated here to make the intent explicit.
  const backdrop = hero ? IMG.backdrop(hero.backdrop_path, "w1280") : "";

  return (
    <div className="pb-6">
      {hero && (
        <section className="relative isolate min-h-[78svh] overflow-hidden sm:min-h-[86svh]">
          {/* Artwork. Slow Ken Burns drift gives the page a pulse without
              ever moving the layout. */}
          {backdrop && (
            <img
              src={backdrop}
              alt=""
              fetchPriority="high"
              decoding="async"
              className="absolute inset-0 size-full scale-105 object-cover object-[50%_20%] [animation:hero-drift_28s_ease-in-out_infinite_alternate]"
            />
          )}

          {/* Two scrims: one grounds the bottom into the page, one protects
              the type column. Combined they keep the artwork readable
              without flattening it. */}
          <div className="scrim-bleed absolute inset-0" />
          <div className="scrim-left absolute inset-0" />

          <div className="shell relative flex min-h-[78svh] items-end pt-(--header-h) pb-14 sm:min-h-[86svh] sm:pb-20">
            <div className="max-w-xl enter">
              <span className="eyebrow inline-flex items-center gap-2 text-chit-400">
                <span className="inline-block h-px w-6 bg-chit-500/60" />
                Trending this week
              </span>

              <h1 className="display mt-4 text-5xl text-ink-100 sm:text-6xl lg:text-7xl">
                {titleOf(hero)}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12.5px] text-ink-300">
                {hero.vote_average > 0 && (
                  <span className="inline-flex items-center gap-1.5 font-medium text-gold-300 tabular-nums">
                    <IconStar className="size-3.5" />
                    {hero.vote_average.toFixed(1)}
                  </span>
                )}
                {yearOf(hero) && <span className="tabular-nums">{yearOf(hero)}</span>}
                <span className="text-ink-400">{kindOf(hero) === "tv" ? "Series" : "Film"}</span>
              </div>

              {hero.overview && (
                <p className="clamp-3 prose-measure mt-4 text-[14px] text-ink-300 sm:text-[15px]">
                  {hero.overview}
                </p>
              )}

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href={kindOf(hero) === "tv" ? `/tv/${hero.id}` : `/movie/${hero.id}`}
                  className="group inline-flex items-center gap-2 rounded-full bg-chit-500 px-5 py-2.5 text-[13.5px] font-semibold text-ink-950 shadow-[0_4px_20px_-4px_rgba(217,162,83,0.5)] transition-[background-color,transform,box-shadow] duration-200 ease-[var(--ease-standard)] hover:bg-chit-400 active:scale-[0.98]"
                >
                  <IconPlay className="size-3.5" />
                  View details
                </Link>

                <Link
                  href="/browse/movie"
                  className="inline-flex items-center gap-1.5 rounded-full border border-ink-600/70 bg-ink-950/40 px-5 py-2.5 text-[13.5px] font-medium text-ink-200 backdrop-blur-sm transition-[background-color,color,border-color] duration-200 ease-[var(--ease-standard)] hover:border-ink-500 hover:bg-ink-900/60 hover:text-ink-100"
                >
                  Browse all
                  <IconChevronRight className="size-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="shell">
        <Shelf
          title="Popular Movies"
          kicker="On now"
          href="/browse/movie"
          items={sections.popularMovies.results}
          mediaType="movie"
        />
        <Shelf
          title="Popular Series"
          kicker="On now"
          href="/browse/tv"
          items={sections.popularTv.results}
          mediaType="tv"
        />
        <Shelf
          title="Top Rated Movies"
          kicker="Critic approved"
          href="/browse/movie?sort=top_rated"
          items={sections.topMovies.results}
          mediaType="movie"
        />
        <Shelf
          title="Top Rated Series"
          kicker="Critic approved"
          href="/browse/tv?sort=top_rated"
          items={sections.topTv.results}
          mediaType="tv"
        />
      </div>
    </div>
  );
}