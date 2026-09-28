import Link from "next/link";
import { notFound } from "next/navigation";
import PlayerFrame from "@/components/PlayerFrame";
import { IconArrowLeft, IconChevronRight } from "@/components/icons";
import { tvEmbedUrl } from "@/lib/embed";
import { IMG, seasonDetail, titleOf, tvDetail } from "@/lib/tmdb";

export const revalidate = 3600;

/** A positive integer, or null. Guards against `1.5`, `abc`, `-1`. */
function positiveInt(raw) {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function generateMetadata({ params }) {
  const { id, season, episode } = await params;
  try {
    const show = await tvDetail(id);
    return {
      title: `Watch ${titleOf(show)} S${Number(season)}E${Number(episode)}`,
    };
  } catch {
    return { title: "Watch" };
  }
}

export default async function WatchEpisode({ params }) {
  const { id, season: rawSeason, episode: rawEpisode } = await params;

  const seasonNumber = positiveInt(rawSeason);
  const episodeNumber = positiveInt(rawEpisode);
  if (!seasonNumber || !episodeNumber) notFound();

  // Built from the validated numbers, so the iframe src can never disagree
  // with the season/episode shown in the UI.
  const src = tvEmbedUrl(id, seasonNumber, episodeNumber);

  // Metadata is decorative: a failure here must not block playback.
  const [show, seasonData] = await Promise.all([
    tvDetail(id).catch(() => null),
    seasonDetail(id, seasonNumber).catch(() => null),
  ]);

  const episodes = seasonData?.episodes ?? [];
  const current = episodes.find((e) => e.episode_number === episodeNumber) ?? null;
  const index = episodes.findIndex((e) => e.episode_number === episodeNumber);

  // Previous/next only exist when the episode is actually in this season.
  const prev = index > 0 ? episodes[index - 1] : null;
  const next = index >= 0 && index < episodes.length - 1 ? episodes[index + 1] : null;

  const title = show ? titleOf(show) : "Series";

  return (
    <div className="shell pt-(--header-h) pb-10">
      <div className="flex flex-wrap items-end justify-between gap-4 pt-10 sm:pt-14">
        <div className="min-w-0">
          <Link
            href={`/tv/${id}`}
            className="group inline-flex items-center gap-1.5 text-[12.5px] text-ink-400 transition-colors duration-200 hover:text-ink-100"
          >
            <span className="inline-block transition-transform duration-300 ease-[var(--ease-emphasised)] group-hover:-translate-x-0.5">
              <IconArrowLeft className="size-3.5" />
            </span>
            Back to series
          </Link>
          <h1 className="display mt-2 truncate text-[26px] text-ink-100 sm:text-[34px]">
            {title}
          </h1>
          <p className="mt-1 text-[12.5px] text-ink-400">
            <span className="tnum">
              Season {seasonNumber}, Episode {episodeNumber}
            </span>
            {current?.name ? ` · ${current.name}` : ""}
          </p>
        </div>
        <p className="eyebrow shrink-0 text-chit-600">Now screening</p>
      </div>

      <div className="mt-5 aspect-video w-full overflow-hidden rounded-2xl border border-ink-800 bg-black [box-shadow:var(--elev-4)]">
        {src ? (
          <PlayerFrame
            src={src}
            title={`${title} — Season ${seasonNumber}, Episode ${episodeNumber}`}
            poster={IMG.backdrop(show?.backdrop_path)}
            label={`Loading S${seasonNumber} · E${episodeNumber}`}
          />
        ) : (
          <div className="grid size-full place-items-center p-6 text-center text-[13px] text-ink-400">
            This episode cannot be played right now.
          </div>
        )}
      </div>

      {current?.overview && (
        <div className="mt-8">
          <h2 className="eyebrow text-chit-600">Synopsis</h2>
          <p className="prose-measure mt-3 text-[13.5px] text-ink-300">{current.overview}</p>
        </div>
      )}

      {(prev || next) && (
        <nav className="mt-10 grid gap-3 sm:grid-cols-2" aria-label="Episode navigation">
          {prev ? (
            <Link
              href={`/watch/tv/${id}/${seasonNumber}/${prev.episode_number}`}
              className="group plate min-w-0 rounded-xl p-4 transition-[transform,border-color] duration-200 ease-[var(--ease-emphasised)] hover:-translate-y-0.5 hover:border-ink-600"
            >
              <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.12em] text-ink-400 uppercase transition-colors duration-200 group-hover:text-chit-400">
                <span className="inline-block transition-transform duration-300 ease-[var(--ease-emphasised)] group-hover:-translate-x-0.5">
                  <IconChevronRight className="size-3 rotate-180" />
                </span>
                Previous
              </span>
              <span className="mt-1.5 block truncate text-[12.5px] text-ink-100 tnum">
                E{prev.episode_number} · {prev.name}
              </span>
            </Link>
          ) : (
            <span />
          )}

          {next && (
            <Link
              href={`/watch/tv/${id}/${seasonNumber}/${next.episode_number}`}
              className="group plate min-w-0 rounded-xl p-4 text-right transition-[transform,border-color] duration-200 ease-[var(--ease-emphasised)] hover:-translate-y-0.5 hover:border-ink-600"
            >
              <span className="flex items-center justify-end gap-1.5 text-[11px] font-semibold tracking-[0.12em] text-ink-400 uppercase transition-colors duration-200 group-hover:text-chit-400">
                Next
                <span className="inline-block transition-transform duration-300 ease-[var(--ease-emphasised)] group-hover:translate-x-0.5">
                  <IconChevronRight className="size-3" />
                </span>
              </span>
              <span className="mt-1.5 block truncate text-[12.5px] text-ink-100 tnum">
                E{next.episode_number} · {next.name}
              </span>
            </Link>
          )}
        </nav>
      )}

      <p className="mt-10 max-w-[70ch] text-[12px] leading-relaxed text-ink-500">
        Playback is provided by an embedded third-party player. If you see popups or fake
        download buttons,{" "}
        <Link href="/adblock" className="text-chit-400 underline underline-offset-2">
          install the ad blocker
        </Link>
        .
      </p>
    </div>
  );
}
