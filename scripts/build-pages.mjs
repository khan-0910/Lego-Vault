// Static export for GitHub Pages. Output goes to ./out, ready to publish.
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const env = { ...process.env, PAGES: "1", PAGES_BASE_PATH: process.env.PAGES_BASE_PATH ?? "/Lego-Vault" };
const r = spawnSync("npx next build", { stdio: "inherit", env, shell: true });
if (r.status !== 0) process.exit(r.status ?? 1);
// Without this, Pages runs Jekyll and drops the _next folder.
writeFileSync("out/.nojekyll", "");
