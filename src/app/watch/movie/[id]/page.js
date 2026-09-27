import Link from "next/link";
import { notFound } from "next/navigation";
import { IconArrowLeft } from "@/components/icons";
import { movieEmbedUrl } from "@/lib/embed";
import { movieDetail, titleOf } from "@/lib/tmdb";

export const revalidate = 3600;

export async function generateMetadata({ params }) {
  const { id } = await params;
  try {
    const movie = await movieDetail(id);
    return { title: `Watch ${titleOf(movie)}` };
  } catch {
    return { title: "Watch" };
  }
}

export default async function WatchMovie({ params }) {
  const { id } = await params;

  const movie = await movieDetail(id).catch(() => null);
  if (!movie) notFound();

  const title = titleOf(movie);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
          {movie.release_date && (
            <p className="mt-0.5 text-[12.5px] text-ink-400">
              {movie.release_date.slice(0, 4)}
            </p>
          )}
        </div>
        <Link
          href={`/movie/${id}`}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-ink-850 px-3 py-2 text-[12.5px] font-medium text-ink-200 ring-1 ring-ink-700 transition-colors hover:bg-ink-800 hover:text-white"
        >
          <IconArrowLeft className="size-4" />
          Back to movie
        </Link>
      </div>

      <div className="mt-4 aspect-video w-full overflow-hidden rounded-xl bg-black ring-1 ring-ink-700">
        {movieEmbedUrl(id) ? (
          <iframe
            src={movieEmbedUrl(id)}
            title={title}
            className="size-full"
            allowFullScreen
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            referrerPolicy="origin-when-cross-origin"
            loading="lazy"
          />
        ) : (
          <div className="grid size-full place-items-center p-6 text-center text-[13px] text-ink-400">
            This title cannot be played right now.
          </div>
        )}
      </div>

      {movie.overview && (
        <p className="mt-4 max-w-3xl text-[13px] leading-relaxed text-ink-300">
          {movie.overview}
        </p>
      )}

      <AdblockNote />
    </div>
  );
}

export function AdblockNote() {
  return (
    <p className="mt-6 text-[12px] text-ink-500">
      Playback is provided by an embedded third-party player. If you see popups or fake
      download buttons,{" "}
      <Link href="/adblock" className="text-cine-400 underline underline-offset-2">
        install the ad blocker
      </Link>
      .
    </p>
  );
}
