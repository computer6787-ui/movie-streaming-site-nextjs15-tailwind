import Link from "next/link";
import { notFound } from "next/navigation";
import { IconArrowLeft } from "@/components/icons";
import { IMG, movieDetail, titleOf } from "@/lib/tmdb";
import MoviePlayer from "./MoviePlayer";

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
  const poster = IMG.backdrop(movie.backdrop_path);

  return (
    <div className="shell pt-(--header-h) pb-10">
      <div className="flex flex-wrap items-end justify-between gap-4 pt-10 sm:pt-14">
        <div className="min-w-0">
          <Link
            href={`/movie/${id}`}
            className="group inline-flex items-center gap-1.5 text-[12.5px] text-ink-400 transition-colors duration-200 hover:text-ink-100"
          >
            <span className="inline-block transition-transform duration-300 ease-[var(--ease-emphasised)] group-hover:-translate-x-0.5">
              <IconArrowLeft className="size-3.5" />
            </span>
            Back to movie
          </Link>
          <h1 className="display mt-2 truncate text-[26px] text-ink-100 sm:text-[34px]">
            {title}
          </h1>
          {movie.release_date && (
            <p className="mt-1 text-[12.5px] text-ink-400 tnum">
              {movie.release_date.slice(0, 4)}
            </p>
          )}
        </div>
        <p className="eyebrow shrink-0 text-chit-600">Now screening</p>
      </div>

      <MoviePlayer 
        tmdbId={id} 
        title={title} 
        poster={poster} 
      />

      {movie.overview && (
        <div className="mt-8">
          <h2 className="eyebrow text-chit-600">Synopsis</h2>
          <p className="prose-measure mt-3 text-[13.5px] text-ink-300">{movie.overview}</p>
        </div>
      )}

      <AdblockNote />
    </div>
  );
}

export function AdblockNote() {
  return (
    <p className="mt-10 max-w-[70ch] text-[12px] leading-relaxed text-ink-500">
      Playback is provided by an embedded third-party player. If you see popups or fake
      download buttons,{" "}
      <Link href="/adblock" className="text-chit-400 underline underline-offset-2">
        install the ad blocker
      </Link>
      .
    </p>
  );
}
