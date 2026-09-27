import { BrowserShell } from "@/components/browser/BrowserShell";

/**
 * The entire app is one route: Lumen is the browser, not a site that links out
 * to one. Server-rendering the shell and letting it hydrate keeps the first
 * paint instant while the session is restored client-side.
 */
export default function Page() {
  return <BrowserShell />;
}
