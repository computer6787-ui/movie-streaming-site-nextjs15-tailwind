/**
 * Test fixture site — reproduces the reported failure, on purpose.
 *
 * The bug being fixed: on a streaming site, clicking PLAY causes an
 * advertisement page to open. This server models that exactly:
 *
 *   /watch          a page with a real Play button and a real <video>.
 *   /play           the click handler that starts playback AND, 1.2s later,
 *                   calls window.open() at an ad domain and also tries a
 *                   top-level redirect to it. Both must be refused.
 *   /popup/allowed  a legitimate window.open (same site) that must survive.
 *   /popup/oauth    a cross-site legitimate popup that must survive.
 *   /ad/*           ad-ish URLs, for request-level checks.
 *   /track/*        tracking pixels, for request-level checks.
 *
 * It also serves the real MP4s from test/fixtures so playback is genuine
 * decoding, not a stub.
 */
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.FIXTURE_PORT ?? 4311);
const SITE = `http://localhost:${PORT}`;

/** Hosts that stand in for ad/tracker infrastructure. */
export const AD_HOSTS = ["ads.doubleclick.net", "trc.taboola.com"];

/* ------------------------------------------------------------------ WebSocket
 * A minimal RFC6455 server. Present so the "WebSocket is not blocked"
 * assertion tests the *browser guard* rather than the absence of a server.
 */
const WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

function wsAccept(key) {
  return createHash("sha1").update(key + WS_GUID).digest("base64");
}


function html(body, extra = "") {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Lumen Fixture</title>${extra}</head><body>${body}</body></html>`;
}

const WATCH = html(`
  <h1>Fixture Stream</h1>
  <button id="play">Play</button>
  <video id="v" width="320" controls poster="">
    <source src="/media/mp4.mp4" type="video/mp4">
  </video>
  <p id="state">idle</p>
  <script>
    // Mirrors the real-world pattern: playback starts, and ~1s later the page
    // tries to hijack the user with an ad popup + a forced redirect.
    document.getElementById('play').addEventListener('click', () => {
      const v = document.getElementById('v');
      v.play().then(
        () => { document.getElementById('state').textContent = 'playing'; },
        (e) => { document.getElementById('state').textContent = 'play-error: ' + e.message; }
      );
      setTimeout(() => {
        // 1) popunder / popup to an ad domain
        try { window.open('https://ads.doubleclick.net/landing', '_blank', 'width=1,height=1'); } catch {}
        // 2) top-level forced navigation to an ad domain
        try { window.top.location.href = 'https://trc.taboola.com/redirect'; } catch {}
      }, 1200);
    });
  </script>
`);

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", SITE);
  const p = url.pathname;

  const send = (code, type, body, extraHeaders = {}) => {
    res.writeHead(code, { "content-type": type, ...extraHeaders });
    res.end(body);
  };

  if (p === "/watch") return send(200, "text/html; charset=utf-8", WATCH);
  if (p === "/") return send(200, "text/html; charset=utf-8", html('<h1>Lumen Fixture</h1>'));
  if (p === "/popup/allowed") {
    return send(200, "text/html; charset=utf-8", html("<h1 id=ok>legit popup</h1>"));
  }
  if (p === "/popup/oauth") {
    return send(200, "text/html; charset=utf-8", html("<h1 id=ok>oauth popup</h1>"));
  }
  if (p === "/open/allowed") {
    return send(200, "text/html; charset=utf-8", html(`
      <button id="b">open</button>
      <script>
        document.getElementById('b').addEventListener('click', () => {
          window.open('${SITE}/popup/allowed', '_blank');
        });
      </script>`));
  }
  if (p === "/open/ad") {
    return send(200, "text/html; charset=utf-8", html(`
      <button id="b">open</button>
      <script>
        document.getElementById('b').addEventListener('click', () => {
          window.open('https://ads.doubleclick.net/landing', '_blank');
        });
      </script>`));
  }

  if (p.startsWith("/media/")) {
    const name = path.basename(p);
    const file = path.join(here, "fixtures", name);
    let buf;
    try {
      await stat(file);
      buf = await readFile(file);
    } catch {
      return send(404, "text/plain", "no such media");
    }

    const type = name.endsWith(".webm") ? "video/webm" : "video/mp4";

    // Range support is REQUIRED, not optional: Chromium's media stack issues
    // `Range:` requests and refuses to play a source that cannot serve them.
    // Without this the test would "fail" for a fixture-server reason rather than
    // telling us anything true about the browser.
    const range = req.headers.range;
    if (range) {
      const m = /bytes=(\d*)-(\d*)/.exec(range);
      const start = m && m[1] ? Number(m[1]) : 0;
      const end = m && m[2] ? Math.min(Number(m[2]), buf.length - 1) : buf.length - 1;
      if (start >= buf.length) {
        res.writeHead(416, { "content-range": `bytes */${buf.length}` });
        return res.end();
      }
      res.writeHead(206, {
        "content-type": type,
        "content-length": String(end - start + 1),
        "content-range": `bytes ${start}-${end}/${buf.length}`,
        "accept-ranges": "bytes",
      });
      return res.end(buf.subarray(start, end + 1));
    }

    return send(200, type, buf, {
      "accept-ranges": "bytes",
      "content-length": String(buf.length),
    });
  }

  if (p.startsWith("/ad/") || p.startsWith("/track/") || p.startsWith("/pixel")) {
    return send(200, "image/gif", Buffer.from("R0lGODlhAQABAAAAACw=", "base64"));
  }

  return send(404, "text/plain", "not found");
});

server.on("upgrade", (req, socket) => {
  const key = req.headers["sec-websocket-key"];
  if (!key) {
    socket.destroy();
    return;
  }
  socket.write(
    "HTTP/1.1 101 Switching Protocols\r\n" +
      "Upgrade: websocket\r\n" +
      "Connection: Upgrade\r\n" +
      `Sec-WebSocket-Accept: ${wsAccept(key)}\r\n\r\n`,
  );
  // Echo one text frame back, then close cleanly.
  socket.write(Buffer.from([0x81, 0x02, 0x6f, 0x6b])); // "ok"
  socket.end();
});

server.listen(PORT, () => {
  console.log(`fixture site on ${SITE}`);
});
