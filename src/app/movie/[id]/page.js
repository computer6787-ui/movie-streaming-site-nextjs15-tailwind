import { notFound } from "next/navigation";
import IntentLink from "@/components/IntentLink";
import { Shelf } from "@/components/PosterCard";
import { IconCalendar, IconClock, IconPlay, IconStar } from "@/components/icons";
import {
  IMG,
  TmdbError,
  formatDate,
  formatRuntime,
  movieDetail,
  scoreOf,
  titleOf,
} from "@/lib/tmdb";

export const revalidate = 3600;

export async function generateMetadata({ params }) {
  const { id } = await params;
  try {
    const movie = await movieDetail(id);
    return { title: titleOf(movie), description: movie.overview?.slice(0, 160) };
  } catch {
    return { title: "Movie" };
  }
}

export default async function MoviePage({ params }) {
  // Next 15 makes `params` a Promise; it must be awaited.
  const { id } = await params;

  let movie;
  try {
    movie = await movieDetail(id);
  } catch (error) {
    if (error instanceof TmdbError && error.status === 404) notFound();
    throw error;
  }

  const score = scoreOf(movie);
  const released = formatDate(movie.release_date);
  const runtime = formatRuntime(movie.runtime);
  const trailer = (movie.videos?.results ?? []).find(
    (v) => v.site === "YouTube" && v.type === "Trailer",
  );

  const facts = [
    movie.status && { label: "Status", value: movie.status },
    released && { label: "Released", value: released },
    runtime && { label: "Runtime", value: runtime },
    movie.original_language && {
      label: "Language",
      value: movie.original_language.toUpperCase(),
    },
  ].filter(Boolean);

  return (
    <div className="shell pt-(--header-h) pb-10">
      {/* Full-bleed backdrop, then the content on top. The art runs edge to
          edge so the page opens like a lobby card. */}
      <div className="relative">
        {IMG.backdrop(movie.backdrop_path, "w1280") && (
          <img
            src={IMG.backdrop(movie.backdrop_path, "w1280")}
            alt=""
            className="backdrop-settle absolute inset-0 -z-10 size-full object-cover opacity-45"
          />
        )}
        <div className="scrim-bleed absolute inset-0 -z-10" />
        <div className="scrim-left absolute inset-0 -z-10" />

        <div className="enter grid gap-7 pt-12 pb-8 sm:pt-16 sm:pb-10 md:grid-cols-[12rem_1fr] md:gap-9 md:pb-14">
          <div className="w-36 sm:w-44 md:w-full">
            {IMG.poster(movie.poster_path, "w500") ? (
              <img
                src={IMG.poster(movie.poster_path, "w500")}
                alt={`${titleOf(movie)} poster`}
                className="poster-img aspect-2/3 w-full rounded-[14px] border border-ink-700/70 object-cover [box-shadow:var(--elev-4)]"
              />
            ) : (
              <div className="grid aspect-2/3 w-full place-items-center rounded-[14px] border border-ink-700/70 bg-ink-850 p-2 text-center text-[11px] text-ink-400">
                No poster
              </div>
            )}
          </div>

          <div className="min-w-0 self-end">
            <p className="eyebrow text-chit-600">Feature film</p>
            <h1 className="display mt-2 text-[30px] text-ink-100 sm:text-[42px] lg:text-[52px]">
              {titleOf(movie)}
            </h1>
            {movie.tagline && (
              <p className="mt-2.5 text-[13.5px] text-ink-300 italic">{movie.tagline}</p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-x-3.5 gap-y-2 text-[12.5px] text-ink-300">
              {score && (
                <span className="inline-flex items-center gap-1.5 font-semibold text-gold-400">
                  <IconStar className="size-3.5" />
                  <span className="tnum">{score}</span>
                  <span className="font-normal text-ink-400 tnum">
                    ({movie.vote_count?.toLocaleString() ?? 0})
                  </span>
                </span>
              )}
              {runtime && (
                <span className="inline-flex items-center gap-1.5">
                  <IconClock className="size-3.5" />
                  {runtime}
                </span>
              )}
              {released && (
                <span className="inline-flex items-center gap-1.5">
                  <IconCalendar className="size-3.5" />
                  {released}
                </span>
              )}
            </div>

            {movie.genres?.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {movie.genres.map((g) => (
                  <IntentLink
                    key={g.id}
                    href={`/browse/movie?genre=${g.id}`}
                    className="rounded-full border border-ink-700 bg-ink-900/60 px-2.5 py-1 text-[11.5px] font-medium text-ink-200 transition-[background-color,color,border-color] duration-200 ease-[var(--ease-standard)] hover:border-chit-500/45 hover:bg-ink-850 hover:text-chit-300"
                  >
                    {g.name}
                  </IntentLink>
                ))}
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              {/* The primary call to action, and the single most latency-sensitive
                  link on the site: this used to be a plain anchor, which opted
                  out of the App Router entirely and cost a full document
                  reload on the very click that is most expected to be instant. */}
              <IntentLink
                href={`/watch/movie/${movie.id}`}
                className="inline-flex items-center gap-2 rounded-xl bg-ink-100 px-5 py-2.5 text-[13.5px] font-semibold text-ink-950 [box-shadow:var(--elev-3)] transition-[transform,background-color,box-shadow] duration-200 ease-[var(--ease-emphasised)] hover:-translate-y-0.5 hover:bg-white hover:[box-shadow:var(--elev-4)] active:translate-y-0"
              >
                <IconPlay className="size-4" />
                Watch now
              </IntentLink>
              {trailer && (
                <a
                  href={`https://www.youtube.com/watch?v=${trailer.key}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-2 rounded-xl border border-ink-600 bg-ink-900/60 px-5 py-2.5 text-[13.5px] font-semibold text-ink-100 backdrop-blur-sm transition-[transform,background-color,border-color] duration-200 ease-[var(--ease-emphasised)] hover:-translate-y-0.5 hover:border-ink-500 hover:bg-ink-850 active:translate-y-0"
                >
                  Trailer
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-3 lg:gap-12">
        <div className="lg:col-span-2">
          <h2 className="eyebrow text-chit-600">Synopsis</h2>
          <p className="prose-measure mt-3 text-[14px] text-ink-300">
            {movie.overview || "No overview available."}
          </p>
        </div>

        <aside className="space-y-8">
          {facts.length > 0 && (
            <dl className="plate rounded-xl p-5">
              {facts.map((fact) => (
                <div
                  key={fact.label}
                  className="flex justify-between gap-4 border-b border-ink-800/80 py-2.5 text-[12.5px] first:pt-0 last:border-b-0 last:pb-0"
                >
                  <dt className="shrink-0 text-ink-400">{fact.label}</dt>
                  <dd className="text-right font-medium text-ink-100">{fact.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {movie.credits?.cast?.length > 0 && <Cast credits={movie.credits} />}
        </aside>
      </div>

      {movie.similar?.results?.length > 0 && (
        <Shelf title="More like this" items={movie.similar.results} mediaType="movie" />
      )}
    </div>
  );
}

function Cast({ credits }) {
  return (
    <div>
      <h2 className="eyebrow text-chit-600">Cast</h2>
      <ul className="mt-3 space-y-2.5">
        {credits.cast.slice(0, 8).map((person) => (
          <li key={person.id} className="flex items-center gap-3">
            {IMG.profile(person.profile_path) ? (
              <img
                src={IMG.profile(person.profile_path)}
                alt=""
                loading="lazy"
                className="size-9 shrink-0 rounded-full border border-ink-700 object-cover"
              />
            ) : (
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ink-800 text-[11px] text-ink-400">
                {person.name?.[0] ?? "?"}
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate text-[12.5px] font-medium text-ink-100">
                {person.name}
              </span>
              <span className="block truncate text-[11.5px] text-ink-400">{person.character}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
