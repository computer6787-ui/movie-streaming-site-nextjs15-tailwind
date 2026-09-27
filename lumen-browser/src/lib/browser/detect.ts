/**
 * Helpers for detecting *observed* frame load outcomes.
 *
 * What we can actually tell from the outside, without touching the framed
 * document:
 *   - `onLoad` fired: the frame rendered SOMETHING. That may be the real site,
 *     an error page, or nothing at all.
 *   - `onLoad` never fired within the timeout: the request is hanging,
 *     refused, or the host dropped the connection.
 *   - `onError`: only fires for genuinely broken/nonexistent frames, which is
 *     rare for cross-origin HTTP.
 *
 * A cross-origin site that sends `X-Frame-Options: DENY` / a CSP without
 * `frame-ancestors` typically fires `onLoad` and renders its own refusal
 * notice — we cannot read that notice. So the UI always offers an
 * "Open in new tab" escape hatch and an honest explanation, and never claims
 * to know what is (or isn't) inside the frame.
 */

export const LOAD_TIMEOUT_MS = 12_000;

export type LoadOutcome = "loaded" | "timeout" | "error";

/**
 * Many well-known sites refuse framing. We surface them as *hints* so the new
 * tab experience can suggest "open externally", but the app still attempts the
 * frame — it never silently refuses, and it never claims certainty.
 */
export const KNOWN_NON_EMBEDDABLE: Array<{ host: string; note: string }> = [
  { host: "google.com", note: "Sends X-Frame-Options that forbid embedding." },
  { host: "youtube.com", note: "Frames are limited on most YouTube pages." },
  { host: "github.com", note: "Blocks framing on most pages." },
  { host: "accounts.google.com", note: "Sign-in pages are never embeddable." },
];

export function isKnownNonEmbeddable(url: string): { host: string; note: string } | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return (
      KNOWN_NON_EMBEDDABLE.find(
        (k) => host === k.host || host.endsWith(`.${k.host}`),
      ) ?? null
    );
  } catch {
    return null;
  }
}
