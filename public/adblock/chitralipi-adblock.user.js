// ==UserScript==
// @name         Chitralipi Ad Blocker
// @namespace    https://github.com/chitralipi/chitralipi
// @version      1.0.0
// @description  Blocks popups/popunders, click-hijackers, notification nags, fake download buttons and ad iframes - on Chitralipi and inside the embedded player.
// @author       Chitralipi
// @match        http://localhost:3000/*
// @match        http://127.0.0.1:3000/*
// @match        https://*.vercel.app/*
// @match        https://vidsrc.mov/*
// @match        https://*.vidsrc.mov/*
// @match        https://vidsrc.to/*
// @match        https://*.vidsrc.to/*
// @match        https://vidsrc.xyz/*
// @match        https://*.vidsrc.xyz/*
// @match        https://vidsrc.in/*
// @match        https://*.vidsrc.in/*
// @match        https://vsembed.ru/*
// @match        https://*.vsembed.ru/*
// @match        https://streamtape.com/*
// @match        https://*.streamtape.com/*
// @match        https://filemoon.sx/*
// @match        https://*.filemoon.sx/*
// @match        https://mixdrop.co/*
// @match        https://*.mixdrop.co/*
// @match        https://streamwish.com/*
// @match        https://*.streamwish.com/*
// @match        https://vidstream.pro/*
// @match        https://*.vidstream.pro/*
// @grant        none
// @run-at       document-start
// ==/UserScript==
//
// ---------------------------------------------------------------------
// HOW TO INSTALL
//   1. Install Tampermonkey (Chrome/Edge/Firefox).
//   2. Open  http://localhost:3000/adblock/chitralipi-adblock.user.js
//      (or your deployed /adblock/chitralipi-adblock.user.js)
//   3. Tampermonkey detects the block above and offers to install it.
//   4. If you deploy somewhere other than *.vercel.app, add that domain
//      to the @match list and reinstall.
//
// WHY THERE IS NO @noframes
//   The player is a CROSS-ORIGIN <iframe> (vidsrc.mov). Same-origin
//   policy means the Next.js site cannot touch that document at all.
//   Listing the player domains in @match is the only way this script
//   gets injected where the ads actually live.
//
// WHAT THIS CANNOT DO
//   Tampermonkey has no request-blocking API, so it cannot cancel
//   network-level ad beacons. For that install the bundled extension
//   in /browser-extension (or uBlock Origin).
// ---------------------------------------------------------------------

