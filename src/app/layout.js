import Link from "next/link";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import Header from "@/components/Header";
import IntentLink from "@/components/IntentLink";
import { IconGrid } from "@/components/icons";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * The display face. A high-contrast editorial serif used only for titles,
 * numbers and section heads - it carries the "lobby poster" feel that a
 * single sans-serif system cannot.
 */
const display = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata = {
  title: {
    default: "Chitralipi — Movies & Series",
    template: "%s | Chitralipi",
  },
  description:
    "Stream movies and series. Browse by genre, sort by rating or popularity, and pick up where you left off.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${display.variable} flex min-h-dvh flex-col`}
      >
        <Header />
        <main className="relative z-10 flex-1">{children}</main>
        <div className="noise-overlay" aria-hidden="true" />
        <footer className="relative z-10 mt-24 border-t border-ink-800/80">
          <div className="shell flex flex-col items-center gap-6 py-10 text-center sm:flex-row sm:justify-between sm:text-left">
            <IntentLink href="/" className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-lg bg-linear-to-br from-chit-400 to-chit-600 text-ink-950">
                <IconGrid className="size-4.5" />
              </span>
              <span className="font-display text-[17px] tracking-tight text-ink-100">Chitralipi</span>
            </IntentLink>
            <p className="max-w-md text-[11.5px] leading-relaxed text-ink-400">
              Metadata &amp; artwork from{" "}
              <a
                href="https://www.themoviedb.org"
                target="_blank"
                rel="noreferrer noopener"
                className="text-ink-300 underline underline-offset-2 transition-colors hover:text-chit-400"
              >
                TMDB
              </a>
              . This product uses the TMDB API but is not endorsed or certified by TMDB.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
