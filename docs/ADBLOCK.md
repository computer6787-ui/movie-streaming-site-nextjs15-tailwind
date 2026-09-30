# Ad blocking on Chitralipi

## Why the site cannot fix this itself

`/watch/[id]` embeds the player in a **cross-origin iframe**. The default source
is Filmu:

```jsx
<iframe src="https://embed.filmu.in/movie/{id}" />
```

The same-origin policy means `chitralipi` code cannot read or modify anything
inside that frame. Popunders, overlay click-bait and ad iframes are injected by
the player's host, so **no server-side or React-side change can remove them**.
Blocking has to happen in your browser, on your machine. (The other providers
in `src/lib/providers.js` behave the same way — only the host changes.)

We hardened what we could from the site side anyway (`referrerPolicy`, `title`
for a11y) — see `src/app/watch/[id]/page.jsx` — but that is defence in depth,
not a fix.

> **Do not add a `sandbox` attribute to the player iframe.** It was tried and
> reverted: the player refuses to render inside a sandboxed frame ("This
> content can't be embedded in a sandboxed frame") and playback fails outright.
> The `vsembed.ru` player behind the VidSrc provider does this deliberately,
> via an anti-sandbox script (`sbx.js`) that redirects to `/sandbox.php` when
> it detects a `sandbox` attribute on a parent frame.
> If you ever revisit it, `allow-same-origin` + `allow-scripts` together also
> provide no real isolation for a cross-origin frame, so the attribute only
> risks breaking the player.
>
> The same rule applies to any frame we embed: beyond the anti-sandbox
> script, a token list missing `allow-presentation`, `allow-pointer-lock`,
> `allow-modals` and `allow-top-navigation-by-user-activation` is enough to stop
> video playing inside it. Untrusted content belongs in a real browser
> process, where Chromium's process isolation applies.

## The three options

Pick in this order: Brave if you already use it (nothing to do), uBlock Origin
otherwise, and the bundled extension if you would rather not depend on a
third-party store.

| Option | Stops popups/click-bait | Stops ad *network* requests | Effort |
| --- | --- | --- | --- |
| [Brave browser](#1-brave-browser-recommended) | Yes | Yes | **Nothing** |
| [uBlock Origin](#2-ublock-origin) | Yes | Yes | Install from store |
| [Bundled MV3 extension](#3-bundled-mv3-extension) | Partly | Yes | Download + load |

## How Brave does it (and why a site cannot copy it)

Brave Shields is not an add-on. Brave is a **Chromium fork** whose network layer
runs the [`adblock-rs`](https://github.com/brave/adblock-rs) engine in Rust
**before any request leaves the machine**, including requests from inside
third-party iframes like this player. It consumes **EasyList + EasyPrivacy** —
the same lists uBlock Origin uses — plus its own curated list.

The important part: that engine lives **above** the page, inside the browser. A
website has no API to reach it. So on Brave there is nothing to install, and on
any other browser one of the options above is what stands in for it.

## What the player actually loads

Verified by fetching the live VidSrc player (Sept 2026). That chain is
`vidsrc.mov/embed/movie/{id}` → inner frame `vsembed.ru/embed/movie/{id}` →
ad servers on that page:

| Host | Role |
| --- | --- |
| `dpjf9a2rbjbvp.cloudfront.net` | Popunder / clickbait loader, injected by the embed page |
| `s10.histats.com` | Histats tracker (`js15_as.js`) |
| `sstatic1.histats.com` | Histats 1×1 tracking pixel |
| `static.cloudflareinsights.com` | Cloudflare Web Analytics beacon |
| `vsembed.ru` | Inner player frame (script `/assets/sbx.js`) |

`sbx.js` is a dedicated **anti-sandbox** script: if it detects a `sandbox`
attribute on a parent frame, it redirects itself to `/sandbox.php`. That is why
adding `sandbox` to our iframe broke playback — see the warning above.

These hosts are listed in `browser-extension/rules.js`, so the bundled
extension blocks them by name rather than relying on a filter list.

Filmu's own ad hosts have not been fingerprinted the same way yet. Its host is
covered by name (and by the EasyList-based lists the extension syncs), but if
you find popunders on it, add the host to `AD_HOSTS` in
`browser-extension/rules.js`.


### 1. Brave browser (recommended)

Nothing to install. Shields is on by default for every site.

1. Nothing to install.
2. Brave Shields is on by default for every site.
3. If a site ever breaks, click the Shields icon in the address bar to toggle
   it for that site only.

This is the recommended option because it is already there — the engine ships
inside the browser, so there is no extension to maintain, no filter lists to
update and no extra process running.

### 2. uBlock Origin

The right pick on any browser that is not Brave. If you install only one thing,
install this.

1. Install [uBlock Origin](https://ublockorigin.com/) from your browser's
   official store.
2. **Settings → Filter lists**: keep EasyList, EasyPrivacy and Fanboy's
   Annoyances enabled (these are the defaults).
3. **Settings → Filter assets**: leave the defaults enabled.

No Chitralipi-specific setup needed. It uses a real content-blocking engine
rather than request matching, so it also handles the cosmetic and scriptlet
rules our extension skips.

### 3. Bundled MV3 extension

Folder: `browser-extension/`. Blocks requests via `declarativeNetRequest`, so
nothing is even sent.

1. Visit `/adblock` and click **Download extension (.zip)** (served by
   `src/app/adblock/extension/route.js`, which zips the folder at request time).
2. Unzip it into its own folder.
3. Open `chrome://extensions` (or `edge://extensions`).
4. Enable **Developer mode**.
5. **Load unpacked** → select the folder you just unzipped.
6. Click the extension icon once so the filter lists download.

It ships 358 built-in rules (58 ad/tracking hosts plus 12 player hosts × 25 ad
paths) and syncs EasyList, EasyPrivacy and Fanboy's Annoyances into dynamic DNR
rules on install and every 6 hours. The popup shows the active rule count and
has a kill switch.

Because every built-in rule is installed as a *dynamic* rule rather than a
manifest `rules.json`, the kill switch genuinely stops all blocking. If the
rule set ever exceeds Chrome's dynamic-rule quota, or the DNR update fails,
the extension sets `lastError` and the popup shows that failure instead of
reporting a rule count that is not actually active.

`rules.js` holds the built-in rules; `background.js` translates Adblock Plus
filter lines into DNR rules. Only `||host^` and `||host^$domain=…` forms are
translated — cosmetic (`##`) and scriptlet (`#$#`) rules are skipped, and any
line with a negated option (`$~script`) is skipped rather than risk
over-blocking. Rules the translator cannot represent safely are ignored, so
coverage is narrower than uBlock's but never breaks playback.

## Verifying it works

- The extension popup shows a non-zero rule count.
- Clicking the player does not open a new tab or window.
- No notification permission prompt appears.
- `chrome://extensions` → the extension's service-worker console shows
  `[Chitralipi Ad Blocker] installed`.
