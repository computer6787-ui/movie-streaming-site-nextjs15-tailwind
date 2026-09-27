"use client";

import { useState } from "react";
import Link from "next/link";

const SCRIPT_URL = "/adblock/cinescope-adblock.user.js";
const REPO_EXT = "browser-extension";

const OPTIONS = [
  {
    id: "userscript",
    tag: "Recommended",
    name: "Tampermonkey userscript",
    blurb:
      "One click, no build step. Kills popunders, click-hijackers, notification nags, fake download buttons and ad iframes - on Cinescope and inside the player.",
    steps: [
      "Install Tampermonkey for your browser.",
      "Click the button below - Tampermonkey reads the script header and asks to install it.",
      "Allow the script to run on top-level frames; that is what lets it reach the embedded player.",
      "Reload any watch page you already had open.",
    ],
    cta: "Install Tampermonkey script",
    href: SCRIPT_URL,
  },
  {
    id: "extension",
    tag: "Network-level",
    name: "Cinescope Ad Blocker extension",
    blurb:
      "A Manifest V3 extension that blocks ad requests before they leave your browser, using uBlock's EasyList lists plus rules targeting this exact player. The only option that stops the requests themselves.",
    steps: [
      "Download the .zip below and unzip it into its own folder.",
      "Open chrome://extensions (or edge://extensions).",
      "Turn on Developer mode.",
      "Choose 'Load unpacked' and select the folder you just unzipped.",
      "Click the extension icon once so the filter lists download.",
    ],
    cta: "Download extension (.zip)",
    href: "/adblock/extension",
  },
  {
    id: "brave",
    tag: "Already built in",
    name: "Brave browser",
    blurb:
      "If you use Brave, do nothing - Shields is already an ad blocker. It runs the same EasyList rules inside the browser itself, so it already covers the player without installing anything.",
    steps: [
      "Nothing to install.",
      "Brave Shields is on by default for every site.",
      "If a site ever breaks, click the Shields icon in the address bar to toggle it for that site only.",
    ],
    external: true,
    externalUrl: "https://brave.com/shields/",
    externalLabel: "brave.com/shields",
  },
  {
    id: "ublock",
    tag: "Best coverage",
    name: "uBlock Origin",
    blurb:
      "The reference implementation. If you only install one thing, install this - it already covers everything Cinescope shows, plus far more.",
    steps: [
      "Install uBlock Origin from your browser's official store.",
      "Settings > Filter lists - keep EasyList, EasyPrivacy and Fanboy's Annoyances enabled.",
      "Settings > Filter assets - leave the defaults enabled.",
      "No Cinescope-specific setup is needed.",
    ],
    external: true,
    externalUrl: "https://ublockorigin.com/",
    externalLabel: "ublockorigin.com",
  },
];

export default function AdBlockPage() {
  const [open, setOpen] = useState("userscript");

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
        <header className="mb-10">
          <Link
            href="/"
            className="text-sm text-neutral-400 hover:text-neutral-100"
          >
            &larr; Back to movies
          </Link>
          <h1 className="mt-4 text-3xl font-bold sm:text-4xl">
            Block the ads
          </h1>
          <p className="mt-3 leading-relaxed text-neutral-400">
            The player we embed is a third-party iframe. Whatever it injects
            lives on <span className="text-neutral-200">its</span> domain, not
            ours, so no amount of site code can remove it. A browser-side
            blocker is the fix - the first option takes one click.
          </p>
        </header>

        <div className="space-y-4">
          {OPTIONS.map((o) => {
            const isOpen = open === o.id;
            return (
              <section
                key={o.id}
                className={`rounded-xl border transition-colors ${
                  isOpen
                    ? "border-red-600/60 bg-neutral-900"
                    : "border-neutral-800 bg-neutral-900/40 hover:border-neutral-700"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? "" : o.id)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="min-w-0">
                    <span className="mb-1 inline-block rounded-full bg-red-600/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-red-400">
                      {o.tag}
                    </span>
                    <span className="block text-lg font-semibold">{o.name}</span>
                    <span className="mt-1 block text-sm text-neutral-400">
                      {o.blurb}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 text-neutral-500 transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                    aria-hidden="true"
                  >
                    &#9662;
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-neutral-800 px-5 py-5">
                    <ol className="mb-5 list-decimal space-y-2 pl-5 text-sm text-neutral-300">
                      {o.steps.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ol>

                    {o.cta && (
                      <a
                        href={o.href}
                        className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500"
                      >
                        {o.cta}
                      </a>
                    )}

                    {o.id === "extension" && (
                      <p className="text-sm text-neutral-400">
                        Select the{" "}
                        <code className="rounded bg-neutral-800 px-1.5 py-0.5 text-xs text-neutral-200">
                          {REPO_EXT}/
                        </code>{" "}
                        folder in this project.
                      </p>
                    )}

                    {o.external && o.externalUrl && (
                      <p className="text-sm text-neutral-400">
                        Official download:{" "}
                        <a
                          href={o.externalUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-red-400 underline underline-offset-2 hover:text-red-300"
                        >
                          {o.externalLabel}
                        </a>
                      </p>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <section className="mt-10 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
          <h2 className="text-base font-semibold">
            How do browsers like Brave block ads?
          </h2>
          <p className="mt-2 text-sm text-neutral-400">
            They do it from the inside. Brave is a Chromium fork whose network
            layer checks every request against the{" "}
            <span className="text-neutral-200">same EasyList</span> rules
            uBlock Origin uses, before the request leaves your machine &mdash;
            including requests from inside third-party iframes like this player.
            That engine ships with the browser, which is why Shields works with
            no setup.
          </p>
          <p className="mt-2 text-sm text-neutral-400">
            A website cannot copy that. Blocking has to run above the page, not
            inside it, so on any other browser one of the options above is what
            stands in for it.
          </p>
        </section>

        <section className="mt-4 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
          <h2 className="text-base font-semibold">Deploying somewhere else?</h2>
          <p className="mt-2 text-sm text-neutral-400">
            The userscript only injects on the domains listed in its{" "}
            <code className="rounded bg-neutral-800 px-1.5 py-0.5 text-xs text-neutral-200">
              @match
            </code>{" "}
            header. If you host Cinescope on your own domain, add a{" "}
            <code className="rounded bg-neutral-800 px-1.5 py-0.5 text-xs text-neutral-200">
              @match https://your-domain/*
            </code>{" "}
            line to{" "}
            <code className="rounded bg-neutral-800 px-1.5 py-0.5 text-xs text-neutral-200">
              {SCRIPT_URL}
            </code>{" "}
            and reinstall it.
          </p>
        </section>
      </div>
    </div>
  );
}
