// Static export for GitHub Pages. Output goes to ./out, ready to publish.
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const run = (cmd, env = process.env) => {
  const r = spawnSync(cmd, { stdio: "inherit", env, shell: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

// Fresh set catalog and news first, so they ship inside the export.
run("node scripts/fetch-catalog.mjs");
run("npx next build", { ...process.env, PAGES: "1", PAGES_BASE_PATH: process.env.PAGES_BASE_PATH ?? "/Lego-Vault" });
// Without this, Pages runs Jekyll and drops the _next folder.
writeFileSync("out/.nojekyll", "");
