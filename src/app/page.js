import { homeSections, trending, titleOf, detailHref, IMG } from "@/lib/tmdb";
import { Shelf } from "@/components/PosterCard";
import { IconPlay, IconStar } from "@/components/icons";

export const revalidate = 3600;

export default async function Home() {
  // The hero and the rows are independent, so fetch them together.
  const [sections, trendingData] = await Promise.all([homeSections(), trending("all")]);

  const [hero] = trendingData.results ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
      {hero && (
        <section className="relative mt-6 overflow-hidden rounded-2xl border border-ink-700/70">
          {IMG.backdrop(hero.backdrop_path, "original") && (
            <img
              src={IMG.backdrop(hero.backdrop_path, "original")}
              alt=""
              className="absolute inset-0 size-full object-cover opacity-45"
              fetchPriority="high"
            />
          )}
          <div className="absolute inset-0 bg-linear-to-t from-ink-950 via-ink-950/85 to-ink-950/40" />

          <div className="relative px-6 py-14 sm:px-10 sm:py-20">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-chit-500/15 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-chit-400 uppercase ring-1 ring-chit-500/30">
              Trending this week
            </span>
            <h1 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-5xl">
              {titleOf(hero)}
            </h1>
            <p className="clamp-2 mt-3 max-w-xl text-[13.5px] leading-relaxed text-ink-300">
              {hero.overview}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <a
                href={detailHref(hero)}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink-950 transition-colors hover:bg-ink-200"
              >
                <IconPlay className="size-4" />
                View details
              </a>
              {hero.vote_average > 0 && (
                <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-gold-400">
                  <IconStar className="size-3.5" />
                  {hero.vote_average.toFixed(1)}
                  <span className="text-ink-400">/ 10</span>
                </span>
              )}
            </div>
          </div>
        </section>
      )}

      <Shelf
        title="Popular Movies"
        href="/browse/movie"
        items={sections.popularMovies.results}
        mediaType="movie"
      />
      <Shelf
        title="Popular Series"
        href="/browse/tv"
        items={sections.popularTv.results}
        mediaType="tv"
      />
      <Shelf
        title="Top Rated Movies"
        href="/browse/movie?sort=top_rated"
        items={sections.topMovies.results}
        mediaType="movie"
      />
      <Shelf
        title="Top Rated Series"
        href="/browse/tv?sort=top_rated"
        items={sections.topTv.results}
        mediaType="tv"
      />
    </div>
  );
}
