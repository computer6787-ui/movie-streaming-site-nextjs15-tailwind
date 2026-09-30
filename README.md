# CineScope (Chitralipi) 🎬

A modern movie and TV show streaming platform with integrated ad-blocking.

## 🚀 Quick Start

This project is a **single** Next.js application.

```bash
npm install
```

## 🎯 Running the Application

```bash
npm run dev
```

Then open **http://localhost:8080**.

You can also run the one-stop startup script, which clears stale build cache
before starting:

```powershell
.\start-dev.ps1
```

## ✨ Features

- 🎬 Browse movies and TV shows
- 🔍 Advanced search functionality
- 🎭 Genre filtering
- 📺 Multiple streaming providers
- 🛡️ Ad and tracker blocking (see [`docs/ADBLOCK.md`](./docs/ADBLOCK.md))
- 🎨 Modern, responsive UI

## 🛠️ Architecture

A single Next.js app on port 8080, deployed to Render as one web service.

The player embed is a cross-origin iframe, so in-page ad blocking is not
possible from site code. Blocking is offered three ways instead — a
Tampermonkey userscript, a bundled MV3 extension, and uBlock Origin. See
[`docs/ADBLOCK.md`](./docs/ADBLOCK.md) for the full explanation and setup.

> **Do not add a `sandbox` attribute to the player iframe.** The player refuses
> to render inside a sandboxed frame, and playback fails outright. The details
> are in `docs/ADBLOCK.md`.

## 📝 Configuration

### Port Configuration

- **CineScope dev**: Port 8080 (`package.json` → `dev` script, and `PORT` in `start-dev.ps1`)
- **Production**: No hardcoded port. `npm run start` runs a bare `next start`,
  which binds `$PORT`. Render sets `PORT` (currently 10000) and scans that port
  before marking a deploy live, so pinning a port in the `start` script breaks
  the deploy.

### Environment

Copy `.env.example` to `.env` and fill it in. `.env` is git-ignored; the
template is not.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_TMDB_API_KEY` | TMDB v3 API key. Required — the site errors without it. |
| `TMDB_DEBUG` | Optional. Set to `1` to log TMDB requests to the server console. |

### Providers

Providers are listed in `src/lib/providers.js`. The one entry with
`default: true` is what loads on a watch page, and users can override it
per-browser with the "Switch Provider" control (remembered in
`localStorage`). **Filmu** is the current default. To change it, move
`default: true` to another entry — no other file needs to change.

## 🔧 Tech Stack

- Next.js 15.2.1 (App Router)
- React 19
- Tailwind CSS 4
- TMDB API

## 📖 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [TMDB API](https://www.themoviedb.org/documentation/api)

## 🚀 Deployment

`render.yaml` defines a single web service that builds with `npm ci && npm run
build` and starts with `npm run start`. Set `NEXT_PUBLIC_TMDB_API_KEY` in the
Render dashboard. See the comments in `render.yaml`.

## 📄 License

Private project

---

Made with ❤️ using Next.js