(function () {
  "use strict";

  var IS_PLAYER = !/(^|\.)localhost$|^127\.0\.0\.1$|vercel\.app$/.test(
    location.hostname
  );

  /* =================================================================
   * 1. BLOCK LISTS
   * ================================================================= */

  // Hosts that only ever serve advertising / tracking on this site.
  var AD_HOSTS = [
    // Confirmed live on the vidsrc.mov -> vsembed.ru player chain.
    "dpjf9a2rbjbvp.cloudfront.net", // popunder / clickbait loader
    "s10.histats.com", // Histats tracker
    "sstatic1.histats.com", // Histats tracking pixel
    "static.cloudflareinsights.com", // Cloudflare Web Analytics
    "doubleclick.net",
    "googlesyndication.com",
    "googleadservices.com",
    "adservice.google.com",
    "google-analytics.com",
    "analytics.google.com",
    "googletagmanager.com",
    "amazon-adsystem.com",
    "adnxs.com",
    "rubiconproject.com",
    "pubmatic.com",
    "openx.net",
    "criteo.com",
    "criteo.net",
    "casalemedia.com",
    "smartadserver.com",
    "smaato.net",
    "teads.tv",
    "adform.net",
    "contextweb.com",
    "gumgum.com",
    "media.net",
    "plista.com",
    "taboola.com",
    "outbrain.com",
    "zemanta.com",
    "revcontent.com",
    "mgid.com",
    "adcash.com",
    "propellerads.com",
    "adsterra.com",
    "hilltopads.net",
    "exoclick.com",
    "exosrv.com",
    "juicyads.com",
    "popads.net",
    "popcash.net",
    "poperblock.com",
    "popsbox.com",
    "onclickalgo.com",
    "onclckds.com",
    "clickadu.com",
    "adskeeper.com",
    "zedo.com",
    "bidvertiser.com",
    "trafficjunky.com",
    "monetiz.com",
    "rotatorads.com",
    "adhigh.net",
    "luckyorange.com",
    "trafficmonetizer.org",
    "pushmonetization.com",
    "notification-ads.com",
    "dataprotection.eu"
  ];

  // Query-string markers that identify affiliate/click-out redirects.
  var CLICKOUT_PARAMS =
    /[?&](utm_|fbclid|gclid|gbraid|wbraid|msclkid|yclid|ttclid|igshid|mc_cid|mc_eid|clickid|click_id|at_recipient|_ga|aff|affiliate|mid|ref|referrer|source)=/i;

  // Link bait: fake "download / stream in HD" buttons.
  var BAIT_HREF =
    /\/download|\/downloader|\bkeygen\b|\bcrack\b|\bserial\b|\.mp4|\.mkv|\.avi|\.zip|\.exe|\.dmg|\.apk|free-?movies|watch-?online-?free/i;

  /* =================================================================
   * 2. URL HELPERS
   * ================================================================= */

  function hostOf(url) {
    try {
      return new URL(url, location.href).hostname.toLowerCase();
    } catch (e) {
      return "";
    }
  }

  function isAdHost(url) {
    var host = hostOf(url);
    if (!host) return false;
    for (var i = 0; i < AD_HOSTS.length; i++) {
      var h = AD_HOSTS[i];
      if (host === h || host.slice(-(h.length + 1)) === "." + h) return true;
    }
    return false;
  }

  // Iframes whose <iframe> element itself looks like a banner/popup.
  var AD_FRAME_SRC =
    /ad[-_]?(frame|slot|banner|box|vert|wall|unit|break|layer|overlay|zone)|doubleclick|googlesyndication|amazon-adsystem|\/ads?\/|adserver|adframe|ad-?container/i;

  // Very loose, deliberately anchored opt-out so we do not nuke the
  // actual video frame that the site embeds.
  var AD_TEXT =
    /\b(advertisement|sponsored|ad\s*by|ads?\s*by|promoted|banner ad|pop\s*-?\s*under)\b|^\s*ad(s)?\s*$/i;

  /* =================================================================
   * 3. MOUSE / POINTER TRAPS
   *    Players bind these on document/body to hijack the first click and
   *    navigate the top window to a click-out URL.
   * ================================================================= */

  function unwrapListeners(target) {
    try {
      var d = Object.getOwnPropertyDescriptor(target, "onclick");
      if (d && typeof d.set === "function") target.onclick = null;
    } catch (e) {}
    try {
      var o = Object.getOwnPropertyDescriptor(target, "onmouseover");
      if (o && typeof o.set === "function") target.onmouseover = null;
    } catch (e) {}
    try {
      var p = Object.getOwnPropertyDescriptor(target, "oncontextmenu");
      if (p && typeof p.set === "function") target.oncontextmenu = null;
    } catch (e) {}
  }

  function stripPointerTraps() {
    var els = document.querySelectorAll("*");
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      try {
        if (el.hasAttribute("onclick")) el.removeAttribute("onclick");
        if (el.hasAttribute("onmouseover")) el.removeAttribute("onmouseover");
        if (el.hasAttribute("oncontextmenu")) el.removeAttribute("oncontextmenu");
      } catch (e) {}
    }
    unwrapListeners(window);
    unwrapListeners(document);
    unwrapListeners(document.documentElement || document);
    if (document.body) unwrapListeners(document.body);
  }

  // Re-run a few times: these traps are (re)installed after load.
  stripPointerTraps();
  document.addEventListener("DOMContentLoaded", stripPointerTraps);
  window.addEventListener("load", stripPointerTraps);
  setTimeout(stripPointerTraps, 800);
  setTimeout(stripPointerTraps, 2500);

  /* =================================================================
   * 4. POPUPS / POPUNDERS
   * ================================================================= */

  function killWindow(w) {
    if (!w) return;
    try { w.close(); } catch (e) {}
  }

  // Keep a reference to the native opener before overriding it. Without this
  // the override below would throw a ReferenceError on every allowed popup.
  var realOpen = window.open.bind(window);

  // In the player frame every extra window is an ad; on our own site we
  // only refuse obvious ad / affiliate destinations.
  window.open = function (url) {
    var target = typeof url === "string" ? url : "";
    if (isClickout(target)) {
      try { window.close(); } catch (e) {}
      return null;
    }
    var w = realOpen.apply(window, arguments);
    if (IS_PLAYER) {
      // Whatever it opened, it did not need to.
      setTimeout(function () { killWindow(w); }, 0);
    }
    return w;
  };

  // Neutralise <a target="_blank"> click-outs: open internally instead.
  function isBaitLink(a) {
    var href = a.getAttribute("href") || "";
    var text = (a.textContent || "").trim();
    if (BAIT_HREF.test(href) && !/\/(embed|watch|play|movie|video)\b/i.test(href)) return true;
    if (AD_FRAME_SRC.test(href)) return true;
    if (/download|\bkeygen\b|\bcrack\b|stream\s*in\s*hd|free\s*download/i.test(text)) return true;
    if (AD_TEXT.test(text) && text.length < 60) return true;
    return false;
  }

  function scrubLinks() {
    var links = document.querySelectorAll("a[href]");
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      if (a.dataset && a.dataset.csNoAd === "1") continue;
      var href = a.getAttribute("href") || "";
      var abs = "";
      try { abs = new URL(href, location.href).href; } catch (e) {}
      if (isAdHost(abs) || (isBaitLink(a) && href.charAt(0) !== "#")) {
        a.dataset.csNoAd = "1";
        a.setAttribute("href", "javascript:void(0)");
        a.style.setProperty("pointer-events", "none", "important");
        a.style.setProperty("opacity", "0.25", "important");
        a.style.setProperty("text-decoration", "line-through", "important");
        a.setAttribute("aria-hidden", "true");
        a.setAttribute("tabindex", "-1");
      } else if (a.getAttribute("target") === "_blank") {
        // Stop the tab-hijack from leaving the app behind a popunder.
        a.removeAttribute("target");
      }
    }
  }

  document.addEventListener("click", function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest("a") : null;
    if (a && a.dataset && a.dataset.csNoAd === "1") {
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation();
    }
  }, true);

  /* =================================================================
   * 5. NAVIGATION HIJACK PREVENTION
   *    Players call top.location = "..." after the video ends.
   * ================================================================= */

  // Hosts that legitimately belong to the site / player we are viewing.
  var OWN_HOSTS = /(^|\.)(localhost|127\.0\.0\.1|vercel\.app)$/;

  function isClickout(url) {
    if (url === undefined || url === null) return false;
    var s = String(url);
    if (!s) return false;
    if (s.charAt(0) === "#" || s === "about:blank") return false;
    if (CLICKOUT_PARAMS.test(s)) return true;
    if (isAdHost(s)) return true;
    var h = hostOf(s);
    if (!h) return false;
    if (h === location.hostname) return false;
    // Inside the player, any cross-host navigation is a click-out.
    if (IS_PLAYER) return true;
    // On our own site only a jump to a totally unrelated host counts.
    return !OWN_HOSTS.test(h);
  }

  // BEST EFFORT ONLY. window.location is [LegacyUnforgeable] in modern
  // engines, so this defineProperty usually throws and is caught. It does
  // work in a few engines; do not rely on it. Anchor hrefs below are the
  // guard that reliably holds.
  function guardLocation(obj, prop) {
    var current = obj[prop];
    try {
      Object.defineProperty(obj, prop, {
        configurable: true,
        get: function () { return current; },
        set: function (v) {
          if (isClickout(v)) return;
          current = v;
        }
      });
    } catch (e) {}
  }

  function guardAnchor() {
    if (!document.documentElement) return;
    var d = Object.getOwnPropertyDescriptor(HTMLAnchorElement.prototype, "href");
    if (d && d.set && d.get) {
      try {
        Object.defineProperty(document.documentElement, "href", {
          configurable: true,
          get: d.get,
          set: function (v) {
            if (isClickout(v)) return;
            d.set.call(this, v);
          }
        });
      } catch (e) {}
    }
  }

  guardLocation(window, "location");
  window.addEventListener("beforeunload", function (ev) {
    // If something is about to bounce us, let it happen silently rather
    // than triggering a "leave site?" prompt from a popunder handler.
    void ev;
  });
  document.addEventListener("DOMContentLoaded", guardAnchor);
  if (document.documentElement) guardAnchor();

  /* =================================================================
   * 6. COSMETIC FILTER
   * ================================================================= */

  var COSMETIC_CSS = [
    "iframe[id^='google_ads'],iframe[id^='googleads'],iframe[id^='aswift'],iframe[id^='ad'],",
    "iframe[src*='doubleclick'],iframe[src*='googlesyndication'],iframe[src*='/pagead/'],",
    "iframe[src*='amazon-adsystem'],iframe[src*='adnxs'],iframe[src*='criteo'],",
    "iframe[src*='adframe'],iframe[src*='adframe_'],iframe[src*='ad-container'],",
    "ins.adsbygoogle,ins.adsbygoogle-iframe,",
    "div[id^='google_ads_'],div[id^='google_ads_iframe_'],div[id^='div-gpt-ad'],",
    "div[id^='dfp-ad-'],div[class^='ad-slot'],div[class*=' ad-slot'],",
    "[id^='banner-'],.ad-container,.ad-wrapper,.adsbygoogle,.advert,.advertisement,",
    "[class*='popupunder'],[id*='popupunder'],[class*='popunder'],[id*='popunder'],",
    "[class*='onclick-algo'],[class*='clickunder'],[id*='clickunder'],",
    "[class*='fake-download'],[id*='fake-download'],[class*='download-btn'],",
    "[class*='notification-popup'],[id*='notification-popup'],[class*='push-notif'],",
    "[class^='z-index-9999'][class*='fixed'],",
    "body > div[style*='position: fixed'][style*='z-index']:not([id*='player']):not([class*='player'])"
  ].join(",");

  function cosmeticSweep() {
    var nodes = document.querySelectorAll(COSMETIC_CSS);
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (n.dataset && n.dataset.csNoAd === "1") continue;
      // Never remove the site's own player iframe.
      var src = n.getAttribute && (n.getAttribute("src") || "");
      if (/\/(embed|watch|play|video)\b/i.test(src)) continue;
      n.dataset.csNoAd = "1";
      n.style.setProperty("display", "none", "important");
      n.style.setProperty("visibility", "hidden", "important");
      n.style.setProperty("position", "absolute", "important");
      n.style.setProperty("left", "-99999px", "important");
      n.style.setProperty("width", "0", "important");
      n.style.setProperty("height", "0", "important");
    }
  }

  // A <style> element injected by the ad script: neutralise it wholesale.
  function nukeInjectedStyles() {
    if (!document.head) return;
    var sheets = document.head.querySelectorAll("style");
    for (var i = 0; i < sheets.length; i++) {
      var s = sheets[i];
      if (s.dataset && s.dataset.csNoAd === "1") continue;
      var t = s.textContent || "";
      if (AD_FRAME_SRC.test(t) || /position\s*:\s*fixed[\s\S]{0,200}z-index\s*:\s*(9\d{3}|[1-9]\d{5,})/i.test(t)) {
        s.dataset.csNoAd = "1";
        s.textContent = "/* removed by Chitralipi Ad Blocker */";
      }
    }
  }

  /* =================================================================
   * 7. NOTIFICATION / ALERT / ONBEFOREUNLOAD NAGS
   * ================================================================= */

  function silence(fn) {
    return function () { return undefined; };
  }
  try {
    window.Notification = silence(window.Notification);
  } catch (e) {}
  try {
    if (window.navigator && "serviceWorker" in navigator) {
      navigator.serviceWorker.register = function () {
        return Promise.reject(new Error("blocked by Chitralipi Ad Blocker"));
      };
    }
  } catch (e) {}

  if (IS_PLAYER) {
    try { window.onbeforeunload = null; } catch (e) {}
    try {
      window.addEventListener("beforeunload", function (e) {
        delete e.returnValue;
        e.stopImmediatePropagation();
      }, true);
    } catch (e) {}
  }

  /* =================================================================
   * 8. MUTATION OBSERVER + INIT
   * ================================================================= */

  var pending = null;
  function schedule() {
    if (pending) return;
    pending = setTimeout(function () {
      pending = null;
      scrubLinks();
      cosmeticSweep();
      nukeInjectedStyles();
    }, 120);
  }

  function start() {
    scrubLinks();
    cosmeticSweep();
    nukeInjectedStyles();
    try {
      var mo = new MutationObserver(schedule);
      mo.observe(document.documentElement || document, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["src", "href", "style", "id", "class"]
      });
    } catch (e) {}
  }

  if (document.documentElement) start();
  else document.addEventListener("readystatechange", start);
  document.addEventListener("DOMContentLoaded", start);
  window.addEventListener("load", start);
  setInterval(schedule, 1500);

  console.info("[Chitralipi Ad Blocker] active in", location.hostname);
})();
