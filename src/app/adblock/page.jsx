"use client";

import { useState } from "react";
import Link from "next/link";

const SCRIPT_URL = "/adblock/chitralipi-adblock.user.js";
const REPO_EXT = "browser-extension";

const OPTIONS = [
  {
    id: "userscript",
    tag: "Recommended",
    name: "Tampermonkey userscript",
    blurb:
      "One click, no build step. Kills popunders, click-hijackers, notification nags, fake download buttons and ad iframes - on Chitralipi and inside the player.",
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
    name: "Chitralipi Ad Blocker extension",
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
      "The reference implementation. If you only install one thing, install this - it already covers everything Chitralipi shows, plus far more.",
    steps: [
      "Install uBlock Origin from your browser's official store.",
      "Settings > Filter lists - keep EasyList, EasyPrivacy and Fanboy's Annoyances enabled.",
      "Settings > Filter assets - leave the defaults enabled.",
      "No Chitralipi-specific setup is needed.",
    ],
    external: true,
    externalUrl: "https://ublockorigin.com/",
    externalLabel: "ublockorigin.com",
  },
];

export default function AdBlockPage() {
  const [open, setOpen] = useState("userscript");

  return (
    <div className="shell max-w-4xl pt-(--header-h) pb-10">
      <header className="pt-12 sm:pt-16">
        <Link
          href="/"
          className="group inline-flex items-center gap-1.5 text-[12.5px] text-ink-400 transition-colors duration-200 hover:text-ink-100"
        >
          <span className="inline-block transition-transform duration-300 ease-[var(--ease-emphasised)] group-hover:-translate-x-0.5">
            &larr;
          </span>
          Back to movies
        </Link>
        <p className="eyebrow mt-8 text-chit-600">Ad blocking</p>
        <h1 className="display mt-2 text-[32px] text-ink-100 sm:text-[44px]">Block the ads</h1>
        <p className="prose-measure mt-4 text-[14px] text-ink-300">
          The player we embed is a third-party iframe. Whatever it injects
          lives on <span className="text-ink-100">its</span> domain, not
          ours, so no amount of site code can remove it. A browser-side
          blocker is the fix &mdash; the first option takes one click.
        </p>
      </header>

        <div className="space-y-4">
          {OPTIONS.map((o) => {
            const isOpen = open === o.id;
            return (
              <section
                key={o.id}
                className={`overflow-hidden rounded-xl border shadow-[0_4px_12px_-8px_rgba(0,0,0,0.6)] transition-all duration-300 ease-out ${
                  isOpen
                    ? "border-red-500/40 bg-ink-900"
                    : "border-ink-700/70 bg-ink-900/50 hover:-translate-y-0.5 hover:border-ink-600 hover:bg-ink-900/70 hover:shadow-[0_12px_28px_-14px_rgba(0,0,0,0.9)]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? "" : o.id)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="min-w-0">
                    <span className="mb-1 inline-block rounded-md bg-red-500/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-red-400">
                      {o.tag}
                    </span>
                    <span className="block text-lg font-semibold text-ink-100">{o.name}</span>
                    <span className="mt-1 block max-w-[60ch] text-sm text-ink-400">
                      {o.blurb}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 text-ink-500 transition-transform duration-300 ease-out ${
                      isOpen ? "rotate-180" : ""
                    }`}
                    aria-hidden="true"
                  >
                    &#9662;
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-ink-800 px-5 py-5">
                    <ol className="mb-5 list-decimal space-y-2 pl-5 text-sm text-ink-300">
                      {o.steps.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ol>

                    {o.cta && (
                      <a
                        href={o.href}
                        className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(220,38,38,0.6)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-red-500 active:translate-y-0 active:scale-[0.98]"
                      >
                        {o.cta}
                      </a>
                    )}

                    {o.id === "extension" && (
                      <p className="text-sm text-ink-400">
                        Select the{" "}
                        <code className="rounded bg-ink-800 px-1.5 py-0.5 text-xs text-ink-200">
                          {REPO_EXT}/
                        </code>{" "}
                        folder in this project.
                      </p>
                    )}

                    {o.external && o.externalUrl && (
                      <p className="text-sm text-ink-400">
                        Official download:{" "}
                        <a
                          href={o.externalUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-chit-400 underline underline-offset-2 transition-colors hover:text-chit-300"
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

        <section className="mt-10 rounded-xl border border-ink-700/70 bg-ink-900/50 p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
          <h2 className="text-base font-semibold text-ink-100">
            How do browsers like Brave block ads?
          </h2>
          <p className="mt-2 max-w-[65ch] text-sm text-ink-400">
            They do it from the inside. Brave is a Chromium fork whose network
            layer checks every request against the{" "}
            <span className="text-ink-200">same EasyList</span> rules
            uBlock Origin uses, before the request leaves your machine &mdash;
            including requests from inside third-party iframes like this player.
            That engine ships with the browser, which is why Shields works with
            no setup.
          </p>
          <p className="mt-2 max-w-[65ch] text-sm text-ink-400">
            A website cannot copy that. Blocking has to run above the page, not
            inside it, so on any other browser one of the options above is what
            stands in for it.
          </p>
        </section>

        <section className="mt-4 rounded-xl border border-ink-700/70 bg-ink-900/50 p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
          <h2 className="text-base font-semibold text-ink-100">Deploying somewhere else?</h2>
          <p className="mt-2 max-w-[65ch] text-sm text-ink-400">
            The userscript only injects on the domains listed in its{" "}
            <code className="rounded bg-ink-800 px-1.5 py-0.5 text-xs text-ink-200">
              @match
            </code>{" "}
            header. If you host Chitralipi on your own domain, add a{" "}
            <code className="rounded bg-ink-800 px-1.5 py-0.5 text-xs text-ink-200">
              @match https://your-domain/*
            </code>{" "}
            line to{" "}
            <code className="rounded bg-ink-800 px-1.5 py-0.5 text-xs text-ink-200">
              {SCRIPT_URL}
            </code>{" "}
            and reinstall it.
          </p>
        </section>
    </div>
  );
}
