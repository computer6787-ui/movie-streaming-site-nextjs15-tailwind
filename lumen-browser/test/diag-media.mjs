/** One-off diagnostic: is the fixture server serving the MP4 correctly? */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const site = spawn(process.execPath, [path.join(here, "serve-fixture.mjs")], {
  env: { ...process.env, FIXTURE_PORT: "4311" },
  stdio: "ignore",
});

await new Promise((r) => setTimeout(r, 1200));

const r1 = await fetch("http://localhost:4311/media/mp4.mp4", {
  headers: { Range: "bytes=0-99" },
});
const b = Buffer.from(await r1.arrayBuffer());
console.log("range:", r1.status, r1.headers.get("content-range"), r1.headers.get("content-type"));
console.log("bytes:", b.length, "ftyp:", JSON.stringify(b.slice(4, 8).toString("latin1")));

const r2 = await fetch("http://localhost:4311/media/mp4.mp4");
console.log("full:", r2.status, r2.headers.get("content-length"), r2.headers.get("content-type"));
console.log("watch page:", (await fetch("http://localhost:4311/watch")).status);

site.kill();
process.exit(0);
