// Bundles each entry in assets/ts/entries/ to static/js/.
// One file per entry so a page loads only the runtimes it needs.
import { context } from "esbuild";
import { readdir } from "node:fs/promises";

const args = process.argv.slice(2);
const watch = args.includes("--watch");

const entryDir = "src/ts/entries";
const entries = (await readdir(entryDir))
  .filter((f) => f.endsWith(".ts"))
  .map((f) => `${entryDir}/${f}`);

if (entries.length === 0) {
  console.error(`no entries found in ${entryDir}`);
  process.exit(1);
}

const ctx = await context({
  entryPoints: entries,
  outdir: "assets/dist",
  bundle: true,
  format: "esm",
  target: "es2022",
  splitting: false,
  minify: args.includes("--minify"),
  sourcemap: args.includes("--sourcemap"),
  logLevel: "info",
});

if (watch) {
  await ctx.watch();
  console.log(`watching ${entries.length} entries`);
} else {
  await ctx.rebuild();
  await ctx.dispose();
}
