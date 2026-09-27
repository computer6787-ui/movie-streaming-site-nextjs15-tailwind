import Link from "next/link";
import { notFound } from "next/navigation";
import { Shelf } from "@/components/PosterCard";
import { IconChevronRight, IconPlay, IconStar, IconTv } from "@/components/icons";
import {
  IMG,
  TmdbError,
  formatDate,
  scoreOf,
  seasonDetail,
  titleOf,
  tvDetail,
} from "@/lib/tmdb";

export const revalidate = 3600;

export async function generateMetadata({ params }) {
  const { id } = await params;
  try {
    const show = await tvDetail(id);
    return { title: titleOf(show), description: show.overview?.slice(0, 160) };
  } catch {
    return { title: "Series" };
  }
}

export default async function TvPage({ params }) {
  // Next 15 makes `params` a Promise; it must be awaited.
  const { id } = await params;

  let show;
  try {
    show = await tvDetail(id);
  } catch (error) {
    if (error instanceof TmdbError && error.status === 404) notFound();
    throw error;
  }

  const score = scoreOf(show);
  const trailer = (show.videos?.results ?? []).find(
    (v) => v.site === "YouTube" && v.type === "Trailer",
  );

  // Season 0 holds specials, which are not episodes to watch through; skip it.
  const seasons = (show.seasons ?? []).filter((s) => s.season_number > 0);
  const totalEpisodes = seasons.reduce((sum, s) => sum + (s.episode_count ?? 0), 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="relative overflow-hidden rounded-2xl border border-ink-700/70">
        {IMG.backdrop(show.backdrop_path, "original") && (
          <img
            src={IMG.backdrop(show.backdrop_path, "original")}
            alt=""
            className="absolute inset-0 size-full object-cover opacity-40"
          />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-ink-950 via-ink-950/90 to-ink-950/50" />

        <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-end sm:p-8">
          <div className="w-40 shrink-0 sm:w-48">
            {IMG.poster(show.poster_path, "w500") ? (
              <img
                src={IMG.poster(show.poster_path, "w500")}
                alt={`${titleOf(show)} poster`}
                className="aspect-2/3 w-full rounded-xl object-cover ring-1 ring-ink-600/60"
              />
            ) : (
              <div className="grid aspect-2/3 w-full place-items-center rounded-xl bg-ink-800 p-2 text-center text-[11px] text-ink-400">
                No poster
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-chit-500/15 px-2.5 py-1 text-[10.5px] font-semibold tracking-wide text-chit-400 uppercase ring-1 ring-chit-500/30">
              <IconTv className="size-3" />
              Series
            </span>

            <h1 className="mt-2.5 text-2xl font-bold tracking-tight text-white sm:text-4xl">
              {titleOf(show)}
            </h1>
            {show.tagline && (
              <p className="mt-1.5 text-[13.5px] text-ink-300 italic">{show.tagline}</p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[12.5px] text-ink-300">
              {score && (
                <span className="inline-flex items-center gap-1.5 font-semibold text-gold-400">
                  <IconStar className="size-3.5" />
                  {score}
                  <span className="font-normal text-ink-400">
                    ({show.vote_count?.toLocaleString() ?? 0})
                  </span>
                </span>
              )}
              <span>{show.status}</span>
              {show.first_air_date && <span>{show.first_air_date.slice(0, 4)}</span>}
              {seasons.length > 0 && (
                <span>
                  {seasons.length} {seasons.length === 1 ? "season" : "seasons"}
                </span>
              )}
              {totalEpisodes > 0 && <span>{totalEpisodes} episodes</span>}
            </div>

            {show.genres?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {show.genres.map((g) => (
                  <a
                    key={g.id}
                    href={`/browse/tv?genre=${g.id}`}
                    className="rounded-lg bg-ink-800/80 px-2.5 py-1 text-[11.5px] font-medium text-ink-200 ring-1 ring-ink-700 transition-colors hover:bg-ink-700 hover:text-white"
                  >
                    {g.name}
                  </a>
                ))}
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href={`/watch/tv/${show.id}/1/1`}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink-950 transition-colors hover:bg-ink-200"
              >
                <IconPlay className="size-4" />
                Watch S1E1
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
            {show.overview || "No overview available."}
          </p>

          {seasons.length > 0 && (
            <div className="mt-8">
              <h2 className="text-[15px] font-semibold">Seasons</h2>
              <div className="mt-3 space-y-2">
                {seasons.map((season) => (
                  <SeasonRow key={season.id} showId={show.id} season={season} />
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-5">
          <dl className="space-y-2.5 rounded-xl border border-ink-700/70 bg-ink-900/60 p-4">
            {[
              show.status && { label: "Status", value: show.status },
              show.first_air_date && {
                label: "First aired",
                value: formatDate(show.first_air_date) ?? show.first_air_date,
              },
              show.last_air_date && show.last_air_date !== show.first_air_date && {
                label: "Last aired",
                value: formatDate(show.last_air_date) ?? show.last_air_date,
              },
              show.network?.name && { label: "Network", value: show.network.name },
              show.type && { label: "Type", value: show.type },
            ]
              .filter(Boolean)
              .map((fact) => (
                <div key={fact.label} className="flex justify-between gap-4 text-[12.5px]">
                  <dt className="text-ink-400">{fact.label}</dt>
                  <dd className="text-right font-medium text-ink-100">{fact.value}</dd>
                </div>
              ))}
          </dl>

          {show.credits?.cast?.length > 0 && (
            <div>
              <h2 className="text-[15px] font-semibold">Cast</h2>
              <ul className="mt-3 space-y-2.5">
                {show.credits.cast.slice(0, 6).map((person) => (
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
                      <span className="block truncate text-[11.5px] text-ink-400">
                        {person.character}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      {show.similar?.results?.length > 0 && (
        <Shelf title="More like this" items={show.similar.results} mediaType="tv" />
      )}
    </div>
  );
}

/**
 * One row per season. The episode list is fetched on demand: a long-running
 * series can run to hundreds of episodes, and rendering them all up front would
 * bloat the page for no benefit.
 */
function SeasonRow({ showId, season }) {
  const n = season.season_number;

  return (
    <details className="group rounded-xl border border-ink-700/70 bg-ink-900/50 open:bg-ink-900">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-3.5 text-[13px] font-medium">
        <IconChevronRight className="size-4 shrink-0 text-ink-400 transition-transform group-open:rotate-90" />
        <span className="text-ink-100">{season.name}</span>
        <span className="text-[12px] font-normal text-ink-400">
          {season.episode_count} {season.episode_count === 1 ? "episode" : "episodes"}
        </span>
        {season.air_date && (
          <span className="ml-auto hidden text-[11.5px] font-normal text-ink-500 sm:block">
            {formatDate(season.air_date) ?? season.air_date}
          </span>
        )}
      </summary>

      <EpisodeList showId={showId} seasonNumber={n} />
    </details>
  );
}

async function EpisodeList({ showId, seasonNumber }) {
  let season;
  try {
    season = await seasonDetail(showId, seasonNumber);
  } catch {
    return <p className="px-3.5 pb-3.5 text-[12px] text-ink-400">Could not load episodes.</p>;
  }

  const episodes = season.episodes ?? [];

  return (
    <ul className="space-y-1.5 px-2.5 pb-3">
      {episodes.map((ep) => (
        <li key={ep.id}>
          <Link
            href={`/watch/tv/${showId}/${seasonNumber}/${ep.episode_number}`}
            className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-ink-800"
          >
            {IMG.still(ep.still_path) ? (
              <img
                src={IMG.still(ep.still_path)}
                alt=""
                loading="lazy"
                className="h-12 w-20 shrink-0 rounded-md object-cover ring-1 ring-ink-700"
              />
            ) : (
              <span className="h-12 w-20 shrink-0 rounded-md bg-ink-800" />
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold text-chit-400">
                E{ep.episode_number}
              </span>
              <span className="block truncate text-[12.5px] font-medium text-ink-100">
                {ep.name}
              </span>
              {ep.overview && (
                <span className="clamp-2 mt-0.5 block text-[11.5px] leading-snug text-ink-400">
                  {ep.overview}
                </span>
              )}
            </span>
            {ep.runtime ? (
              <span className="shrink-0 text-[11.5px] text-ink-500">{ep.runtime}m</span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
