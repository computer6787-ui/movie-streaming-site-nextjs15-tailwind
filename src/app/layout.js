import { Geist, Geist_Mono } from "next/font/google";
import Header from "@/components/Header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: {
    default: "Cinescope — Movies & Series",
    template: "%s | Cinescope",
  },
  description:
    "Stream movies and series. Browse by genre, sort by rating or popularity, and pick up where you left off.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex min-h-dvh flex-col antialiased`}
      >
        <Header />
        <main className="flex-1">{children}</main>
        <footer className="mt-16 border-t border-ink-700/70 py-8">
          <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 text-[11.5px] text-ink-500 sm:flex-row sm:justify-between sm:px-6">
            <p>Cinescope — movie and series browser.</p>
            <p>
              Metadata &amp; artwork from{" "}
              <a
                href="https://www.themoviedb.org"
                target="_blank"
                rel="noreferrer noopener"
                className="text-ink-400 underline underline-offset-2 transition-colors hover:text-cine-400"
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
