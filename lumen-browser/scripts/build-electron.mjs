/**
 * Compile the Electron main process to CommonJS.
 *
 * Why this exists: the app is a Next.js project, so `npm run build` must keep
 * producing a static export for the *web* build. The Electron main process is
 * a completely separate target that Electron itself loads, so it gets its own
 * tiny esbuild step rather than being entangled with Next's config.
 *
 * esbuild is already present (Next depends on it), so this adds no new
 * dependency to install.
 */
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { existsSync } from "node:fs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const external = ["electron"];

if (!existsSync(path.join(root, "electron", "main.ts"))) {
  console.error("electron/main.ts not found — nothing to build.");
  process.exit(1);
}

// Two entry points, both bundled to CJS because Electron's main process is CJS:
//
//   main.cjs   — the shipping app.
//   guards.cjs — the guards alone, so the headless test harness can attach the
//                EXACT production guards to its own window. This is what stops
//                the test from drifting away from what actually ships.
for (const [entry, outfile] of [
  ["main.ts", "main.cjs"],
  ["guards.ts", "guards.cjs"],
]) {
  await build({
    entryPoints: [path.join(root, "electron", entry)],
    bundle: true,
    platform: "node",
    target: "node20",
    format: "cjs",
    outfile: path.join(root, "electron", outfile),
    external,
    sourcemap: true,
    logLevel: "warning",
  });
  console.log(`Built electron/${outfile}`);
}

