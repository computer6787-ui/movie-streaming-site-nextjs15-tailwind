import Link from "next/link";
import { notFound } from "next/navigation";
import { IconArrowLeft, IconChevronRight } from "@/components/icons";
import { tvEmbedUrl } from "@/lib/embed";
import { seasonDetail, titleOf, tvDetail } from "@/lib/tmdb";

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
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
          <p className="mt-0.5 text-[12.5px] text-ink-400">
            Season {seasonNumber}, Episode {episodeNumber}
            {current?.name ? ` · ${current.name}` : ""}
          </p>
        </div>
        <Link
          href={`/tv/${id}`}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-ink-850 px-3 py-2 text-[12.5px] font-medium text-ink-200 ring-1 ring-ink-700 transition-colors hover:bg-ink-800 hover:text-white"
        >
          <IconArrowLeft className="size-4" />
          Back to series
        </Link>
      </div>

      <div className="mt-4 aspect-video w-full overflow-hidden rounded-xl bg-black ring-1 ring-ink-700">
        {src ? (
          <iframe
            key={src}
            src={src}
            title={`${title} — Season ${seasonNumber}, Episode ${episodeNumber}`}
            className="size-full"
            allowFullScreen
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            referrerPolicy="origin-when-cross-origin"
            loading="lazy"
          />
        ) : (
          <div className="grid size-full place-items-center p-6 text-center text-[13px] text-ink-400">
            This episode cannot be played right now.
          </div>
        )}
      </div>

      {current?.overview && (
        <p className="mt-4 max-w-3xl text-[13px] leading-relaxed text-ink-300">
          {current.overview}
        </p>
      )}

      {(prev || next) && (
        <nav className="mt-6 flex items-center justify-between gap-3" aria-label="Episode navigation">
          {prev ? (
            <Link
              href={`/watch/tv/${id}/${seasonNumber}/${prev.episode_number}`}
              className="group min-w-0 rounded-xl bg-ink-900 p-3 ring-1 ring-ink-700 transition-colors hover:bg-ink-850"
            >
              <span className="flex items-center gap-1 text-[11px] font-semibold tracking-wide text-ink-400 uppercase">
                <IconChevronRight className="size-3 rotate-180" />
                Previous
              </span>
              <span className="mt-1 block truncate text-[12.5px] text-ink-100">
                E{prev.episode_number} · {prev.name}
              </span>
            </Link>
          ) : (
            <span />
          )}

          {next && (
            <Link
              href={`/watch/tv/${id}/${seasonNumber}/${next.episode_number}`}
              className="group min-w-0 rounded-xl bg-ink-900 p-3 text-right ring-1 ring-ink-700 transition-colors hover:bg-ink-850"
            >
              <span className="flex items-center justify-end gap-1 text-[11px] font-semibold tracking-wide text-ink-400 uppercase">
                Next
                <IconChevronRight className="size-3" />
              </span>
              <span className="mt-1 block truncate text-[12.5px] text-ink-100">
                E{next.episode_number} · {next.name}
              </span>
            </Link>
          )}
        </nav>
      )}

      <p className="mt-6 text-[12px] text-ink-500">
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
