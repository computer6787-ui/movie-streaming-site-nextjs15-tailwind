import { notFound } from "next/navigation";
import { Shelf } from "@/components/PosterCard";
import { IconClock, IconPlay, IconStar } from "@/components/icons";
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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="relative overflow-hidden rounded-2xl border border-ink-700/70">
        {IMG.backdrop(movie.backdrop_path, "original") && (
          <img
            src={IMG.backdrop(movie.backdrop_path, "original")}
            alt=""
            className="absolute inset-0 size-full object-cover opacity-40"
          />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-ink-950 via-ink-950/90 to-ink-950/50" />

        <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-end sm:p-8">
          <div className="w-40 shrink-0 sm:w-48">
            {IMG.poster(movie.poster_path, "w500") ? (
              <img
                src={IMG.poster(movie.poster_path, "w500")}
                alt={`${titleOf(movie)} poster`}
                className="aspect-2/3 w-full rounded-xl object-cover ring-1 ring-ink-600/60"
              />
            ) : (
              <div className="grid aspect-2/3 w-full place-items-center rounded-xl bg-ink-800 p-2 text-center text-[11px] text-ink-400">
                No poster
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-4xl">
              {titleOf(movie)}
            </h1>
            {movie.tagline && (
              <p className="mt-1.5 text-[13.5px] text-ink-300 italic">{movie.tagline}</p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-x-3.5 gap-y-2 text-[12.5px] text-ink-300">
              {score && (
                <span className="inline-flex items-center gap-1.5 font-semibold text-gold-400">
                  <IconStar className="size-3.5" />
                  {score}
                  <span className="font-normal text-ink-400">
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
            </div>

            {movie.genres?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {movie.genres.map((g) => (
                  <a
                    key={g.id}
                    href={`/browse/movie?genre=${g.id}`}
                    className="rounded-lg bg-ink-800/80 px-2.5 py-1 text-[11.5px] font-medium text-ink-200 ring-1 ring-ink-700 transition-colors hover:bg-ink-700 hover:text-white"
                  >
                    {g.name}
                  </a>
                ))}
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href={`/watch/movie/${movie.id}`}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink-950 transition-colors hover:bg-ink-200"
              >
                <IconPlay className="size-4" />
                Watch now
              </a>
              {trailer && (
                <a
                  href={`https://www.youtube.com/watch?v=${trailer.key}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-2 rounded-xl bg-ink-800/90 px-5 py-2.5 text-[13.5px] font-semibold text-ink-100 ring-1 ring-ink-600 transition-colors hover:bg-ink-700"
                >
                  Trailer
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="text-[15px] font-semibold">Overview</h2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-300">
            {movie.overview || "No overview available."}
          </p>
        </div>

        <aside className="space-y-5">
          {facts.length > 0 && (
            <dl className="space-y-2.5 rounded-xl border border-ink-700/70 bg-ink-900/60 p-4">
              {facts.map((fact) => (
                <div key={fact.label} className="flex justify-between gap-4 text-[12.5px]">
                  <dt className="text-ink-400">{fact.label}</dt>
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
      <h2 className="text-[15px] font-semibold">Cast</h2>
      <ul className="mt-3 space-y-2.5">
        {credits.cast.slice(0, 8).map((person) => (
          <li key={person.id} className="flex items-center gap-3">
            {IMG.profile(person.profile_path) ? (
              <img
                src={IMG.profile(person.profile_path)}
                alt=""
                loading="lazy"
                className="size-9 shrink-0 rounded-full object-cover ring-1 ring-ink-700"
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
