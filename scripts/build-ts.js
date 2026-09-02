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

// 重的运行时各自一次分割构建（见下面的 splitBuild），从平铺这批里排掉 ——
// 两次都收的话 assets/dist/ 里会多一份全量副本，而且没人加载它。
//
// 判据是体积：这四个 bundle 起来是 3.3 MB / 184 KB / 706 KB / 77 KB，而平铺的
// 那几个都在 10 KB 以下。分割的收益是首屏只下入口（1 KB 上下），本体等到内容
// 进视口。
const splitEntries = ["mermaid.ts", "asciinema.ts", "echarts.ts", "markmap.ts"];
const entries = (await readdir(entryDir))
  .filter((f) => f.endsWith(".ts") && !splitEntries.includes(f))
  .map((f) => `${entryDir}/${f}`);

if (entries.length === 0) {
  console.error(`no entries found in ${entryDir}`);
  process.exit(1);
}

/**
 * 一个重运行时的分割构建。
 *
 * 每个 splitEntries 成员单独一次，而不是一次把它们都交给 esbuild：开了 splitting
 * 之后 esbuild 会把入口间的公共代码抽成带哈希名的 chunk，平铺那几个入口的文件名
 * 就不再是 `main.js` 这种可预测的名字，而 foot/js.html 正是按名字取它们的。
 * 一个入口一次构建也抽不出跨入口 chunk，分割的收益全部来自它内部的动态 import。
 *
 * **输出到 static/ 而不是 assets/。** chunk 是浏览器按入口文件里的相对路径直接
 * 取的，不经过 Hugo 的资源管线 —— 而 Hugo 只发布被 `resources.Get` 引用过的
 * asset，放在 assets/ 里的 chunk 一个都不会进 public/，运行时会 404。static/
 * 是原样拷贝，整个目录连同 chunk 都在。
 */
function splitBuild(file) {
  const name = file.replace(/\.ts$/, "");
  return context({
    ...shared,
    entryPoints: [`${entryDir}/${file}`],
    outdir: `static/js/${name}`,
    splitting: true,
    // chunk 自带内容哈希：换了上游版本，旧 chunk 不会被缓存命中。
    // static/ 下的文件拿不到 Hugo 的 fingerprint，缓存失效只能靠这个。
    chunkNames: "chunks/[name]-[hash]",
  });
}

const builds = await Promise.all([
  // 平铺的入口：一个入口一个文件，文件名稳定 —— foot/js.html 按名字取它们。
  context({ ...shared, entryPoints: entries, outdir: "assets/dist", splitting: false }),
  ...splitEntries.map(splitBuild),
]);

if (watch) {
  await Promise.all(builds.map((c) => c.watch()));
  console.log(`watching ${entries.length} flat entries + ${splitEntries.length} split`);
} else {
  await Promise.all(builds.map((c) => c.rebuild()));
  await Promise.all(builds.map((c) => c.dispose()));
}
