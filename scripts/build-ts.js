// Bundles each entry in src/ts/entries/ to assets/dist/.
// One file per entry so a page loads only the runtimes it needs.
import { context } from "esbuild";
import { readdir } from "node:fs/promises";

const args = process.argv.slice(2);
const watch = args.includes("--watch");
const shared = {
  bundle: true,
  format: "esm",
  target: "es2022",
  minify: args.includes("--minify"),
  sourcemap: args.includes("--sourcemap"),
  logLevel: "info",
};

const entryDir = "src/ts/entries";
// mermaid 走下面那次分割构建，从平铺这批里排掉 —— 两次都收它的话，
// assets/dist/mermaid.js 会是一份 3.3 MB 的全量副本，而且没人加载它。
const splitEntries = new Set(["mermaid.ts"]);
const entries = (await readdir(entryDir))
  .filter((f) => f.endsWith(".ts") && !splitEntries.has(f))
  .map((f) => `${entryDir}/${f}`);

if (entries.length === 0) {
  console.error(`no entries found in ${entryDir}`);
  process.exit(1);
}

const builds = [
  // 平铺的入口：一个入口一个文件，文件名稳定 —— foot/js.html 按名字取它们。
  await context({ ...shared, entryPoints: entries, outdir: "assets/dist", splitting: false }),

  // mermaid 单独一次，开代码分割。
  //
  // 分两次而不是一次开 splitting：开了分割之后 esbuild 会把入口间的公共代码抽成
  // 带哈希名的 chunk，上面那 5 个入口的文件名就不再是 `main.js` 这种可预测的
  // 名字，而 foot/js.html 正是按名字取它们的。mermaid 自己一个入口，抽不出跨
  // 入口的 chunk，分割的收益全部来自它内部那些动态 import。
  //
  // 收益是读者侧的：页面加载时只多 1.9 KB，mermaid 本体（719 KB）在图进视口时
  // 才下，图种各自的 chunk 再按需。整份打成单文件是 3.3 MB，一次性全下。
  //
  // **输出到 static/ 而不是 assets/。** chunk 是浏览器按入口文件里的相对路径
  // 直接取的，不经过 Hugo 的资源管线 —— 而 Hugo 只发布被 `resources.Get` 引用
  // 过的 asset，放在 assets/ 里的 chunk 一个都不会进 public/，图会 404。
  // static/ 是原样拷贝，整个目录连同 chunk 都在。
  await context({
    ...shared,
    entryPoints: ["src/ts/entries/mermaid.ts"],
    outdir: "static/js/mermaid",
    splitting: true,
    // chunk 自带内容哈希：换了 mermaid 版本，旧 chunk 不会被缓存命中。
    // static/ 下的文件拿不到 Hugo 的 fingerprint，缓存失效只能靠这个。
    chunkNames: "chunks/[name]-[hash]",
  }),
];

if (watch) {
  await Promise.all(builds.map((c) => c.watch()));
  console.log(`watching ${entries.length} entries + mermaid`);
} else {
  await Promise.all(builds.map((c) => c.rebuild()));
  await Promise.all(builds.map((c) => c.dispose()));
}
